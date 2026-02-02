import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  concepts,
  conceptRelations,
  episodicMemories,
  selfQuestions,
  reflectionLog,
  cognitiveLog,
} from "../../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Get complete cognitive state aggregating all data sources
 * This mirrors the previous getCognitiveState implementation
 */
export async function getCompleteCognitiveState() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cognitive state: database not available");
    return null;
  }

  try {
    // Query all data sources
    const [
      totalConcepts,
      totalRelations,
      totalMemories,
      pendingQuestions,
      recentReflections,
      recentGrowth,
    ] = await Promise.all([
      db.select().from(concepts),
      db.select().from(conceptRelations),
      db.select().from(episodicMemories),
      db.select().from(selfQuestions).where(eq(selfQuestions.status, "pending")),
      db
        .select()
        .from(reflectionLog)
        .orderBy(desc(reflectionLog.createdAt))
        .limit(3),
      db
        .select()
        .from(cognitiveLog)
        .orderBy(desc(cognitiveLog.createdAt))
        .limit(5),
    ]);

    return {
      conceptCount: totalConcepts.length,
      relationCount: totalRelations.length,
      memoryCount: totalMemories.length,
      pendingQuestionCount: pendingQuestions.length,
      recentReflections: recentReflections.map((r) => ({
        type: r.reflectionType,
        content: r.content,
        timestamp: r.createdAt,
      })),
      recentGrowth: recentGrowth.map((g) => ({
        stage: g.stage,
        event: g.eventType,
        description: g.description,
        timestamp: g.createdAt,
      })),
    };
  } catch (error) {
    console.error("[Database] Failed to get cognitive state:", error);
    return null;
  }
}

/**
 * Get concept details
 */
export async function getConceptDetails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(concepts)
      .orderBy(desc(concepts.lastReinforced))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get concepts:", error);
    return [];
  }
}

/**
 * Get relation details
 */
export async function getRelationDetails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(conceptRelations)
      .orderBy(desc(conceptRelations.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get relations:", error);
    return [];
  }
}

/**
 * Get memory details
 */
export async function getMemoryDetails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(episodicMemories)
      .orderBy(desc(episodicMemories.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get memories:", error);
    return [];
  }
}

/**
 * Get pending questions
 */
export async function getPendingQuestions(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(selfQuestions)
      .where(eq(selfQuestions.status, "pending"))
      .orderBy(desc(selfQuestions.priority), desc(selfQuestions.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get questions:", error);
    return [];
  }
}

/**
 * Get reflection history
 */
export async function getReflectionHistory(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(reflectionLog)
      .orderBy(desc(reflectionLog.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get reflections:", error);
    return [];
  }
}

/**
 * Get growth events
 */
export async function getGrowthEvents(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(cognitiveLog)
      .orderBy(desc(cognitiveLog.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("[Database] Failed to get growth events:", error);
    return [];
  }
}
