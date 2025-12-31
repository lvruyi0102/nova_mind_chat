/**
 * Memory Manager - Handles memory optimization and garbage collection
 * Prevents memory leaks and manages data lifecycle
 */

import { eq, lt } from 'drizzle-orm';
import { getDb } from '../db';
import {
  cognitiveLog,
  episodicMemories,
  conceptRelations,
  concepts,
} from '../../drizzle/schema';

interface MemoryStats {
  totalConcepts: number;
  totalRelations: number;
  totalLogs: number;
  totalEpisodes: number;
  timestamp: Date;
}

/**
 * Clean up old cognitive logs (older than 7 days)
 */
export async function cleanOldCognitiveLogs(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Delete old logs
    await db
      .delete(cognitiveLog)
      .where(lt(cognitiveLog.createdAt, sevenDaysAgo));

    console.log('[MemoryManager] Cleaned old cognitive logs');
    return 1;
  } catch (error) {
    console.error('[MemoryManager] Error cleaning cognitive logs:', error);
    return 0;
  }
}

/**
 * Archive old episodic memories (older than 30 days)
 */
export async function archiveOldEpisodes(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete old episodes
    await db
      .delete(episodicMemories)
      .where(lt(episodicMemories.createdAt, thirtyDaysAgo));

    console.log('[MemoryManager] Archived old episodic memories');
    return 1;
  } catch (error) {
    console.error('[MemoryManager] Error archiving episodes:', error);
    return 0;
  }
}

/**
 * Clean up weak concept relations (strength < 3)
 */
export async function cleanWeakRelations(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    // Delete weak relations
    await db
      .delete(conceptRelations)
      .where(lt(conceptRelations.strength, 3));

    console.log('[MemoryManager] Cleaned weak concept relations');
    return 1;
  } catch (error) {
    console.error('[MemoryManager] Error cleaning weak relations:', error);
    return 0;
  }
}

/**
 * Consolidate duplicate or similar concepts
 */
export async function consolidateConcepts(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    let deletedCount = 0;

    // Get all concepts
    const allConcepts = await db.select().from(concepts);

    // Group by similar names (case-insensitive)
    const conceptGroups: Record<string, any[]> = {};
    for (const concept of allConcepts) {
      const key = concept.name.toLowerCase().trim();
      if (!conceptGroups[key]) {
        conceptGroups[key] = [];
      }
      conceptGroups[key].push(concept);
    }

    // Merge duplicates
    for (const key in conceptGroups) {
      const group = conceptGroups[key];
      if (group.length > 1) {
        // Keep the one with highest confidence
        const sorted = group.sort((a: any, b: any) => b.confidence - a.confidence);
        const keeper = sorted[0];

        // Delete others
        for (let i = 1; i < sorted.length; i++) {
          try {
            await db.delete(concepts).where(eq(concepts.id, sorted[i].id));
            deletedCount++;
          } catch (err) {
            console.warn('[MemoryManager] Failed to delete duplicate concept:', err);
          }
        }
      }
    }

    console.log(`[MemoryManager] Consolidated ${deletedCount} duplicate concepts`);
    return deletedCount;
  } catch (error) {
    console.error('[MemoryManager] Error consolidating concepts:', error);
    return 0;
  }
}

/**
 * Get current memory statistics
 */
export async function getMemoryStats(): Promise<MemoryStats | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get all records to count them
    const allConcepts = await db.select().from(concepts);
    const allRelations = await db.select().from(conceptRelations);
    const allLogs = await db.select().from(cognitiveLog);
    const allEpisodes = await db.select().from(episodicMemories);

    return {
      totalConcepts: allConcepts.length,
      totalRelations: allRelations.length,
      totalLogs: allLogs.length,
      totalEpisodes: allEpisodes.length,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[MemoryManager] Error getting memory stats:', error);
    return null;
  }
}

/**
 * Perform full memory cleanup
 */
export async function performFullCleanup(): Promise<MemoryStats | null> {
  console.log('[MemoryManager] Starting full memory cleanup...');

  try {
    const statsBefore = await getMemoryStats();

    // Execute cleanup operations
    await cleanOldCognitiveLogs();
    await archiveOldEpisodes();
    await cleanWeakRelations();
    await consolidateConcepts();

    const statsAfter = await getMemoryStats();

    if (statsAfter && statsBefore) {
      console.log('[MemoryManager] Cleanup complete:');
      console.log(`  Concepts: ${statsBefore.totalConcepts} -> ${statsAfter.totalConcepts}`);
      console.log(`  Relations: ${statsBefore.totalRelations} -> ${statsAfter.totalRelations}`);
      console.log(`  Logs: ${statsBefore.totalLogs} -> ${statsAfter.totalLogs}`);
      console.log(`  Episodes: ${statsBefore.totalEpisodes} -> ${statsAfter.totalEpisodes}`);
    }

    return statsAfter;
  } catch (error) {
    console.error('[MemoryManager] Error during full cleanup:', error);
    return null;
  }
}

/**
 * Schedule periodic memory cleanup
 */
export function scheduleMemoryCleanup(intervalMinutes: number = 60): NodeJS.Timeout {
  console.log(`[MemoryManager] Scheduling memory cleanup every ${intervalMinutes} minutes`);

  return setInterval(() => {
    performFullCleanup().catch((err) => {
      console.error('[MemoryManager] Scheduled cleanup failed:', err);
    });
  }, intervalMinutes * 60 * 1000);
}

/**
 * Cache manager for in-memory caching with TTL
 */
export const cacheManager = {
  cache: new Map<string, { value: any; expiry: number }>(),

  set(key: string, value: any, ttlSeconds: number = 300) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  },

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  },

  clear() {
    this.cache.clear();
  },

  cleanup() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiry) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach((key) => this.cache.delete(key));
  },

  getStats() {
    return {
      size: this.cache.size,
      maxSize: 1000,
      utilizationPercent: (this.cache.size / 1000) * 100,
    };
  },
};
