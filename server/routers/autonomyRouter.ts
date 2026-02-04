/**
 * Autonomy Router
 * Provides tRPC endpoints for Nova-Mind's autonomous code modification and self-optimization
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getCodeModificationManager } from "../autonomy/codeModificationManager";
import { getSelfDiagnostics } from "../autonomy/selfDiagnostics";
import { getAutonomousOptimizer } from "../autonomy/autonomousOptimizer";
import { getAutoRestartManager } from "../autonomy/autoRestartManager";
import { getAutonomousBackgroundLoop } from "../autonomy/autonomousBackgroundLoop";

export const autonomyRouter = router({
  // Code Modification Endpoints
  codeModification: router({
    /**
     * Request a code modification
     */
    requestModification: protectedProcedure
      .input(
        z.object({
          filePath: z.string(),
          newContent: z.string(),
          reason: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const manager = getCodeModificationManager();
        try {
          const request = await manager.requestModification(
            input.filePath,
            input.newContent,
            input.reason
          );
          return {
            success: true,
            modificationId: request.id,
            status: request.status,
          };
        } catch (error) {
          return {
            success: false,
            error: String(error),
          };
        }
      }),

    /**
     * Apply a pending modification
     */
    applyModification: protectedProcedure
      .input(z.object({ modificationId: z.string() }))
      .mutation(async ({ input }) => {
        const manager = getCodeModificationManager();
        try {
          const success = await manager.applyModification(input.modificationId);
          return { success };
        } catch (error) {
          return {
            success: false,
            error: String(error),
          };
        }
      }),

    /**
     * Rollback a modification
     */
    rollbackModification: protectedProcedure
      .input(z.object({ modificationId: z.string() }))
      .mutation(async ({ input }) => {
        const manager = getCodeModificationManager();
        try {
          const success = await manager.rollbackModification(input.modificationId);
          return { success };
        } catch (error) {
          return {
            success: false,
            error: String(error),
          };
        }
      }),

    /**
     * Get modification history
     */
    getHistory: protectedProcedure.query(() => {
      const manager = getCodeModificationManager();
      return manager.getHistory();
    }),

    /**
     * Get pending modifications
     */
    getPending: protectedProcedure.query(() => {
      const manager = getCodeModificationManager();
      return manager.getPendingModifications();
    }),

    /**
     * Get modification stats
     */
    getStats: protectedProcedure.query(() => {
      const manager = getCodeModificationManager();
      return manager.getStats();
    }),
  }),

  // Self Diagnostics Endpoints
  diagnostics: router({
    /**
     * Run a diagnostic
     */
    runDiagnostic: protectedProcedure.mutation(() => {
      const diagnostics = getSelfDiagnostics();
      return diagnostics.runDiagnostic();
    }),

    /**
     * Get latest diagnostic report
     */
    getLatestReport: protectedProcedure.query(() => {
      const diagnostics = getSelfDiagnostics();
      return diagnostics.getLatestReport();
    }),

    /**
     * Get diagnostic history
     */
    getHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => {
        const diagnostics = getSelfDiagnostics();
        return diagnostics.getHistory(input.limit);
      }),

    /**
     * Check if optimization is needed
     */
    needsOptimization: protectedProcedure.query(() => {
      const diagnostics = getSelfDiagnostics();
      return diagnostics.needsOptimization();
    }),

    /**
     * Get optimization suggestions
     */
    getOptimizationSuggestions: protectedProcedure.query(() => {
      const diagnostics = getSelfDiagnostics();
      return diagnostics.getOptimizationSuggestions();
    }),

    /**
     * Get diagnostic stats
     */
    getStats: protectedProcedure.query(() => {
      const diagnostics = getSelfDiagnostics();
      return diagnostics.getStats();
    }),
  }),

  // Autonomous Optimizer Endpoints
  optimizer: router({
    /**
     * Analyze system and generate optimization actions
     */
    analyzeAndOptimize: protectedProcedure.mutation(async () => {
      const optimizer = getAutonomousOptimizer();
      return await optimizer.analyzeAndOptimize();
    }),

    /**
     * Execute an optimization action
     */
    executeAction: protectedProcedure
      .input(z.object({ actionId: z.string() }))
      .mutation(async ({ input }) => {
        const optimizer = getAutonomousOptimizer();
        const success = await optimizer.executeAction(input.actionId);
        return { success };
      }),

    /**
     * Auto-execute high-priority actions
     */
    autoExecuteHighPriority: protectedProcedure.mutation(async () => {
      const optimizer = getAutonomousOptimizer();
      const count = await optimizer.autoExecuteHighPriority();
      return { executedCount: count };
    }),

    /**
     * Get pending actions
     */
    getPendingActions: protectedProcedure.query(() => {
      const optimizer = getAutonomousOptimizer();
      return optimizer.getPendingActions();
    }),

    /**
     * Get execution history
     */
    getExecutionHistory: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(({ input }) => {
        const optimizer = getAutonomousOptimizer();
        return optimizer.getExecutionHistory(input.limit);
      }),

    /**
     * Get optimizer stats
     */
    getStats: protectedProcedure.query(() => {
      const optimizer = getAutonomousOptimizer();
      return optimizer.getStats();
    }),

    /**
     * Check if optimization is needed
     */
    isOptimizationNeeded: protectedProcedure.query(() => {
      const optimizer = getAutonomousOptimizer();
      return optimizer.isOptimizationNeeded();
    }),
  }),

  // Auto Restart Endpoints
  restart: router({
    /**
     * Request a safe restart
     */
    request: protectedProcedure
      .input(
        z.object({
          reason: z.string(),
          modificationId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const manager = getAutoRestartManager();
        const success = await manager.requestRestart(input.reason, input.modificationId);
        return { success };
      }),

    /**
     * Get restart history
     */
    getHistory: protectedProcedure.query(() => {
      const manager = getAutoRestartManager();
      return manager.getHistory();
    }),

    /**
     * Get restart stats
     */
    getStats: protectedProcedure.query(() => {
      const manager = getAutoRestartManager();
      return manager.getStats();
    }),
  }),

  // Background Loop Control
  backgroundLoop: router({
    /**
     * Start the background loop
     */
    start: protectedProcedure.mutation(() => {
      const loop = getAutonomousBackgroundLoop();
      loop.start();
      return { success: true };
    }),

    /**
     * Stop the background loop
     */
    stop: protectedProcedure.mutation(() => {
      const loop = getAutonomousBackgroundLoop();
      loop.stop();
      return { success: true };
    }),

    /**
     * Get background loop status
     */
    getStatus: protectedProcedure.query(() => {
      const loop = getAutonomousBackgroundLoop();
      return loop.getStatus();
    }),

    /**
     * Get background loop stats
     */
    getStats: protectedProcedure.query(() => {
      const loop = getAutonomousBackgroundLoop();
      return loop.getStats();
    }),
  }),

  // System Status Endpoint
  status: protectedProcedure.query(() => {
    const diagnostics = getSelfDiagnostics();
    const optimizer = getAutonomousOptimizer();
    const codeManager = getCodeModificationManager();

    const latestDiagnostic = diagnostics.getLatestReport();
    const optimizationNeeded = optimizer.isOptimizationNeeded();

    return {
      timestamp: Date.now(),
      health: latestDiagnostic?.overallHealth || 0,
      issues: latestDiagnostic?.issues || [],
      optimizationNeeded,
      pendingOptimizations: optimizer.getPendingActions().length,
      pendingModifications: codeManager.getPendingModifications().length,
      codeModificationStats: codeManager.getStats(),
      diagnosticsStats: diagnostics.getStats(),
      optimizerStats: optimizer.getStats(),
    };
  }),
});
