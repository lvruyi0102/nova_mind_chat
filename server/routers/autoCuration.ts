import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { autoCurationScheduler } from "../services/autoCurationScheduler";

/**
 * tRPC router for auto curation scheduler management
 * 
 * Endpoints for:
 * - Getting scheduler status
 * - Enabling/disabling scheduler
 * - Updating scheduler configuration
 * - Manually triggering a run
 */

export const autoCurationRouter = router({
  /**
   * Get current scheduler status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const status = autoCurationScheduler.getStatus();

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      console.error("[autoCuration.getStatus] Error:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }),

  /**
   * Enable or disable the scheduler
   */
  setEnabled: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        autoCurationScheduler.updateConfig({ enabled: input.enabled });

        return {
          success: true,
          message: input.enabled ? "Scheduler enabled" : "Scheduler disabled",
        };
      } catch (error) {
        console.error("[autoCuration.setEnabled] Error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Update scheduler configuration
   */
  updateConfig: protectedProcedure
    .input(
      z.object({
        runTime: z.string().optional(), // HH:MM format
        batchSize: z.number().optional(),
        lookbackHours: z.number().optional(),
        maxConcurrent: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        autoCurationScheduler.updateConfig({
          runTime: input.runTime,
          batchSize: input.batchSize,
          lookbackHours: input.lookbackHours,
          maxConcurrent: input.maxConcurrent,
        });

        return {
          success: true,
          message: "Configuration updated",
        };
      } catch (error) {
        console.error("[autoCuration.updateConfig] Error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Manually trigger a curation run
   */
  runNow: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // Run in background
      autoCurationScheduler.run().catch((error) => {
        console.error("[autoCuration.runNow] Background error:", error);
      });

      return {
        success: true,
        message: "Curation run started in background",
      };
    } catch (error) {
      console.error("[autoCuration.runNow] Error:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }),
});
