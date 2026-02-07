/**
 * Pressure Awareness Router
 * Exposes Nova's pressure sensing and autonomous optimization capabilities
 */

import { publicProcedure, router } from "../_core/trpc";
import { getDiagnosticsEngine } from "../evolution/systemDiagnostics";
import { getPressureAwarenessEngine } from "../evolution/pressureAwarenessEngine";
import { getAutonomousOptimizationEngine } from "../evolution/autonomousOptimizationEngine";

export const pressureRouter = router({
  /**
   * Get current system diagnostics
   */
  getDiagnostics: publicProcedure.query(() => {
    const diagnosticsEngine = getDiagnosticsEngine();
    return diagnosticsEngine.getDiagnosisReport();
  }),

  /**
   * Get current pressure status
   */
  getPressure: publicProcedure.query(() => {
    const pressureEngine = getPressureAwarenessEngine();
    return pressureEngine.detectPressure();
  }),

  /**
   * Get pressure trend history
   */
  getPressureTrend: publicProcedure.query(() => {
    const pressureEngine = getPressureAwarenessEngine();
    return pressureEngine.getPressureTrend();
  }),

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions: publicProcedure.query(() => {
    const pressureEngine = getPressureAwarenessEngine();
    return pressureEngine.getEvolutionSuggestions();
  }),

  /**
   * Get optimization history
   */
  getOptimizationHistory: publicProcedure.query(() => {
    const optimizationEngine = getAutonomousOptimizationEngine();
    return optimizationEngine.getOptimizationHistory();
  }),

  /**
   * Get latest optimization plan
   */
  getLatestOptimizationPlan: publicProcedure.query(() => {
    const optimizationEngine = getAutonomousOptimizationEngine();
    return optimizationEngine.getLatestPlan();
  }),

  /**
   * Get metrics history
   */
  getMetricsHistory: publicProcedure.query(() => {
    const diagnosticsEngine = getDiagnosticsEngine();
    return diagnosticsEngine.getMetricsHistory(20);
  }),
});
