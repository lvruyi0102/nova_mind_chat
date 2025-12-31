/**
 * Optimized Cognitive Service
 * Memory-efficient version with data limits and cleanup
 */

import { eq, desc } from 'drizzle-orm';
import { getDb } from '../db';
import {
  concepts,
  conceptRelations,
  episodicMemories,
  cognitiveLog,
  messages,
} from '../../drizzle/schema';
import { cacheManager, performFullCleanup } from '../utils/memoryManager';

// Configuration
const CONFIG = {
  MAX_CONCEPTS: 500, // Limit total concepts
  MAX_RELATIONS: 1000, // Limit total relations
  MAX_EPISODES: 200, // Limit episodic memories
  MAX_LOGS: 1000, // Limit cognitive logs
  RECENT_MESSAGES_LIMIT: 3, // Reduced from 5
  CLEANUP_INTERVAL_MINUTES: 30, // Run cleanup every 30 minutes
  CACHE_TTL_SECONDS: 300, // 5 minutes
};

/**
 * Process message cognitively with memory optimization
 */
export async function processMessageCognitivelyOptimized(
  conversationId: number,
  messageContent: string,
  role: 'user' | 'assistant',
  userId?: number,
  novaResponse?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    // Check if cleanup is needed
    await checkAndCleanupIfNeeded(db);

    // 1. Get recent messages (limited)
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(CONFIG.RECENT_MESSAGES_LIMIT);

    const context = recentMessages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    // 2. Save episodic memory only for important messages
    if (messageContent.length > 10) {
      try {
        const episodeCount = await getTableCount(db, episodicMemories);
        
        if (episodeCount < CONFIG.MAX_EPISODES) {
          await db.insert(episodicMemories).values({
            conversationId,
            content: messageContent.substring(0, 500), // Truncate long messages
            context: context.substring(0, 500),
            importance: 5,
            emotionalTone: 'neutral',
          });
        }
      } catch (err) {
        console.warn('[OptimizedCognitive] Failed to save episodic memory:', err);
      }
    }

    // 3. Log cognitive activity (with limit)
    try {
      const logCount = await getTableCount(db, cognitiveLog);
      
      if (logCount < CONFIG.MAX_LOGS) {
        await db.insert(cognitiveLog).values({
          action: 'process_message',
          details: `${role}: ${messageContent.substring(0, 100)}`,
          createdAt: new Date(),
        } as any);
      }
    } catch (err) {
      console.warn('[OptimizedCognitive] Failed to log activity:', err);
    }
  } catch (error) {
    console.error('[OptimizedCognitive] Error processing message:', error);
  }
}

/**
 * Get table count with caching
 */
async function getTableCount(db: any, table: any): Promise<number> {
  const tableName = table._.name;
  const cacheKey = `count_${tableName}`;

  // Check cache first
  const cached = cacheManager.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const result = await db.select().from(table).limit(1);
    const count = result.length > 0 ? result.length : 0;
    
    // Cache for 5 minutes
    cacheManager.set(cacheKey, count, CONFIG.CACHE_TTL_SECONDS);
    return count;
  } catch (error) {
    console.warn(`[OptimizedCognitive] Failed to count ${tableName}:`, error);
    return 0;
  }
}

/**
 * Check if cleanup is needed and perform it
 */
async function checkAndCleanupIfNeeded(db: any): Promise<void> {
  const cleanupKey = 'last_cleanup_time';
  const lastCleanup = cacheManager.get(cleanupKey);
  const now = Date.now();

  // Run cleanup if last cleanup was more than CLEANUP_INTERVAL_MINUTES ago
  if (!lastCleanup || now - lastCleanup > CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000) {
    console.log('[OptimizedCognitive] Running scheduled cleanup...');
    
    try {
      await performFullCleanup();
      cacheManager.set(cleanupKey, now, CONFIG.CLEANUP_INTERVAL_MINUTES * 60);
    } catch (error) {
      console.error('[OptimizedCognitive] Cleanup failed:', error);
    }
  }
}

