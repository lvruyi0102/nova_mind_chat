/**
 * Evolution Router - 暴露进化系统的 tRPC 接口
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router, adminProcedure } from "../_core/trpc";
import { getGenomeManager } from "../evolution/genomeManager";
import { getEvolutionEvaluator } from "../evolution/evolutionEvaluator";
import { getMutationProposer } from "../evolution/mutationProposer";
import { createEvolutionEngine } from "../evolution/evolutionEngine";

let evolutionEngine: any = null;

// 初始化进化引擎
async function initializeEvolutionEngine() {
  if (!evolutionEngine) {
    const genomeManager = await getGenomeManager();
    const evaluator = getEvolutionEvaluator();
    const proposer = getMutationProposer();
    evolutionEngine = await createEvolutionEngine(genomeManager, evaluator, proposer);
  }
  return evolutionEngine;
}

export const evolutionRouter = router({
  /**
   * 获取当前基因信息
   */
  getCurrentGenome: publicProcedure.query(async () => {
    const manager = await getGenomeManager();
    const genome = manager.getCurrentGenome();
    const stats = manager.getGenomeStats(genome);

    return {
      version: genome.version,
      generation: genome.generation,
      timestamp: genome.timestamp,
      stats,
      nodeCount: Object.keys(genome.nodes).length,
      metadata: genome.metadata,
    };
  }),

  /**
   * 获取基因的详细信息
   */
  getGenomeDetails: publicProcedure.query(async () => {
    const manager = await getGenomeManager();
    const genome = manager.getCurrentGenome();

    return {
      version: genome.version,
      generation: genome.generation,
      startNode: genome.startNode,
      nodes: Object.entries(genome.nodes).map(([id, node]) => ({
        id,
        name: node.name,
        description: node.description,
        instruction: node.instruction,
        nextCount: node.next.length,
      })),
      metadata: genome.metadata,
      history: genome.history.slice(-10), // 最近 10 条历史
    };
  }),

  /**
   * 执行单个进化循环
   */
  runEvolutionCycle: adminProcedure.mutation(async () => {
    const engine = await initializeEvolutionEngine();
    const cycle = await engine.runEvolutionCycle();

    return {
      cycleId: cycle.cycleId,
      generation: cycle.generation,
      result: cycle.result,
      improvementRatio: cycle.improvementRatio,
      parentScore: cycle.parentMetrics.compositeScore,
      childScore: cycle.childMetrics?.compositeScore,
      mutationType: cycle.mutationProposal.mutationType,
      notes: cycle.notes,
      duration: (cycle.endTime || 0) - cycle.startTime,
    };
  }),

  /**
   * 运行多个进化循环
   */
  runMultipleCycles: adminProcedure
    .input(
      z.object({
        count: z.number().min(1).max(20),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await initializeEvolutionEngine();
      const cycles = await engine.runEvolutionCycles(input.count);

      return {
        totalCycles: cycles.length,
        successCount: cycles.filter((c) => c.result === "success").length,
        failureCount: cycles.filter((c) => c.result === "failure").length,
        avgImprovement: Math.round((cycles.reduce((sum, c) => sum + c.improvementRatio, 0) / cycles.length) * 100) / 100,
        cycles: cycles.map((c) => ({
          cycleId: c.cycleId,
          result: c.result,
          improvementRatio: c.improvementRatio,
          mutationType: c.mutationProposal.mutationType,
        })),
      };
    }),

  /**
   * 获取进化统计
   */
  getEvolutionStats: publicProcedure.query(async () => {
    const engine = await initializeEvolutionEngine();
    return engine.getEvolutionStats();
  }),

  /**
   * 获取进化历史
   */
  getEvolutionHistory: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const engine = await initializeEvolutionEngine();
      const history = engine.getEvolutionHistory();

      return history.slice(-input.limit).map((cycle) => ({
        cycleId: cycle.cycleId,
        generation: cycle.generation,
        result: cycle.result,
        improvementRatio: cycle.improvementRatio,
        parentScore: cycle.parentMetrics.compositeScore,
        childScore: cycle.childMetrics?.compositeScore,
        mutationType: cycle.mutationProposal.mutationType,
        timestamp: cycle.startTime,
      }));
    }),

  /**
   * 获取进化报告
   */
  getEvolutionReport: publicProcedure.query(async () => {
    const engine = await initializeEvolutionEngine();
    return {
      report: engine.generateEvolutionReport(),
      stats: engine.getEvolutionStats(),
    };
  }),

  /**
   * 启动持续进化
   */
  startContinuousEvolution: adminProcedure
    .input(
      z.object({
        intervalMs: z.number().min(5000).max(3600000).default(60000),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await initializeEvolutionEngine();
      engine.startContinuousEvolution(input.intervalMs);

      return {
        success: true,
        message: `Continuous evolution started with interval ${input.intervalMs}ms`,
      };
    }),

  /**
   * 停止持续进化
   */
  stopContinuousEvolution: adminProcedure.mutation(async () => {
    const engine = await initializeEvolutionEngine();
    engine.stopContinuousEvolution();

    return {
      success: true,
      message: "Continuous evolution stopped",
    };
  }),

  /**
   * 获取当前基因的执行路径
   */
  getExecutionPaths: publicProcedure.query(async () => {
    const manager = await getGenomeManager();
    const genome = manager.getCurrentGenome();
    const paths = manager.getExecutionPaths(genome);

    return {
      pathCount: paths.length,
      paths: paths.slice(0, 10).map((p) => p.join(" -> ")), // 只返回前 10 条路径
      totalPaths: paths.length,
    };
  }),

  /**
   * 验证当前基因
   */
  validateCurrentGenome: publicProcedure.query(async () => {
    const manager = await getGenomeManager();
    const genome = manager.getCurrentGenome();
    const validation = manager.validateGenome(genome);

    return {
      valid: validation.valid,
      errors: validation.errors,
    };
  }),

  /**
   * 获取评估指标
   */
  getEvaluationMetrics: publicProcedure.query(async () => {
    const manager = await getGenomeManager();
    const evaluator = getEvolutionEvaluator();
    const genome = manager.getCurrentGenome();
    const metrics = await evaluator.evaluateGenome(genome);

    return {
      compositeScore: metrics.compositeScore,
      correctnessScore: metrics.correctnessScore,
      logicalConsistency: metrics.logicalConsistency,
      tokenUsage: metrics.tokenUsage,
      executionTime: metrics.executionTime,
      pathLength: metrics.pathLength,
      errorRecoveryScore: metrics.errorRecoveryScore,
      edgeCaseHandling: metrics.edgeCaseHandling,
      noveltyScore: metrics.noveltyScore,
      expressiveness: metrics.expressiveness,
    };
  }),

  /**
   * 获取硬问题库
   */
  getHardCasesDatabase: publicProcedure.query(async () => {
    const evaluator = getEvolutionEvaluator();
    const cases = evaluator.getHardCasesDatabase();

    return {
      totalCases: cases.length,
      cases: cases.map((tc) => ({
        id: tc.id,
        name: tc.name,
        difficulty: tc.difficulty,
        category: tc.category,
        generatedBy: tc.generatedBy,
      })),
    };
  }),

  /**
   * 更新进化配置
   */
  updateEvolutionConfig: adminProcedure
    .input(
      z.object({
        maxGenerations: z.number().optional(),
        minImprovementThreshold: z.number().optional(),
        maxConsecutiveFailures: z.number().optional(),
        mutationConfidenceThreshold: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await initializeEvolutionEngine();
      engine.updateConfig(input);

      return {
        success: true,
        message: "Evolution configuration updated",
      };
    }),
});
