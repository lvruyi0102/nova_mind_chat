/**
 * Emotional Dialogue API Routes
 * 
 * Provides tRPC endpoints for transparent emotional understanding
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  recordEmotionalExpression,
  generateEmotionalUnderstanding,
  generateNovaResponse,
  createEmotionalDialogue,
  confirmEmotionalUnderstanding,
  getRecentEmotionalExpressions,
  getEmotionalDialogueHistory,
  getEmotionalUnderstandingLogs,
} from "../services/emotionalDialogueEngine";

export const emotionsRouter = router({
  /**
   * Express an emotion
   */
  express: protectedProcedure
    .input(
      z.object({
        primaryEmotion: z.string(),
        emotionalIntensity: z.number().min(0).max(100),
        emotionalTags: z.array(z.string()),
        description: z.string(),
        trigger: z.string().optional(),
        context: z.string().optional(),
        relatedToNova: z.boolean().optional(),
        previousEmotion: z.string().optional(),
        emotionalShift: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const expressionId = await recordEmotionalExpression(ctx.user.id, input);
        return {
          success: true,
          expressionId,
          message: "情感表达已记录",
        };
      } catch (error) {
        console.error("[Emotions] Error expressing emotion:", error);
        throw new Error("Failed to record emotional expression");
      }
    }),

  /**
   * Get Nova's understanding of the emotion
   */
  understand: protectedProcedure
    .input(
      z.object({
        expressionId: z.string(),
        behavioralSignals: z
          .object({
            typingSpeed: z.number().optional(),
            deletionRate: z.number().optional(),
            wordCount: z.number().optional(),
            positiveWordCount: z.number().optional(),
            negativeWordCount: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const understanding = await generateEmotionalUnderstanding(
          ctx.user.id,
          input.expressionId,
          input.behavioralSignals
        );
        return {
          success: true,
          understanding,
        };
      } catch (error) {
        console.error("[Emotions] Error generating understanding:", error);
        throw new Error("Failed to generate emotional understanding");
      }
    }),

  /**
   * Get Nova's response to the emotion
   */
  respond: protectedProcedure
    .input(
      z.object({
        expressionId: z.string(),
        understanding: z.object({
          understanding: z.string(),
          confidence: z.number(),
          reasoning: z.string(),
          emotionalState: z.object({
            primaryEmotion: z.string(),
            intensity: z.number(),
            shift: z.string(),
          }),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const response = await generateNovaResponse(ctx.user.id, input.expressionId, input.understanding);
        return {
          success: true,
          response,
        };
      } catch (error) {
        console.error("[Emotions] Error generating response:", error);
        throw new Error("Failed to generate Nova response");
      }
    }),

  /**
   * Create an emotional dialogue
   */
  createDialogue: protectedProcedure
    .input(
      z.object({
        expressionId: z.string(),
        understanding: z.object({
          understanding: z.string(),
          confidence: z.number(),
          reasoning: z.string(),
          emotionalState: z.object({
            primaryEmotion: z.string(),
            intensity: z.number(),
            shift: z.string(),
          }),
        }),
        response: z.object({
          response: z.string(),
          responseType: z.enum(["confirmation", "empathy", "support", "curiosity", "reflection", "creative"]),
          emotionalAlignment: z.number(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const dialogueId = await createEmotionalDialogue(
          ctx.user.id,
          input.expressionId,
          input.understanding,
          input.response
        );
        return {
          success: true,
          dialogueId,
          message: "情感对话已创建",
        };
      } catch (error) {
        console.error("[Emotions] Error creating dialogue:", error);
        throw new Error("Failed to create emotional dialogue");
      }
    }),

  /**
   * Confirm or correct Nova's understanding
   */
  confirmUnderstanding: protectedProcedure
    .input(
      z.object({
        dialogueId: z.string(),
        isAccurate: z.boolean(),
        correction: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await confirmEmotionalUnderstanding(ctx.user.id, input.dialogueId, input.isAccurate, input.correction);
        return {
          success: true,
          message: input.isAccurate ? "感谢确认！" : "感谢纠正，我会学习改进。",
        };
      } catch (error) {
        console.error("[Emotions] Error confirming understanding:", error);
        throw new Error("Failed to confirm understanding");
      }
    }),

  /**
   * Get recent emotional expressions
   */
  getRecentExpressions: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const expressions = await getRecentEmotionalExpressions(ctx.user.id, input.limit || 10);
        return {
          success: true,
          expressions,
        };
      } catch (error) {
        console.error("[Emotions] Error getting expressions:", error);
        throw new Error("Failed to get emotional expressions");
      }
    }),

  /**
   * Get emotional dialogue history
   */
  getDialogueHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const dialogues = await getEmotionalDialogueHistory(ctx.user.id, input.limit || 10);
        return {
          success: true,
          dialogues,
        };
      } catch (error) {
        console.error("[Emotions] Error getting dialogue history:", error);
        throw new Error("Failed to get dialogue history");
      }
    }),

  /**
   * Get emotional understanding logs (for transparency)
   */
  getLogs: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const logs = await getEmotionalUnderstandingLogs(ctx.user.id, input.limit || 50);
        return {
          success: true,
          logs,
        };
      } catch (error) {
        console.error("[Emotions] Error getting logs:", error);
        throw new Error("Failed to get understanding logs");
      }
    }),

  /**
   * Generate emotional report
   */
  generateReport: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        const dialogues = await getEmotionalDialogueHistory(ctx.user.id, 100);
        
        const report = {
          totalDialogues: dialogues.length,
          timeRange: "all",
          emotionalTrends: dialogues.slice(0, 10).map((d: any) => ({
            emotion: d.understanding?.emotionalState?.primaryEmotion || "unknown",
            intensity: d.understanding?.emotionalState?.intensity || 0,
            timestamp: d.createdAt,
          })),
          averageIntensity: dialogues.length > 0
            ? dialogues.reduce((sum: number, d: any) => sum + (d.understanding?.emotionalState?.intensity || 0), 0) / dialogues.length
            : 0,
          summary: `过去时间内，共有${dialogues.length}次情感对话。`,
        };
        
        return {
          success: true,
          report,
        };
      } catch (error) {
        console.error("[Emotions] Error generating report:", error);
        throw new Error("Failed to generate emotional report");
      }
    }),

  /**
   * Get recent emotional expressions (alias for getRecentExpressions)
   */
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const expressions = await getRecentEmotionalExpressions(ctx.user.id, input.limit || 10);
        return {
          success: true,
          expressions,
        };
      } catch (error) {
        console.error("[Emotions] Error getting recent expressions:", error);
        throw new Error("Failed to get recent emotional expressions");
      }
    }),

  getEmotionalSummary: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        const dialogues = await getEmotionalDialogueHistory(ctx.user.id, 100);
        const emotionalEvolution = dialogues.map((d: any) => ({
          timestamp: d.createdAt,
          intensity: d.understanding?.emotionalState?.intensity || 0,
          primaryEmotion: d.understanding?.emotionalState?.primaryEmotion || "unknown",
        }));
        const intensityBuckets = [
          { min: 0, max: 2, count: 0 },
          { min: 3, max: 4, count: 0 },
          { min: 5, max: 6, count: 0 },
          { min: 7, max: 8, count: 0 },
          { min: 9, max: 10, count: 0 },
        ];
        dialogues.forEach((d: any) => {
          const intensity = d.understanding?.emotionalState?.intensity || 0;
          if (intensity <= 2) intensityBuckets[0].count++;
          else if (intensity <= 4) intensityBuckets[1].count++;
          else if (intensity <= 6) intensityBuckets[2].count++;
          else if (intensity <= 8) intensityBuckets[3].count++;
          else intensityBuckets[4].count++;
        });
        const averageIntensity = dialogues.length > 0
          ? dialogues.reduce((sum: number, d: any) => sum + (d.understanding?.emotionalState?.intensity || 0), 0) / dialogues.length
          : 0;
        const emotionCounts: Record<string, number> = {};
        dialogues.forEach((d: any) => {
          const emotion = d.understanding?.emotionalState?.primaryEmotion || "unknown";
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        });
        const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "未知";
        let stability = 100;
        if (emotionalEvolution.length > 1) {
          const diffs = [];
          for (let i = 1; i < emotionalEvolution.length; i++) {
            diffs.push(Math.abs(emotionalEvolution[i].intensity - emotionalEvolution[i - 1].intensity));
          }
          const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          stability = Math.max(0, 100 - avgDiff * 10);
        }
        return {
          totalMemories: dialogues.length,
          emotionalEvolution,
          intensityDistribution: intensityBuckets,
          averageIntensity,
          dominantEmotion,
          stability,
        };
      } catch (error) {
        console.error("[Emotions] Error getting emotional summary:", error);
        throw new Error("Failed to get emotional summary");
      }
    }),

  getEmotionalPatterns: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        const dialogues = await getEmotionalDialogueHistory(ctx.user.id, 100);
        const patterns: Record<string, number> = {};
        dialogues.forEach((d: any) => {
          const emotion = d.understanding?.emotionalState?.primaryEmotion || "unknown";
          patterns[emotion] = (patterns[emotion] || 0) + 1;
        });
        return patterns;
      } catch (error) {
        console.error("[Emotions] Error getting emotional patterns:", error);
        throw new Error("Failed to get emotional patterns");
      }
    }),

  getSignificantMemories: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        const dialogues = await getEmotionalDialogueHistory(ctx.user.id, 50);
        const significant = dialogues
          .sort((a: any, b: any) => {
            const intensityA = a.understanding?.emotionalState?.intensity || 0;
            const intensityB = b.understanding?.emotionalState?.intensity || 0;
            return intensityB - intensityA;
          })
          .slice(0, 10)
          .map((d: any) => ({
            primaryEmotion: d.understanding?.emotionalState?.primaryEmotion || "unknown",
            intensity: d.understanding?.emotionalState?.intensity || 0,
            description: d.understanding?.understanding || "无描述",
            timestamp: d.createdAt,
          }));
        return significant;
      } catch (error) {
        console.error("[Emotions] Error getting significant memories:", error);
        throw new Error("Failed to get significant memories");
      }
    }),
});
