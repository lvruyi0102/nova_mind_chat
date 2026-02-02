import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { cognitiveStates, recentThoughts } from "../../drizzle/schema";
import { ENV } from "../_core/env";

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
 * Get or create cognitive state for a user
 */
export async function getCognitiveState(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cognitive state: database not available");
    return null;
  }

  try {
    const result = await db
      .select()
      .from(cognitiveStates)
      .where(eq(cognitiveStates.userId, userId))
      .limit(1);

    if (result.length > 0) {
      return result[0];
    }

    // Create default cognitive state if not  try {
    await db.insert(cognitiveStates).values({
      userId,
      thoughtCount: 0,
      learningRate: "0.5",
      emotionalState: "neutral",
      activeProcesses: 0,
      memoryUsage: "0.5",
      confidenceLevel: "0.5",
    });

    const newResult = await db
      .select()
      .from(cognitiveStates)
      .where(eq(cognitiveStates.userId, userId))
      .limit(1);

    return newResult[0] || null;
  } catch (error) {
    console.error("[Database] Failed to get cognitive state:", error);
    return null;
  }
}

/**
 * Update cognitive state metrics
 */
export async function updateCognitiveState(
  userId: number,
  updates: {
    thoughtCount?: number;
    learningRate?: number;
    emotionalState?: string;
    activeProcesses?: number;
    memoryUsage?: number;
    confidenceLevel?: number;
  }
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update cognitive state: database not available");
    return null;
  }

  try {
    const updateData: any = {};
    if (updates.thoughtCount !== undefined) updateData.thoughtCount = updates.thoughtCount;
    if (updates.learningRate !== undefined) updateData.learningRate = updates.learningRate.toString();
    if (updates.emotionalState !== undefined) updateData.emotionalState = updates.emotionalState;
    if (updates.activeProcesses !== undefined) updateData.activeProcesses = updates.activeProcesses;
    if (updates.memoryUsage !== undefined) updateData.memoryUsage = updates.memoryUsage.toString();
    if (updates.confidenceLevel !== undefined) updateData.confidenceLevel = updates.confidenceLevel.toString();

    await db
      .update(cognitiveStates)
      .set(updateData)
      .where(eq(cognitiveStates.userId, userId));

    return await getCognitiveState(userId);
  } catch (error) {
    console.error("[Database] Failed to update cognitive state:", error);
    return null;
  }
}

/**
 * Get recent thoughts for a user
 */
export async function getRecentThoughts(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get recent thoughts: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(recentThoughts)
      .where(eq(recentThoughts.userId, userId))
      .orderBy(desc(recentThoughts.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Database] Failed to get recent thoughts:", error);
    return [];
  }
}

/**
 * Add a recent thought
 */
export async function addRecentThought(
  userId: number,
  content: string,
  confidence: number = 0.5,
  category: string = "reflection"
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add recent thought: database not available");
    return null;
  }

  try {
    const result = await db.insert(recentThoughts).values({
      userId,
      content,
      confidence: confidence.toString(),
      category: category || "reflection",
    });

    // Also increment thought count in cognitive state
    const state = await getCognitiveState(userId);
    if (state) {
      await updateCognitiveState(userId, {
        thoughtCount: state.thoughtCount + 1,
      });
    }

    return result;
  } catch (error) {
    console.error("[Database] Failed to add recent thought:", error);
    return null;
  }
}

/**
 * Get cognitive statistics for a user
 */
export async function getCognitiveStatistics(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get cognitive statistics: database not available");
    return null;
  }

  try {
    const state = await getCognitiveState(userId);
    const thoughts = await getRecentThoughts(userId, 5);

    return {
      state,
      recentThoughts: thoughts,
      thoughtCount: state?.thoughtCount || 0,
      learningRate: parseFloat(state?.learningRate?.toString() || "0.5"),
      emotionalState: state?.emotionalState || "neutral",
      activeProcesses: state?.activeProcesses || 0,
      memoryUsage: parseFloat(state?.memoryUsage?.toString() || "0.5"),
      confidenceLevel: parseFloat(state?.confidenceLevel?.toString() || "0.5"),
    };
  } catch (error) {
    console.error("[Database] Failed to get cognitive statistics:", error);
    return null;
  }
}
