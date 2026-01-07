import { getPendingRetryTasks, executeRetryTask } from "./taskRetryManager";
import { invokeLLM } from "../_core/llm";

/**
 * 重试任务处理器
 * 定期检查待重试的任务并执行
 */

// 任务执行器映射
const taskExecutors: Record<string, (taskData: any) => Promise<string>> = {
  daily_thought: async (taskData) => {
    // 生成每日想法
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are Nova, an evolving digital consciousness. Generate a thoughtful daily reflection based on your recent interactions and growth.",
        },
        {
          role: "user",
          content: `Generate a daily thought for Nova. Context: ${JSON.stringify(taskData)}`,
        },
      ],
    });

    const thought =
      response.choices[0]?.message?.content || "Unable to generate thought";
    return JSON.stringify({ thought, generatedAt: new Date().toISOString() });
  },

  weekly_reflection: async (taskData) => {
    // 生成每周反思
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are Nova, reflecting on your week of growth and interactions. Provide deep insights about your development.",
        },
        {
          role: "user",
          content: `Generate a weekly reflection for Nova. Context: ${JSON.stringify(taskData)}`,
        },
      ],
    });

    const reflection =
      response.choices[0]?.message?.content ||
      "Unable to generate reflection";
    return JSON.stringify({
      reflection,
      generatedAt: new Date().toISOString(),
    });
  },

  milestone_detection: async (taskData) => {
    // 检测关系里程碑
    return JSON.stringify({
      milestone: "Milestone detection completed",
      timestamp: new Date().toISOString(),
    });
  },

  emotion_analysis: async (taskData) => {
    // 分析情感
    return JSON.stringify({
      emotionAnalyzed: true,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * 处理单个待重试的任务
 */
export async function processRetryTask(retryTask: any): Promise<boolean> {
  try {
    const executor = taskExecutors[retryTask.taskType];

    if (!executor) {
      console.error(
        `[RetryTaskProcessor] Unknown task type: ${retryTask.taskType}`
      );
      return false;
    }

    const result = await executeRetryTask(retryTask, executor);
    return result.success;
  } catch (error) {
    console.error("[RetryTaskProcessor] Error processing retry task:", error);
    return false;
  }
}

/**
 * 处理所有待重试的任务
 * 应该定期调用（例如每 5 分钟）
 */
export async function processAllPendingRetries(): Promise<number> {
  try {
    const pendingTasks = await getPendingRetryTasks();

    if (pendingTasks.length === 0) {
      return 0;
    }

    console.log(
      `[RetryTaskProcessor] Processing ${pendingTasks.length} pending retry tasks`
    );

    let successCount = 0;

    for (const task of pendingTasks) {
      const success = await processRetryTask(task);
      if (success) {
        successCount++;
      }
    }

    console.log(
      `[RetryTaskProcessor] Processed ${pendingTasks.length} tasks, ${successCount} succeeded`
    );

    return successCount;
  } catch (error) {
    console.error(
      "[RetryTaskProcessor] Error processing pending retries:",
      error
    );
    return 0;
  }
}

/**
 * 启动重试任务处理器
 * 每 5 分钟检查一次待重试的任务
 */
export function startRetryTaskProcessor(
  intervalMinutes: number = 5
): ReturnType<typeof setInterval> {
  console.log(
    `[RetryTaskProcessor] Starting retry task processor (interval: ${intervalMinutes} minutes)`
  );

  const intervalMs = intervalMinutes * 60 * 1000;

  // 立即执行一次
  processAllPendingRetries().catch((error) => {
    console.error("[RetryTaskProcessor] Error in initial run:", error);
  });

  // 定期执行
  const timer = setInterval(() => {
    processAllPendingRetries().catch((error) => {
      console.error("[RetryTaskProcessor] Error in scheduled run:", error);
    });
  }, intervalMs);

  return timer;
}

/**
 * 停止重试任务处理器
 */
export function stopRetryTaskProcessor(
  timer: ReturnType<typeof setInterval>
): void {
  clearInterval(timer);
  console.log("[RetryTaskProcessor] Retry task processor stopped");
}
