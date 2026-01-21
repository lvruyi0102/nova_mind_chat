import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  curateThoughtsBatch,
  getCuratedThoughts,
  updateCommercializationLevel,
  publishCuratedThought,
} from "../services/curatedThoughtsService";
import { runUserCuration } from "../services/curatedThoughtsScheduler";

export const curatedThoughtsRouter = router({
  /**
   * Get curated thoughts for current user
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getCuratedThoughts(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Trigger curation for current user
   */
  curate: protectedProcedure
    .input(
      z.object({
        maxThoughts: z.number().optional(),
        minQualityScore: z.number().optional(),
        excludeRecentDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = await runUserCuration(ctx.user.id, {
        maxThoughts: input.maxThoughts,
        minQualityScore: input.minQualityScore,
        excludeRecent: input.excludeRecentDays,
      });

      return results;
    }),

  /**
   * Update commercialization level
   */
  updateCommercializationLevel: protectedProcedure
    .input(
      z.object({
        thoughtId: z.number(),
        level: z.enum(["internal", "public", "paid"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await updateCommercializationLevel(
        input.thoughtId,
        ctx.user.id,
        input.level
      );
      return { success: true };
    }),

  /**
   * Publish a curated thought
   */
  publish: protectedProcedure
    .input(
      z.object({
        thoughtId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await publishCuratedThought(input.thoughtId, ctx.user.id);
      return { success: true };
    }),
});