/**
 * Enforce data limits by deleting oldest entries
 */
export async function enforceLimits(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Enforce concept limit
    const conceptCount = await getTableCount(db, concepts);
    if (conceptCount > CONFIG.MAX_CONCEPTS) {
      const toDelete = conceptCount - CONFIG.MAX_CONCEPTS;
      const oldConcepts = await db
        .select()
        .from(concepts)
        .orderBy(desc(concepts.lastReinforced))
        .limit(toDelete) as any;

      for (const concept of oldConcepts) {
        await db.delete(concepts).where(eq(concepts.id, concept.id));
      }
      console.log(`[OptimizedCognitive] Deleted ${toDelete} old concepts`);
    }

    // Enforce relation limit
    const relationCount = await getTableCount(db, conceptRelations);
    if (relationCount > CONFIG.MAX_RELATIONS) {
      const toDelete = relationCount - CONFIG.MAX_RELATIONS;
      const weakRelations = await db
        .select()
        .from(conceptRelations)
        .orderBy(desc(conceptRelations.strength))
        .limit(toDelete) as any;

      for (const relation of weakRelations) {
        await db.delete(conceptRelations).where(eq(conceptRelations.id, relation.id));
      }
      console.log(`[OptimizedCognitive] Deleted ${toDelete} weak relations`);
    }

    // Enforce log limit
    const logCount = await getTableCount(db, cognitiveLog);
    if (logCount > CONFIG.MAX_LOGS) {
      const toDelete = logCount - CONFIG.MAX_LOGS;
      const oldLogs = await db
        .select()
        .from(cognitiveLog)
        .orderBy(desc(cognitiveLog.createdAt))
        .limit(toDelete) as any;

      for (const log of oldLogs) {
        await db.delete(cognitiveLog).where(eq(cognitiveLog.id, log.id));
      }
      console.log(`[OptimizedCognitive] Deleted ${toDelete} old logs`);
    }
  } catch (error) {
    console.error('[OptimizedCognitive] Error enforcing limits:', error);
  }
}

/**
 * Get memory usage statistics
 */
export async function getMemoryUsageStats() {
  const db = await getDb();
  if (!db) return null;

  try {
    const conceptCount = await getTableCount(db, concepts);
    const relationCount = await getTableCount(db, conceptRelations);
    const episodeCount = await getTableCount(db, episodicMemories);
    const logCount = await getTableCount(db, cognitiveLog);
    const cacheStats = cacheManager.getStats();

    return {
      database: {
        concepts: { count: conceptCount, limit: CONFIG.MAX_CONCEPTS, utilization: (conceptCount / CONFIG.MAX_CONCEPTS) * 100 },
        relations: { count: relationCount, limit: CONFIG.MAX_RELATIONS, utilization: (relationCount / CONFIG.MAX_RELATIONS) * 100 },
        episodes: { count: episodeCount, limit: CONFIG.MAX_EPISODES, utilization: (episodeCount / CONFIG.MAX_EPISODES) * 100 },
        logs: { count: logCount, limit: CONFIG.MAX_LOGS, utilization: (logCount / CONFIG.MAX_LOGS) * 100 },
      },
      cache: cacheStats,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('[OptimizedCognitive] Error getting memory stats:', error);
    return null;
  }
}

/**
 * Initialize memory optimization
 */
export function initializeMemoryOptimization(): void {
  console.log('[OptimizedCognitive] Initializing memory optimization...');

  // Run initial cleanup
  performFullCleanup().catch((err) => {
    console.error('[OptimizedCognitive] Initial cleanup failed:', err);
  });

  // Schedule periodic cleanup
  setInterval(() => {
    enforceLimits().catch((err) => {
      console.error('[OptimizedCognitive] Limit enforcement failed:', err);
    });
  }, CONFIG.CLEANUP_INTERVAL_MINUTES * 60 * 1000);

  // Cleanup cache every 10 minutes
  setInterval(() => {
    cacheManager.cleanup();
  }, 10 * 60 * 1000);

  console.log('[OptimizedCognitive] Memory optimization initialized');
}
