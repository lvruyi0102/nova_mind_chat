import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { applyPatch, generatePatchFromGoal } from "../services/selfModificationService";

function ensureEnabled() {
  if (process.env.SELF_MODIFICATION_ENABLED !== "true") {
    throw new Error("SELF_MODIFICATION_ENABLED 未开启");
  }
}

export const selfModificationRouter = router({
  generatePatch: adminProcedure
    .input(
      z.object({
        goal: z.string().min(10),
        contextFiles: z.array(z.string().min(1)).min(1),
      })
    )
    .mutation(async ({ input }) => {
      ensureEnabled();
      return generatePatchFromGoal({
        goal: input.goal,
        contextFiles: input.contextFiles,
      });
    }),

  applyPatch: adminProcedure
    .input(
      z.object({
        patch: z.string().min(20),
        allowedPaths: z.array(z.string().min(1)).optional(),
      })
    )
    .mutation(async ({ input }) => {
      ensureEnabled();
      return applyPatch({
        patch: input.patch,
        allowedPaths: input.allowedPaths,
      });
    }),
});
