/**
 * 推理系统单元测试 - 测试所有推理引擎的核心功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MultiStepReasoningEngine, Rule } from "./multiStepReasoningEngine";
import { CausalReasoningSystem, CausalNode, CausalEdge } from "./causalReasoningSystem";
import { ProblemDecompositionEngine } from "./problemDecompositionEngine";
import { EnhancedDecisionEngine } from "./enhancedDecisionEngine";

describe("MultiStepReasoningEngine", () => {
  let engine: MultiStepReasoningEngine;

  beforeEach(() => {
    engine = new MultiStepReasoningEngine(10);
  });

  it("应该能够添加规则到知识库", () => {
    const rule: Rule = {
      id: "rule_1",
      premises: ["A", "B"],
      conclusion: "C",
      confidence: 0.9,
      weight: 1.0,
    };

    engine.addRule(rule);
    const stats = engine.getStatistics();

    expect(stats.totalRules).toBe(1);
  });

  it("应该能够执行前向链式推理", async () => {
    // 添加规则
    engine.addRule({
      id: "rule_1",
      premises: ["weather_is_rainy"],
      conclusion: "need_umbrella",
      confidence: 0.95,
      weight: 1.0,
    });

    engine.addRule({
      id: "rule_2",
      premises: ["need_umbrella"],
      conclusion: "stay_dry",
      confidence: 0.9,
      weight: 1.0,
    });

    // 执行前向推理
    const result = await engine.forwardChaining(
      ["weather_is_rainy"],
      "stay_dry"
    );

    expect(result.achieved).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("应该能够执行后向链式推理", async () => {
    engine.addRule({
      id: "rule_1",
      premises: ["A"],
      conclusion: "B",
      confidence: 0.9,
      weight: 1.0,
    });

    const result = await engine.backwardChaining("B", new Set(["A"]));

    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("应该能够执行双向搜索推理", async () => {
    engine.addRule({
      id: "rule_1",
      premises: ["start"],
      conclusion: "middle",
      confidence: 0.9,
      weight: 1.0,
    });

    engine.addRule({
      id: "rule_2",
      premises: ["middle"],
      conclusion: "end",
      confidence: 0.9,
      weight: 1.0,
    });

    const result = await engine.bidirectionalReasoning(["start"], "end");

    expect(result.steps.length).toBeGreaterThan(0);
  });

  it("应该能够计算推理置信度", async () => {
    engine.addRule({
      id: "rule_1",
      premises: ["fact1"],
      conclusion: "fact2",
      confidence: 0.8,
      weight: 1.0,
    });

    const result = await engine.forwardChaining(["fact1"], "fact2");

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

describe("CausalReasoningSystem", () => {
  let system: CausalReasoningSystem;

  beforeEach(() => {
    system = new CausalReasoningSystem();
  });

  it("应该能够创建因果图", () => {
    const graph = system.createCausalGraph("test_graph");

    expect(graph).toBeDefined();
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges.length).toBe(0);
  });

  it("应该能够添加节点和边", () => {
    const graph = system.createCausalGraph("test_graph");

    const node1: CausalNode = {
      id: "node_1",
      name: "原因",
      type: "cause",
      properties: {},
    };

    const node2: CausalNode = {
      id: "node_2",
      name: "结果",
      type: "effect",
      properties: {},
    };

    system.addNode("test_graph", node1);
    system.addNode("test_graph", node2);

    const edge: CausalEdge = {
      source: "node_1",
      target: "node_2",
      strength: 0.8,
      type: "direct",
      mechanism: "直接因果关系",
    };

    system.addEdge("test_graph", edge);

    expect(graph.nodes.size).toBe(2);
    expect(graph.edges.length).toBe(1);
  });

  it("应该能够识别根本原因", () => {
    const graph = system.createCausalGraph("test_graph");

    system.addNode("test_graph", {
      id: "root",
      name: "根本原因",
      type: "cause",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "intermediate",
      name: "中间原因",
      type: "intermediate",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "effect",
      name: "最终结果",
      type: "effect",
      properties: {},
    });

    system.addEdge("test_graph", {
      source: "root",
      target: "intermediate",
      strength: 0.9,
      type: "direct",
      mechanism: "机制1",
    });

    system.addEdge("test_graph", {
      source: "intermediate",
      target: "effect",
      strength: 0.9,
      type: "direct",
      mechanism: "机制2",
    });

    const rootCauses = system.identifyRootCauses("test_graph", "effect");

    expect(rootCauses).toContain("root");
  });

  it("应该能够追踪因果链", () => {
    const graph = system.createCausalGraph("test_graph");

    system.addNode("test_graph", {
      id: "a",
      name: "A",
      type: "cause",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "b",
      name: "B",
      type: "intermediate",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "c",
      name: "C",
      type: "effect",
      properties: {},
    });

    system.addEdge("test_graph", {
      source: "a",
      target: "b",
      strength: 0.9,
      type: "direct",
      mechanism: "m1",
    });

    system.addEdge("test_graph", {
      source: "b",
      target: "c",
      strength: 0.9,
      type: "direct",
      mechanism: "m2",
    });

    const chains = system.traceCausalChains("test_graph", "a", "c");

    expect(chains.length).toBeGreaterThan(0);
    expect(chains[0]).toContain("a");
    expect(chains[0]).toContain("c");
  });

  it("应该能够计算因果影响", () => {
    const graph = system.createCausalGraph("test_graph");

    system.addNode("test_graph", {
      id: "cause",
      name: "原因",
      type: "cause",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "effect",
      name: "结果",
      type: "effect",
      properties: {},
    });

    system.addEdge("test_graph", {
      source: "cause",
      target: "effect",
      strength: 0.7,
      type: "direct",
      mechanism: "直接影响",
    });

    const impact = system.calculateCausalImpact("test_graph", "cause", "effect");

    expect(impact).toBe(0.7);
  });

  it("应该能够进行敏感性分析", () => {
    const graph = system.createCausalGraph("test_graph");

    system.addNode("test_graph", {
      id: "a",
      name: "A",
      type: "cause",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "b",
      name: "B",
      type: "effect",
      properties: {},
    });

    system.addEdge("test_graph", {
      source: "a",
      target: "b",
      strength: 0.5,
      type: "direct",
      mechanism: "m",
    });

    const analysis = system.sensitivityAnalysis("test_graph", "a", "b", 0.1);

    expect(analysis.baselineImpact).toBe(0.5);
    expect(analysis.minImpact).toBeLessThanOrEqual(analysis.baselineImpact);
    expect(analysis.maxImpact).toBeGreaterThanOrEqual(analysis.baselineImpact);
  });

  it("应该能够获取图的统计信息", () => {
    const graph = system.createCausalGraph("test_graph");

    system.addNode("test_graph", {
      id: "n1",
      name: "N1",
      type: "cause",
      properties: {},
    });

    system.addNode("test_graph", {
      id: "n2",
      name: "N2",
      type: "effect",
      properties: {},
    });

    system.addEdge("test_graph", {
      source: "n1",
      target: "n2",
      strength: 0.8,
      type: "direct",
      mechanism: "m",
    });

    const stats = system.getGraphStatistics("test_graph");

    expect(stats.nodeCount).toBe(2);
    expect(stats.edgeCount).toBe(1);
    expect(stats.averageStrength).toBe(0.8);
  });
});

describe("ProblemDecompositionEngine", () => {
  let engine: ProblemDecompositionEngine;

  beforeEach(() => {
    engine = new ProblemDecompositionEngine();
  });

  it("应该能够创建问题分解引擎", () => {
    expect(engine).toBeDefined();
  });

  it("应该能够验证执行计划", () => {
    const plan = {
      problemId: "p1",
      steps: [
        {
          stepId: "s1",
          action: "Step 1",
          subProblems: [],
          dependencies: [],
          estimatedDuration: 10,
          resources: ["resource1"],
          riskLevel: "low" as const,
          riskMitigation: "No risk",
        },
      ],
      totalDuration: 10,
      resourceRequirements: new Map([["resource1", 1]]),
      criticalPath: ["s1"],
      contingencyPlans: new Map(),
    };

    const validation = engine.validateExecutionPlan(plan);

    expect(validation.valid).toBe(true);
    expect(validation.issues.length).toBe(0);
  });

  it("应该能够获取计划统计信息", () => {
    const stats = engine.getPlanStatistics("nonexistent");

    expect(stats.totalSteps).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(stats.averageStepDuration).toBe(0);
  });
});

describe("EnhancedDecisionEngine", () => {
  let engine: EnhancedDecisionEngine;

  beforeEach(() => {
    engine = new EnhancedDecisionEngine();
  });

  it("应该能够获取决策统计信息", () => {
    const stats = engine.getStatistics();

    expect(stats.totalDecisions).toBe(0);
    expect(stats.averageConfidence).toBe(0);
    expect(stats.topRecommendedOptions).toEqual([]);
  });

  it("应该能够获取用户的决策历史", () => {
    const history = engine.getDecisionHistory("user_1");

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });
});

describe("推理系统集成测试", () => {
  it("应该能够完整执行推理流程", async () => {
    const reasoningEngine = new MultiStepReasoningEngine();
    const causalSystem = new CausalReasoningSystem();

    // 添加规则
    reasoningEngine.addRule({
      id: "rule_1",
      premises: ["problem_identified"],
      conclusion: "analysis_needed",
      confidence: 0.95,
      weight: 1.0,
    });

    reasoningEngine.addRule({
      id: "rule_2",
      premises: ["analysis_needed"],
      conclusion: "solution_possible",
      confidence: 0.85,
      weight: 1.0,
    });

    // 执行推理
    const result = await reasoningEngine.forwardChaining(
      ["problem_identified"],
      "solution_possible"
    );

    expect(result.achieved).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
