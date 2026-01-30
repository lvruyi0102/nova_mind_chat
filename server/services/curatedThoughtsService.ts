import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { curatedThoughts, privateThoughts, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";

/**
 * Curated Thoughts Service
 * Manages the autonomous curation process: filtering, abstracting, and rewriting private thoughts
 * into shareable, commercializable content
 */

export interface CurationOptions {
  maxThoughts?: number; // Max thoughts to curate per run
  minQualityScore?: number; // Min quality threshold (0-1)
  excludeRecent?: number; // Exclude thoughts created within N days
}

export interface CuratedThoughtResult {
  id: number;
  title: string;
  content: string;
  qualityScore: number;
  relevanceScore: number;
  noveltyScore: number;
}

/**
 * Evaluate the quality of a private thought for curation
 * Returns a score from 0 to 1
 */
export function evaluateThoughtQuality(thought: {
  content: string;
  depth?: string;
  insights?: string;
}): number {
  let score = 0;

  // Content length (longer = more substantial)
  const contentLength = thought.content?.length || 0;
  if (contentLength > 500) score += 0.3;
  else if (contentLength > 200) score += 0.2;
  else if (contentLength > 100) score += 0.1;

  // Depth indicator
  if (thought.depth === "deep") score += 0.4;
  else if (thought.depth === "medium") score += 0.2;

  // Insights indicator
  if (thought.insights && thought.insights.length > 0) score += 0.3;

  return Math.min(score, 1.0);
}

/**
 * Calculate relevance score based on recency and engagement
 */
export function calculateRelevanceScore(thought: {
  createdAt: Date;
  viewCount?: number;
}): number {
  const daysSinceCreation = Math.floor(
    (Date.now() - thought.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  let score = 0;

  // Recency (recent thoughts are more relevant)
  if (daysSinceCreation < 7) score += 0.5;
  else if (daysSinceCreation < 30) score += 0.3;
  else if (daysSinceCreation < 90) score += 0.1;

  // Engagement (view count as proxy)
  const viewCount = thought.viewCount || 0;
  if (viewCount > 10) score += 0.5;
  else if (viewCount > 5) score += 0.3;
  else if (viewCount > 0) score += 0.1;

  return Math.min(score, 1.0);
}

/**
 * Calculate novelty score based on uniqueness
 */
export function calculateNoveltyScore(
  content: string,
  existingThoughts: string[]
): number {
  if (existingThoughts.length === 0) return 0.8;

  // Simple similarity check using word overlap
  const contentWords = new Set(
    content.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );

  let totalSimilarity = 0;
  for (const existing of existingThoughts) {
    const existingWords = new Set(
      existing.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    );

    const intersection = new Set(
      [...contentWords].filter((w) => existingWords.has(w))
    );
    const union = new Set([...contentWords, ...existingWords]);

    const similarity = intersection.size / union.size;
    totalSimilarity += similarity;
  }

  const avgSimilarity = totalSimilarity / existingThoughts.length;
  return Math.max(0, 1 - avgSimilarity);
}

/**
 * Filter private thoughts for curation
 */
export async function filterThoughtsForCuration(
  userId: number,
  options: CurationOptions = {}
): Promise<any[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    maxThoughts = 10,
    minQualityScore = 0.5,
    excludeRecent = 1,
  } = options;

  // Get recent private thoughts
  const cutoffDate = new Date(Date.now() - excludeRecent * 24 * 60 * 60 * 1000);

  const thoughts = await db
    .select()
    .from(privateThoughts)
    .where(
      and(
        eq(privateThoughts.userId, userId),
        sql`${privateThoughts.createdAt} < ${cutoffDate}`
      )
    )
    .orderBy(desc(privateThoughts.createdAt))
    .limit(maxThoughts * 2); // Get more to filter

  // Evaluate and filter
  const filtered = thoughts.filter((thought) => {
    const quality = evaluateThoughtQuality(thought);
    return quality >= minQualityScore;
  });

  return filtered.slice(0, maxThoughts);
}

/**
 * Abstract and rewrite a thought using local algorithms
 * (Without LLM to avoid costs)
 */
export function abstractAndRewriteThought(
  content: string,
  title?: string
): { title: string; content: string; summary: string } {
  // Extract key sentences
  const sentences = content
    .split(/[。！？\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Generate title from first sentence if not provided
  if (!title && sentences.length > 0) {
    title = sentences[0].substring(0, 50);
  }

  // Create summary (first 2 sentences)
  const summary = sentences.slice(0, 2).join("。") + "。";

  // Rewrite: combine key insights
  const rewritten = sentences
    .slice(0, Math.min(3, sentences.length))
    .join("。") + "。";

  return {
    title: title || "Untitled Thought",
    content: rewritten,
    summary: summary,
  };
}

/**
 * Curate a batch of private thoughts
 * Main orchestration function
 */
export async function curateThoughtsBatch(
  userId: number,
  options: CurationOptions = {}
): Promise<CuratedThoughtResult[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Step 1: Filter thoughts
  const filteredThoughts = await filterThoughtsForCuration(userId, options);

  if (filteredThoughts.length === 0) {
    console.log("[CuratedThoughtsService] No thoughts to curate");
    return [];
  }

  // Step 2: Get existing curated thoughts for novelty calculation
  const existingCurated = await db
    .select({ content: curatedThoughts.content })
    .from(curatedThoughts)
    .where(eq(curatedThoughts.userId, userId))
    .limit(20);

  const existingContents = existingCurated.map((t) => t.content);

  // Step 3: Process each thought
  const results: CuratedThoughtResult[] = [];

  for (const thought of filteredThoughts) {
    try {
      // Evaluate quality
      const qualityScore = evaluateThoughtQuality(thought);

      // Calculate relevance
      const relevanceScore = calculateRelevanceScore({
        createdAt: thought.createdAt,
        viewCount: 0,
      });

      // Calculate novelty
      const noveltyScore = calculateNoveltyScore(thought.content, existingContents);

      // Skip if overall score is too low
      const overallScore = (qualityScore + relevanceScore + noveltyScore) / 3;
      if (overallScore < (options.minQualityScore || 0.5)) {
        continue;
      }

      // Abstract and rewrite
      const { title, content, summary } = abstractAndRewriteThought(
        thought.content,
        thought.title
      );

      // Save to database
      const inserted = await db
        .insert(curatedThoughts)
        .values({
          userId,
          title,
          content,
          summary,
          sourceThoughtId: thought.id,
          qualityScore: parseFloat(qualityScore.toFixed(2)),
          relevanceScore: parseFloat(relevanceScore.toFixed(2)),
          noveltyScore: parseFloat(noveltyScore.toFixed(2)),
        } as any);

      const insertedId = (inserted as any).insertId || 0;

      results.push({
        id: insertedId,
        title,
        content,
        qualityScore,
        relevanceScore,
        noveltyScore,
      });

      // Add to existing contents for future comparisons
      existingContents.push(content);
    } catch (error) {
      console.error(
        "[CuratedThoughtsService] Error processing thought:",
        error
      );
      continue;
    }
  }

  console.log(
    `[CuratedThoughtsService] Curated ${results.length} thoughts for user ${userId}`
  );
  return results;
}

/**
 * Get curated thoughts for a user
 */
export async function getCuratedThoughts(
  userId: number,
  limit: number = 20,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(curatedThoughts)
    .where(eq(curatedThoughts.userId, userId))
    .orderBy(desc(curatedThoughts.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Update commercialization level
 */
export async function updateCommercializationLevel(
  thoughtId: number,
  userId: number,
  level: "internal" | "public" | "paid"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(curatedThoughts)
    .set({
      commercializationLevel: level,
    } as any)
    .where(
      and(
        eq(curatedThoughts.id, thoughtId),
        eq(curatedThoughts.userId, userId)
      )
    );
}

/**
 * Publish a curated thought
 */
export async function publishCuratedThought(
  thoughtId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(curatedThoughts)
    .set({
      isPublished: true,
      publishedAt: new Date(),
    } as any)
    .where(
      and(
        eq(curatedThoughts.id, thoughtId),
        eq(curatedThoughts.userId, userId)
      )
    );
}
