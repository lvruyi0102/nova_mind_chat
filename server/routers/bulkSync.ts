import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { bulkCurationService } from "../services/bulkCurationService";

/**
 * tRPC router for bulk curation sync
 * 
 * Endpoints for:
 * - Starting bulk curation
 * - Checking progress
 * - Pausing/resuming sync
 * - Getting statistics
 */

export const bulkSyncRouter = router({
  /**
   * Start bulk curation sync
   */
  startSync: protectedProcedure
    .input(
      z.object({
        batchSize: z.number().optional().default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Start sync in background
        bulkCurationService.startBulkCuration(ctx.user.id, input.batchSize).catch((error) => {
          console.error("[bulkSync.startSync] Background error:", error);
        });

        return {
          success: true,
          message: "Bulk curation sync started",
        };
      } catch (error) {
        console.error("[bulkSync.startSync] Error:", error);
        return {
          success: false,
          error: String(error),
        };
      }
    }),

  /**
   * Get current sync progress
   */
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    try {
      const progress = bulkCurationService.getSyncProgress(ctx.user.id);

      if (!progress) {
        return {
          success: true,
          data: null,
          message: "No sync in progress",
        };
      }

      return {
        success: true,
        data: progress,
      };
    } catch (error) {
      console.error("[bulkSync.getProgress] Error:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }),

  /**
   * Pause the current sync
   */
  pauseSync: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      bulkCurationService.pauseSync(ctx.user.id);

      return {
        success: true,
        message: "Sync paused",
      };
    } catch (error) {
      console.error("[bulkSync.pauseSync] Error:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }),

  /**
   * Resume the sync
   */
  resumeSync: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      bulkCurationService.resumeSync(ctx.user.id);

      return {
        success: true,
        message: "Sync resumed",
      };
    } catch (error) {
      console.error("[bulkSync.resumeSync] Error:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }),

  /**
   * Get curation statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const stats = await bulkCurationService.getCurationStats(ctx.user.id);

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error("[bulkSync.getStats] Error:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  }),
});
