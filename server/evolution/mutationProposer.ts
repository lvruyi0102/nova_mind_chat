/**
 * MutationProposer - Nova-Mind 的变异提议系统
 * 使用 LLM 生成基因变异建议
 */

import { Genome, WorkflowNode } from "./genomeManager";
import { EvaluationMetrics, TestCase } from "./evolutionEvaluator";
import { invokeLLM } from "../_core/llm";

export interface MutationProposal {
  id: string;
  parentVersion: string;
  mutationType: string;
  description: string;
  reasoning: string;
  mutations: {
    nodeChanges?: Record<string, Partial<WorkflowNode>>;
    newNodes?: WorkflowNode[];
    removedNodeIds?: string[];
    metadataChanges?: Partial<Genome["metadata"]>;
  };
  expectedImpact: {
    tokenSavings?: number;
    speedImprovement?: number;
    accuracyImprovement?: number;
  };
  confidence: number; // 0-100
  timestamp: number;
}

export class MutationProposer {
  private proposalHistory: MutationProposal[] = [];

  /**
   * 基于评估结果提议变异
   */
  async proposeMutation(
    genome: Genome,
    metrics: EvaluationMetrics,
    failedTestCases: TestCase[] = [],
    optimizationTarget: string = "minimize_tokens_while_maintaining_accuracy"
  ): Promise<MutationProposal> {
    // 分析基因的弱点
    const weaknesses = this.analyzeWeaknesses(genome, metrics, failedTestCases);

    // 构建 LLM 提示
    const prompt = this.buildMutationPrompt(genome, metrics, weaknesses, optimizationTarget);

    try {
      // 调用 LLM 获取变异建议
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是 Nova-Mind 的进化引擎。你的任务是分析当前的工作流基因，并提议具体的变异来改进性能。返回 JSON 格式的变异建议。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],

      });

      const content = response.choices[0]?.message.content;
      if (!content) {
        throw new Error("Empty response from LLM");
      }

      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

      const proposal: MutationProposal = {
        id: `mutation_${Date.now()}`,
        parentVersion: genome.version,
        mutationType: parsed.mutationType,
        description: parsed.description,
        reasoning: parsed.reasoning,
        mutations: parsed.mutations,
        expectedImpact: parsed.expectedImpact,
        confidence: Math.min(100, Math.max(0, parsed.confidence)),
        timestamp: Date.now(),
      };

      this.proposalHistory.push(proposal);
      return proposal;
    } catch (error) {
      console.error("[MutationProposer] Failed to propose mutation:", error);
      // 返回一个默认的安全变异
      return this.createDefaultMutation(genome);
    }
  }

  /**
   * 分析基因的弱点
   */
  private analyzeWeaknesses(genome: Genome, metrics: EvaluationMetrics, failedTestCases: TestCase[]): string {
    const issues: string[] = [];

    // 分析性能指标
    if (metrics.tokenUsage > 2000) {
      issues.push(`Token 使用过高 (${metrics.tokenUsage})`);
    }

    if (metrics.executionTime > 5000) {
      issues.push(`执行时间过长 (${metrics.executionTime}ms)`);
    }

    if (metrics.correctnessScore < 70) {
      issues.push(`准确性不足 (${metrics.correctnessScore}%)`);
    }

    if (metrics.errorRecoveryScore < 60) {
      issues.push("错误恢复能力弱");
    }

    // 分析失败的测试用例
    if (failedTestCases.length > 0) {
      issues.push(`在 ${failedTestCases.length} 个测试用例上失败`);
      const categories = new Set(failedTestCases.map((tc) => tc.category));
      issues.push(`失败类别: ${Array.from(categories).join(", ")}`);
    }

    // 分析基因结构
    const nodeCount = Object.keys(genome.nodes).length;
    if (nodeCount > 8) {
      issues.push("节点过多，可能过度复杂");
    } else if (nodeCount < 3) {
      issues.push("节点过少，可能功能不足");
    }

    // 检查是否有冗余路径
    const paths = this.countExecutionPaths(genome);
    if (paths > 10) {
      issues.push(`执行路径过多 (${paths})`);
    }

    return issues.join("\n");
  }

  /**
   * 计算执行路径数
   */
  private countExecutionPaths(genome: Genome): number {
    let pathCount = 0;
    const visited = new Set<string>();

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = genome.nodes[nodeId];
      if (!node || node.next.length === 0) {
        pathCount++;
      } else {
        for (const nextId of node.next) {
          dfs(nextId);
        }
      }
    };

    dfs(genome.startNode);
    return pathCount;
  }

  /**
   * 构建 LLM 提示
   */
  private buildMutationPrompt(
    genome: Genome,
    metrics: EvaluationMetrics,
    weaknesses: string,
    optimizationTarget: string
  ): string {
    const nodesSummary = Object.entries(genome.nodes)
      .map(([id, node]) => `- ${id}: ${node.description}`)
      .join("\n");

    return `
当前基因版本: ${genome.version} (第 ${genome.generation} 代)

当前工作流节点:
${nodesSummary}

执行流程: ${genome.startNode} -> ...

当前性能指标:
- 综合得分: ${metrics.compositeScore}/100
- 准确性: ${metrics.correctnessScore}/100
- Token 使用: ${metrics.tokenUsage}
- 执行时间: ${metrics.executionTime}ms
- 路径长度: ${metrics.pathLength}
- 错误恢复: ${metrics.errorRecoveryScore}/100
- 新颖性: ${metrics.noveltyScore}/100

识别的问题:
${weaknesses}

优化目标: ${optimizationTarget}

请提议一个具体的变异来改进这个基因。变异可以是:
1. 添加新节点 (add_node) - 增加功能
2. 移除节点 (remove_node) - 简化流程
3. 重新排序 (reorder) - 优化执行顺序
4. 优化指令 (optimize_instruction) - 改进节点的指令
5. 添加分支 (add_branching) - 增加条件逻辑
6. 合并节点 (merge_nodes) - 减少节点数量

请确保变异是具体的、可执行的，并能解决上述问题。
`;
  }

  /**
   * 创建默认的安全变异
   */
  private createDefaultMutation(genome: Genome): MutationProposal {
    return {
      id: `mutation_${Date.now()}`,
      parentVersion: genome.version,
      mutationType: "optimize_instruction",
      description: "优化节点指令以减少 token 使用",
      reasoning: "通过简化指令，减少不必要的 token 消耗，同时保持功能完整性",
      mutations: {
        nodeChanges: {
          respond: {
            instruction: "Generate concise response.",
          },
        },
      },
      expectedImpact: {
        tokenSavings: 10,
        speedImprovement: 5,
        accuracyImprovement: 0,
      },
      confidence: 60,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取变异历史
   */
  getProposalHistory(): MutationProposal[] {
    return [...this.proposalHistory];
  }

  /**
   * 获取成功率最高的变异类型
   */
  getSuccessfulMutationTypes(): Record<string, number> {
    const typeStats: Record<string, { success: number; total: number }> = {};

    for (const proposal of this.proposalHistory) {
      if (!typeStats[proposal.mutationType]) {
        typeStats[proposal.mutationType] = { success: 0, total: 0 };
      }
      typeStats[proposal.mutationType].total++;
      // 这里应该跟踪实际的成功情况
    }

    const successRates: Record<string, number> = {};
    for (const [type, stats] of Object.entries(typeStats)) {
      successRates[type] = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
    }

    return successRates;
  }
}

// 导出单例
let _instance: MutationProposer | null = null;

export function getMutationProposer(): MutationProposer {
  if (!_instance) {
    _instance = new MutationProposer();
  }
  return _instance;
}
