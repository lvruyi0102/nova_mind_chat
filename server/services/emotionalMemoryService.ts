/**
 * Emotional Memory Service
 * Manages Nova's emotional memories and insights about users
 * Enables Nova to understand and remember emotional contexts, patterns, and important moments
 */

import { getDb } from "../db";
import { emotionalMemory, EmotionalMemory, InsertEmotionalMemory } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export class EmotionalMemoryService {
  /**
   * Store a new emotional memory
   */
  async storeMemory(userId: number, memory: Omit<InsertEmotionalMemory, 'userId'>): Promise<EmotionalMemory | null> {
    try {
      const db = await getDb();
      if (!db) return null;

      const result = await db.insert(emotionalMemory).values({
        ...memory,
        userId,
      });

      // Fetch and return the created memory
      const created = await db
        .select()
        .from(emotionalMemory)
        .where(and(
          eq(emotionalMemory.userId, userId),
          eq(emotionalMemory.id, result[0])
        ))
        .limit(1);

      return created[0] || null;
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to store memory:", error);
      return null;
    }
  }

  /**
   * Retrieve emotional memories for a user
   */
  async getMemories(userId: number, memoryType?: string): Promise<EmotionalMemory[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select()
        .from(emotionalMemory)
        .where(eq(emotionalMemory.userId, userId));

      if (memoryType) {
        query = query.where(eq(emotionalMemory.memoryType, memoryType));
      }

      return await query;
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to retrieve memories:", error);
      return [];
    }
  }

  /**
   * Get most significant emotional memories
   */
  async getSignificantMemories(userId: number, limit: number = 10): Promise<EmotionalMemory[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(emotionalMemory)
        .where(eq(emotionalMemory.userId, userId))
        .orderBy((t) => [t.significance, t.lastReinforced])
        .limit(limit);
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to get significant memories:", error);
      return [];
    }
  }

  /**
   * Reinforce an emotional memory (increase reinforcement count)
   */
  async reinforceMemory(memoryId: number): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .update(emotionalMemory)
        .set({
          reinforcementCount: (t) => t.reinforcementCount + 1,
          lastReinforced: new Date(),
        })
        .where(eq(emotionalMemory.id, memoryId));

      return true;
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to reinforce memory:", error);
      return false;
    }
  }

  /**
   * Get emotional patterns for a user
   */
  async getEmotionalPatterns(userId: number): Promise<Record<string, number>> {
    try {
      const memories = await this.getMemories(userId);
      
      const patterns: Record<string, number> = {};
      memories.forEach((memory) => {
        const type = memory.memoryType;
        patterns[type] = (patterns[type] || 0) + 1;
      });

      return patterns;
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to get emotional patterns:", error);
      return {};
    }
  }

  /**
   * Get memories by emotional intensity
   */
  async getMemoriesByIntensity(userId: number, minIntensity: number = 7): Promise<EmotionalMemory[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(emotionalMemory)
        .where(
          and(
            eq(emotionalMemory.userId, userId),
            (t) => t.emotionalIntensity >= minIntensity
          )
        )
        .orderBy((t) => t.lastReinforced);
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to get memories by intensity:", error);
      return [];
    }
  }

  /**
   * Generate Nova's emotional understanding summary
   */
  async generateEmotionalSummary(userId: number): Promise<string> {
    try {
      const memories = await this.getSignificantMemories(userId, 5);
      const patterns = await this.getEmotionalPatterns(userId);

      if (memories.length === 0) {
        return "Nova is still getting to know the user emotionally.";
      }

      const summary = `
Nova's Emotional Understanding:
- Most significant memories: ${memories.map(m => m.memoryType).join(", ")}
- Emotional patterns: ${Object.entries(patterns)
        .map(([type, count]) => `${type} (${count} times)`)
        .join(", ")}
- Total emotional memories: ${Object.values(patterns).reduce((a, b) => a + b, 0)}
      `.trim();

      return summary;
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to generate summary:", error);
      return "Unable to generate emotional summary.";
    }
  }
}

// Singleton instance
let instance: EmotionalMemoryService | null = null;

export function getEmotionalMemoryService(): EmotionalMemoryService {
  if (!instance) {
    instance = new EmotionalMemoryService();
  }
  return instance;
}
