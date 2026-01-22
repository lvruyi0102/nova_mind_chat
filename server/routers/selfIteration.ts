/**
 * Self-Iteration tRPC Router
 * 暴露自我迭代框架的接口
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getSelfIterationFramework } from "../services/selfIterationFramework";
import { TRPCError } from "@trpc/server";

const framework = getSelfIterationFramework();

export const selfIterationRouter = router({
  /**
   * 获取当前迭代进度
   */
  getProgress: protectedProcedure.query(({ ctx }) => {
    try {
      const progress = framework.getIterationProgress();
      return {
        success: true,
        data: progress,
      };
    } catch (error) {
      console.error("[SelfIterationRouter] Error getting progress:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get iteration progress",
      });
    }
  }),

  /**
   * 收集用户反馈
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        targetId: z.number(),
        targetType: z.enum(["thought", "learning", "decision", "response"]),
        feedbackType: z.enum(["positive", "negative", "neutral", "correction"]),
        rating: z.number().min(1).max(5),
        comment: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        const feedback = framework.collectUserFeedback({
          userId: ctx.user.id,
          targetId: input.targetId,
          targetType: input.targetType,
          feedbackType: input.feedbackType,
          rating: input.rating,
          comment: input.comment,
        });

        return {
          success: true,
          data: feedback,
        };
      } catch (error) {
        console.error("[SelfIterationRouter] Error submitting feedback:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to submit feedback",
        });
      }
    }),

  /**
   * 执行自我评估
   */
  performAssessment: protectedProcedure
    .input(
      z.object({
        learningMetrics: z.record(z.any()),
        knowledgeMetrics: z.record(z.any()),
        decisionMetrics: z.record(z.any()),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        const assessment = framework.performSelfAssessment(
          [], // 使用收集的反馈
          input.learningMetrics,
          input.knowledgeMetrics,
          input.decisionMetrics
        );

        return {
          success: true,
          data: assessment,
        };
      } catch (error) {
        console.error("[SelfIterationRouter] Error performing assessment:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to perform assessment",
        });
      }
    }),

  /**
   * 检测知识冲突
   */
  detectConflicts: protectedProcedure
    .input(
      z.object({
        concepts: z.record(z.any()),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        const conceptsMap = new Map(Object.entries(input.concepts));
        const conflicts = framework.detectKnowledgeConflicts(conceptsMap);

        return {
          success: true,
          data: conflicts,
        };
      } catch (error) {
        console.error("[SelfIterationRouter] Error detecting conflicts:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to detect conflicts",
        });
      }
    }),

  /**
   * 识别过时知识
   */
  identifyObsolete: protectedProcedure
    .input(
      z.object({
        concepts: z.record(z.any()),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        const conceptsMap = new Map(Object.entries(input.concepts));
        const obsolete = framework.identifyObsoleteKnowledge(conceptsMap);

        return {
          success: true,
          data: obsolete,
        };
      } catch (error) {
        console.error("[SelfIterationRouter] Error identifying obsolete knowledge:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to identify obsolete knowledge",
        });
      }
    }),

  /**
   * 生成迭代决策
   */
  generateDecisions: protectedProcedure
    .input(
      z.object({
        assessment: z.record(z.any()),
        conflicts: z.array(z.record(z.any())),
        obsolete: z.array(z.record(z.any())),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        // 类型转换（简化版）
        const assessment = input.assessment as any;
        const conflicts = input.conflicts as any[];
        const obsolete = input.obsolete as any[];

        const decisions = framework.generateIterationDecisions(
          assessment,
          conflicts,
          obsolete
        );

        return {
          success: true,
          data: decisions,
        };
      } catch (error) {
        console.error("[SelfIterationRouter] Error generating decisions:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate decisions",
        });
      }
    }),

  /**
   * 创建改进计划
   */
  createPlan: protectedProcedure
    .input(
      z.object({
        decision: z.record(z.any()),
      })
    )
    .mutation(({ ctx, input }) => {
      try {
        const decision = input.decision as any;
        const plan = framework.createImprovementPlan(decision);

        return {
          success: true,
          data: plan,
        };
      } catch (error) {
        console.error("[SelfIterationRouter] Error creating plan:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create improvement plan",
        });
      }
    }),

  /**
   * 获取完整的迭代报告
   */
  getFullReport: protectedProcedure.query(({ ctx }) => {
    try {
      const progress = framework.getIterationProgress();

      return {
        success: true,
        data: {
          progress,
          timestamp: new Date(),
          userId: ctx.user.id,
        },
      };
    } catch (error) {
      console.error("[SelfIterationRouter] Error getting full report:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get full report",
      });
    }
  }),
});

export type SelfIterationRouter = typeof selfIterationRouter;
