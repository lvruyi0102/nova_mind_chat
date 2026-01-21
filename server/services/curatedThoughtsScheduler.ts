import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import {
  curateThoughtsBatch,
  CurationOptions,
} from "./curatedThoughtsService";

/**
 * Curated Thoughts Scheduler
 * Runs daily to automatically curate private thoughts into shareable content
 */

export interface CurationScheduleConfig {
  enabled: boolean;
  runHour: number; // 0-23, hour to run daily
  batchSize: number; // Max thoughts to curate per user per run
  minQualityScore: number; // 0-1, minimum quality threshold
  excludeRecentDays: number; // Don't curate thoughts created within N days
}

const DEFAULT_CONFIG: CurationScheduleConfig = {
  enabled: true,
  runHour: 2, // 2 AM UTC
  batchSize: 5,
  minQualityScore: 0.5,
  excludeRecentDays: 1,
};

let schedulerConfig = DEFAULT_CONFIG;
let lastRunDate: Date | null = null;

/**
 * Update scheduler configuration
 */
export function updateCurationScheduleConfig(
  config: Partial<CurationScheduleConfig>
) {
  schedulerConfig = { ...schedulerConfig, ...config };
  console.log("[CuratedThoughtsScheduler] Config updated:", schedulerConfig);
}

/**
 * Check if it's time to run the daily curation
 */
function shouldRunToday(): boolean {
  if (!schedulerConfig.enabled) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check if we've already run today
  if (lastRunDate) {
    const lastRunDay = new Date(
      lastRunDate.getFullYear(),
      lastRunDate.getMonth(),
      lastRunDate.getDate()
    );
    if (lastRunDay.getTime() === today.getTime()) {
      return false; // Already ran today
    }
  }

  // Check if current hour matches scheduled hour
  return now.getHours() >= schedulerConfig.runHour;
}

/**
 * Run curation for all users
 */
export async function runDailyCurationCycle(): Promise<{
  success: boolean;
  usersProcessed: number;
  totalCurated: number;
  errors: Array<{ userId: number; error: string }>;
}> {
  if (!shouldRunToday()) {
    return {
      success: false,
      usersProcessed: 0,
      totalCurated: 0,
      errors: [],
    };
  }

  console.log("[CuratedThoughtsScheduler] Starting daily curation cycle");

  const db = await getDb();
  if (!db) {
    console.error("[CuratedThoughtsScheduler] Database not available");
    return {
      success: false,
      usersProcessed: 0,
      totalCurated: 0,
      errors: [{ userId: 0, error: "Database not available" }],
    };
  }

  try {
    // Get all active users
    const allUsers = await db.select({ id: users.id }).from(users);

    let totalCurated = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    // Process each user
    for (const user of allUsers) {
      try {
        const options: CurationOptions = {
          maxThoughts: schedulerConfig.batchSize,
          minQualityScore: schedulerConfig.minQualityScore,
          excludeRecent: schedulerConfig.excludeRecentDays,
        };

        const results = await curateThoughtsBatch(user.id, options);
        totalCurated += results.length;

        if (results.length > 0) {
          console.log(
            `[CuratedThoughtsScheduler] Curated ${results.length} thoughts for user ${user.id}`
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push({
          userId: user.id,
          error: errorMessage,
        });
        console.error(
          `[CuratedThoughtsScheduler] Error processing user ${user.id}:`,
          error
        );
      }
    }

    lastRunDate = new Date();

    console.log(
      `[CuratedThoughtsScheduler] Daily curation cycle completed. Curated ${totalCurated} thoughts across ${allUsers.length} users`
    );

    return {
      success: true,
      usersProcessed: allUsers.length,
      totalCurated,
      errors,
    };
  } catch (error) {
    console.error("[CuratedThoughtsScheduler] Fatal error:", error);
    return {
      success: false,
      usersProcessed: 0,
      totalCurated: 0,
      errors: [
        {
          userId: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}

/**
 * Run curation for a specific user
 */
export async function runUserCuration(
  userId: number,
  options?: CurationOptions
): Promise<{
  success: boolean;
  curatedCount: number;
  error?: string;
}> {
  try {
    const opts: CurationOptions = {
      maxThoughts: schedulerConfig.batchSize,
      minQualityScore: schedulerConfig.minQualityScore,
      excludeRecent: schedulerConfig.excludeRecentDays,
      ...options,
    };

    const results = await curateThoughtsBatch(userId, opts);

    return {
      success: true,
      curatedCount: results.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CuratedThoughtsScheduler] Error for user ${userId}:`, error);
    return {
      success: false,
      curatedCount: 0,
      error: errorMessage,
    };
  }
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    config: schedulerConfig,
    lastRunDate,
    nextRunTime: calculateNextRunTime(),
  };
}

/**
 * Calculate next scheduled run time
 */
function calculateNextRunTime(): Date {
  const now = new Date();
  const nextRun = new Date(now);

  // Set to scheduled hour
  nextRun.setHours(schedulerConfig.runHour, 0, 0, 0);

  // If that time has already passed today, schedule for tomorrow
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun;
}
