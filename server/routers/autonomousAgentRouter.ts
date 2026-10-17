import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAutonomousAgentOrchestrator } from "../services/autonomousAgentOrchestrator";

export const autonomousAgentRouter = router({
  getStatus: protectedProcedure.query(() => {
    return getAutonomousAgentOrchestrator().getStatus();
  }),

  runCycle: protectedProcedure.mutation(async () => {
    const result = await getAutonomousAgentOrchestrator().runCycle();
    return { success: true, result };
  }),

  startAutoMode: protectedProcedure
    .input(
      z.object({
        intervalMs: z.number().min(10_000).max(10 * 60_000).default(60_000),
      }),
    )
    .mutation(({ input }) => {
      getAutonomousAgentOrchestrator().startAutoMode(input.intervalMs);
      return { success: true, status: getAutonomousAgentOrchestrator().getStatus() };
    }),

  stopAutoMode: protectedProcedure.mutation(() => {
    getAutonomousAgentOrchestrator().stopAutoMode();
    return { success: true, status: getAutonomousAgentOrchestrator().getStatus() };
  }),
});
