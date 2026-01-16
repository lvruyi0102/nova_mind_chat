import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

export const commentsRouter = router({
  getComments: protectedProcedure
    .input(
      z.object({
        workId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return [];
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        workId: z.number(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        commentId: 1,
        content: input.content,
        author: ctx.user.name,
      };
    }),

  deleteComment: protectedProcedure
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { success: true };
    }),

  likeComment: protectedProcedure
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return { success: true };
    }),
});
