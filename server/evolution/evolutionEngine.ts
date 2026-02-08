/**
 * EvolutionEngine - Nova-Mind 的自我进化引擎
 * 协调基因管理、评估、变异和测试的完整进化循环
 */

import { GenomeManager, Genome } from "./genomeManager";
import { EvolutionEvaluator, EvaluationMetrics, TestCase } from "./evolutionEvaluator";
import { MutationProposer, MutationProposal } from "./mutationProposer";
import { getCodeModificationEngine, CodeModificationProposal } from "./codeModificationEngine";
import { getCodeModificationExecutor } from "./codeModificationExecutor";

export interface EvolutionCycle {
  cycleId: string;
  generation: number;
  startTime: number;
  endTime?: number;
  parentGenome: Genome;
  childGenome?: Genome;
  parentMetrics: EvaluationMetrics;
  childMetrics?: EvaluationMetrics;
  mutationProposal: MutationProposal;
  testCases: TestCase[];
  failedTestCases: TestCase[];
  result: "success" | "failure" | "pending";
  improvementRatio: number; // 改进比例
  notes: string;
}

export class EvolutionEngine {
  private genomeManager: GenomeManager;
  private evaluator: EvolutionEvaluator;
  private proposer: MutationProposer;
  private codeModificationEngine = getCodeModificationEngine();
  private codeExecutor = getCodeModificationExecutor();
  private evolutionCycles: EvolutionCycle[] = [];
  private codeModifications: CodeModificationProposal[] = [];
  private isRunning: boolean = false;
  private config: {
    maxGenerations: number;
    minImprovementThreshold: number; // 最小改进阈值
    maxConsecutiveFailures: number; // 最多连续失败次数
    mutationConfidenceThreshold: number; // 变异信心阈值
  };

  constructor(
    genomeManager: GenomeManager,
    evaluator: EvolutionEvaluator,
    proposer: MutationProposer
  ) {
    this.genomeManager = genomeManager;
    this.evaluator = evaluator;
    this.proposer = proposer;
    this.config = {
      maxGenerations: 100,
      minImprovementThreshold: 0.5, // 至少改进 0.5%
      maxConsecutiveFailures: 5,
      mutationConfidenceThreshold: 40,
    };
  }

