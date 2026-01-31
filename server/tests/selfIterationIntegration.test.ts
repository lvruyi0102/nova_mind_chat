/**
 * 自迭代系统集成测试
 * 测试完整的学习→改进→应用→验证循环
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FileBasedRuleManager, getRuleManager } from "../selfIteration/fileBasedRuleManager";
import { CodeSandbox, TestCase } from "../selfIteration/codeSandbox";
import { ImprovedDecisionEngine } from "../selfIteration/improvedDecisionEngine";

describe("自迭代系统集成测试", () => {
  let ruleManager: FileBasedRuleManager;
  let decisionEngine: ImprovedDecisionEngine;

  beforeAll(async () => {
    ruleManager = await getRuleManager();
    decisionEngine = new ImprovedDecisionEngine();
  });

  describe("规则管理器", () => {
    it("应该能够添加规则", async () => {
      const rule = await ruleManager.addRule({
        name: "测试规则1",
        description: "用于测试的规则",
        code: "return 'test result';",
        status: "active",
        priority: 50,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      expect(rule).toBeDefined();
      expect(rule.name).toBe("测试规则1");
      expect(rule.ruleId).toBeDefined();
    });

    it("应该能够获取规则", async () => {
      const rule = await ruleManager.addRule({
        name: "测试规则2",
        description: "用于测试的规则",
        code: "return 'test result';",
        status: "active",
        priority: 50,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const retrieved = await ruleManager.getRule(rule.ruleId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("测试规则2");
    });

    it("应该能够获取所有活跃规则", async () => {
      await ruleManager.addRule({
        name: "活跃规则1",
        description: "活跃规则",
        code: "return 'active';",
        status: "active",
        priority: 50,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      await ruleManager.addRule({
        name: "测试规则3",
        description: "测试规则",
        code: "return 'testing';",
        status: "testing",
        priority: 40,
        confidence: 0.7,
        averageScore: 0.7,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const activeRules = await ruleManager.getActiveRules();
      expect(activeRules.length).toBeGreaterThan(0);
      expect(activeRules.some((r) => r.name === "活跃规则1")).toBe(true);
      expect(activeRules.some((r) => r.name === "测试规则3")).toBe(true);
    });

    it("应该能够记录执行", async () => {
      const rule = await ruleManager.addRule({
        name: "执行测试规则",
        description: "用于测试执行记录的规则",
        code: "return 'success';",
        status: "active",
        priority: 50,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      await ruleManager.recordExecution(
        rule.ruleId,
        true,
        0.9,
        100,
        { test: "context" },
        { result: "success" }
      );

      const history = await ruleManager.getExecutionHistory(rule.ruleId);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].success).toBe(true);
      expect(history[0].score).toBe(0.9);
    });

    it("应该能够更新规则", async () => {
      const rule = await ruleManager.addRule({
        name: "更新测试规则",
        description: "用于测试更新的规则",
        code: "return 'original';",
        status: "active",
        priority: 50,
        confidence: 0.8,
        averageScore: 0.8,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const updated = await ruleManager.updateRule(rule.ruleId, {
        code: "return 'updated';",
        status: "inactive",
      });

      expect(updated).toBeDefined();
      expect(updated?.code).toBe("return 'updated';");
      expect(updated?.status).toBe("inactive");
    });
  });

  describe("代码沙箱", () => {
    it("应该能够执行简单代码", async () => {
      const code = "return 42;";
      const result = await CodeSandbox.executeCode(code, {});

      expect(result.success).toBe(true);
      expect(result.output).toBe(42);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it("应该能够处理代码错误", async () => {
      const code = "throw new Error('Test error');";
      const result = await CodeSandbox.executeCode(code, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该能够验证代码语法", () => {
      const validCode = "return 42;";
      const invalidCode = "return 42";

      const validResult = CodeSandbox.validateSyntax(validCode);
      const invalidResult = CodeSandbox.validateSyntax(invalidCode);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
    });

    it("应该能够运行测试用例", async () => {
      const code = "return query.length > 0 ? 'has_query' : 'no_query';";
      const testCases: TestCase[] = [
        {
          name: "有查询",
          input: { query: "test" },
          expectedOutput: "has_query",
          description: "查询不为空",
        },
        {
          name: "无查询",
          input: { query: "" },
          expectedOutput: "no_query",
          description: "查询为空",
        },
      ];

      const result = await CodeSandbox.runTests(code, testCases);

      expect(result.totalTests).toBe(2);
      expect(result.passedTests).toBe(2);
      expect(result.failedTests).toBe(0);
    });

    it("应该能够处理超时", async () => {
      const code = "while(true) {}"; // 无限循环
      const result = await CodeSandbox.executeCode(code, {}, 100); // 100ms 超时

      expect(result.success).toBe(false);
      expect(result.error).toContain("超时");
    });
  });

  describe("改进的决策引擎", () => {
    it("应该能够使用规则进行决策", async () => {
      // 添加一个活跃规则
      await ruleManager.addRule({
        name: "决策规则1",
        description: "用于决策的规则",
        code: "return query.includes('help') ? '提供帮助' : '继续对话';",
        status: "active",
        priority: 100,
        confidence: 0.9,
        averageScore: 0.9,
        successCount: 10,
        failureCount: 1,
        lastUsedAt: new Date(),
      });

      const result = await decisionEngine.makeDecision({
        query: "I need help",
        history: [],
        facts: {},
        goals: [],
      });

      expect(result).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it("应该能够获取统计信息", async () => {
      const stats = await decisionEngine.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalRules).toBeGreaterThanOrEqual(0);
      expect(stats.activeRules).toBeGreaterThanOrEqual(0);
      expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe("完整的自迭代循环", () => {
    it("应该能够执行完整的改进循环", async () => {
      // 1. 创建一个初始规则
      const initialRule = await ruleManager.addRule({
        name: "初始规则",
        description: "初始规则",
        code: "return 'initial_decision';",
        status: "active",
        priority: 50,
        confidence: 0.5,
        averageScore: 0.5,
        successCount: 5,
        failureCount: 5,
        lastUsedAt: new Date(),
      });

      // 2. 记录一些执行
      await ruleManager.recordExecution(
        initialRule.ruleId,
        true,
        0.6,
        100,
        { query: "test" },
        { result: "success" }
      );

      // 3. 创建一个改进的规则
      const improvedRule = await ruleManager.addRule({
        name: "改进规则",
        description: "改进的规则",
        code: "return query ? 'improved_decision' : 'default_decision';",
        status: "testing",
        priority: 60,
        confidence: 0.7,
        averageScore: 0.7,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      // 4. 测试改进的规则
      const testCases: TestCase[] = [
        {
          name: "有查询",
          input: { query: "test" },
          expectedOutput: "improved_decision",
          description: "测试改进规则",
        },
      ];

      const testResult = await CodeSandbox.runTests(improvedRule.code, testCases);
      expect(testResult.passedTests).toBeGreaterThan(0);

      // 5. 记录改进规则的执行
      await ruleManager.recordExecution(
        improvedRule.ruleId,
        true,
        0.9,
        50,
        { query: "test" },
        { result: "improved_success" }
      );

      // 6. 验证改进
      const initialHistory = await ruleManager.getExecutionHistory(initialRule.ruleId);
      const improvedHistory = await ruleManager.getExecutionHistory(improvedRule.ruleId);

      const initialAvgScore =
        initialHistory.reduce((sum, log) => sum + log.score, 0) / initialHistory.length;
      const improvedAvgScore =
        improvedHistory.reduce((sum, log) => sum + log.score, 0) / improvedHistory.length;

      expect(improvedAvgScore).toBeGreaterThan(initialAvgScore);
    });

    it("应该能够处理多个规则的优先级", async () => {
      // 添加多个优先级不同的规则
      const rule1 = await ruleManager.addRule({
        name: "低优先级规则",
        description: "低优先级",
        code: "return 'low_priority';",
        status: "active",
        priority: 10,
        confidence: 0.5,
        averageScore: 0.5,
        successCount: 0,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const rule2 = await ruleManager.addRule({
        name: "高优先级规则",
        description: "高优先级",
        code: "return 'high_priority';",
        status: "active",
        priority: 100,
        confidence: 0.9,
        averageScore: 0.9,
        successCount: 10,
        failureCount: 0,
        lastUsedAt: new Date(),
      });

      const activeRules = await ruleManager.getActiveRules();
      const highPriorityIndex = activeRules.findIndex((r) => r.ruleId === rule2.ruleId);
      const lowPriorityIndex = activeRules.findIndex((r) => r.ruleId === rule1.ruleId);

      expect(highPriorityIndex).toBeLessThan(lowPriorityIndex);
    });
  });

  describe("性能和可靠性", () => {
    it("应该能够处理大量规则", async () => {
      const ruleCount = 50;

      for (let i = 0; i < ruleCount; i++) {
        await ruleManager.addRule({
          name: `规则_${i}`,
          description: `规则 ${i}`,
          code: `return 'rule_${i}';`,
          status: i % 2 === 0 ? "active" : "testing",
          priority: Math.random() * 100,
          confidence: Math.random(),
          averageScore: Math.random(),
          successCount: Math.floor(Math.random() * 100),
          failureCount: Math.floor(Math.random() * 50),
          lastUsedAt: new Date(),
        });
      }

      const activeRules = await ruleManager.getActiveRules();
      expect(activeRules.length).toBeGreaterThan(0);
    });

    it("应该能够快速执行代码", async () => {
      const code = "return 42;";
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        await CodeSandbox.executeCode(code, {});
      }

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // 100 次执行应该在 5 秒内完成
    });

    it("应该能够恢复从错误", async () => {
      const errorCode = "throw new Error('Test error');";
      const validCode = "return 42;";

      const errorResult = await CodeSandbox.executeCode(errorCode, {});
      expect(errorResult.success).toBe(false);

      const validResult = await CodeSandbox.executeCode(validCode, {});
      expect(validResult.success).toBe(true);
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await ruleManager.clear();
  });
});
