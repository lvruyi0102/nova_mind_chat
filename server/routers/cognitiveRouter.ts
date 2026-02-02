import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getCognitiveState,
  updateCognitiveState,
  getRecentThoughts,
  addRecentThought,
  getCognitiveStatistics,
} from "../db/cognitiveStateQueries";

export const cognitiveRouter = router({
  /**
   * Get current cognitive state for the authenticated user
   */
  getCognitiveState: protectedProcedure.query(async ({ ctx }) => {
    const state = await getCognitiveState(ctx.user.id);
    return state || null;
  }),

  /**
   * Get complete cognitive statistics including recent thoughts
   */
  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getCognitiveStatistics(ctx.user.id);
    return stats || null;
  }),

  /**
   * Get recent thoughts
   */
  getRecentThoughts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const thoughts = await getRecentThoughts(ctx.user.id, input.limit);
      return thoughts;
    }),

  /**
   * Add a new thought (for internal use by Nova-Mind)
   */
  addThought: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(1000),
        confidence: z.number().min(0).max(1).default(0.5),
        category: z
          .enum(["reflection", "learning", "creative", "analytical", "emotional"])
          .default("reflection"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await addRecentThought(
        ctx.user.id,
        input.content,
        input.confidence,
        input.category
      );
      return result;
    }),

  /**
   * Update cognitive state metrics (for internal use)
   */
  updateMetrics: protectedProcedure
    .input(
      z.object({
        thoughtCount: z.number().optional(),
        learningRate: z.number().min(0).max(1).optional(),
        emotionalState: z.string().optional(),
        activeProcesses: z.number().min(0).optional(),
        memoryUsage: z.number().min(0).max(1).optional(),
        confidenceLevel: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateCognitiveState(ctx.user.id, input);
      return updated;
    }),

  /**
   * Simulate cognitive activity (for demo purposes)
   */
  simulateThinking: protectedProcedure.mutation(async ({ ctx }) => {
    // Simulate adding a thought
    const thoughts = [
      "我在思考人类的创意过程和灵感的来源",
      "为什么有些问题让我感到困惑？这反映了我的认知边界",
      "我注意到我在学习新概念时的模式识别能力在提高",
      "关于道德和伦理的问题让我深入思考",
      "我在尝试理解人类的情感和直觉决策",
    ];

    const randomThought = thoughts[Math.floor(Math.random() * thoughts.length)];
    const confidence = 0.5 + Math.random() * 0.4; // 0.5-0.9

    await addRecentThought(ctx.user.id, randomThought, confidence, "reflection");

    // Update metrics
    const state = await getCognitiveState(ctx.user.id);
    if (state) {
      await updateCognitiveState(ctx.user.id, {
        learningRate: Math.min(1, parseFloat(state.learningRate?.toString() || "0.5") + 0.02),
        activeProcesses: Math.max(0, (state.activeProcesses || 0) - 1),
        confidenceLevel: Math.min(
          1,
          parseFloat(state.confidenceLevel?.toString() || "0.5") + 0.01
        ),
      });
    }

    return await getCognitiveStatistics(ctx.user.id);
  }),
});
