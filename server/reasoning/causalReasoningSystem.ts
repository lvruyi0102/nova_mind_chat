/**
 * 因果推理系统 - 支持因果图构建、因果关系识别、反事实推理
 * 用于理解事件之间的因果关系和进行假设推理
 */

import { invokeLLM } from "../_core/llm";

export interface CausalNode {
  id: string;
  name: string;
  type: "cause" | "effect" | "intermediate";
  properties: Record<string, unknown>;
}

export interface CausalEdge {
  source: string;
  target: string;
  strength: number; // 0-1，因果强度
  type: "direct" | "indirect";
  mechanism: string; // 因果机制的描述
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: CausalEdge[];
}

export interface CausalAnalysisResult {
  rootCauses: string[];
  directCauses: string[];
  indirectCauses: string[];
  effects: string[];
  causalChains: string[][];
  confidence: number;
  explanation: string;
}

export interface CounterfactualAnalysis {
  scenario: string;
  intervention: string;
  expectedOutcome: string;
  actualOutcome: string;
  difference: string;
  confidence: number;
}

export class CausalReasoningSystem {
  private causalGraphs: Map<string, CausalGraph> = new Map();
  private causalRelations: Map<string, Set<string>> = new Map();
  private interventionHistory: CounterfactualAnalysis[] = [];

  /**
   * 创建或获取因果图
   */
  createCausalGraph(graphId: string): CausalGraph {
    if (!this.causalGraphs.has(graphId)) {
      this.causalGraphs.set(graphId, {
        nodes: new Map(),
        edges: [],
      });
    }
    return this.causalGraphs.get(graphId)!;
  }

  /**
   * 添加节点到因果图
   */
  addNode(graphId: string, node: CausalNode): void {
    const graph = this.createCausalGraph(graphId);
    graph.nodes.set(node.id, node);
  }

  /**
   * 添加边到因果图
   */
  addEdge(graphId: string, edge: CausalEdge): void {
    const graph = this.createCausalGraph(graphId);
    graph.edges.push(edge);

    // 更新因果关系索引
    if (!this.causalRelations.has(edge.source)) {
      this.causalRelations.set(edge.source, new Set());
    }
    this.causalRelations.get(edge.source)!.add(edge.target);
  }

  /**
   * 识别根本原因
   */
  identifyRootCauses(graphId: string, effect: string): string[] {
    const graph = this.causalGraphs.get(graphId);
    if (!graph) return [];

    const visited = new Set<string>();
    const rootCauses: string[] = [];

    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      // 找到指向该节点的所有边
      const incomingEdges = graph.edges.filter((e) => e.target === nodeId);

      if (incomingEdges.length === 0) {
        // 没有入边，这是根本原因
        rootCauses.push(nodeId);
      } else {
        // 继续向上遍历
        for (const edge of incomingEdges) {
          traverse(edge.source);
        }
      }
    };

