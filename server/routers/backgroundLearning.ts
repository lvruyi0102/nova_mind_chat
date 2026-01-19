/**
 * 后台学习 tRPC 路由
 * 提供 Nova 的后台主动学习相关的 API 端点
 */

import { protectedProcedure, router } from "../_core/trpc";
import { executeBackgroundLearningCycle, getLearningStats } from "../services/novaBackgroundLearner";

export const backgroundLearningRouter = router({
  /**
   * 获取学习统计信息
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await getLearningStats(ctx.user.id);
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("[BackgroundLearning] Failed to get stats:", error);
      return {
        success: false,
        error: "Failed to get learning stats",
      };
    }
  }),

  /**
   * 手动触发一次学习循环
   */
  triggerLearning: protectedProcedure
    .input((input: unknown) => {
      // 简单的输入验证
      if (typeof input === "object" && input !== null) {
        const obj = input as Record<string, unknown>;
        return {
          sampleCount: typeof obj.sampleCount === "number" ? obj.sampleCount : 5,
          strategy: typeof obj.strategy === "string" ? obj.strategy : "random",
          depth: typeof obj.depth === "string" ? obj.depth : "medium",
        };
      }
      return {
        sampleCount: 5,
        strategy: "random",
        depth: "medium",
      };
    })
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await executeBackgroundLearningCycle(ctx.user.id, {
          sampleCount: input.sampleCount,
          strategy: input.strategy as "random" | "recent" | "important" | "clustered",
          depth: input.depth as "shallow" | "medium" | "deep",
        });

        if (result) {
          return {
            success: true,
            message: "Learning cycle completed successfully",
            data: result,
          };
        } else {
          return {
            success: false,
            error: "Learning cycle failed",
          };
        }
      } catch (error) {
        console.error("[BackgroundLearning] Failed to trigger learning:", error);
        return {
          success: false,
          error: "Failed to trigger learning cycle",
        };
      }
    }),
});
