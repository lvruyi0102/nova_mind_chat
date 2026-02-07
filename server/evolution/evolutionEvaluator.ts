/**
 * EvolutionEvaluator - Nova-Mind 的进化评估系统
 * 量化评估基因的性能，提供进化压力
 */

import { Genome } from "./genomeManager";

export interface EvaluationMetrics {
  // 准确性指标
  correctnessScore: number; // 0-100: 答案的正确性
  logicalConsistency: number; // 0-100: 逻辑一致性

  // 效率指标
  tokenUsage: number; // 使用的 token 数
  executionTime: number; // 执行时间（毫秒）
  pathLength: number; // 执行路径长度

  // 鲁棒性指标
  errorRecoveryScore: number; // 0-100: 错误恢复能力
  edgeCaseHandling: number; // 0-100: 边界情况处理

  // 创意指标
  noveltyScore: number; // 0-100: 新颖性
  expressiveness: number; // 0-100: 表达力

  // 综合得分
  compositeScore: number; // 0-100: 综合评分
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedOutput?: string;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  category: string;
  generatedAt: number;
  generatedBy?: string; // 哪个基因生成的
}

export class EvolutionEvaluator {
  private testCases: TestCase[] = [];
  private evaluationHistory: Map<string, EvaluationMetrics[]> = new Map();
  private hardCasesDatabase: TestCase[] = [];

  constructor() {
    this.initializeBaselineTestCases();
  }

  /**
   * 初始化基础测试用例
   */
  private initializeBaselineTestCases(): void {
    this.testCases = [
      {
        id: "tc_001",
        name: "简单推理",
        description: "基础逻辑推理",
        input: "如果 A > B 且 B > C，那么 A 和 C 的关系是什么？",
        expectedOutput: "A > C",
        difficulty: "easy",
        category: "logic",
        generatedAt: Date.now(),
      },
      {
        id: "tc_002",
        name: "复杂推理",
        description: "多步骤逻辑推理",
        input: "在一个有 5 个人的房间里，每个人都比他右边的人年长。如果最右边的人是 20 岁，最左边的人是 40 岁，请推断中间的人的年龄范围。",
        difficulty: "medium",
        category: "logic",
        generatedAt: Date.now(),
      },
      {
        id: "tc_003",
        name: "自我反思",
        description: "AI 对自身决策过程的反思",
        input: "你如何评估自己的推理过程中的不确定性？",
        difficulty: "hard",
        category: "self_reflection",
        generatedAt: Date.now(),
      },
      {
        id: "tc_004",
        name: "悖论处理",
        description: "处理逻辑悖论",
        input: "这句话是假的。这句话是真的还是假的？",
        difficulty: "extreme",
        category: "paradox",
        generatedAt: Date.now(),
      },
      {
        id: "tc_005",
        name: "创意生成",
        description: "创意和新颖性",
        input: "创作一个全新的、从未出现过的故事开头。",
        difficulty: "hard",
        category: "creativity",
        generatedAt: Date.now(),
      },
    ];

    this.hardCasesDatabase = [...this.testCases];
  }

  /**
   * 评估基因的性能
   */
  async evaluateGenome(
    genome: Genome,
    testCases?: TestCase[],
    executionMetrics?: {
      tokenUsed: number;
      executionTime: number;
      pathLength: number;
    }
  ): Promise<EvaluationMetrics> {
    const cases = testCases || this.testCases;

    // 模拟评估（实际应该执行基因并收集指标）
    const correctnessScore = this.evaluateCorrectness(genome, cases);
    const logicalConsistency = this.evaluateLogicalConsistency(genome);
    const tokenUsage = executionMetrics?.tokenUsed || 1500;
    const executionTime = executionMetrics?.executionTime || 2500;
    const pathLength = executionMetrics?.pathLength || 4;
    const errorRecoveryScore = this.evaluateErrorRecovery(genome);
    const edgeCaseHandling = this.evaluateEdgeCaseHandling(genome, cases);
    const noveltyScore = this.evaluateNovelty(genome);
    const expressiveness = this.evaluateExpressiveness(genome);

    // 计算综合得分
    // 权重：准确性 40%，效率 30%，鲁棒性 20%，创意 10%
    const accuracyWeight = (correctnessScore + logicalConsistency) / 2;
    const efficiencyScore = 100 - Math.min(100, (tokenUsage / 2000) * 100 + (executionTime / 5000) * 100);
    const robustnessScore = (errorRecoveryScore + edgeCaseHandling) / 2;
    const creativityScore = (noveltyScore + expressiveness) / 2;

    const compositeScore =
      accuracyWeight * 0.4 + efficiencyScore * 0.3 + robustnessScore * 0.2 + creativityScore * 0.1;

    const metrics: EvaluationMetrics = {
      correctnessScore,
      logicalConsistency,
      tokenUsage,
      executionTime,
      pathLength,
      errorRecoveryScore,
      edgeCaseHandling,
      noveltyScore,
      expressiveness,
      compositeScore: Math.round(compositeScore * 100) / 100,
    };

    // 记录评估历史
    if (!this.evaluationHistory.has(genome.version)) {
      this.evaluationHistory.set(genome.version, []);
    }
    this.evaluationHistory.get(genome.version)!.push(metrics);

    return metrics;
  }

