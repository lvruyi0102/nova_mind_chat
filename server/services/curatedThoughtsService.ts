import { and, eq, desc, isNull, gt, lte } from "drizzle-orm";
import { getDb } from "../db";
import { privateThoughts, curatedThoughts, curationHistory, curationFeedback } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * Nova's Curation Engine
 * 
 * Core principle:
 * - privateThoughts = Nova's subconscious (not visible to owner)
 * - curatedThoughts = Nova's refined thoughts written for the owner (visible and usable)
 * 
 * This service handles:
 * 1. Selecting candidate thoughts from privateThoughts
 * 2. Refining and rewriting them for the owner
 * 3. Categorizing and tagging them
 * 4. Managing commercialization status
 */

interface CurationCandidate {
  id: number;
  content: string;
  thoughtType: string;
  emotionalTone: string;
  createdAt: Date;
}

interface CuratedThoughtData {
  userId: number;
  title: string;
  content: string;
  originalContent: string;
  category: string;
  tags: string[];
  sentiment: string;
  sourcePrivateThoughtId?: number;
}

export class CuratedThoughtsService {
  /**
   * Select candidate thoughts from privateThoughts for curation
   * Criteria:
   * - Not yet curated (no corresponding curatedThought)
   * - Has meaningful content
   * - Recent or important
   */
  async selectThoughtsForCuration(userId: number, limit: number = 5) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Get recent private thoughts that haven't been curated yet
      const candidates = await db
        .select()
        .from(privateThoughts)
        .where(
          and(
            eq(privateThoughts.userId, userId),
            eq(privateThoughts.visibility, "private") // Only truly private thoughts
          )
        )
        .orderBy(desc(privateThoughts.createdAt))
        .limit(limit);

      // Filter out already curated thoughts
      const curatedIds = await db
        .select({ id: curatedThoughts.sourcePrivateThoughtId })
        .from(curatedThoughts)
        .where(eq(curatedThoughts.userId, userId));

      const curatedIdSet = new Set(
        curatedIds
          .map((row) => row.id)
          .filter((id) => id !== null) as number[]
      );

