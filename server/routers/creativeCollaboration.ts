import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";

export const creativeCollaborationRouter = router({
  startCollaboration: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        collaborationId: 1,
        title: input.title,
        participants: [ctx.user.id],
      };
    }),

  addUserContribution: protectedProcedure
    .input(
      z.object({
        collaborationId: z.number(),
        contribution: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,
        contributionId: 1,
      };
    }),

  generateNovaContribution: protectedProcedure
    .input(
      z.object({
        collaborationId: z.number(),
        context: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        contribution: "Nova's creative contribution",
        emotion: "excited",
      };
    }),

  finalizeCollaboration: protectedProcedure
    .input(
      z.object({
        collaborationId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,
        finalWorkId: 1,
      };
    }),
});
