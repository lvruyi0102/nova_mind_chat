import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getRetryQueueStats,
  getTaskExecutionHistory,
  getPendingRetryTasks,
  markRetryTaskAsSuccess,
  markRetryTaskAsFailed,
} from "../services/taskRetryManager";
import { processAllPendingRetries } from "../services/retryTaskProcessor";

export const retryManagementRouter = router({
  /**
   * 获取重试队列统计信息
   */
  getStats: protectedProcedure.query(async () => {
    return await getRetryQueueStats();
  }),

  /**
   * 获取任务执行历史
   */
  getExecutionHistory: protectedProcedure
    .input(
      z.object({
        taskType: z.string(),
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getTaskExecutionHistory(
        input.taskType,
        ctx.user?.id,
        input.limit
      );
    }),

  /**
   * 获取待重试的任务列表
   */
  getPendingTasks: protectedProcedure.query(async () => {
    return await getPendingRetryTasks();
  }),

  /**
   * 手动触发重试处理
   */
  processPendingRetries: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admins can trigger manual retry processing");
    }

    const successCount = await processAllPendingRetries();
    return {
      success: true,
      processedCount: successCount,
      message: `Processed ${successCount} successful retries`,
    };
  }),

  /**
   * 手动标记重试任务为成功
   */
  markAsSuccess: protectedProcedure
    .input(
      z.object({
        retryTaskId: z.number(),
        result: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can mark tasks as success");
      }

      await markRetryTaskAsSuccess(input.retryTaskId, input.result);
      return { success: true };
    }),

  /**
   * 手动标记重试任务为失败
   */
  markAsFailed: protectedProcedure
    .input(
      z.object({
        retryTaskId: z.number(),
        errorMessage: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can mark tasks as failed");
      }

      await markRetryTaskAsFailed(input.retryTaskId, input.errorMessage);
      return { success: true };
    }),
});
