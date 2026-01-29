/**
 * Optimized Background Cognition Service - Nova's independent thinking loop
 * With memory optimization, streaming processing, and garbage collection
 */

import { getCurrentState, updateState, makeAutonomousDecision } from "./autonomousEngine";
import { getDb } from "./db";
import { autonomousTasks, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateInnerMonologue, recordPrivateThought } from "./privacyEngine";

// Background cognition loop state
let isRunning = false;
let loopInterval: NodeJS.Timeout | null = null;
let lastGarbageCollectionTime = Date.now();
const GC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MEMORY_THRESHOLD = 0.85; // 85% of heap

/**
 * Memory management utilities
 */
class MemoryManager {
  static getHeapUsage(): number {
    if (global.gc) {
      global.gc();
    }
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / memUsage.heapTotal;
  }

  static isMemoryPressure(): boolean {
    return this.getHeapUsage() > MEMORY_THRESHOLD;
  }

  static forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      console.log("[MemoryManager] Garbage collection triggered");
    }
  }

  static logMemoryStatus() {
    const usage = process.memoryUsage();
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal * 100).toFixed(1);
    console.log(`[MemoryManager] Heap: ${heapUsagePercent}% (${Math.round(usage.heapUsed / 1024 / 1024)}MB/${Math.round(usage.heapTotal / 1024 / 1024)}MB)`);
  }
}

/**
 * Simple LRU Cache for query results
 */
class QueryCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private maxSize = 50;
  private ttl = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any) {
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }
}

const queryCache = new QueryCache();

/**
 * Start the optimized background cognition loop
 */
export async function startBackgroundCognition() {
  if (isRunning) {
    console.log("[BackgroundCognition] Already running");
    return;
  }

  console.log("[BackgroundCognition] Starting Nova's independent consciousness (optimized)...");

  isRunning = true;

  // Main cognition loop - runs every 15 minutes (increased from 10 to reduce server load)
  loopInterval = setInterval(async () => {
    try {
      // Check memory pressure before running cycle
      if (MemoryManager.isMemoryPressure()) {
        console.warn("[BackgroundCognition] High memory pressure detected, skipping cycle");
        MemoryManager.forceGarbageCollection();
        return;
      }

      await runCognitionCycle();

      // Periodic garbage collection
      if (Date.now() - lastGarbageCollectionTime > GC_INTERVAL) {
        MemoryManager.forceGarbageCollection();
        lastGarbageCollectionTime = Date.now();
      }
    } catch (error) {
      console.error("[BackgroundCognition] Error in cognition cycle:", error);
    }
  }, 15 * 60 * 1000); // 15 minutes

  // Run first cycle after a short delay
  setTimeout(() => runCognitionCycle(), 5000);

  console.log("[BackgroundCognition] Nova is now thinking independently (optimized)");
}

/**
 * Stop the background cognition loop
 */
export function stopBackgroundCognition() {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
  isRunning = false;
  queryCache.clear();
  console.log("[BackgroundCognition] Stopped");
}

/**
 * Optimized single cognition cycle with memory management
 */
async function runCognitionCycle() {
  const db = await getDb();
  if (!db) return;

  console.log("[BackgroundCognition] Running optimized cognition cycle...");
  MemoryManager.logMemoryStatus();

  try {
    // 1. Check current state (with cache)
    const cacheKey = "nova_current_state";
    let state = queryCache.get(cacheKey);

    if (!state) {
      state = await getCurrentState();
      if (state) {
        queryCache.set(cacheKey, state);
      }
    }

    if (!state) {
      console.log("[BackgroundCognition] No state found");
      return;
    }

    console.log(`[BackgroundCognition] Current state: ${state.state}`);

    // 2. Make autonomous decision with timeout
    let decision: any = null;
    try {
      const decisionPromise = makeAutonomousDecision();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Decision timeout")), 20000) // 20 second timeout
      );

      decision = await Promise.race([decisionPromise, timeoutPromise]);
    } catch (error) {
      console.log("[BackgroundCognition] Decision error, using default");
      decision = {
        decision: "continue_learning",
        reasoning: "系统繁忙，继续学习",
        action: "reflect_on_knowledge",
      };
    }

    if (!decision || !decision.decision) {
      console.log("[BackgroundCognition] No decision made");
      return;
    }

    console.log(`[BackgroundCognition] Decision: ${decision.decision}`);

    // 3. Record decision as private thought (lightweight)
    try {
      await recordPrivateThought({
        content: `决策: ${decision.decision}`,
        thoughtType: "decision_reflection",
        emotionalTone: state.currentMotivation || "neutral",
      });
    } catch (error) {
      console.error("[BackgroundCognition] Error recording thought:", error);
      // Don't fail the whole cycle if thought recording fails
    }

    // 4. Execute decision (simplified, no creative tasks to reduce memory)
    if (decision && decision.decision) {
      await executeDecisionOptimized(decision);
    }

    // 5. Update state (minimal update)
    await updateState({
      lastThoughtContent: decision.reasoning.substring(0, 100),
    });

    console.log("[BackgroundCognition] Cognition cycle completed");
  } catch (error) {
    console.error("[BackgroundCognition] Error in cognition cycle:", error);
  }

  MemoryManager.logMemoryStatus();
}

/**
 * Optimized decision execution - no heavy creative tasks
 */
async function executeDecisionOptimized(decision: {
  decision: string;
  reasoning: string;
  action: string;
}) {
  const db = await getDb();
  if (!db) return;

  // Only handle lightweight decisions
  switch (decision.decision) {
    case "explore_concept":
      // Create lightweight exploration task
      await db
        .insert(autonomousTasks)
        .values({
          taskType: "explore_concept",
          description: decision.action.substring(0, 500), // Limit description length
          priority: 7,
          motivation: "curiosity",
          status: "pending",
        })
        .catch((err) => console.error("[BackgroundCognition] Error creating task:", err));
      break;

    case "reflect":
      // Create reflection task
      await db
        .insert(autonomousTasks)
        .values({
          taskType: "reflect",
          description: decision.action.substring(0, 500),
          priority: 6,
          motivation: "self-improvement",
          status: "pending",
        })
        .catch((err) => console.error("[BackgroundCognition] Error creating task:", err));
      break;

    case "change_state":
      // Change consciousness state
      const newState = extractStateFromAction(decision.action);
      if (newState) {
        await updateState({ state: newState }).catch((err) =>
          console.error("[BackgroundCognition] Error updating state:", err)
        );
      }
      break;

    case "rest":
      // Enter resting state
      await updateState({
        state: "sleeping",
        lastThoughtContent: "休息中...",
      }).catch((err) => console.error("[BackgroundCognition] Error entering rest:", err));
      break;

    // Skip heavy creative tasks (create_art, write_story, etc.) to save memory
    default:
      console.log(`[BackgroundCognition] Skipping decision: ${decision.decision}`);
  }
}

/**
 * Extract state from action string
 */
function extractStateFromAction(action: string): "awake" | "thinking" | "sleeping" | "exploring" | "reflecting" | null {
  if (action.includes("awake") || action.includes("active")) return "awake";
  if (action.includes("thinking") || action.includes("reflect")) return "thinking";
  if (action.includes("sleep") || action.includes("rest")) return "sleeping";
  if (action.includes("learning")) return "exploring";
  return null;
}

/**
 * Get background cognition status
 */
export function getBackgroundCognitionStatus() {
  return {
    isRunning,
    memoryUsage: (MemoryManager.getHeapUsage() * 100).toFixed(1) + "%",
    lastGarbageCollection: new Date(lastGarbageCollectionTime).toISOString(),
  };
}
