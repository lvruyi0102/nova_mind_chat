/**
 * 改进的决策引擎集成器
 * 将持久化的规则库集成到决策引擎中
 * 确保决策引擎使用最新的改进规则
 */

import { PersistentRuleManager } from "./persistentRuleManager";
import { CodeSandbox, TestCase } from "./codeSandbox";
import { getDecisionEngine, DecisionContext as RealDecisionContext } from "../reasoning/decisionEngine";

export interface DecisionContext {
  query: string;
  history: Array<{ role: string; content: string }>;
  facts: Record<string, unknown>;
  goals: string[];
}

export interface DecisionResult {
  decision: string;
  reasoning: string[];
  confidence: number;
  usedRules: string[];
  executionTime: number;
}

/**
 * 改进的决策引擎集成器
 */
export class ImprovedDecisionEngine {
  private decisionEngine: ReturnType<typeof getDecisionEngine>;
  private ruleManager: typeof PersistentRuleManager;

  constructor() {
    this.decisionEngine = getDecisionEngine();
    this.ruleManager = PersistentRuleManager;
  }

  /**
   * 使用最新的规则进行决策
   */
  async makeDecision(context: DecisionContext): Promise<DecisionResult> {
    const startTime = Date.now();
    const usedRules: string[] = [];
    const reasoning: string[] = [];

    try {
      // 1. 获取所有活跃规则
      const activeRules = await this.ruleManager.getActiveRules();
      reasoning.push(`加载了 ${activeRules.length} 条活跃规则`);

      if (activeRules.length === 0) {
        reasoning.push("没有活跃规则，使用默认决策引擎");
        return {
          decision: "使用默认决策",
          reasoning,
          confidence: 0.5,
          usedRules: [],
          executionTime: Date.now() - startTime,
        };
      }

      // 2. 按优先级排序规则
      const sortedRules = activeRules.sort((a, b) => b.priority - a.priority);
      reasoning.push(`按优先级排序规则：${sortedRules.map((r) => r.name).join(", ")}`);

      // 3. 尝试每条规则
      for (const rule of sortedRules) {
        try {
          // 执行规则代码
          const result = await CodeSandbox.executeCode(
            rule.code,
          {
            query: context.query,
            history: context.history,
            facts: context.facts,
            goals: context.goals,
          } as Record<string, unknown>,
            5000 // 5秒超时
          );

          if (result.success && result.output) {
            usedRules.push(rule.name);
            reasoning.push(`规则 "${rule.name}" 执行成功，置信度: ${rule.confidence}`);

            // 记录执行
            await this.ruleManager.recordExecution(
              rule.ruleId,
              true,
              rule.averageScore,
              result.executionTime,
            context as unknown as Record<string, unknown>,
            result.output as Record<string, unknown>
          );

            // 返回决策结果
            return {
              decision: String(result.output),
              reasoning,
              confidence: rule.confidence,
              usedRules,
              executionTime: Date.now() - startTime,
            };
          } else {
            reasoning.push(`规则 "${rule.name}" 执行失败: ${result.error}`);

            // 记录失败
            await this.ruleManager.recordExecution(
              rule.ruleId,
              false,
              0,
              result.executionTime,
              context as unknown as Record<string, unknown>,
              undefined,
              result.error
            );
          }
        } catch (error) {
          reasoning.push(`规则 "${rule.name}" 异常: ${String(error)}`);
        }
      }

      // 4. 如果所有规则都失败，使用默认决策引擎
      reasoning.push("所有规则都失败，使用默认决策引擎");
      
      // 添加事实到决策引擎
      for (const [key, value] of Object.entries(context.facts)) {
        this.decisionEngine.addFact(key, value, 0.8);
      }
      
      const defaultDecision = await this.decisionEngine.makeDecision({
        userId: 0,
        conversationId: 0,
        currentState: context.facts,
        timestamp: new Date(),
      } as RealDecisionContext);

      return {
        decision: defaultDecision.action,
        reasoning,
        confidence: 0.5,
        usedRules,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      reasoning.push(`决策过程出错: ${String(error)}`);

      return {
        decision: "错误",
        reasoning,
        confidence: 0,
        usedRules,
        executionTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 验证规则的改进效果
   */
  async validateRuleImprovement(
    oldRuleId: string,
    newRuleId: string,
    testCases: TestCase[]
  ): Promise<{
    oldScore: number;
    newScore: number;
    improvement: number;
    details: string[];
  }> {
    const details: string[] = [];

    try {
      // 获取旧规则
      const oldRule = await this.ruleManager.getRule(oldRuleId);
      if (!oldRule) {
        return {
          oldScore: 0,
          newScore: 0,
          improvement: 0,
          details: ["旧规则不存在"],
        };
      }

      // 获取新规则
      const newRule = await this.ruleManager.getRule(newRuleId);
      if (!newRule) {
        return {
          oldScore: 0,
          newScore: 0,
          improvement: 0,
          details: ["新规则不存在"],
        };
      }

      details.push(`比较规则: "${oldRule.name}" vs "${newRule.name}"`);

      // 测试旧规则
      const oldResults = await CodeSandbox.runTests(oldRule.code, testCases);
      const oldScore = oldResults.passedTests / oldResults.totalTests;
      details.push(`旧规则: ${oldResults.passedTests}/${oldResults.totalTests} 通过 (${(oldScore * 100).toFixed(2)}%)`);

      // 测试新规则
      const newResults = await CodeSandbox.runTests(newRule.code, testCases);
      const newScore = newResults.passedTests / newResults.totalTests;
      details.push(`新规则: ${newResults.passedTests}/${newResults.totalTests} 通过 (${(newScore * 100).toFixed(2)}%)`);

      // 计算改进幅度
      const improvement = oldScore > 0 ? (newScore - oldScore) / oldScore : newScore;
      details.push(`改进幅度: ${(improvement * 100).toFixed(2)}%`);

      return {
        oldScore,
        newScore,
        improvement,
        details,
      };
    } catch (error) {
      details.push(`验证过程出错: ${String(error)}`);
      return {
        oldScore: 0,
        newScore: 0,
        improvement: 0,
        details,
      };
    }
  }

  /**
   * 获取决策引擎的统计信息
   */
  async getStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    testingRules: number;
    inactiveRules: number;
    averageConfidence: number;
    topRules: Array<{ name: string; confidence: number; successRate: number }>;
  }> {
    try {
      const activeRules = await this.ruleManager.getActiveRules();

      const topRules = activeRules
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)
        .map((rule) => ({
          name: rule.name,
          confidence: rule.confidence,
          successRate:
            rule.successCount + rule.failureCount > 0
              ? rule.successCount / (rule.successCount + rule.failureCount)
              : 0,
        }));

      const averageConfidence =
        activeRules.length > 0
          ? activeRules.reduce((sum, r) => sum + r.confidence, 0) / activeRules.length
          : 0;

      return {
        totalRules: activeRules.length,
        activeRules: activeRules.filter((r) => r.status === "active").length,
        testingRules: activeRules.filter((r) => r.status === "testing").length,
        inactiveRules: activeRules.filter((r) => r.status === "inactive").length,
        averageConfidence,
        topRules,
      };
    } catch (error) {
      console.error("[ImprovedDecisionEngine] Failed to get statistics:", error);
      return {
        totalRules: 0,
        activeRules: 0,
        testingRules: 0,
        inactiveRules: 0,
        averageConfidence: 0,
        topRules: [],
      };
    }
  }
}

/**
 * 全局改进的决策引擎实例
 */
export const improvedDecisionEngine = new ImprovedDecisionEngine();
