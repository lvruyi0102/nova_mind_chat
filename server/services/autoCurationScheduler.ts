import { eq, gte, desc } from "drizzle-orm";
import { getDb } from "../db";
import { privateThoughts, curatedThoughts, curationHistory } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * Auto Curation Scheduler
 * 
 * Automatically curates new privateThoughts on a daily schedule
 * Runs at a configured time each day and processes thoughts from the past 24 hours
 */

interface SchedulerConfig {
  enabled: boolean;
  runTime: string; // HH:MM format, e.g., "02:00"
  batchSize: number; // How many thoughts to process per run
  lookbackHours: number; // How many hours back to look for new thoughts
  maxConcurrent: number; // Max concurrent LLM calls
}

interface SchedulerStatus {
  enabled: boolean;
  lastRunTime?: Date;
  lastRunStatus: "success" | "failed" | "pending";
  lastRunMessage?: string;
  nextRunTime?: Date;
  thoughtsProcessed: number;
  successCount: number;
  errorCount: number;
}

export class AutoCurationScheduler {
  private config: SchedulerConfig;
  private status: SchedulerStatus;
  private isRunning = false;
  private schedulerInterval?: NodeJS.Timeout;

  constructor(config: Partial<SchedulerConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      runTime: config.runTime ?? "02:00", // Default: 2 AM
      batchSize: config.batchSize ?? 10,
      lookbackHours: config.lookbackHours ?? 24,
      maxConcurrent: config.maxConcurrent ?? 3,
    };

    this.status = {
      enabled: this.config.enabled,
      lastRunStatus: "pending",
      thoughtsProcessed: 0,
      successCount: 0,
      errorCount: 0,
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.schedulerInterval) {
      console.log("[AutoCurationScheduler] Scheduler already running");
      return;
    }

    console.log(
      `[AutoCurationScheduler] Starting scheduler - will run daily at ${this.config.runTime}`
    );

    // Check every minute if it's time to run
    this.schedulerInterval = setInterval(() => {
      this.checkAndRun();
    }, 60000); // Check every minute

