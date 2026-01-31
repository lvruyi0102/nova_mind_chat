/**
 * 自主迭代系统测试
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CodeGenerator } from "../selfIteration/codeGenerator";
import {
  getRuleLibraryManager,
  RuleLibraryManager,
} from "../selfIteration/ruleLibraryManager";
import {
  getSelfIterationController,
  SelfIterationController,
} from "../selfIteration/selfIterationController";

describe("自主迭代系统", () => {
  let ruleLibraryManager: RuleLibraryManager;
  let selfIterationController: SelfIterationController;

  beforeEach(() => {
    ruleLibraryManager = getRuleLibraryManager();
    selfIterationController = getSelfIterationController();
  });

  describe("规则库管理器", () => {
    it("应该创建新规则", () => {
      const rule = ruleLibraryManager.createRule(
        "测试规则",
        "function testRule() { return true; }",
        {
          description: "这是一个测试规则",
          priority: 75,
        }
      );

      expect(rule).toBeDefined();
      expect(rule.name).toBe("测试规则");
      expect(rule.version).toBe(1);
      expect(rule.status).toBe("testing");
      expect(rule.priority).toBe(75);
    });

    it("应该获取规则", () => {
      const created = ruleLibraryManager.createRule(
        "获取测试",
        "function test() { return 1; }"
      );
      const retrieved = ruleLibraryManager.getRule(created.ruleId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.ruleId).toBe(created.ruleId);
      expect(retrieved?.name).toBe("获取测试");
    });

    it("应该更新规则代码并创建新版本", () => {
      const rule = ruleLibraryManager.createRule(
        "版本测试",
        "v1 code"
      );
      const updated = ruleLibraryManager.updateRuleCode(
        rule.ruleId,
        "v2 code",
        "改进代码"
      );

      expect(updated).toBeDefined();
      expect(updated?.version).toBe(2);
      expect(updated?.code).toBe("v2 code");
      expect(updated?.status).toBe("testing");
    });

    it("应该记录执行结果并更新统计", () => {
      const rule = ruleLibraryManager.createRule(
        "统计测试",
        "test code"
      );

      ruleLibraryManager.recordExecution(rule.ruleId, true, 0.9);
      ruleLibraryManager.recordExecution(rule.ruleId, true, 0.85);
      ruleLibraryManager.recordExecution(rule.ruleId, false, 0.5);

      const stats = ruleLibraryManager.getExecutionStats(rule.ruleId);
      expect(stats).toBeDefined();
      expect(stats?.successCount).toBe(2);
      expect(stats?.failureCount).toBe(1);
      expect(stats?.successRate).toBeCloseTo(0.667, 2);
    });

    it("应该激活和停用规则", () => {
      const rule = ruleLibraryManager.createRule(
        "激活测试",
        "test code"
      );

      const activated = ruleLibraryManager.activateRule(rule.ruleId);
      expect(activated?.status).toBe("active");

      const deactivated = ruleLibraryManager.deactivateRule(rule.ruleId);
      expect(deactivated?.status).toBe("inactive");
    });

    it("应该获取所有活跃规则", () => {
      ruleLibraryManager.createRule("规则1", "code1");
      ruleLibraryManager.createRule("规则2", "code2");

      const rule3 = ruleLibraryManager.createRule("规则3", "code3");
      ruleLibraryManager.activateRule(rule3.ruleId);

      const activeRules = ruleLibraryManager.getActiveRules();
      expect(activeRules.length).toBeGreaterThan(0);
    });

    it("应该获取顶级规则（按置信度排序）", () => {
      const rule1 = ruleLibraryManager.createRule("规则1", "code1");
      const rule2 = ruleLibraryManager.createRule("规则2", "code2");

      // 给 rule1 更高的成功率
      ruleLibraryManager.recordExecution(rule1.ruleId, true, 0.95);
      ruleLibraryManager.recordExecution(rule1.ruleId, true, 0.9);

      // 给 rule2 较低的成功率
      ruleLibraryManager.recordExecution(rule2.ruleId, false, 0.3);
      ruleLibraryManager.recordExecution(rule2.ruleId, true, 0.5);

      const topRules = ruleLibraryManager.getTopRules(2);
      expect(topRules.length).toBeGreaterThan(0);
      expect(topRules[0].confidence).toBeGreaterThanOrEqual(
        topRules[1]?.confidence || 0
      );
    });

    it("应该回滚到之前的版本", () => {
      const rule = ruleLibraryManager.createRule(
        "回滚测试",
        "v1"
      );
      ruleLibraryManager.updateRuleCode(rule.ruleId, "v2", "更新");
      ruleLibraryManager.updateRuleCode(rule.ruleId, "v3", "再次更新");

      const rolledBack = ruleLibraryManager.rollbackToVersion(
        rule.ruleId,
        2
      );
      expect(rolledBack?.code).toBe("v2");
      expect(rolledBack?.version).toBe(2);
    });

    it("应该获取规则版本历史", () => {
      const rule = ruleLibraryManager.createRule(
        "历史测试",
        "v1"
      );
      ruleLibraryManager.updateRuleCode(rule.ruleId, "v2");
      ruleLibraryManager.updateRuleCode(rule.ruleId, "v3");

      const versions = ruleLibraryManager.getRuleVersions(rule.ruleId);
      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(1);
      expect(versions[2].version).toBe(3);
    });

    it("应该获取统计信息", () => {
      const rule1 = ruleLibraryManager.createRule("规则1", "code1");
      const rule2 = ruleLibraryManager.createRule("规则2", "code2");

      ruleLibraryManager.activateRule(rule1.ruleId);
      ruleLibraryManager.recordExecution(rule1.ruleId, true, 0.9);
      ruleLibraryManager.recordExecution(rule2.ruleId, false, 0.5);

      const stats = ruleLibraryManager.getStatistics();
      expect(stats.totalRules).toBeGreaterThanOrEqual(2);
      expect(stats.activeRules).toBeGreaterThanOrEqual(1);
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(2);
    });
  });

  describe("代码生成器", () => {
    it("应该生成改进的代码", async () => {
      const codeGenerator = new CodeGenerator();
      const result = await codeGenerator.generateImprovedCode({
        originalRuleCode: "function rule() { return true; }",
        failureAnalysis: "规则在某些情况下返回错误结果",
        successRate: 0.6,
        averageScore: 0.65,
        improvements: ["添加更多验证", "改进错误处理"],
      });

      expect(result).toBeDefined();
      expect(result.code).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(result.expectedImprovement).toBeGreaterThanOrEqual(0);
      expect(result.expectedImprovement).toBeLessThanOrEqual(1);
      expect(result.testCases).toBeDefined();
      expect(Array.isArray(result.testCases)).toBe(true);
    });

    it("生成的代码应该包含函数定义", async () => {
      const codeGenerator = new CodeGenerator();
      const result = await codeGenerator.generateImprovedCode({
        originalRuleCode: "function test() { return 1; }",
        failureAnalysis: "测试失败",
        successRate: 0.5,
        averageScore: 0.5,
        improvements: ["改进"],
      });

      expect(result.code).toMatch(/function|=>|export/);
    });
  });

  describe("自主迭代控制器", () => {
    it("应该执行完整的迭代流程", async () => {
      // 创建一个规则
      const rule = ruleLibraryManager.createRule(
        "迭代测试规则",
        "function rule() { return true; }"
      );

      // 执行迭代
      const result = await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "规则性能不佳",
        improvements: ["改进逻辑", "添加验证"],
      });

      expect(result).toBeDefined();
      expect(result.iterationId).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.steps[0].step).toBe("analyze");
    });

    it("应该记录迭代步骤", async () => {
      const rule = ruleLibraryManager.createRule(
        "步骤测试",
        "test code"
      );

      const result = await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "测试",
        improvements: ["改进"],
      });

      const steps = result.steps;
      expect(steps.some((s) => s.step === "analyze")).toBe(true);
      expect(steps.some((s) => s.step === "generate")).toBe(true);
      expect(steps.some((s) => s.step === "test")).toBe(true);
      expect(steps.some((s) => s.step === "apply")).toBe(true);
      expect(steps.some((s) => s.step === "validate")).toBe(true);
    });

    it("应该获取迭代结果", async () => {
      const rule = ruleLibraryManager.createRule(
        "结果测试",
        "test code"
      );

      const result = await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "测试",
        improvements: ["改进"],
      });

      const retrieved = selfIterationController.getIterationResult(
        result.iterationId
      );
      expect(retrieved).toBeDefined();
      expect(retrieved?.iterationId).toBe(result.iterationId);
    });

    it("应该获取规则的迭代历史", async () => {
      const rule = ruleLibraryManager.createRule(
        "历史测试",
        "test code"
      );

      await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "测试1",
        improvements: ["改进1"],
      });

      await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "测试2",
        improvements: ["改进2"],
      });

      const history = selfIterationController.getRuleIterations(rule.ruleId);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it("应该获取迭代统计", async () => {
      const rule = ruleLibraryManager.createRule(
        "统计测试",
        "test code"
      );

      await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "测试",
        improvements: ["改进"],
      });

      const stats = selfIterationController.getStatistics();
      expect(stats.totalIterations).toBeGreaterThanOrEqual(1);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
    });
  });

  describe("完整的自我迭代流程", () => {
    it("应该完成从创建到改进的完整流程", async () => {
      // 1. 创建规则
      const rule = ruleLibraryManager.createRule(
        "完整流程测试",
        "function rule() { return Math.random() > 0.5; }"
      );

      // 2. 模拟执行并记录结果
      for (let i = 0; i < 10; i++) {
        const success = Math.random() > 0.4; // 60% 成功率
        ruleLibraryManager.recordExecution(rule.ruleId, success, success ? 0.9 : 0.3);
      }

      // 3. 检查统计
      const stats = ruleLibraryManager.getExecutionStats(rule.ruleId);
      expect(stats?.successCount).toBeGreaterThan(0);

      // 4. 执行迭代
      const iterationResult = await selfIterationController.executeIteration({
        ruleId: rule.ruleId,
        failureAnalysis: "规则成功率只有 60%，需要改进",
        improvements: [
          "添加更好的随机数生成",
          "改进决策逻辑",
        ],
      });

      // 5. 验证迭代结果
      expect(iterationResult.status).toBeDefined();
      expect(iterationResult.steps.length).toBeGreaterThan(0);

      // 6. 检查规则是否被更新
      const updatedRule = ruleLibraryManager.getRule(rule.ruleId);
      expect(updatedRule?.version).toBeGreaterThan(1);
    });
  });
});
