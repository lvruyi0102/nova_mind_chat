import { getDb } from "../db";
import { taskExecutionHistory, taskRetryQueue } from "../../drizzle/schema";
import { eq, and, lt, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * 任务重试管理器
 * 负责处理失败任务的重试逻辑，使用指数退避策略
 */

export interface TaskRetryConfig {
  maxRetries: number; // 最大重试次数
  initialDelayMs: number; // 初始延迟（毫秒）
  maxDelayMs: number; // 最大延迟（毫秒）
  backoffMultiplier: number; // 退避倍数
}

// 默认重试配置
const DEFAULT_RETRY_CONFIG: TaskRetryConfig = {
  maxRetries: 3, // 最多重试 3 次
  initialDelayMs: 30 * 1000, // 首次重试延迟 30 秒
  maxDelayMs: 10 * 60 * 1000, // 最大延迟 10 分钟
  backoffMultiplier: 2, // 每次延迟翻倍
};

/**
 * 计算重试延迟时间（指数退避）
 */
export function calculateRetryDelay(
  retryCount: number,
  config: TaskRetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * 记录任务执行历史
 */
export async function recordTaskExecution(data: {
  taskType: string;
  userId?: number;
  status: "success" | "failed" | "pending";
  result?: string;
  errorMessage?: string;
  executionTimeMs?: number;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return null;
  }

  try {
    const result = await db.insert(taskExecutionHistory).values({
      taskType: data.taskType,
      userId: data.userId,
      status: data.status,
      result: data.result,
      errorMessage: data.errorMessage,
      executionTimeMs: data.executionTimeMs,
      executedAt: new Date(),
    });

    return result;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to record task execution:", error);
    throw error;
  }
}

/**
 * 添加任务到重试队列
 */
export async function enqueueTaskForRetry(data: {
  taskType: string;
  userId?: number;
  retryCount: number;
  maxRetries: number;
  errorMessage: string;
  taskData?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return null;
  }

  try {
    // 计算下次重试时间
    const delayMs = calculateRetryDelay(data.retryCount);
    const nextRetryAt = new Date(Date.now() + delayMs);

    const result = await db.insert(taskRetryQueue).values({
      taskType: data.taskType,
      userId: data.userId,
      retryCount: data.retryCount,
      maxRetries: data.maxRetries,
      errorMessage: data.errorMessage,
      taskData: data.taskData ? JSON.stringify(data.taskData) : null,
      nextRetryAt: nextRetryAt,
      status: "pending",
      createdAt: new Date(),
    });

    console.log(
      `[TaskRetryManager] Task queued for retry: ${data.taskType} (retry ${data.retryCount}/${data.maxRetries}), next retry at ${nextRetryAt.toISOString()}`
    );

    return result;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to enqueue task for retry:", error);
    throw error;
  }
}

/**
 * 获取待重试的任务
 */
export async function getPendingRetryTasks() {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return [];
  }

  try {
    const now = new Date();
    const tasks = await db
      .select()
      .from(taskRetryQueue)
      .where(
        and(
          eq(taskRetryQueue.status, "pending" as any),
          lt(taskRetryQueue.nextRetryAt, now)
        )
      )
      .orderBy(taskRetryQueue.nextRetryAt)
      .limit(10); // 一次最多获取 10 个待重试任务

    return tasks;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to get pending retry tasks:", error);
    return [];
  }
}

/**
 * 标记重试任务为成功
 */
export async function markRetryTaskAsSuccess(retryTaskId: number, result?: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return null;
  }

  try {
    const updateResult = await db
      .update(taskRetryQueue)
      .set({
        status: "success",
        result: result,
        completedAt: new Date(),
      })
      .where(eq(taskRetryQueue.id, retryTaskId));

    console.log(`[TaskRetryManager] Retry task ${retryTaskId} marked as success`);
    return updateResult;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to mark retry task as success:", error);
    throw error;
  }
}

/**
 * 标记重试任务为失败
 */
export async function markRetryTaskAsFailed(
  retryTaskId: number,
  errorMessage: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return null;
  }

  try {
    const updateResult = await db
      .update(taskRetryQueue)
      .set({
        status: "failed",
        errorMessage: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(taskRetryQueue.id, retryTaskId));

    console.log(`[TaskRetryManager] Retry task ${retryTaskId} marked as failed`);
    return updateResult;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to mark retry task as failed:", error);
    throw error;
  }
}

/**
 * 获取任务执行历史
 */
