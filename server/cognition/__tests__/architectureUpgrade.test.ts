/**
 * 架构升级集成测试
 * 
 * 验证三条升级主线的实现：
 * 1. 强化底层语义稳定性
 * 2. 增强元认知监控
 * 3. 引入目标生成机制
 */

import { describe, it, expect } from "vitest";
import { SemanticStabilityEngine } from "../semanticStabilityEngine";
import { MetacognitiveMonitor } from "../metacognitiveMonitor";
import { GoalGenerationEngine } from "../../autonomy/goalGenerationEngine";

describe("Architecture Upgrade Integration Tests", () => {
  describe("1. Semantic Stability Engine", () => {
    const engine = new SemanticStabilityEngine();

    it("should analyze input semantics with multi-dimensional approach", async () => {
      await engine.initialize();

      const result = await engine.analyzeInputSemantics(
        "What is the meaning of life?",
        {
          conversationHistory: ["Hello", "How are you?"],
          userProfile: { name: "Test User" },
        }
      );

      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("ambiguities");
      expect(result).toHaveProperty("riskLevel");
      expect(result).toHaveProperty("strategy");

      // 验证置信度在合理范围内
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should detect semantic ambiguities", async () => {
      const result = await engine.analyzeInputSemantics("I saw the bank yesterday");

      expect(result.ambiguities.length).toBeGreaterThan(0);
      expect(result.riskLevel).toBe("medium");
    });

    it("should perform reverse validation", async () => {
      const validation = await engine.reverseValidation(
        "What is artificial intelligence?",
        "Artificial intelligence is a field of computer science..."
      );

      expect(validation).toHaveProperty("isValid");
      expect(validation).toHaveProperty("semanticShiftRate");
      expect(validation).toHaveProperty("warnings");

      expect(validation.semanticShiftRate).toBeGreaterThanOrEqual(0);
      expect(validation.semanticShiftRate).toBeLessThanOrEqual(1);
    });

    it("should generate stability report", async () => {
      const report = await engine.getStabilityReport("test-user");

      expect(report).toHaveProperty("baselineConfidence");
      expect(report).toHaveProperty("recentErrors");
      expect(report).toHaveProperty("topErrorPatterns");
      expect(report).toHaveProperty("recommendations");

      expect(report.baselineConfidence).toBeGreaterThan(0.5);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("2. Metacognitive Monitor", () => {
    const monitor = new MetacognitiveMonitor();

    it("should analyze reasoning chain quality", () => {
      const reasoning = [
        {
          step: "Premise 1",
          type: "deduction" as const,
          premises: ["All humans are mortal", "Socrates is human"],
          conclusion: "Socrates is mortal",
        },
        {
          step: "Premise 2",
          type: "deduction" as const,
          premises: ["Socrates is mortal"],
          conclusion: "Socrates will die",
        },
      ];

      const metrics = monitor.analyzeReasoningChain(reasoning);

      expect(metrics).toHaveProperty("chainLength");
      expect(metrics).toHaveProperty("logicalJumpDensity");
      expect(metrics).toHaveProperty("confidence");
      expect(metrics).toHaveProperty("errorProbability");
      expect(metrics).toHaveProperty("complexityScore");
      expect(metrics).toHaveProperty("shouldContinueReasoning");

      expect(metrics.chainLength).toBe(2);
      expect(metrics.confidence).toBeGreaterThan(0);
      expect(metrics.errorProbability).toBe(1 - metrics.confidence);
    });

    it("should generate uncertainty index", () => {
      const reasoning = [
        {
          step: "Test",
          type: "deduction" as const,
          premises: ["Premise 1"],
          conclusion: "Conclusion 1",
        },
      ];

      const metrics = monitor.analyzeReasoningChain(reasoning);
      const uncertainty = monitor.generateUncertaintyIndex(0.8, metrics, 0.7);

      expect(uncertainty).toHaveProperty("overall");
      expect(uncertainty).toHaveProperty("knowledge");
      expect(uncertainty).toHaveProperty("reasoning");
      expect(uncertainty).toHaveProperty("context");
      expect(uncertainty).toHaveProperty("strategy");

      expect(uncertainty.overall).toBeGreaterThanOrEqual(0);
      expect(uncertainty.overall).toBeLessThanOrEqual(1);
    });

    it("should monitor reasoning quality in real-time", () => {
      const reasoning = [
        {
          step: "Step 1",
          type: "deduction" as const,
          premises: ["A", "B"],
          conclusion: "C",
        },
      ];

      const quality = monitor.monitorReasoningQuality(reasoning);

      expect(quality).toHaveProperty("quality");
      expect(quality).toHaveProperty("issues");
      expect(quality).toHaveProperty("recommendations");

      expect(["excellent", "good", "acceptable", "poor"]).toContain(quality.quality);
    });

    it("should identify high-risk inferences", () => {
      const reasoning = [
        {
          step: "Risky inference",
          type: "abduction" as const,
          premises: ["Single premise"],
          conclusion: "Very different conclusion",
        },
      ];

      const metrics = monitor.analyzeReasoningChain(reasoning);

      expect(metrics.riskInferences.length).toBeGreaterThan(0);
    });
  });

  describe("3. Goal Generation Engine", () => {
    const engine = new GoalGenerationEngine();

    it("should identify knowledge gaps", async () => {
      const gaps = await engine.identifyKnowledgeGaps({
        failedQuestions: ["What is quantum computing?"],
        uncertainInferences: ["The relationship between A and B is unclear"],
        missingConnections: ["Connection between concept X and Y"],
        userFeedback: ["You misunderstood my question"],
      });

      expect(gaps.length).toBeGreaterThan(0);
      gaps.forEach((gap) => {
        expect(gap).toHaveProperty("description");
        expect(gap).toHaveProperty("priority");
        expect(gap).toHaveProperty("expectedBenefit");
        expect(gap).toHaveProperty("resourceRequired");
        expect(gap).toHaveProperty("difficulty");
      });
    });

    it("should select learning goals based on resources", async () => {
      await engine.identifyKnowledgeGaps({
        failedQuestions: ["Question 1", "Question 2", "Question 3"],
      });

      const goals = engine.selectLearningGoals(1000, 3);

      expect(goals.length).toBeGreaterThan(0);
      expect(goals.length).toBeLessThanOrEqual(3);

      goals.forEach((goal) => {
        expect(goal).toHaveProperty("goal");
        expect(goal).toHaveProperty("priority");
      });
    });

    it("should validate learning outcomes", async () => {
      const outcome = await engine.validateLearningOutcome(
        "Learn about quantum computing",
        "Quantum computers use quantum bits (qubits) for computation",
        { uncertainty: 0.8, inferenceEfficiency: 0.5 },
        { uncertainty: 0.3, inferenceEfficiency: 0.8 }
      );

      expect(outcome).toHaveProperty("goal");
      expect(outcome).toHaveProperty("knowledge");
      expect(outcome).toHaveProperty("uncertaintyReduction");
      expect(outcome).toHaveProperty("efficiencyGain");
      expect(outcome).toHaveProperty("successRate");

      // 验证不确定性确实降低了
      expect(outcome.uncertaintyReduction).toBeGreaterThan(0);
      // 验证效率提升了
      expect(outcome.efficiencyGain).toBeGreaterThan(0);
    });

    it("should resolve resource conflicts", () => {
      const goals = [
        { goal: "Goal 1", priority: 0.8, resourceRequired: 200 },
        { goal: "Goal 2", priority: 0.7, resourceRequired: 300 },
        { goal: "Goal 3", priority: 0.9, resourceRequired: 400 },
      ];

      const allocation = engine.resolveResourceConflicts(goals, 1000);

      expect(allocation).toHaveProperty("totalResources");
      expect(allocation).toHaveProperty("allocation");
      expect(allocation).toHaveProperty("conflicts");

      // 验证分配的资源不超过总资源
      const totalAllocated = allocation.allocation.reduce(
        (sum, a) => sum + a.allocatedResources,
        0
      );
      expect(totalAllocated).toBeLessThanOrEqual(allocation.totalResources);
    });

    it("should generate goal generation report", () => {
      const report = engine.getGoalGenerationReport();

      expect(report).toHaveProperty("identifiedGaps");
      expect(report).toHaveProperty("selectedGoals");
      expect(report).toHaveProperty("completedLearning");
      expect(report).toHaveProperty("averageSuccessRate");
      expect(report).toHaveProperty("recommendations");

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Integration: Complete Cognitive Loop", () => {
    it("should integrate all three systems into a coherent flow", async () => {
      const semanticEngine = new SemanticStabilityEngine();
      const metacognitive = new MetacognitiveMonitor();
      const goalEngine = new GoalGenerationEngine();

      await semanticEngine.initialize();

      // 1. 分析输入的语义稳定性
      const semanticAnalysis = await semanticEngine.analyzeInputSemantics(
        "How can I improve my learning efficiency?"
      );
      expect(semanticAnalysis.confidence).toBeGreaterThan(0);

      // 2. 识别知识空白
      const gaps = await goalEngine.identifyKnowledgeGaps({
        failedQuestions: ["How does learning work?"],
      });
      expect(gaps.length).toBeGreaterThan(0);

      // 3. 选择学习目标
      const goals = goalEngine.selectLearningGoals(1000);
      expect(goals.length).toBeGreaterThan(0);

      // 4. 模拟推理过程
      const reasoning = [
        {
          step: "Learning improves with practice",
          type: "induction" as const,
          premises: ["I practiced and improved", "Others practiced and improved"],
          conclusion: "Practice leads to improvement",
        },
      ];

      // 5. 监控推理质量
      const quality = metacognitive.monitorReasoningQuality(reasoning);
      expect(quality.quality).toBeDefined();

      // 6. 验证学习成果
      const outcome = await goalEngine.validateLearningOutcome(
        "Understand learning mechanisms",
        "Learning is a process of knowledge acquisition through practice",
        { uncertainty: 0.7, inferenceEfficiency: 0.5 },
        { uncertainty: 0.3, inferenceEfficiency: 0.8 }
      );
      expect(outcome.successRate).toBeGreaterThan(0);

      console.log("✅ Complete cognitive loop integration successful");
    });
  });
});