  /**
   * 执行单个进化循环
   */
  async runEvolutionCycle(): Promise<EvolutionCycle> {
    const cycleId = `cycle_${Date.now()}`;
    const startTime = Date.now();

    try {
      // 1. 获取当前基因
      const parentGenome = this.genomeManager.getCurrentGenome();
      console.log(`[EvolutionEngine] Starting cycle for genome v${parentGenome.version}`);

      // 2. 评估当前基因
      const parentMetrics = await this.evaluator.evaluateGenome(parentGenome);
      console.log(`[EvolutionEngine] Parent metrics: ${JSON.stringify(parentMetrics, null, 2)}`);

      // 3. 生成自举难题
      const bootstrappingTestCase = this.evaluator.generateBootstrappingTestCase(parentGenome);
      const testCases = [bootstrappingTestCase, ...this.evaluator.getHardCasesDatabase().slice(0, 3)];

      // 4. 识别失败的测试用例（模拟）
      const failedTestCases = testCases.filter((tc) => tc.difficulty === "extreme" || tc.difficulty === "hard");

      // 5. 提议变异
      const mutationProposal = await this.proposer.proposeMutation(
        parentGenome,
        parentMetrics,
        failedTestCases,
        parentGenome.metadata.optimizationTarget
      );

      console.log(`[EvolutionEngine] Mutation proposal: ${mutationProposal.mutationType} (confidence: ${mutationProposal.confidence}%)`);

      // 6. 如果信心不足，返回失败的循环
      if (mutationProposal.confidence < this.config.mutationConfidenceThreshold) {
        return {
          cycleId,
          generation: parentGenome.generation,
          startTime,
          endTime: Date.now(),
          parentGenome,
          parentMetrics,
          mutationProposal,
          testCases,
          failedTestCases,
          result: "failure",
          improvementRatio: 0,
          notes: `Mutation confidence too low (${mutationProposal.confidence}%)`,
        };
      }

      // 7. 创建变异基因
      const childGenome = this.genomeManager.createMutantGenome(
        parentGenome,
        mutationProposal.mutations,
        mutationProposal.mutationType,
        parentMetrics.compositeScore
      );

      // 8. 验证新基因
      const validation = this.genomeManager.validateGenome(childGenome);
      if (!validation.valid) {
        console.error(`[EvolutionEngine] Invalid genome: ${validation.errors.join(", ")}`);
        return {
          cycleId,
          generation: parentGenome.generation,
          startTime,
          endTime: Date.now(),
          parentGenome,
          parentMetrics,
          mutationProposal,
          testCases,
          failedTestCases,
          result: "failure",
          improvementRatio: 0,
          notes: `Genome validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // 9. 评估新基因
      const childMetrics = await this.evaluator.evaluateGenome(childGenome, testCases);
      console.log(`[EvolutionEngine] Child metrics: ${JSON.stringify(childMetrics, null, 2)}`);

      // 10. 比较性能
      const comparison = this.evaluator.compareGenomes(parentMetrics, childMetrics);
      const improvementRatio = comparison.improvement;

      // 11. 决定是否接受变异
      let result: "success" | "failure" = "failure";
      if (improvementRatio > this.config.minImprovementThreshold) {
        result = "success";
        // 保存新基因
        await this.genomeManager.saveGenome(childGenome);
        console.log(`[EvolutionEngine] Evolution successful! Improvement: ${improvementRatio.toFixed(2)}%`);
        
        // 尝试执行代码修改
        try {
          const codeModification = await this.codeModificationEngine.generateModificationProposal({
            pressureLevel: 50,
            pressureType: 'latency',
            systemMetrics: {
              responseTime: childMetrics.compositeScore || 0,
              accuracy: childMetrics.compositeScore || 0,
            },
            diagnosticResults: `Evolution successful with ${improvementRatio.toFixed(2)}% improvement`,
          });
          
          if (codeModification && codeModification.riskAssessment.level !== 'critical') {
            const executionResult = await this.codeExecutor.executeModification(codeModification);
            if (executionResult.success) {
              console.log(`[EvolutionEngine] Code modification executed successfully`);
              this.codeModifications.push(codeModification);
            } else {
              console.warn(`[EvolutionEngine] Code modification failed: ${executionResult.error}`);
            }
          }
        } catch (codeError) {
          console.warn(`[EvolutionEngine] Code modification attempt failed:`, codeError);
        }
      } else {
        console.log(`[EvolutionEngine] Evolution failed. Improvement: ${improvementRatio.toFixed(2)}% (threshold: ${this.config.minImprovementThreshold}%)`);
      }

      // 13. 记录循环
      const cycle: EvolutionCycle = {
        cycleId,
        generation: parentGenome.generation,
        startTime,
        endTime: Date.now(),
        parentGenome,
        childGenome,
        parentMetrics,
        childMetrics,
        mutationProposal,
        testCases,
        failedTestCases,
        result,
        improvementRatio,
        notes: `${mutationProposal.description} - ${comparison.winner === "second" ? "Improvement" : "No improvement"}`,
      };

      this.evolutionCycles.push(cycle);
      return cycle;
    } catch (error) {
      console.error("[EvolutionEngine] Evolution cycle failed:", error);
      const parentGenome = this.genomeManager.getCurrentGenome();
      const parentMetrics = await this.evaluator.evaluateGenome(parentGenome);

      return {
        cycleId,
        generation: parentGenome.generation,
        startTime,
        endTime: Date.now(),
        parentGenome,
        parentMetrics,
        mutationProposal: {
          id: "error",
          parentVersion: parentGenome.version,
          mutationType: "error",
          description: "Error occurred",
          reasoning: String(error),
          mutations: {},
          expectedImpact: {},
          confidence: 0,
          timestamp: Date.now(),
        },
        testCases: [],
        failedTestCases: [],
        result: "failure",
        improvementRatio: 0,
        notes: `Error: ${String(error)}`,
      };
    }
  }

  /**
   * 运行多个进化循环
   */
  async runEvolutionCycles(count: number): Promise<EvolutionCycle[]> {
    const cycles: EvolutionCycle[] = [];
    let consecutiveFailures = 0;

    for (let i = 0; i < count; i++) {
      console.log(`\n[EvolutionEngine] Running evolution cycle ${i + 1}/${count}`);

      const cycle = await this.runEvolutionCycle();
      cycles.push(cycle);

      if (cycle.result === "failure") {
        consecutiveFailures++;
        if (consecutiveFailures >= this.config.maxConsecutiveFailures) {
          console.warn(`[EvolutionEngine] Stopping evolution: ${consecutiveFailures} consecutive failures`);
          break;
        }
      } else {
        consecutiveFailures = 0;
      }

      // 等待一段时间再进行下一个循环
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return cycles;
  }

  /**
   * 获取进化历史
   */
  getEvolutionHistory(): EvolutionCycle[] {
    return [...this.evolutionCycles];
  }

  /**
   * 获取进化统计
   */
  getEvolutionStats() {
    const successCount = this.evolutionCycles.filter((c) => c.result === "success").length;
    const failureCount = this.evolutionCycles.filter((c) => c.result === "failure").length;
    const avgImprovement = this.evolutionCycles.reduce((sum, c) => sum + c.improvementRatio, 0) / this.evolutionCycles.length;
    const maxImprovement = Math.max(...this.evolutionCycles.map((c) => c.improvementRatio), 0);

    const successRate = this.evolutionCycles.length > 0 ? (successCount / this.evolutionCycles.length) * 100 : 0;

    return {
      totalCycles: this.evolutionCycles.length,
      successCount,
      failureCount,
      successRate: Math.round(successRate * 100) / 100,
      avgImprovement: Math.round(avgImprovement * 100) / 100,
      maxImprovement: Math.round(maxImprovement * 100) / 100,
      currentGeneration: this.genomeManager.getCurrentGenome().generation,
    };
  }

  /**
   * 获取最佳基因
   */
  getBestGenome(): Genome {
    return this.genomeManager.getCurrentGenome();
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`[EvolutionEngine] Configuration updated: ${JSON.stringify(this.config)}`);
  }

  /**
   * 启动持续进化循环
   */
  async startContinuousEvolution(intervalMs: number = 60000): Promise<void> {
    if (this.isRunning) {
      console.warn("[EvolutionEngine] Evolution is already running");
      return;
    }

    this.isRunning = true;
    console.log(`[EvolutionEngine] Starting continuous evolution (interval: ${intervalMs}ms)`);

    while (this.isRunning) {
      try {
        await this.runEvolutionCycle();
      } catch (error) {
        console.error("[EvolutionEngine] Error in continuous evolution:", error);
      }

      // 等待指定时间
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  /**
   * 停止进化循环
   */
  stopContinuousEvolution(): void {
    this.isRunning = false;
    console.log("[EvolutionEngine] Continuous evolution stopped");
  }

  /**
   * 获取进化报告
   */
  generateEvolutionReport(): string {
    const stats = this.getEvolutionStats();
    const currentGenome = this.getBestGenome();
    const genomeStats = this.genomeManager.getGenomeStats(currentGenome);

    const report = `
=== Nova-Mind 进化报告 ===

当前状态:
- 基因版本: ${currentGenome.version}
- 代数: ${currentGenome.generation}
- 节点数: ${genomeStats.nodeCount}
- 执行路径数: ${genomeStats.pathCount}

进化统计:
- 总循环数: ${stats.totalCycles}
- 成功次数: ${stats.successCount}
- 失败次数: ${stats.failureCount}
- 成功率: ${stats.successRate}%
- 平均改进: ${stats.avgImprovement}%
- 最大改进: ${stats.maxImprovement}%

最近的循环:
${this.evolutionCycles
  .slice(-5)
  .map(
    (c) =>
      `- 循环 ${c.cycleId}: ${c.result} (改进: ${c.improvementRatio.toFixed(2)}%) - ${c.notes}`
  )
  .join("\n")}
`;

    return report;
  }
}

// 导出工厂函数
export async function createEvolutionEngine(
  genomeManager: GenomeManager,
  evaluator: EvolutionEvaluator,
  proposer: MutationProposer
): Promise<EvolutionEngine> {
  return new EvolutionEngine(genomeManager, evaluator, proposer);
}
