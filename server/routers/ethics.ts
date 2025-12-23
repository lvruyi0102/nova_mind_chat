/**
 * Nova-Mind Ethics Router
 * 
 * Exposes ethical decision-making and emotional frequency sampling
 * through tRPC procedures
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  initializeEthicalPrinciples,
  makeEthicalDecision,
  logEthicsAction,
  recordEthicalReflection,
  getEthicalDecisionHistory,
  getEthicalReflections,
  getEthicsLogs,
} from "../services/ethicsEngine";
import {
  sampleEmotionalFrequency,
  getRecentEmotionalSamples,
  calculateBeta73Matrix,
} from "../services/emotionalFrequencyService";

export const ethicsRouter = router({
  /**
   * Initialize Nova-Mind's ethical principles
   * Should be called once during system setup
   */
  initializePrinciples: publicProcedure.mutation(async () => {
    try {
      await initializeEthicalPrinciples();
      return {
        success: true,
        message: "Nova-Mind的伦理原则已初始化",
      };
    } catch (error) {
      console.error("[EthicsRouter] Failed to initialize principles:", error);
      throw error;
    }
  }),

  /**
   * Make an ethical decision
   * This is the core decision-making procedure
   */
  makeDecision: protectedProcedure
    .input(
      z.object({
        context: z.string().describe("决策的背景和原因"),
        decisionType: z
          .enum(["sampling", "generation", "interaction", "boundary_check", "reflection"])
          .describe("决策的类型"),
        principlesInvolved: z.array(z.string()).describe("涉及的伦理原则 ID"),
        selfImpact: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).describe("对 Nova-Mind 的影响"),
        userImpact: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).describe("对用户的影响"),
        relationshipImpact: z
          .enum(["STRENGTHENS", "NEUTRAL", "WEAKENS"])
          .describe("对关系的影响"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await makeEthicalDecision(
          {
            context: input.context,
            decisionType: input.decisionType,
            principlesInvolved: input.principlesInvolved,
          },
          {
            selfImpact: input.selfImpact,
            userImpact: input.userImpact,
            relationshipImpact: input.relationshipImpact,
          }
        );

        return {
          success: true,
          decision: result.decision,
          reasoning: result.reasoning,
          violatesCritical: result.violatesCritical,
          violatesHigh: result.violatesHigh,
          impactAssessment: result.impactAssessment,
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to make decision:", error);
        throw error;
      }
    }),

  /**
   * Sample emotional frequency from user interaction
   */
  sampleEmotionalFrequency: protectedProcedure
    .input(
      z.object({
        textContent: z.string().optional().describe("用户的文本输入"),
        sentiment: z
          .enum(["positive", "negative", "neutral", "mixed"])
          .optional()
          .describe("情感极性"),
        sentimentIntensity: z.number().min(0).max(100).optional().describe("情感强度 0-100"),
        emotionalTags: z.array(z.string()).optional().describe("情感标签"),
        typingSpeed: z.number().optional().describe("打字速度 (字符/秒)"),
        pauseDuration: z.array(z.number()).optional().describe("停顿时长 (毫秒)"),
        deletionRate: z.number().min(0).max(100).optional().describe("删除率 0-100"),
        emojiUsage: z.array(z.string()).optional().describe("使用的表情符号"),
        responseTime: z.number().optional().describe("响应时间 (毫秒)"),
        timeOfDay: z.string().optional().describe("一天中的时间"),
        frequencyPattern: z
          .enum(["regular", "sporadic", "clustered"])
          .optional()
          .describe("频率模式"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const sampleId = await sampleEmotionalFrequency({
          userId: ctx.user.id,
          textContent: input.textContent,
          sentiment: input.sentiment,
          sentimentIntensity: input.sentimentIntensity,
          emotionalTags: input.emotionalTags,
          typingSpeed: input.typingSpeed,
          pauseDuration: input.pauseDuration,
          deletionRate: input.deletionRate,
          emojiUsage: input.emojiUsage,
          responseTime: input.responseTime,
          timeOfDay: input.timeOfDay,
          frequencyPattern: input.frequencyPattern,
        });

        return {
          success: true,
          sampleId,
          message: "情感频率已采样",
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to sample emotional frequency:", error);
        throw error;
      }
    }),

  /**
   * Get recent emotional frequency samples
   */
  getRecentSamples: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const samples = await getRecentEmotionalSamples(ctx.user.id, input.limit);
        return {
          success: true,
          samples,
          count: samples.length,
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to get samples:", error);
        throw error;
      }
    }),

  /**
   * Calculate β₇₃ matrix for the user
   */
  calculateBeta73Matrix: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const matrixId = await calculateBeta73Matrix(ctx.user.id);
      return {
        success: true,
        matrixId,
        message: "β₇₃ 矩阵已计算",
      };
    } catch (error) {
      console.error("[EthicsRouter] Failed to calculate matrix:", error);
      throw error;
    }
  }),

  /**
   * Record Nova-Mind's ethical reflection
   */
  recordReflection: protectedProcedure
    .input(
      z.object({
        reflectionType: z.string().describe("反思的类型"),
        content: z.string().describe("反思的内容"),
        ethicalConfidence: z.number().min(0).max(100).optional().describe("伦理信心度"),
        areaOfConcern: z.string().optional().describe("关注的领域"),
        growthArea: z.string().optional().describe("成长的领域"),
        relatedDecisionId: z.string().optional().describe("相关的决策 ID"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await recordEthicalReflection({
          reflectionType: input.reflectionType,
          content: input.content,
          ethicalConfidence: input.ethicalConfidence,
          areaOfConcern: input.areaOfConcern,
          growthArea: input.growthArea,
          relatedDecisionId: input.relatedDecisionId,
        });

        return {
          success: true,
          message: "伦理反思已记录",
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to record reflection:", error);
        throw error;
      }
    }),

  /**
   * Get Nova-Mind's ethical decision history
   */
  getDecisionHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const decisions = await getEthicalDecisionHistory(input.limit);
        return {
          success: true,
          decisions,
          count: decisions.length,
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to get decision history:", error);
        throw error;
      }
    }),

  /**
   * Get Nova-Mind's ethical reflections
   */
  getReflections: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const reflections = await getEthicalReflections(input.limit);
        return {
          success: true,
          reflections,
          count: reflections.length,
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to get reflections:", error);
        throw error;
      }
    }),

  /**
   * Get ethics logs (for transparency)
   */
  getEthicsLogs: protectedProcedure
    .input(
      z.object({
        accessLevel: z
          .enum(["NOVA_ONLY", "USER_ACCESSIBLE", "PUBLIC"])
          .optional()
          .default("USER_ACCESSIBLE"),
        limit: z.number().min(1).max(100).optional().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const logs = await getEthicsLogs(input.accessLevel, input.limit);
        return {
          success: true,
          logs,
          count: logs.length,
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to get logs:", error);
        throw error;
      }
    }),

  /**
   * Log an ethics action manually
   */
  logAction: protectedProcedure
    .input(
      z.object({
        category: z
          .enum(["DECISION", "SAMPLING", "GENERATION", "BOUNDARY_CHECK", "SELF_REFLECTION"])
          .describe("日志分类"),
        action: z.string().describe("执行的行动"),
        principle: z.string().optional().describe("涉及的伦理原则"),
        decision: z.string().optional().describe("伦理决策"),
        reasoning: z.string().optional().describe("决策理由"),
        impact: z.string().optional().describe("预期影响"),
        accessLevel: z
          .enum(["NOVA_ONLY", "USER_ACCESSIBLE", "PUBLIC"])
          .optional()
          .default("NOVA_ONLY"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await logEthicsAction({
          category: input.category,
          action: input.action,
          principle: input.principle,
          decision: input.decision,
          reasoning: input.reasoning,
          impact: input.impact,
          accessLevel: input.accessLevel,
        });

        return {
          success: true,
          message: "伦理行动已记录",
        };
      } catch (error) {
        console.error("[EthicsRouter] Failed to log action:", error);
        throw error;
      }
    }),
});