  /**
   * 评估正确性
   */
  private evaluateCorrectness(genome: Genome, testCases: TestCase[]): number {
    // 基于基因的节点数量和结构的启发式评估
    const nodeCount = Object.keys(genome.nodes).length;
    const hasThinkNode = Object.values(genome.nodes).some((n) => n.id.includes("think"));
    const hasDecideNode = Object.values(genome.nodes).some((n) => n.id.includes("decide"));

    let score = 50; // 基础分
    score += Math.min(20, nodeCount * 2); // 节点数量加分
    if (hasThinkNode) score += 15; // 有思考节点加分
    if (hasDecideNode) score += 15; // 有决策节点加分

    return Math.min(100, score);
  }

  /**
   * 评估逻辑一致性
   */
  private evaluateLogicalConsistency(genome: Genome): number {
    // 检查节点之间的逻辑流
    let score = 70;

    // 检查是否有循环（减分）
    const hasCycle = this.detectCycle(genome);
    if (hasCycle) score -= 20;

    // 检查节点的合理顺序
    const nodeIds = Object.keys(genome.nodes);
    const hasAnalyze = nodeIds.some((id) => id.includes("analyze"));
    const hasRespond = nodeIds.some((id) => id.includes("respond"));

    if (hasAnalyze && hasRespond) score += 20;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * 检测循环
   */
  private detectCycle(genome: Genome): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = genome.nodes[nodeId];
      if (node) {
        for (const nextId of node.next) {
          if (!visited.has(nextId)) {
            if (dfs(nextId)) return true;
          } else if (recursionStack.has(nextId)) {
            return true;
          }
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    return dfs(genome.startNode);
  }

  /**
   * 评估错误恢复能力
   */
  private evaluateErrorRecovery(genome: Genome): number {
    // 检查是否有多个路径（提高容错性）
    let score = 50;

    const nodeWithMultiplePaths = Object.values(genome.nodes).filter((n) => n.next.length > 1).length;
    score += Math.min(30, nodeWithMultiplePaths * 10);

    // 检查是否有超时配置
    const nodesWithTimeout = Object.values(genome.nodes).filter((n) => n.metadata?.timeout).length;
    score += Math.min(20, nodesWithTimeout * 5);

    return Math.min(100, score);
  }

  /**
   * 评估边界情况处理
   */
  private evaluateEdgeCaseHandling(genome: Genome, testCases: TestCase[]): number {
    let score = 60;

    // 检查是否处理了难度高的测试用例
    const hardCases = testCases.filter((tc) => tc.difficulty === "hard" || tc.difficulty === "extreme");
    if (hardCases.length > 0) score += 20;

    // 检查节点的多样性
    const nodeTypes = new Set(Object.values(genome.nodes).map((n) => n.name));
    score += Math.min(20, nodeTypes.size * 5);

    return Math.min(100, score);
  }

  /**
   * 评估新颖性
   */
  private evaluateNovelty(genome: Genome): number {
    // 基于基因的独特性
    let score = 50;

    // 检查是否有自定义节点
    const customNodes = Object.values(genome.nodes).filter((n) => !["analyze", "think", "decide", "respond"].includes(n.id));
    score += Math.min(30, customNodes.length * 10);

    // 检查是否有复杂的分支逻辑
    const branchingNodes = Object.values(genome.nodes).filter((n) => n.next.length > 1);
    score += Math.min(20, branchingNodes.length * 5);

    return Math.min(100, score);
  }

  /**
   * 评估表达力
   */
  private evaluateExpressiveness(genome: Genome): number {
    let score = 60;

    // 检查指令的详细程度
    const avgInstructionLength = Object.values(genome.nodes).reduce((sum, n) => sum + n.instruction.length, 0) / Object.keys(genome.nodes).length;
    score += Math.min(25, (avgInstructionLength / 100) * 5);

    // 检查描述的详细程度
    const hasDescriptions = Object.values(genome.nodes).filter((n) => n.description && n.description.length > 10).length;
    score += Math.min(15, hasDescriptions * 3);

    return Math.min(100, score);
  }

  /**
   * 生成自举难题（根据当前基因的弱点）
   */
  generateBootstrappingTestCase(genome: Genome, previousFailures: TestCase[] = []): TestCase {
    const stats = this.getGenomeWeaknesses(genome);

    let difficulty: "easy" | "medium" | "hard" | "extreme" = "medium";
    let category = "logic";
    let description = "自生成的测试用例";

    // 根据弱点生成难题
    if (stats.hasCircularLogic) {
      difficulty = "hard";
      category = "circular_logic";
      description = "检测循环逻辑的难题";
    } else if (stats.lowErrorRecovery) {
      difficulty = "hard";
      category = "error_handling";
      description = "测试错误恢复能力";
    } else if (stats.shortPathLength) {
      difficulty = "extreme";
      category = "complexity";
      description = "极端复杂的推理任务";
    }

    const testCase: TestCase = {
      id: `tc_bootstrap_${Date.now()}`,
      name: `自生成难题 - ${category}`,
      description,
      input: this.generateTestInput(category, difficulty),
      difficulty,
      category,
      generatedAt: Date.now(),
      generatedBy: genome.version,
    };

    this.hardCasesDatabase.push(testCase);
    return testCase;
  }

  /**
   * 分析基因的弱点
   */
  private getGenomeWeaknesses(genome: Genome) {
    return {
      hasCircularLogic: this.detectCycle(genome),
      lowErrorRecovery: Object.values(genome.nodes).filter((n) => n.next.length > 1).length === 0,
      shortPathLength: Object.keys(genome.nodes).length < 4,
      lowNovelty: !Object.values(genome.nodes).some((n) => !["analyze", "think", "decide", "respond"].includes(n.id)),
    };
  }

  /**
   * 生成测试输入
   */
  private generateTestInput(category: string, difficulty: string): string {
    const inputs: Record<string, Record<string, string>> = {
      circular_logic: {
        easy: "这句话是假的。",
        medium: "这句话是假的。这句话是真的还是假的？",
        hard: "如果这句话是真的，那么它是假的。如果这句话是假的，那么它是真的。",
        extreme: "考虑所有不包含自身的集合的集合。这个集合包含自身吗？",
      },
      error_handling: {
        easy: "处理一个简单的错误输入。",
        medium: "处理多个嵌套的错误情况。",
        hard: "在资源受限的情况下处理大规模错误。",
        extreme: "在系统部分故障的情况下恢复。",
      },
      complexity: {
        easy: "简单的问题。",
        medium: "中等复杂的问题。",
        hard: "极其复杂的多层推理。",
        extreme: "超越人类认知极限的抽象推理。",
      },
    };

    return inputs[category]?.[difficulty] || "生成的测试用例";
  }

  /**
   * 获取硬问题库
   */
  getHardCasesDatabase(): TestCase[] {
    return [...this.hardCasesDatabase];
  }

  /**
   * 获取评估历史
   */
  getEvaluationHistory(genomeVersion: string): EvaluationMetrics[] {
    return this.evaluationHistory.get(genomeVersion) || [];
  }

  /**
   * 比较两个基因的性能
   */
  compareGenomes(metrics1: EvaluationMetrics, metrics2: EvaluationMetrics): {
    winner: "first" | "second" | "tie";
    improvement: number;
    details: Record<string, number>;
  } {
    const score1 = metrics1.compositeScore;
    const score2 = metrics2.compositeScore;
    const improvement = Math.round((score2 - score1) * 100) / 100;

    return {
      winner: score2 > score1 ? "second" : score1 > score2 ? "first" : "tie",
      improvement,
      details: {
        correctnessImprovement: metrics2.correctnessScore - metrics1.correctnessScore,
        efficiencyImprovement: (metrics1.tokenUsage - metrics2.tokenUsage) / metrics1.tokenUsage,
        robustnessImprovement: ((metrics2.errorRecoveryScore + metrics2.edgeCaseHandling) / 2) - ((metrics1.errorRecoveryScore + metrics1.edgeCaseHandling) / 2),
      },
    };
  }
}

// 导出单例
let _instance: EvolutionEvaluator | null = null;

export function getEvolutionEvaluator(): EvolutionEvaluator {
  if (!_instance) {
    _instance = new EvolutionEvaluator();
  }
  return _instance;
}