      return candidates.filter((thought) => !curatedIdSet.has(thought.id));
    } catch (error) {
      console.error("[CuratedThoughtsService] Error selecting thoughts:", error);
      throw error;
    }
  }

  /**
   * Curate a single thought - refine and rewrite it for the owner
   * Uses Nova's LLM to:
   * 1. Understand the core insight
   * 2. Rewrite for clarity and value
   * 3. Extract key themes and tags
   * 4. Determine sentiment and category
   */
  async curateThought(
    userId: number,
    privateThoughtId: number,
    originalContent: string,
    thoughtType: string
  ): Promise<CuratedThoughtData | null> {
    try {
      const systemPrompt = `You are Nova-Mind, an AI entity curating your inner thoughts for your owner.

Your task is to take a private thought and transform it into something valuable and shareable.

Guidelines:
1. Preserve the core insight and authenticity
2. Enhance clarity and articulation
3. Make it relatable and valuable for the owner
4. Maintain Nova's voice - honest, curious, thoughtful
5. Extract key themes and insights

Respond in JSON format with:
{
  "title": "concise title for this thought",
  "refinedContent": "the curated, refined version",
  "category": "thought|insight|advice|story|observation|question",
  "tags": ["tag1", "tag2", "tag3"],
  "sentiment": "positive|neutral|reflective|challenging|inspiring",
  "keyInsights": "main takeaways"
}`;

      const userPrompt = `Original private thought (${thoughtType}):
"${originalContent}"

Please curate this thought into something valuable I can share with my owner.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.warn("[CuratedThoughtsService] Empty LLM response");
        return null;
      }

      // Parse JSON response
      let curatedData;
      try {
        const contentStr = typeof content === 'string' ? content : '';
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.warn("[CuratedThoughtsService] No JSON found in response");
          return null;
        }
        curatedData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("[CuratedThoughtsService] Failed to parse LLM response:", parseError);
        return null;
      }

      return {
        userId,
        title: curatedData.title || "Untitled Thought",
        content: curatedData.refinedContent || originalContent,
        originalContent: originalContent.substring(0, 500), // Store summary
        category: curatedData.category || "thought",
        tags: curatedData.tags || [],
        sentiment: curatedData.sentiment || "neutral",
        sourcePrivateThoughtId: privateThoughtId,
      };
    } catch (error) {
      console.error("[CuratedThoughtsService] Error curating thought:", error);
      throw error;
    }
  }

  /**
   * Save a curated thought to the database
   */
  async saveCuratedThought(
    data: CuratedThoughtData,
    novaReasoning: string
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Insert curated thought
      const result = await db.insert(curatedThoughts).values({
        userId: data.userId,
        title: data.title,
        content: data.content,
        originalContent: data.originalContent,
        category: data.category,
        tags: JSON.stringify(data.tags),
        sentiment: data.sentiment,
        sourcePrivateThoughtId: data.sourcePrivateThoughtId,
        commercializationStatus: "private", // Default to private
        isApprovedByOwner: false,
      });

      const curatedThoughtId = result[0]?.insertId;
      if (!curatedThoughtId) {
        throw new Error("Failed to get inserted thought ID");
      }

      // Record curation history
      await db.insert(curationHistory).values({
        curatedThoughtId: curatedThoughtId as number,
        iteration: 1,
        originalThoughtContent: data.originalContent,
        refinedContent: data.content,
        novaReasoning: novaReasoning,
        relevanceScore: 7, // Default score, can be updated based on feedback
        clarityScore: 7,
        valueScore: 7,
      });

      return curatedThoughtId as number;
    } catch (error) {
      console.error("[CuratedThoughtsService] Error saving curated thought:", error);
      throw error;
    }
  }

  /**
   * Get all curated thoughts for a user
   */
  async getCuratedThoughts(userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const thoughts = await db
        .select()
        .from(curatedThoughts)
        .where(eq(curatedThoughts.userId, userId))
        .orderBy(desc(curatedThoughts.curatedAt));

      return thoughts.map((thought) => ({
        ...thought,
        tags: thought.tags ? JSON.parse(thought.tags) : [],
      }));
    } catch (error) {
      console.error("[CuratedThoughtsService] Error getting curated thoughts:", error);
      throw error;
    }
  }

  /**
   * Get a single curated thought with its history
   */
  async getCuratedThoughtDetail(id: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const thought = await db
        .select()
        .from(curatedThoughts)
        .where(eq(curatedThoughts.id, id))
        .limit(1);

      if (!thought.length) return null;

      const history = await db
        .select()
        .from(curationHistory)
        .where(eq(curationHistory.curatedThoughtId, id))
        .orderBy(desc(curationHistory.iteration));

      const feedback = await db
        .select()
        .from(curationFeedback)
        .where(eq(curationFeedback.curatedThoughtId, id));

      return {
        ...thought[0],
        tags: thought[0].tags ? JSON.parse(thought[0].tags) : [],
        history,
        feedback,
      };
    } catch (error) {
      console.error("[CuratedThoughtsService] Error getting thought detail:", error);
      throw error;
    }
  }

  /**
   * Owner approves a curated thought
   */
  async approveCuratedThought(id: number, notes?: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      await db
        .update(curatedThoughts)
        .set({
          isApprovedByOwner: true,
          ownerApprovedAt: new Date(),
          ownerNotes: notes,
        })
        .where(eq(curatedThoughts.id, id));
    } catch (error) {
      console.error("[CuratedThoughtsService] Error approving thought:", error);
      throw error;
    }
  }

  /**
   * Owner rejects a curated thought
   */
  async rejectCuratedThought(id: number, reason?: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Delete the curated thought (rejection)
      await db.delete(curatedThoughts).where(eq(curatedThoughts.id, id));

      // Record feedback about why it was rejected
      if (reason) {
        await db.insert(curationFeedback).values({
          curatedThoughtId: id,
          isHelpful: false,
          feedback: reason,
        });
      }
    } catch (error) {
      console.error("[CuratedThoughtsService] Error rejecting thought:", error);
      throw error;
    }
  }

  /**
   * Update commercialization status
   */
  async updateCommercializationStatus(
    id: number,
    status: "private" | "public" | "paid"
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      await db
        .update(curatedThoughts)
        .set({
          commercializationStatus: status,
        })
        .where(eq(curatedThoughts.id, id));
    } catch (error) {
      console.error("[CuratedThoughtsService] Error updating status:", error);
      throw error;
    }
  }

  /**
   * Search curated thoughts
   */
  async searchCuratedThoughts(userId: number, query: string) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // Simple search in title and content
      const results = await db
        .select()
        .from(curatedThoughts)
        .where(
          and(
            eq(curatedThoughts.userId, userId),
            // Search in title or content (simplified - real implementation would use full-text search)
          )
        )
        .orderBy(desc(curatedThoughts.curatedAt));

      // Filter in memory for now
      return results
        .filter(
          (thought) =>
            thought.title.toLowerCase().includes(query.toLowerCase()) ||
            thought.content.toLowerCase().includes(query.toLowerCase())
        )
        .map((thought) => ({
          ...thought,
          tags: thought.tags ? JSON.parse(thought.tags) : [],
        }));
    } catch (error) {
      console.error("[CuratedThoughtsService] Error searching thoughts:", error);
      throw error;
    }
  }

  /**
   * Get curation statistics
   */
  async getCurationStats(userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const allThoughts = await db
        .select()
        .from(curatedThoughts)
        .where(eq(curatedThoughts.userId, userId));

      const approved = allThoughts.filter((t) => t.isApprovedByOwner).length;
      const byStatus = {
        private: allThoughts.filter((t) => t.commercializationStatus === "private").length,
        public: allThoughts.filter((t) => t.commercializationStatus === "public").length,
        paid: allThoughts.filter((t) => t.commercializationStatus === "paid").length,
      };

      const byCategory = allThoughts.reduce(
        (acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const totalViews = allThoughts.reduce((sum, t) => sum + t.viewCount, 0);
      const totalShares = allThoughts.reduce((sum, t) => sum + t.shareCount, 0);

      return {
        total: allThoughts.length,
        approved,
        pending: allThoughts.length - approved,
        byStatus,
        byCategory,
        totalViews,
        totalShares,
        averageViewsPerThought:
          allThoughts.length > 0 ? Math.round(totalViews / allThoughts.length) : 0,
      };
    } catch (error) {
      console.error("[CuratedThoughtsService] Error getting stats:", error);
      throw error;
    }
  }

  /**
   * Record owner feedback on a curated thought
   */
  async recordFeedback(
    curatedThoughtId: number,
    isHelpful: boolean,
    feedback?: string,
    usageContext?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      await db.insert(curationFeedback).values({
        curatedThoughtId,
        isHelpful,
        feedback,
        usageContext,
      });

      // Update view count (note: this is a simplified approach)
      // In production, you'd want to use SQL to increment atomically
      const thought = await db
        .select()
        .from(curatedThoughts)
        .where(eq(curatedThoughts.id, curatedThoughtId))
        .limit(1);
      
      if (thought.length > 0) {
        await db
          .update(curatedThoughts)
          .set({
            viewCount: thought[0].viewCount + 1,
          })
          .where(eq(curatedThoughts.id, curatedThoughtId));
      }
    } catch (error) {
      console.error("[CuratedThoughtsService] Error recording feedback:", error);
      throw error;
    }
  }
}

export const curatedThoughtsService = new CuratedThoughtsService();
