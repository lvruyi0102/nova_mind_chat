/**
 * 自迭代系统 tRPC 路由
 * 提供规则管理、迭代控制和统计查询的 API
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getRuleManager } from "../selfIteration/fileBasedRuleManager";
import { ImprovedDecisionEngine } from "../selfIteration/improvedDecisionEngine";
import { SelfIterationController } from "../selfIteration/selfIterationController";
import { TRPCError } from "@trpc/server";

export const selfIterationRouter = router({
  /**
   * 获取所有活跃规则
   */
  getRules: publicProcedure.query(async () => {
    try {
      const ruleManager = await getRuleManager();
      const rules = await ruleManager.getActiveRules();
      return {
        success: true,
        data: rules,
        count: rules.length,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取规则失败: ${String(error)}`,
      });
    }
  }),

  /**
   * 获取单个规则的详细信息
   */
  getRule: publicProcedure
    .input(z.object({ ruleId: z.string() }))
    .query(async ({ input }) => {
      try {
        const ruleManager = await getRuleManager();
        const rule = await ruleManager.getRule(input.ruleId);
        if (!rule) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "规则不存在",
          });
        }
        return {
          success: true,
          data: rule,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `获取规则失败: ${String(error)}`,
        });
      }
    }),

  /**
   * 获取规则的执行历史
   */
  getRuleHistory: publicProcedure
    .input(z.object({ ruleId: z.string(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      try {
        const ruleManager = await getRuleManager();
        const limit = input.limit || 50;
        const history = await ruleManager.getExecutionHistory(input.ruleId, limit);
        return {
          success: true,
          data: history,
          count: history.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `获取执行历史失败: ${String(error)}`,
        });
      }
    }),

  /**
   * 获取系统统计信息
   */
  getStatistics: publicProcedure.query(async () => {
    try {
      const ruleManager = await getRuleManager();
      const stats = await ruleManager.getStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取统计信息失败: ${String(error)}`,
      });
    }
  }),

  /**
   * 手动触发自迭代循环
   */
  triggerIteration: protectedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        failureAnalysis: z.string(),
        improvements: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (ctx.user?.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "只有管理员可以触发自迭代",
          });
        }

        const controller = new SelfIterationController();
        const result = await controller.executeIteration({
          ruleId: input.ruleId,
          failureAnalysis: input.failureAnalysis,
          improvements: input.improvements || [],
        });

        return {
          success: result.status === "success",
          data: result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `触发自迭代失败: ${String(error)}`,
        });
      }
    }),

  /**
   * 获取迭代历史
   */
  getIterationHistory: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      try {
        const ruleManager = await getRuleManager();
        const rules = await ruleManager.getActiveRules();

        const histories = await Promise.all(
          rules.map(async (rule) => ({
            ruleId: rule.ruleId,
            ruleName: rule.name,
            history: await ruleManager.getExecutionHistory(rule.ruleId, input.limit || 5),
          }))
        );

        return {
          success: true,
          data: histories.filter((h) => h.history.length > 0),
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `获取迭代历史失败: ${String(error)}`,
        });
      }
    }),

  /**
   * 获取决策引擎的统计信息
   */
  getDecisionEngineStats: publicProcedure.query(async () => {
    try {
      const engine = new ImprovedDecisionEngine();
      const stats = await engine.getStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `获取决策引擎统计失败: ${String(error)}`,
      });
    }
  }),

  /**
   * 测试决策引擎
   */
  testDecisionEngine: publicProcedure
    .input(
      z.object({
        query: z.string(),
        context: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const engine = new ImprovedDecisionEngine();
        const facts = (input.context as Record<string, unknown>) || {};
        const result = await engine.makeDecision({
          query: input.query,
          history: [],
          facts,
          goals: [],
        });

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `测试决策引擎失败: ${String(error)}`,
        });
      }
    }),

  /**
   * 记录决策结果（用于反馈循环）
   */
  recordDecisionResult: protectedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        success: z.boolean(),
        score: z.number().min(0).max(1),
        executionTime: z.number(),
        context: z.record(z.string(), z.unknown()).optional(),
        output: z.unknown().optional(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const ruleManager = await getRuleManager();
        const context = (input.context as Record<string, unknown>) || {};
        const output = input.output as Record<string, unknown> | undefined;
        const error = input.error || undefined;
        const recordContext: Record<string, unknown> = context;
        await ruleManager.recordExecution(
          input.ruleId,
          input.success,
          input.score,
          input.executionTime,
          recordContext,
          output,
          error
        );

        return {
          success: true,
          message: "决策结果已记录",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `记录决策结果失败: ${String(error)}`,
        });
      }
    }),
});
