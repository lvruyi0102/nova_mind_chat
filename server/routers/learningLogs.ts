/**
 * 学习日志 tRPC 路由
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getLearningLogs,
  getLearningLogDetail,
  searchLearningLogs,
  getLearningStats,
  getRecentLearningLogs,
} from "../services/learningLogService";

export const learningLogsRouter = router({
  /**
   * 获取学习日志列表
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().positive().default(20),
        offset: z.number().int().nonnegative().default(0),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        learningType: z.enum(["local", "monthly_llm"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const logs = await getLearningLogs(ctx.user.id, {
        limit: input.limit,
        offset: input.offset,
        startDate: input.startDate,
        endDate: input.endDate,
        learningType: input.learningType as "local" | "monthly_llm" | undefined,
      });

      return {
        success: !!logs,
        data: logs || [],
        total: logs?.length || 0,
      };
    }),

  /**
   * 获取学习日志详情
   */
  getDetail: protectedProcedure
    .input(z.object({ logId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const log = await getLearningLogDetail(input.logId);

      return {
        success: !!log,
        data: log,
      };
    }),

  /**
   * 搜索学习日志
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().default(20),
        offset: z.number().int().nonnegative().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      const logs = await searchLearningLogs(ctx.user.id, input.query, {
        limit: input.limit,
        offset: input.offset,
      });

      return {
        success: !!logs,
        data: logs || [],
        total: logs?.length || 0,
      };
    }),

  /**
   * 获取学习统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getLearningStats(ctx.user.id);

    return {
      success: !!stats,
      data: stats,
    };
  }),

  /**
   * 获取最近的学习日志
   */
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().int().positive().default(5) }))
    .query(async ({ input, ctx }) => {
      const logs = await getRecentLearningLogs(ctx.user.id, input.limit);

      return {
        success: !!logs,
        data: logs || [],
      };
    }),
});
