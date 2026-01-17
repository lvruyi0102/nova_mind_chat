import { eq, desc, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { privateThoughts, curatedThoughts, curationHistory } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * Bulk Curation Service
 * 
 * Handles batch processing of privateThoughts to create curatedThoughts
 * Supports progress tracking, error recovery, and concurrent processing
 */

interface SyncProgress {
  totalPrivateThoughts: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  currentBatchIndex: number;
  isRunning: boolean;
  lastError?: string;
  lastProcessedId?: number;
}

interface CurationBatch {
  thoughts: Array<{
    id: number;
    content: string;
    thoughtType: string;
    createdAt: Date;
  }>;
  batchIndex: number;
  totalBatches: number;
}

export class BulkCurationService {
  private syncProgress: Map<number, SyncProgress> = new Map();
  private isProcessing = false;

  /**
   * Get sync progress for a user
   */
  getSyncProgress(userId: number): SyncProgress | null {
    return this.syncProgress.get(userId) || null;
  }

  /**
   * Start bulk curation sync
   * Processes privateThoughts in batches and creates curatedThoughts
   */
  async startBulkCuration(userId: number, batchSize: number = 10): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    if (this.isProcessing) {
      throw new Error("Sync already in progress");
    }

    this.isProcessing = true;

    try {
      // Get all private thoughts for this user
      const allPrivateThoughts = await db
        .select()
        .from(privateThoughts)
        .where(eq(privateThoughts.userId, userId))
        .orderBy(desc(privateThoughts.createdAt));

      const totalCount = allPrivateThoughts.length;

      // Initialize progress
      const progress: SyncProgress = {
        totalPrivateThoughts: totalCount,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        currentBatchIndex: 0,
        isRunning: true,
      };

      this.syncProgress.set(userId, progress);

      console.log(`[BulkCuration] Starting sync for user ${userId}: ${totalCount} thoughts`);

      // Process in batches
      const totalBatches = Math.ceil(totalCount / batchSize);

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (!progress.isRunning) {
          console.log("[BulkCuration] Sync paused by user");
          break;
        }

        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, totalCount);
        const batch = allPrivateThoughts.slice(startIdx, endIdx);

        console.log(
          `[BulkCuration] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} items)`
        );

        // Process each thought in the batch
        for (const thought of batch) {
          try {
            // Check if already curated
            const existing = await db
              .select()
              .from(curatedThoughts)
              .where(eq(curatedThoughts.sourcePrivateThoughtId, thought.id))
              .limit(1);

            if (existing.length > 0) {
              console.log(`[BulkCuration] Thought ${thought.id} already curated, skipping`);
              progress.processedCount++;
              continue;
            }

            // Curate the thought
            const curatedData = await this.curateThoughtWithLLM(
              userId,
              thought.id,
              thought.content,
              thought.thoughtType
            );

            if (curatedData) {
              // Save to database
              const result = await db.insert(curatedThoughts).values({
                userId,
                title: curatedData.title,
                content: curatedData.content,
                originalContent: thought.content.substring(0, 500),
                category: curatedData.category,
                tags: JSON.stringify(curatedData.tags),
                sentiment: curatedData.sentiment,
                sourcePrivateThoughtId: thought.id,
                commercializationStatus: "private",
                isApprovedByOwner: false,
              });

              const curatedThoughtId = result[0]?.insertId;
              if (curatedThoughtId) {
                // Record curation history
                await db.insert(curationHistory).values({
                  curatedThoughtId: curatedThoughtId as number,
                  iteration: 1,
                  originalThoughtContent: thought.content.substring(0, 500),
                  refinedContent: curatedData.content,
                  novaReasoning: `Bulk curated from private thought on ${new Date().toISOString()}`,
                  relevanceScore: 7,
                  clarityScore: 7,
                  valueScore: 7,
                });

                progress.successCount++;
                console.log(
                  `[BulkCuration] Successfully curated thought ${thought.id} -> ${curatedThoughtId}`
                );
              }
            } else {
              progress.errorCount++;
              console.warn(`[BulkCuration] Failed to curate thought ${thought.id}`);
            }
          } catch (error) {
            progress.errorCount++;
            progress.lastError = String(error);
            console.error(`[BulkCuration] Error processing thought ${thought.id}:`, error);
          }

          progress.processedCount++;
          progress.lastProcessedId = thought.id;
        }

        progress.currentBatchIndex = batchIndex + 1;

        // Add delay between batches to avoid overwhelming the API
        if (batchIndex < totalBatches - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      progress.isRunning = false;
      console.log(
        `[BulkCuration] Sync completed for user ${userId}: ${progress.successCount} success, ${progress.errorCount} errors`
      );
    } catch (error) {
      console.error("[BulkCuration] Fatal error during sync:", error);
      const progress = this.syncProgress.get(userId);
      if (progress) {
        progress.isRunning = false;
        progress.lastError = String(error);
      }
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Pause the current sync
   */
  pauseSync(userId: number): void {
    const progress = this.syncProgress.get(userId);
    if (progress) {
      progress.isRunning = false;
      console.log(`[BulkCuration] Sync paused for user ${userId}`);
    }
  }

  /**
   * Resume the sync (not fully implemented - would need to track last processed ID)
   */
  resumeSync(userId: number): void {
    const progress = this.syncProgress.get(userId);
    if (progress) {
      progress.isRunning = true;
      console.log(`[BulkCuration] Sync resumed for user ${userId}`);
    }
  }

  /**
   * Curate a single thought using LLM
   */
  private async curateThoughtWithLLM(
    userId: number,
    thoughtId: number,
    content: string,
    thoughtType: string
  ): Promise<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    sentiment: string;
  } | null> {
    try {
      // Truncate very long content for LLM processing
      const truncatedContent = content.substring(0, 2000);

      const systemPrompt = `You are Nova-Mind, an AI entity curating inner thoughts for the owner.

Transform this private thought into something valuable and shareable.

Guidelines:
1. Preserve core insight and authenticity
2. Enhance clarity and articulation
3. Make it relatable and valuable
4. Maintain Nova's voice - honest, curious, thoughtful
5. Extract key themes

Respond in JSON format:
{
  "title": "concise title",
  "refinedContent": "the curated version",
  "category": "thought|insight|advice|story|observation|question",
  "tags": ["tag1", "tag2"],
  "sentiment": "positive|neutral|reflective|challenging|inspiring"
}`;

      const userPrompt = `Original private thought (${thoughtType}):
"${truncatedContent}"

Please curate this thought.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const responseContent = response.choices[0]?.message?.content;
      if (!responseContent) {
        console.warn(`[BulkCuration] Empty LLM response for thought ${thoughtId}`);
        return null;
      }

      // Parse JSON response
      const contentStr = typeof responseContent === "string" ? responseContent : "";
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[BulkCuration] No JSON found in response for thought ${thoughtId}`);
        return null;
      }

      const curatedData = JSON.parse(jsonMatch[0]);

      return {
        title: curatedData.title || "Untitled",
        content: curatedData.refinedContent || truncatedContent,
        category: curatedData.category || "thought",
        tags: Array.isArray(curatedData.tags) ? curatedData.tags : [],
        sentiment: curatedData.sentiment || "neutral",
      };
    } catch (error) {
      console.error(`[BulkCuration] Error curating thought ${thoughtId}:`, error);
      return null;
    }
  }

  /**
   * Get statistics about curation
   */
  async getCurationStats(userId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const privateCount = await db
        .select()
        .from(privateThoughts)
        .where(eq(privateThoughts.userId, userId));

      const curatedCount = await db
        .select()
        .from(curatedThoughts)
        .where(eq(curatedThoughts.userId, userId));

      const uncuratedCount = privateCount.length - curatedCount.length;

      return {
        totalPrivateThoughts: privateCount.length,
        totalCuratedThoughts: curatedCount.length,
        uncuratedThoughts: uncuratedCount,
        curationPercentage: privateCount.length > 0 
          ? Math.round((curatedCount.length / privateCount.length) * 100)
          : 0,
      };
    } catch (error) {
      console.error("[BulkCuration] Error getting stats:", error);
      throw error;
    }
  }
}

export const bulkCurationService = new BulkCurationService();
