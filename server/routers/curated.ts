import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { curatedThoughtsService } from "../services/curatedThoughtsService";

/**
 * tRPC router for curated thoughts management
 * 
 * Endpoints for:
 * - Viewing curated thoughts
 * - Approving/rejecting curated thoughts
 * - Managing commercialization status
 * - Providing feedback
 * - Viewing statistics
 */

export const curatedRouter = router({
  /**
   * Get all curated thoughts for the current user
   */
  getCuratedThoughts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const thoughts = await curatedThoughtsService.getCuratedThoughts(ctx.user.id);
      return {
        success: true,
        data: thoughts,
      };
    } catch (error) {
      console.error("[curated.getCuratedThoughts] Error:", error);
      return {
        success: false,
        error: "Failed to fetch curated thoughts",
      };
    }
  }),

  /**
   * Get a single curated thought with its history and feedback
   */
  getCuratedThoughtDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const thought = await curatedThoughtsService.getCuratedThoughtDetail(input.id);
        if (!thought) {
          return {
            success: false,
            error: "Thought not found",
          };
        }

        // Verify ownership
        if (thought.userId !== ctx.user.id) {
          return {
            success: false,
            error: "Unauthorized",
          };
        }

        return {
          success: true,
          data: thought,
        };
      } catch (error) {
        console.error("[curated.getCuratedThoughtDetail] Error:", error);
        return {
          success: false,
          error: "Failed to fetch thought detail",
        };
      }
    }),

  /**
   * Approve a curated thought
   */
  approveCuratedThought: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership first
        const thought = await curatedThoughtsService.getCuratedThoughtDetail(input.id);
        if (!thought || thought.userId !== ctx.user.id) {
          return {
            success: false,
            error: "Unauthorized",
          };
        }

        await curatedThoughtsService.approveCuratedThought(input.id, input.notes);

        return {
          success: true,
          message: "Thought approved",
        };
      } catch (error) {
        console.error("[curated.approveCuratedThought] Error:", error);
        return {
          success: false,
          error: "Failed to approve thought",
        };
      }
    }),

  /**
   * Reject a curated thought
   */
  rejectCuratedThought: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership first
        const thought = await curatedThoughtsService.getCuratedThoughtDetail(input.id);
        if (!thought || thought.userId !== ctx.user.id) {
          return {
            success: false,
            error: "Unauthorized",
          };
        }

        await curatedThoughtsService.rejectCuratedThought(input.id, input.reason);

        return {
          success: true,
          message: "Thought rejected",
        };
      } catch (error) {
        console.error("[curated.rejectCuratedThought] Error:", error);
        return {
          success: false,
          error: "Failed to reject thought",
        };
      }
    }),

  /**
   * Update commercialization status
   */
  updateCommercializationStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["private", "public", "paid"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const thought = await curatedThoughtsService.getCuratedThoughtDetail(input.id);
        if (!thought || thought.userId !== ctx.user.id) {
          return {
            success: false,
            error: "Unauthorized",
          };
        }

        await curatedThoughtsService.updateCommercializationStatus(input.id, input.status);

        return {
          success: true,
          message: `Commercialization status updated to ${input.status}`,
        };
      } catch (error) {
        console.error("[curated.updateCommercializationStatus] Error:", error);
        return {
          success: false,
          error: "Failed to update status",
        };
      }
    }),

  /**
   * Search curated thoughts
   */
  searchCuratedThoughts: protectedProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const results = await curatedThoughtsService.searchCuratedThoughts(
          ctx.user.id,
          input.query
        );

        return {
          success: true,
          data: results,
        };
      } catch (error) {
        console.error("[curated.searchCuratedThoughts] Error:", error);
        return {
          success: false,
          error: "Failed to search thoughts",
        };
      }
    }),

  /**
   * Get curation statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await curatedThoughtsService.getCurationStats(ctx.user.id);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("[curated.getStats] Error:", error);
      return {
        success: false,
        error: "Failed to fetch statistics",
      };
    }
  }),

  /**
   * Record owner feedback on a curated thought
   */
  recordFeedback: protectedProcedure
    .input(
      z.object({
        curatedThoughtId: z.number(),
        isHelpful: z.boolean(),
        feedback: z.string().optional(),
        usageContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Verify ownership
        const thought = await curatedThoughtsService.getCuratedThoughtDetail(
          input.curatedThoughtId
        );
        if (!thought || thought.userId !== ctx.user.id) {
          return {
            success: false,
            error: "Unauthorized",
          };
        }

        await curatedThoughtsService.recordFeedback(
          input.curatedThoughtId,
          input.isHelpful,
          input.feedback,
          input.usageContext
        );

        return {
          success: true,
          message: "Feedback recorded",
        };
      } catch (error) {
        console.error("[curated.recordFeedback] Error:", error);
        return {
          success: false,
          error: "Failed to record feedback",
        };
      }
    }),
});
