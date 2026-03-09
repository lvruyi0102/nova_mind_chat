import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  concepts,
  conceptRelations,
  episodicMemories,
  selfQuestions,
  reflectionLog,
  cognitiveLog,
  privateThoughts,
  messages,
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
 * Optimized to reduce memory usage by using COUNT queries instead of SELECT *
 */
export async function getCompleteCognitiveState() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cognitive state: database not available");
    return {
      conceptCount: 0,
      relationCount: 0,
      memoryCount: 0,
      pendingQuestionCount: 0,
      recentReflections: [],
      recentGrowth: [],
    };
  }

  try {
    // Use COUNT queries for counts to minimize memory usage
    const countResults = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(concepts),
      db.select({ count: sql<number>`COUNT(*)` }).from(conceptRelations),
      db.select({ count: sql<number>`COUNT(*)` }).from(episodicMemories),
      db.select({ count: sql<number>`COUNT(*)` }).from(privateThoughts),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(selfQuestions)
        .where(eq(selfQuestions.status, "pending")),
    ]);

    const conceptCount = countResults[0][0]?.count || 0;
    const relationCount = countResults[1][0]?.count || 0;
    const episodicMemoryCount = countResults[2][0]?.count || 0;
    const privateThoughtCount = countResults[3][0]?.count || 0;
    const memoryCount = episodicMemoryCount + privateThoughtCount;
    const pendingQuestionCount = countResults[4][0]?.count || 0;

    // Get recent reflections and growth events separately with limits
    const [recentReflections, recentGrowth, latestPrivateThoughts, latestMessages] = await Promise.all([
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
      db
        .select()
        .from(privateThoughts)
        .orderBy(desc(privateThoughts.createdAt))
        .limit(3),
      db
        .select()
        .from(messages)
        .orderBy(desc(messages.createdAt))
        .limit(5),
    ]);

    const reflectionItems = recentReflections.length > 0
      ? recentReflections.map((r) => ({
          type: r.reflectionType,
          content: r.content,
          timestamp: r.createdAt,
        }))
      : latestPrivateThoughts.map((t) => ({
          type: t.thoughtType || "private_thought",
          content: t.content,
          timestamp: t.createdAt,
        }));

    const growthItems = recentGrowth.length > 0
      ? recentGrowth.map((g) => ({
          stage: g.stage,
          event: g.eventType,
          description: g.description,
          timestamp: g.createdAt,
        }))
      : latestMessages.map((m) => ({
          stage: "conversation",
          event: m.role === "assistant" ? "assistant_response" : "user_input",
          description: typeof m.content === "string" ? m.content.slice(0, 120) : "new message",
          timestamp: m.createdAt,
        }));

    return {
      conceptCount,
      relationCount,
      memoryCount,
      pendingQuestionCount,
      recentReflections: reflectionItems,
      recentGrowth: growthItems,
    };
  } catch (error) {
    console.error("[Database] Failed to get cognitive state:", error);
    return {
      conceptCount: 0,
      relationCount: 0,
      memoryCount: 0,
      pendingQuestionCount: 0,
      recentReflections: [],
      recentGrowth: [],
    };
  }
}

/**
 * Get concept details with limit
 */
export async function getConceptDetails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(concepts)
      .orderBy(desc(concepts.lastReinforced))
      .limit(Math.min(limit, 50)); // Cap at 50 to prevent memory issues
  } catch (error) {
    console.error("[Database] Failed to get concepts:", error);
    return [];
  }
}

/**
 * Get relation details with limit
 */
export async function getRelationDetails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(conceptRelations)
      .orderBy(desc(conceptRelations.createdAt))
      .limit(Math.min(limit, 50)); // Cap at 50 to prevent memory issues
  } catch (error) {
    console.error("[Database] Failed to get relations:", error);
    return [];
  }
}

/**
 * Get memory details with limit
 */
export async function getMemoryDetails(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(episodicMemories)
      .orderBy(desc(episodicMemories.createdAt))
      .limit(Math.min(limit, 50)); // Cap at 50 to prevent memory issues
  } catch (error) {
    console.error("[Database] Failed to get memories:", error);
    return [];
  }
}

/**
 * Get pending questions with limit
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
      .limit(Math.min(limit, 50)); // Cap at 50 to prevent memory issues
  } catch (error) {
    console.error("[Database] Failed to get questions:", error);
    return [];
  }
}

/**
 * Get reflection history with limit
 */
export async function getReflectionHistory(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(reflectionLog)
      .orderBy(desc(reflectionLog.createdAt))
      .limit(Math.min(limit, 50)); // Cap at 50 to prevent memory issues
  } catch (error) {
    console.error("[Database] Failed to get reflections:", error);
    return [];
  }
}

/**
 * Get growth events with limit
 */
export async function getGrowthEvents(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(cognitiveLog)
      .orderBy(desc(cognitiveLog.createdAt))
      .limit(Math.min(limit, 50)); // Cap at 50 to prevent memory issues
  } catch (error) {
    console.error("[Database] Failed to get growth events:", error);
    return [];
  }
}
