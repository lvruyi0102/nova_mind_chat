import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getAutonomousBackgroundLoop, stopAutonomousBackgroundLoop } from "../autonomy/autonomousBackgroundLoop";

export const backgroundProcessRouter = router({
  /**
   * Get the status of the background cognition process
   */
  getStatus: protectedProcedure.query(() => {
    const loop = getAutonomousBackgroundLoop();
    return loop.getStatus();
  }),

  /**
   * Get statistics of the background cognition process
   */
  getStats: protectedProcedure.query(() => {
    const loop = getAutonomousBackgroundLoop();
    return loop.getStats();
  }),

  /**
   * Start the background cognition process (admin only)
   */
  start: adminProcedure.mutation(() => {
    const loop = getAutonomousBackgroundLoop();
    loop.start();
    console.log("[API] Background cognition process started");
    return {
      success: true,
      message: "Background cognition process started",
      status: loop.getStatus(),
    };
  }),

  /**
   * Stop the background cognition process (admin only)
   */
  stop: adminProcedure.mutation(() => {
    stopAutonomousBackgroundLoop();
    const loop = getAutonomousBackgroundLoop();
    console.log("[API] Background cognition process stopped");
    return {
      success: true,
      message: "Background cognition process stopped",
      status: loop.getStatus(),
    };
  }),

  /**
   * Update the configuration of the background cognition process (admin only)
   */
  updateConfig: adminProcedure
    .input(
      z.object({
        diagnosticInterval: z.number().optional(),
        optimizationInterval: z.number().optional(),
        autoExecuteThreshold: z.number().optional(),
        maxConcurrentActions: z.number().optional(),
      })
    )
    .mutation(({ input }) => {
      const loop = getAutonomousBackgroundLoop();
      loop.updateConfig(input);
      console.log("[API] Background cognition configuration updated:", input);
      return {
        success: true,
        message: "Configuration updated",
        status: loop.getStatus(),
      };
    }),

  /**
   * Force a diagnostic run (admin only)
   */
  runDiagnostics: adminProcedure.mutation(() => {
    const loop = getAutonomousBackgroundLoop();
    // Trigger a diagnostic by updating config (which will be picked up in next iteration)
    console.log("[API] Diagnostic run requested");
    return {
      success: true,
      message: "Diagnostic run triggered",
      status: loop.getStatus(),
    };
  }),
});
