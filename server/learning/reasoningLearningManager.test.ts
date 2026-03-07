import { describe, it, expect, beforeEach } from "vitest";
import { ReasoningLearningManager } from "./reasoningLearningManager";

describe("ReasoningLearningManager", () => {
  let manager: ReasoningLearningManager;

  beforeEach(() => {
    manager = new ReasoningLearningManager();
  });

  describe("learnFromReasoning", () => {
    it("应该从推理过程中学习符号", async () => {
      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "分析问题",
          reasoning: "这是一个复杂的决策问题，需要考虑多个因素",
          confidence: 0.8,
        },
        {
          stepNumber: 2,
          action: "评估选项",
          reasoning: "有三个主要选项，每个都有优缺点",
          confidence: 0.7,
        },
      ];

      const result = await manager.learnFromReasoning(reasoningSteps);

      expect(result).toBeDefined();
      expect(result.symbols).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.rules).toBeInstanceOf(Array);
      expect(result.overallQuality).toBeGreaterThanOrEqual(0);
      expect(result.overallQuality).toBeLessThanOrEqual(1);
      expect(result.learningTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("应该处理空的推理步骤", async () => {
      const result = await manager.learnFromReasoning([]);

      expect(result).toBeDefined();
      expect(result.symbols).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.rules).toBeInstanceOf(Array);
    });

    it("应该累积学习历史", async () => {
      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "第一次推理",
          reasoning: "学习第一个概念",
          confidence: 0.8,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);
      const history1 = manager.getLearningHistory();
      expect(history1.length).toBe(1);

      await manager.learnFromReasoning(reasoningSteps);
      const history2 = manager.getLearningHistory();
      expect(history2.length).toBe(2);
    });
  });

  describe("learnFromDecision", () => {
    it("应该从决策结果中学习", async () => {
      const decisionData = {
        problem: "选择最佳策略",
        options: [
          {
            description: "策略A",
            reasoning: "快速但风险高",
            confidence: 0.7,
          },
          {
            description: "策略B",
            reasoning: "稳妥但缓慢",
            confidence: 0.8,
          },
        ],
        selectedOption: "策略B",
        outcome: "成功完成目标，获得良好结果",
        success: true,
      };

      const result = await manager.learnFromDecision(decisionData);

      expect(result).toBeDefined();
      expect(result.symbols).toBeInstanceOf(Array);
      expect(result.relationships).toBeInstanceOf(Array);
      expect(result.rules).toBeInstanceOf(Array);
      expect(result.overallQuality).toBeGreaterThanOrEqual(0);
    });

    it("应该处理失败的决策", async () => {
      const decisionData = {
        problem: "选择策略",
        selectedOption: "策略A",
        outcome: "失败，未达到目标",
        success: false,
      };

      const result = await manager.learnFromDecision(decisionData);

      expect(result).toBeDefined();
      expect(result.overallQuality).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStatistics", () => {
    it("应该返回学习统计信息", () => {
      const stats = manager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(0);
      expect(stats.totalRelationships).toBeGreaterThanOrEqual(0);
      expect(stats.totalRules).toBeGreaterThanOrEqual(0);
      expect(stats.symbolQuality).toBeGreaterThanOrEqual(0);
      expect(stats.symbolQuality).toBeLessThanOrEqual(1);
      expect(stats.relationshipQuality).toBeGreaterThanOrEqual(0);
      expect(stats.relationshipQuality).toBeLessThanOrEqual(1);
      expect(stats.ruleQuality).toBeGreaterThanOrEqual(0);
      expect(stats.ruleQuality).toBeLessThanOrEqual(1);
      expect(stats.overallQuality).toBeGreaterThanOrEqual(0);
      expect(stats.overallQuality).toBeLessThanOrEqual(1);
      expect(stats.learningCount).toBeGreaterThanOrEqual(0);
    });

    it("应该在学习后更新统计信息", async () => {
      const stats1 = manager.getStatistics();
      expect(stats1.learningCount).toBe(0);

      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "推理",
          reasoning: "学习概念",
          confidence: 0.8,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);

      const stats2 = manager.getStatistics();
      expect(stats2.learningCount).toBe(1);
    });
  });

  describe("getSymbols", () => {
    it("应该返回学习的符号", () => {
      const symbols = manager.getSymbols();

      expect(symbols).toBeInstanceOf(Array);
      expect(symbols.length).toBeGreaterThanOrEqual(0);
    });

    it("应该返回按重要性排序的符号", async () => {
      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "分析",
          reasoning: "重要的概念A和概念B",
          confidence: 0.9,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);

      const symbols = manager.getSymbols();
      if (symbols.length > 1) {
        for (let i = 0; i < symbols.length - 1; i++) {
          expect(symbols[i].importance).toBeGreaterThanOrEqual(
            symbols[i + 1].importance
          );
        }
      }
    });
  });

  describe("generateLearningReport", () => {
    it("应该生成学习报告", () => {
      const report = manager.generateLearningReport();

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(typeof report.summary).toBe("string");
      expect(report.statistics).toBeDefined();
      expect(report.topSymbols).toBeInstanceOf(Array);
      expect(report.topRelationships).toBeInstanceOf(Array);
      expect(report.topRules).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
    });

    it("应该在学习后包含有意义的报告", async () => {
      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "推理",
          reasoning: "学习新概念",
          confidence: 0.8,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);

      const report = manager.generateLearningReport();

      expect(report.summary).toContain("符号");
      expect(report.summary).toContain("关系");
      expect(report.summary).toContain("规则");
    });
  });

  describe("getLatestLearning", () => {
    it("应该返回最近的学习结果", async () => {
      expect(manager.getLatestLearning()).toBeNull();

      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "推理",
          reasoning: "学习",
          confidence: 0.8,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);

      const latest = manager.getLatestLearning();
      expect(latest).toBeDefined();
      expect(latest?.symbols).toBeInstanceOf(Array);
    });
  });

  describe("clear", () => {
    it("应该清空所有学习数据", async () => {
      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "推理",
          reasoning: "学习",
          confidence: 0.8,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);

      const stats1 = manager.getStatistics();
      expect(stats1.learningCount).toBeGreaterThan(0);

      manager.clear();

      const stats2 = manager.getStatistics();
      expect(stats2.learningCount).toBe(0);
    });
  });

  describe("getLastLearningTime", () => {
    it("应该返回最后一次学习的耗时", async () => {
      const reasoningSteps = [
        {
          stepNumber: 1,
          action: "推理",
          reasoning: "学习",
          confidence: 0.8,
        },
      ];

      await manager.learnFromReasoning(reasoningSteps);

      const time = manager.getLastLearningTime();
      expect(time).toBeGreaterThan(0);
    });
  });
});
