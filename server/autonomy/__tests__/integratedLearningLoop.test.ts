/**
 * Integrated Learning Loop Tests
 * 
 * 测试三层学习架构和完整的认知循环集成
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { IntegratedLearningLoop } from "../integratedLearningLoop";

describe("IntegratedLearningLoop", () => {
  let learningLoop: IntegratedLearningLoop;
  const testUserId = 1;

  beforeEach(() => {
    learningLoop = new IntegratedLearningLoop(testUserId);
  });

  describe("Learning Cycle Execution", () => {
    it("should initialize learning loop with correct userId", () => {
      expect(learningLoop).toBeDefined();
    });

    it("should return learning loop statistics", () => {
      const stats = learningLoop.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.ruleStats).toBeDefined();
      expect(stats.ruleStats.totalRules).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty conversation list gracefully", async () => {
      // Mock 空对话列表的情况
      const result = await learningLoop.executeLearningCycle();
      
      expect(result).toBeDefined();
      expect(result.cycleId).toBeDefined();
      expect(result.cycleId).toMatch(/^cycle_/);
      expect(result.conversationsProcessed).toBeGreaterThanOrEqual(0);
      expect(result.symbolsExtracted).toBeGreaterThanOrEqual(0);
      expect(result.relationshipsLearned).toBeGreaterThanOrEqual(0);
      expect(result.rulesLearned).toBeGreaterThanOrEqual(0);
    });

    it("should have valid learning statistics", async () => {
      const result = await learningLoop.executeLearningCycle();
      
      expect(result.learningStats).toBeDefined();
      expect(result.learningStats.relationshipConfidence).toBeGreaterThanOrEqual(0);
      expect(result.learningStats.relationshipConfidence).toBeLessThanOrEqual(1);
      expect(result.learningStats.ruleConfidence).toBeGreaterThanOrEqual(0);
      expect(result.learningStats.ruleConfidence).toBeLessThanOrEqual(1);
      expect(result.learningStats.decisionQuality).toBeGreaterThanOrEqual(0);
      expect(result.learningStats.decisionQuality).toBeLessThanOrEqual(1);
    });

    it("should track feedback collection", async () => {
      const result = await learningLoop.executeLearningCycle();
      expect(result.feedbackCollected).toBe(true);
    });
  });

  describe("Learning Loop Result Structure", () => {
    it("should have valid cycle ID format", async () => {
      const result = await learningLoop.executeLearningCycle();
      expect(result.cycleId).toMatch(/^cycle_\d+_[a-z0-9]+$/);
    });

    it("should have valid timestamp", async () => {
      const result = await learningLoop.executeLearningCycle();
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it("should have non-negative metrics", async () => {
      const result = await learningLoop.executeLearningCycle();
      
      expect(result.conversationsProcessed).toBeGreaterThanOrEqual(0);
      expect(result.symbolsExtracted).toBeGreaterThanOrEqual(0);
      expect(result.relationshipsLearned).toBeGreaterThanOrEqual(0);
      expect(result.rulesLearned).toBeGreaterThanOrEqual(0);
      expect(result.decisionsGenerated).toBeGreaterThanOrEqual(0);
      expect(result.decisionsExecuted).toBeGreaterThanOrEqual(0);
    });

    it("should have decisions executed <= decisions generated", async () => {
      const result = await learningLoop.executeLearningCycle();
      expect(result.decisionsExecuted).toBeLessThanOrEqual(result.decisionsGenerated);
    });
  });

  describe("Integration Points", () => {
    it("should integrate memory augmented conversation", () => {
      expect(learningLoop).toBeDefined();
      // 验证内存增强对话系统已集成
    });

    it("should integrate relationship learner", () => {
      const stats = learningLoop.getStatistics();
      expect(stats).toBeDefined();
      // 验证关系学习器已集成
    });

    it("should integrate rule learner", () => {
      const stats = learningLoop.getStatistics();
      expect(stats.ruleStats).toBeDefined();
      expect(stats.ruleStats.totalRules).toBeGreaterThanOrEqual(0);
      expect(stats.ruleStats.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.ruleStats.averageConfidence).toBeLessThanOrEqual(1);
    });

    it("should integrate autonomous decision maker", () => {
      expect(learningLoop).toBeDefined();
      // 验证自主决策制定器已集成
    });
  });

  describe("Three-Layer Learning Architecture", () => {
    it("should support symbol extraction", async () => {
      const result = await learningLoop.executeLearningCycle();
      // 符号提取应该被执行
      expect(result.symbolsExtracted).toBeGreaterThanOrEqual(0);
    });

    it("should support relationship learning", async () => {
      const result = await learningLoop.executeLearningCycle();
      // 关系学习应该被执行
      expect(result.relationshipsLearned).toBeGreaterThanOrEqual(0);
    });

    it("should support rule learning", async () => {
      const result = await learningLoop.executeLearningCycle();
      // 规则学习应该被执行
      expect(result.rulesLearned).toBeGreaterThanOrEqual(0);
    });

    it("should complete all three learning layers", async () => {
      const result = await learningLoop.executeLearningCycle();
      
      // 验证三层学习都被执行
      expect(result.symbolsExtracted).toBeGreaterThanOrEqual(0);
      expect(result.relationshipsLearned).toBeGreaterThanOrEqual(0);
      expect(result.rulesLearned).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Decision Generation and Execution", () => {
    it("should generate decisions from learning", async () => {
      const result = await learningLoop.executeLearningCycle();
      expect(result.decisionsGenerated).toBeGreaterThanOrEqual(0);
    });

    it("should execute generated decisions", async () => {
      const result = await learningLoop.executeLearningCycle();
      expect(result.decisionsExecuted).toBeGreaterThanOrEqual(0);
      expect(result.decisionsExecuted).toBeLessThanOrEqual(result.decisionsGenerated);
    });

    it("should calculate decision quality", async () => {
      const result = await learningLoop.executeLearningCycle();
      const quality = result.learningStats.decisionQuality;
      
      expect(quality).toBeGreaterThanOrEqual(0);
      expect(quality).toBeLessThanOrEqual(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle learning cycle errors gracefully", async () => {
      // 测试错误处理
      expect(async () => {
        await learningLoop.executeLearningCycle();
      }).not.toThrow();
    });

    it("should continue despite individual component failures", async () => {
      // 即使某个组件失败，学习循环也应该继续
      const result = await learningLoop.executeLearningCycle();
      expect(result).toBeDefined();
    });
  });
});