export async function getTaskExecutionHistory(
  taskType: string,
  userId?: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return [];
  }

  try {
    const whereConditions = [eq(taskExecutionHistory.taskType, taskType)];
    if (userId) {
      whereConditions.push(eq(taskExecutionHistory.userId, userId));
    }

    const history = await db
      .select()
      .from(taskExecutionHistory)
      .where(and(...whereConditions))
      .orderBy(desc(taskExecutionHistory.executedAt))
      .limit(limit);

    return history;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to get task execution history:", error);
    return [];
  }
}

/**
 * 获取重试队列统计
 */
export async function getRetryQueueStats() {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return {
      pendingCount: 0,
      successCount: 0,
      failedCount: 0,
    };
  }

  try {
    const pending = await db
      .select()
      .from(taskRetryQueue)
      .where(eq(taskRetryQueue.status, "pending"));

    const success = await db
      .select()
      .from(taskRetryQueue)
      .where(eq(taskRetryQueue.status, "success"));

    const failed = await db
      .select()
      .from(taskRetryQueue)
      .where(eq(taskRetryQueue.status, "failed"));

    return {
      pendingCount: pending.length,
      successCount: success.length,
      failedCount: failed.length,
    };
  } catch (error) {
    console.error("[TaskRetryManager] Failed to get retry queue stats:", error);
    return {
      pendingCount: 0,
      successCount: 0,
      failedCount: 0,
    };
  }
}

/**
 * 清理已完成的重试任务（超过 30 天）
 */
export async function cleanupOldRetryTasks(daysOld: number = 30) {
  const db = await getDb();
  if (!db) {
    console.warn("[TaskRetryManager] Database not available");
    return null;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db
      .delete(taskRetryQueue)
      .where(
        and(
          lt(taskRetryQueue.completedAt, cutoffDate),
          eq(taskRetryQueue.status, "success")
        )
      );

    console.log(
      `[TaskRetryManager] Cleaned up old retry tasks (older than ${daysOld} days)`
    );
    return result;
  } catch (error) {
    console.error("[TaskRetryManager] Failed to cleanup old retry tasks:", error);
    throw error;
  }
}

/**
 * 执行待重试的任务
 */
export async function executeRetryTask(
  retryTask: any,
  taskExecutor: (taskData: any) => Promise<string>
) {
  const startTime = Date.now();

  try {
    console.log(
      `[TaskRetryManager] Executing retry task: ${retryTask.taskType} (retry ${retryTask.retryCount}/${retryTask.maxRetries})`
    );

    // 解析任务数据
    const taskData = retryTask.taskData ? JSON.parse(retryTask.taskData) : {};

    // 执行任务
    const result = await taskExecutor(taskData);

    // 记录成功
    const executionTimeMs = Date.now() - startTime;
    await recordTaskExecution({
      taskType: retryTask.taskType,
      userId: retryTask.userId,
      status: "success",
      result: result,
      executionTimeMs: executionTimeMs,
    });

    // 标记重试任务为成功
    await markRetryTaskAsSuccess(retryTask.id, result);

    console.log(
      `[TaskRetryManager] Retry task succeeded: ${retryTask.taskType} (${executionTimeMs}ms)`
    );

    return { success: true, result };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[TaskRetryManager] Retry task failed: ${retryTask.taskType}`,
      error
    );

    // 记录失败
    await recordTaskExecution({
      taskType: retryTask.taskType,
      userId: retryTask.userId,
      status: "failed",
      errorMessage: errorMessage,
      executionTimeMs: executionTimeMs,
    });

    // 检查是否还有重试次数
    if (retryTask.retryCount < retryTask.maxRetries) {
      // 加入重试队列
      await enqueueTaskForRetry({
        taskType: retryTask.taskType,
        userId: retryTask.userId,
        retryCount: retryTask.retryCount + 1,
        maxRetries: retryTask.maxRetries,
        errorMessage: errorMessage,
        taskData: retryTask.taskData ? JSON.parse(retryTask.taskData) : undefined,
      });

      console.log(
        `[TaskRetryManager] Task re-queued for retry: ${retryTask.taskType}`
      );
    } else {
      // 已达到最大重试次数，标记为失败
      await markRetryTaskAsFailed(retryTask.id, errorMessage);

      console.error(
        `[TaskRetryManager] Task failed after ${retryTask.maxRetries} retries: ${retryTask.taskType}`
      );
    }

    return { success: false, error: errorMessage };
  }
}
