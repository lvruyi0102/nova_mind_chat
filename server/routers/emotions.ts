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
    .query(async ({ ctx, input }) => {
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
    .query(async ({ ctx, input }) => {
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
});