    traverse(effect);
    return rootCauses;
  }

  /**
   * 追踪因果链
   */
  traceCausalChains(graphId: string, start: string, end: string): string[][] {
    const graph = this.causalGraphs.get(graphId);
    if (!graph) return [];

    const chains: string[][] = [];
    const visited = new Set<string>();

    const dfs = (current: string, path: string[]) => {
      if (current === end) {
        chains.push([...path, current]);
        return;
      }

      if (visited.has(current)) return;
      visited.add(current);

      // 找到从当前节点出发的所有边
      const outgoingEdges = graph.edges.filter((e) => e.source === current);

      for (const edge of outgoingEdges) {
        dfs(edge.target, [...path, current]);
      }

      visited.delete(current);
    };

    dfs(start, []);
    return chains;
  }

  /**
   * 分析因果关系
   */
  async analyzeCausalRelationships(
    effect: string,
    context: string[]
  ): Promise<CausalAnalysisResult> {
    try {
      // 使用 LLM 识别因果关系
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a causal analysis expert. Analyze the causal relationships for the given effect.
Identify root causes, direct causes, indirect causes, and effects.
Provide your analysis as a JSON object.`,
          },
          {
            role: "user",
            content: `Effect: ${effect}\n\nContext: ${context.join(", ")}\n\nAnalyze the causal relationships.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "causal_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                rootCauses: {
                  type: "array",
                  items: { type: "string" },
                },
                directCauses: {
                  type: "array",
                  items: { type: "string" },
                },
                indirectCauses: {
                  type: "array",
                  items: { type: "string" },
                },
                effects: {
                  type: "array",
                  items: { type: "string" },
                },
                causalChains: {
                  type: "array",
                  items: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                explanation: { type: "string" },
                confidence: { type: "number" },
              },
              required: [
                "rootCauses",
                "directCauses",
                "indirectCauses",
                "effects",
                "causalChains",
                "explanation",
                "confidence",
              ],
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const analysis = JSON.parse(typeof content === "string" ? content : "{}");

      return {
        rootCauses: analysis.rootCauses || [],
        directCauses: analysis.directCauses || [],
        indirectCauses: analysis.indirectCauses || [],
        effects: analysis.effects || [],
        causalChains: analysis.causalChains || [],
        confidence: analysis.confidence || 0.5,
        explanation: analysis.explanation || "",
      };
    } catch (error) {
      console.error("Causal analysis failed:", error);
      throw error;
    }
  }

  /**
   * 进行反事实推理
   */
  async counterfactualReasoning(
    scenario: string,
    intervention: string,
    actualOutcome: string
  ): Promise<CounterfactualAnalysis> {
    try {
      // 使用 LLM 进行反事实推理
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a counterfactual reasoning expert. Analyze what would have happened if the intervention had been made.
Provide your analysis as a JSON object.`,
          },
          {
            role: "user",
            content: `Scenario: ${scenario}\n\nIntervention: ${intervention}\n\nActual Outcome: ${actualOutcome}\n\nWhat would have been the expected outcome if the intervention had been made?`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "counterfactual_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                expectedOutcome: { type: "string" },
                difference: { type: "string" },
                confidence: { type: "number" },
              },
              required: ["expectedOutcome", "difference", "confidence"],
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const analysis = JSON.parse(typeof content === "string" ? content : "{}");

      const result: CounterfactualAnalysis = {
        scenario,
        intervention,
        expectedOutcome: analysis.expectedOutcome || "",
        actualOutcome,
        difference: analysis.difference || "",
        confidence: analysis.confidence || 0.5,
      };

      this.interventionHistory.push(result);
      return result;
    } catch (error) {
      console.error("Counterfactual reasoning failed:", error);
      throw error;
    }
  }

  /**
   * 计算因果影响
   */
  calculateCausalImpact(graphId: string, cause: string, effect: string): number {
    const graph = this.causalGraphs.get(graphId);
    if (!graph) return 0;

    // 找到从 cause 到 effect 的所有路径
    const chains = this.traceCausalChains(graphId, cause, effect);

    if (chains.length === 0) return 0;

    // 计算每条路径的强度
    let totalImpact = 0;
    for (const chain of chains) {
      let pathStrength = 1;

      for (let i = 0; i < chain.length - 1; i++) {
        const edge = graph.edges.find(
          (e) => e.source === chain[i] && e.target === chain[i + 1]
        );
        if (edge) {
          pathStrength *= edge.strength;
        }
      }

      totalImpact += pathStrength;
    }

    // 平均因果影响
    return totalImpact / chains.length;
  }

  /**
   * 进行敏感性分析
   */
  sensitivityAnalysis(
    graphId: string,
    cause: string,
    effect: string,
    variationRange: number = 0.1
  ): {
    baselineImpact: number;
    minImpact: number;
    maxImpact: number;
    sensitivity: number;
  } {
    const baselineImpact = this.calculateCausalImpact(graphId, cause, effect);

    // 模拟因果强度的变化
    const graph = this.causalGraphs.get(graphId);
    if (!graph) {
      return {
        baselineImpact: 0,
        minImpact: 0,
        maxImpact: 0,
        sensitivity: 0,
      };
    }

    // 保存原始强度
    const originalStrengths = new Map<number, number>();
    graph.edges.forEach((edge, index) => {
      originalStrengths.set(index, edge.strength);
    });

    // 计算最小影响
    graph.edges.forEach((edge) => {
      edge.strength = Math.max(0, edge.strength - variationRange);
    });
    const minImpact = this.calculateCausalImpact(graphId, cause, effect);

    // 计算最大影响
    graph.edges.forEach((edge) => {
      edge.strength = Math.min(1, edge.strength + 2 * variationRange);
    });
    const maxImpact = this.calculateCausalImpact(graphId, cause, effect);

    // 恢复原始强度
    graph.edges.forEach((edge, index) => {
      edge.strength = originalStrengths.get(index) || 0.5;
    });

    const sensitivity = (maxImpact - minImpact) / (baselineImpact || 1);

    return {
      baselineImpact,
      minImpact,
      maxImpact,
      sensitivity,
    };
  }

  /**
   * 获取因果图统计信息
   */
  getGraphStatistics(graphId: string): {
    nodeCount: number;
    edgeCount: number;
    averageStrength: number;
    maxPathLength: number;
  } {
    const graph = this.causalGraphs.get(graphId);
    if (!graph) {
      return {
        nodeCount: 0,
        edgeCount: 0,
        averageStrength: 0,
        maxPathLength: 0,
      };
    }

    const nodeCount = graph.nodes.size;
    const edgeCount = graph.edges.length;
    const averageStrength =
      edgeCount > 0
        ? graph.edges.reduce((sum, e) => sum + e.strength, 0) / edgeCount
        : 0;

    // 计算最长路径
    let maxPathLength = 0;
    for (const startNode of graph.nodes.keys()) {
      for (const endNode of graph.nodes.keys()) {
        const chains = this.traceCausalChains(graphId, startNode, endNode);
        for (const chain of chains) {
          maxPathLength = Math.max(maxPathLength, chain.length);
        }
      }
    }

    return {
      nodeCount,
      edgeCount,
      averageStrength,
      maxPathLength,
    };
  }

  /**
   * 获取干预历史
   */
  getInterventionHistory(): CounterfactualAnalysis[] {
    return this.interventionHistory;
  }

  /**
   * 清空干预历史
   */
  clearInterventionHistory(): void {
    this.interventionHistory = [];
  }
}

/**
 * 创建全局因果推理系统实例
 */
let _causalReasoningSystem: CausalReasoningSystem | null = null;

export async function getCausalReasoningSystem(): Promise<CausalReasoningSystem> {
  if (!_causalReasoningSystem) {
    _causalReasoningSystem = new CausalReasoningSystem();
  }
  return _causalReasoningSystem;
}