    // Also run immediately on startup (optional)
    this.checkAndRun();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
      console.log("[AutoCurationScheduler] Scheduler stopped");
    }
  }

  /**
   * Check if it's time to run and execute if needed
   */
  private async checkAndRun(): Promise<void> {
    if (!this.config.enabled || this.isRunning) {
      return;
    }

    const now = new Date();
    const [hour, minute] = this.config.runTime.split(":").map(Number);

    // Check if current time matches the scheduled time (within 1 minute window)
    if (now.getHours() === hour && now.getMinutes() === minute) {
      // Prevent running multiple times in the same minute
      if (this.status.lastRunTime && this.getMinutesDiff(now, this.status.lastRunTime) < 2) {
        return;
      }

      console.log(`[AutoCurationScheduler] Time to run! Starting auto-curation...`);
      await this.run();
    }
  }

  /**
   * Execute the curation process
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      console.warn("[AutoCurationScheduler] Curation already in progress");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      console.log("[AutoCurationScheduler] Starting auto-curation run");

      // Get all users (for now, just process user 1 - the owner)
      // In a multi-user system, you'd iterate through all users
      const userId = 1;

      // Get new privateThoughts from the past N hours that haven't been curated yet
      const lookbackDate = new Date(Date.now() - this.config.lookbackHours * 60 * 60 * 1000);

      const newPrivateThoughts = await db
        .select()
        .from(privateThoughts)
        .where(
          eq(privateThoughts.userId, userId)
          // Only get thoughts created after lookback time
          // Note: Drizzle doesn't have a direct gte for dates in this context, so we filter in memory
        )
        .orderBy(desc(privateThoughts.createdAt))
        .limit(this.config.batchSize * 2); // Get extra to account for already-curated ones

      // Filter for new thoughts only
      const newThoughts = newPrivateThoughts.filter((t) => t.createdAt > lookbackDate);

      if (newThoughts.length === 0) {
        console.log("[AutoCurationScheduler] No new thoughts to curate");
        this.status.lastRunStatus = "success";
        this.status.lastRunMessage = "No new thoughts to process";
        this.status.lastRunTime = new Date();
        this.status.thoughtsProcessed = 0;
        return;
      }

      console.log(
        `[AutoCurationScheduler] Found ${newThoughts.length} new thoughts to curate`
      );

      // Check which ones are already curated
      const curatedIds = await db
        .select({ id: curatedThoughts.sourcePrivateThoughtId })
        .from(curatedThoughts)
        .where(eq(curatedThoughts.userId, userId));

      const curatedIdSet = new Set(
        curatedIds.map((row) => row.id).filter((id) => id !== null) as number[]
      );

      const thoughtsToCurate = newThoughts
        .filter((t) => !curatedIdSet.has(t.id))
        .slice(0, this.config.batchSize);

      if (thoughtsToCurate.length === 0) {
        console.log("[AutoCurationScheduler] All new thoughts already curated");
        this.status.lastRunStatus = "success";
        this.status.lastRunMessage = "All new thoughts already curated";
        this.status.lastRunTime = new Date();
        this.status.thoughtsProcessed = 0;
        return;
      }

      console.log(`[AutoCurationScheduler] Curating ${thoughtsToCurate.length} thoughts`);

      // Process thoughts with controlled concurrency
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < thoughtsToCurate.length; i += this.config.maxConcurrent) {
        const batch = thoughtsToCurate.slice(i, i + this.config.maxConcurrent);

        const results = await Promise.allSettled(
          batch.map((thought) =>
            this.curateAndSave(userId, thought.id, thought.content, thought.thoughtType)
          )
        );

        for (const result of results) {
          if (result.status === "fulfilled" && result.value) {
            successCount++;
          } else {
            errorCount++;
            if (result.status === "rejected") {
              console.error(
                "[AutoCurationScheduler] Error curating thought:",
                result.reason
              );
            }
          }
        }

        // Add delay between batches
        if (i + this.config.maxConcurrent < thoughtsToCurate.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(
        `[AutoCurationScheduler] Run completed: ${successCount} success, ${errorCount} errors (${duration}s)`
      );

      this.status.lastRunStatus = "success";
      this.status.lastRunTime = new Date();
      this.status.thoughtsProcessed = thoughtsToCurate.length;
      this.status.successCount += successCount;
      this.status.errorCount += errorCount;
      this.status.lastRunMessage = `Processed ${thoughtsToCurate.length} thoughts: ${successCount} success, ${errorCount} errors`;
    } catch (error) {
      console.error("[AutoCurationScheduler] Fatal error:", error);
      this.status.lastRunStatus = "failed";
      this.status.lastRunTime = new Date();
      this.status.lastRunMessage = String(error);
    } finally {
      this.isRunning = false;
      this.calculateNextRunTime();
    }
  }

  /**
   * Curate a single thought and save it
   */
  private async curateAndSave(
    userId: number,
    thoughtId: number,
    content: string,
    thoughtType: string
  ): Promise<boolean> {
    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Truncate content for LLM
      const truncatedContent = content.substring(0, 2000);

      const systemPrompt = `You are Nova-Mind, curating inner thoughts for the owner.

Transform this private thought into something valuable and shareable.

Respond in JSON:
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
        console.warn(`[AutoCurationScheduler] Empty response for thought ${thoughtId}`);
        return false;
      }

      const contentStr = typeof responseContent === "string" ? responseContent : "";
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn(`[AutoCurationScheduler] No JSON in response for thought ${thoughtId}`);
        return false;
      }

      const curatedData = JSON.parse(jsonMatch[0]);

      // Save to database
      const result = await db.insert(curatedThoughts).values({
        userId: userId as number,
        title: curatedData.title || "Untitled",
        content: curatedData.refinedContent || truncatedContent,
        summary: truncatedContent,
        sourceThoughtId: thoughtId,
        keywords: curatedData.tags ? (Array.isArray(curatedData.tags) ? curatedData.tags.join(",") : curatedData.tags) : "",
        topics: curatedData.category || "thought",
        qualityScore: 0.75,
        relevanceScore: 0.80,
        noveltyScore: 0.70,
        commercializationLevel: "internal",
        isPublished: false,
      });

      const curatedThoughtId = (result as any)?.[0]?.insertId || (result as any)?.insertId;
      if (curatedThoughtId) {
        // Record history
        await db.insert(curationHistory).values({
          curatedThoughtId: curatedThoughtId as number,
          iteration: 1,
          originalThoughtContent: truncatedContent,
          refinedContent: curatedData.refinedContent || truncatedContent,
          novaReasoning: `Auto-curated at ${new Date().toISOString()}`,
          relevanceScore: 7,
          clarityScore: 7,
          valueScore: 7,
        });

        console.log(
          `[AutoCurationScheduler] Successfully curated thought ${thoughtId} -> ${curatedThoughtId}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[AutoCurationScheduler] Error curating thought ${thoughtId}:`, error);
      return false;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): SchedulerStatus {
    return { ...this.status };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[AutoCurationScheduler] Configuration updated:", this.config);

    if (config.enabled !== undefined) {
      this.status.enabled = config.enabled;
      if (config.enabled && !this.schedulerInterval) {
        this.start();
      } else if (!config.enabled && this.schedulerInterval) {
        this.stop();
      }
    }

    this.calculateNextRunTime();
  }

  /**
   * Calculate next run time
   */
  private calculateNextRunTime(): void {
    const now = new Date();
    const [hour, minute] = this.config.runTime.split(":").map(Number);

    const nextRun = new Date(now);
    nextRun.setHours(hour, minute, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    this.status.nextRunTime = nextRun;
  }

  /**
   * Get minutes difference between two dates
   */
  private getMinutesDiff(date1: Date, date2: Date): number {
    return Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60));
  }
}

// Create and export singleton instance
export const autoCurationScheduler = new AutoCurationScheduler({
  enabled: true,
  runTime: "02:00", // 2 AM daily
  batchSize: 10,
  lookbackHours: 24,
  maxConcurrent: 3,
});
