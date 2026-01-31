/**
 * 自迭代系统核心功能测试
 * 专注于真实的自迭代循环验证
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getRuleManager } from "../selfIteration/fileBasedRuleManager";
import { CodeSandbox } from "../selfIteration/codeSandbox";

describe("自迭代系统核心功能", () => {
  let ruleManager: any;

  beforeAll(async () => {
    ruleManager = await getRuleManager();
  });

  describe("规则管理和持久化", () => {
    it("应该能够添加和检索规则", async () => {
      const rule = await ruleManager.addRule({
        name: "核心测试规则",
        description: "核心功能测试",
        code: "return 'test_result';",
        status: "active",
        priority: 50,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      expect(rule.ruleId).toBeDefined();
      expect(rule.name).toBe("核心测试规则");

      const retrieved = await ruleManager.getRule(rule.ruleId);
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe("核心测试规则");
    });

    it("应该能够记录规则执行并更新统计", async () => {
      const rule = await ruleManager.addRule({
        name: "执行统计规则",
        description: "测试执行统计",
        code: "return 'success';",
        status: "active",
        priority: 50,
        confidence: 0.5,
        averageScore: 0.5,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      // 记录成功执行
      await ruleManager.recordExecution(
        rule.ruleId,
        true,
        0.9,
        50,
        { test: "context" },
        { result: "success" }
      );

      // 记录失败执行
      await ruleManager.recordExecution(
        rule.ruleId,
        false,
        0.3,
        100,
        { test: "context" },
        undefined,
        "Test error"
      );

      // 验证统计更新
      const updated = await ruleManager.getRule(rule.ruleId);
      expect(updated.successCount).toBe(1);
      expect(updated.failureCount).toBe(1);
      expect(updated.averageScore).toBeGreaterThan(0.5);
      expect(updated.confidence).toBeGreaterThan(0.4);
    });

    it("应该能够按优先级排序规则", async () => {
      const lowPriority = await ruleManager.addRule({
        name: "低优先级",
        description: "低",
        code: "return 'low';",
        status: "active",
        priority: 10,
        confidence: 0.5,
        averageScore: 0.5,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const highPriority = await ruleManager.addRule({
        name: "高优先级",
        description: "高",
        code: "return 'high';",
        status: "active",
        priority: 100,
        confidence: 0.9,
        averageScore: 0.9,
        successCount: 10,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const activeRules = await ruleManager.getActiveRules();
      const highIndex = activeRules.findIndex((r) => r.ruleId === highPriority.ruleId);
      const lowIndex = activeRules.findIndex((r) => r.ruleId === lowPriority.ruleId);

      expect(highIndex).toBeLessThan(lowIndex);
    });
  });

  describe("代码执行和测试", () => {
    it("应该能够执行简单代码", async () => {
      const code = "return 42;";
      const result = await CodeSandbox.executeCode(code, {});

      expect(result.success).toBe(true);
      expect(result.output).toBe(42);
    });

    it("应该能够验证代码语法", () => {
      const validCode = "return 42;";
      const invalidCode = "return 42"; // 缺少分号

      const validResult = CodeSandbox.validateSyntax(validCode);
      const invalidResult = CodeSandbox.validateSyntax(invalidCode);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it("应该能够处理代码执行错误", async () => {
      const code = "throw new Error('Test error');";
      const result = await CodeSandbox.executeCode(code, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("完整的改进循环", () => {
    it("应该能够模拟改进流程", async () => {
      // 1. 创建初始规则（低性能）
      const initialRule = await ruleManager.addRule({
        name: "初始规则_改进测试",
        description: "初始规则",
        code: "return 'initial';",
        status: "active",
        priority: 50,
        confidence: 0.5,
        averageScore: 0.5,
        successCount: 5,
        failureCount: 5,
        lastUsedAt: new Date(),
      });

      // 2. 记录初始规则的执行
      for (let i = 0; i < 5; i++) {
        await ruleManager.recordExecution(
          initialRule.ruleId,
          Math.random() > 0.5,
          0.5 + Math.random() * 0.2,
          50,
          { iteration: i },
          { result: "initial" }
        );
      }

      // 3. 创建改进规则（高性能）
      const improvedRule = await ruleManager.addRule({
        name: "改进规则_改进测试",
        description: "改进的规则",
        code: "return query ? 'improved' : 'default';",
        status: "testing",
        priority: 60,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      // 4. 记录改进规则的执行
      for (let i = 0; i < 5; i++) {
        await ruleManager.recordExecution(
          improvedRule.ruleId,
          true, // 全部成功
          0.8 + Math.random() * 0.15,
          30,
          { iteration: i, query: "test" },
          { result: "improved" }
        );
      }

      // 5. 验证改进
      const initialHistory = await ruleManager.getExecutionHistory(initialRule.ruleId);
      const improvedHistory = await ruleManager.getExecutionHistory(improvedRule.ruleId);

      const initialSuccess = initialHistory.filter((log) => log.success).length;
      const improvedSuccess = improvedHistory.filter((log) => log.success).length;

      const initialAvgScore =
        initialHistory.reduce((sum, log) => sum + log.score, 0) / initialHistory.length;
      const improvedAvgScore =
        improvedHistory.reduce((sum, log) => sum + log.score, 0) / improvedHistory.length;

      expect(improvedSuccess).toBeGreaterThan(initialSuccess);
      expect(improvedAvgScore).toBeGreaterThan(initialAvgScore);
    });

    it("应该能够获取系统统计信息", async () => {
      const stats = await ruleManager.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.activeRules).toBeGreaterThanOrEqual(0);
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.successfulExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("真实的自迭代场景", () => {
    it("应该能够从失败中学习并改进", async () => {
      // 场景：一个规则在某些情况下失败，我们生成改进版本

      // 1. 原始规则（有缺陷）
      const originalRule = await ruleManager.addRule({
        name: "有缺陷的规则",
        description: "在某些情况下失败",
        code: "return input.length > 0 ? 'has_input' : null;",
        status: "active",
        priority: 50,
        confidence: 0.6,
        averageScore: 0.6,
        successCount: 3,
        failureCount: 2,
        lastUsedAt: new Date(),
      });

      // 2. 记录一些失败
      await ruleManager.recordExecution(
        originalRule.ruleId,
        false,
        0.2,
        100,
        { input: "" },
        undefined,
        "Returned null instead of default"
      );

      // 3. 改进版本（修复了缺陷）
      const improvedVersion = await ruleManager.addRule({
        name: "改进的规则",
        description: "修复了缺陷",
        code: "return input && input.length > 0 ? 'has_input' : 'no_input';",
        status: "testing",
        priority: 60,
        confidence: 0.9,
        averageScore: 0.9,
        successCount: 5,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      // 4. 验证改进
      const originalStats = await ruleManager.getExecutionHistory(originalRule.ruleId);
      const improvedStats = await ruleManager.getExecutionHistory(improvedVersion.ruleId);

      const originalFailureRate =
        originalStats.filter((log) => !log.success).length / originalStats.length;
      const improvedFailureRate =
        improvedStats.filter((log) => !log.success).length / improvedStats.length;

      expect(improvedFailureRate).toBeLessThan(originalFailureRate);
    });
  });
});
