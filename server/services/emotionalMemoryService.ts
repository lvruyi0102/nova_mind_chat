/**
 * Emotional Memory Service
 * Manages Nova's emotional memories and insights about users
 * Enables Nova to understand and remember emotional contexts, patterns, and important moments
 */

import { getDb } from "../db";
import { emotionalMemory, EmotionalMemory, InsertEmotionalMemory } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

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
        .where(eq(emotionalMemory.userId, userId))
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
  async getMemories(userId: number): Promise<EmotionalMemory[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(emotionalMemory)
        .where(eq(emotionalMemory.userId, userId));
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to retrieve memories:", error);
      return [];
    }
  }

  /**
   * Get most significant emotional memories (by intensity)
   */
  async getSignificantMemories(userId: number, limit: number = 10): Promise<EmotionalMemory[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(emotionalMemory)
        .where(eq(emotionalMemory.userId, userId))
        .orderBy(desc(emotionalMemory.intensity))
        .limit(limit);
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to get significant memories:", error);
      return [];
    }
  }

  /**
   * Reinforce an emotional memory (update last reinforced time)
   */
  async reinforceMemory(memoryId: number): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) return false;

      await db
        .update(emotionalMemory)
        .set({
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
   * Get emotional patterns for a user (emotion frequency)
   */
  async getEmotionalPatterns(userId: number): Promise<Record<string, number>> {
    try {
      const memories = await this.getMemories(userId);
      
      const patterns: Record<string, number> = {};
      memories.forEach((memory) => {
        const emotion = memory.emotion;
        patterns[emotion] = (patterns[emotion] || 0) + 1;
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

      const memories = await db
        .select()
        .from(emotionalMemory)
        .where(eq(emotionalMemory.userId, userId));

      // Filter by intensity in memory since Drizzle ORM comparison is complex
      return memories.filter(m => m.intensity >= minIntensity);
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
- Most significant emotions: ${memories.map(m => m.emotion).join(", ")}
- Emotional patterns: ${Object.entries(patterns)
        .map(([emotion, count]) => `${emotion} (${count} times)`)
        .join(", ")}
- Total emotional memories: ${Object.values(patterns).reduce((a, b) => a + b, 0)}
      `.trim();

      return summary;
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to generate summary:", error);
      return "Unable to generate emotional summary.";
    }
  }

  /**
   * Get recent emotional memories
   */
  async getRecentMemories(userId: number, limit: number = 5): Promise<EmotionalMemory[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db
        .select()
        .from(emotionalMemory)
        .where(eq(emotionalMemory.userId, userId))
        .orderBy(desc(emotionalMemory.lastReinforced))
        .limit(limit);
    } catch (error) {
      console.error("[EmotionalMemoryService] Failed to get recent memories:", error);
      return [];
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
