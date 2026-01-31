/**
 * 失败检测器
 * 监控决策结果，识别失败模式，自动触发改进循环
 */

import { getRuleManager } from "./fileBasedRuleManager";

export interface FailurePattern {
  ruleId: string;
  failureRate: number;
  recentFailures: number;
  totalExecutions: number;
  failureThreshold: number;
  shouldTriggerImprovement: boolean;
}

export interface DetectionResult {
  timestamp: Date;
  patterns: FailurePattern[];
  criticalFailures: FailurePattern[];
  recommendedActions: string[];
}

/**
 * 失败检测器类
 */
export class FailureDetector {
  private failureThreshold: number = 0.3; // 30% 失败率阈值
  private minExecutions: number = 5; // 最少执行次数
  private criticalThreshold: number = 0.5; // 50% 失败率为严重

  /**
   * 检测失败模式
   */
  async detectFailures(): Promise<DetectionResult> {
    const ruleManager = await getRuleManager();
    const rules = await ruleManager.getActiveRules();
    const patterns: FailurePattern[] = [];
    const criticalFailures: FailurePattern[] = [];
    const recommendedActions: string[] = [];

    for (const rule of rules) {
      const history = await ruleManager.getExecutionHistory(rule.ruleId, 100);

      if (history.length < this.minExecutions) {
        continue;
      }

      // 计算失败率
      const failures = history.filter((log) => !log.success).length;
      const failureRate = failures / history.length;

      // 计算最近的失败次数（最后 10 次执行）
      const recentExecutions = history.slice(0, 10);
      const recentFailures = recentExecutions.filter((log) => !log.success).length;

      const pattern: FailurePattern = {
        ruleId: rule.ruleId,
        failureRate,
        recentFailures,
        totalExecutions: history.length,
        failureThreshold: this.failureThreshold,
        shouldTriggerImprovement: failureRate > this.failureThreshold,
      };

      patterns.push(pattern);

      // 识别严重失败
      if (failureRate > this.criticalThreshold) {
        criticalFailures.push(pattern);
        recommendedActions.push(
          `规则 "${rule.name}" 失败率过高 (${(failureRate * 100).toFixed(1)}%), 建议立即改进`
        );
      } else if (failureRate > this.failureThreshold) {
        recommendedActions.push(
          `规则 "${rule.name}" 失败率 ${(failureRate * 100).toFixed(1)}%, 建议进行改进`
        );
      }

      // 检测最近失败增加
      if (recentFailures > 5) {
        recommendedActions.push(
          `规则 "${rule.name}" 最近失败增加 (${recentFailures}/10), 可能需要调查`
        );
      }
    }

    return {
      timestamp: new Date(),
      patterns,
      criticalFailures,
      recommendedActions,
    };
  }

  /**
   * 获取需要改进的规则
   */
  async getRulesToImprove(): Promise<FailurePattern[]> {
    const result = await this.detectFailures();
    return result.patterns.filter((p) => p.shouldTriggerImprovement);
  }

  /**
   * 获取严重失败的规则
   */
  async getCriticalFailures(): Promise<FailurePattern[]> {
    const result = await this.detectFailures();
    return result.criticalFailures;
  }

  /**
   * 设置失败率阈值
   */
  setFailureThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error("失败率阈值必须在 0 到 1 之间");
    }
    this.failureThreshold = threshold;
  }

  /**
   * 设置严重失败阈值
   */
  setCriticalThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error("严重失败阈值必须在 0 到 1 之间");
    }
    this.criticalThreshold = threshold;
  }

  /**
   * 获取检测统计
   */
  async getDetectionStats(): Promise<{
    totalRules: number;
    rulesWithFailures: number;
    criticalFailureCount: number;
    averageFailureRate: number;
  }> {
    const result = await this.detectFailures();
    const failingRules = result.patterns.filter((p) => p.failureRate > 0);
    const avgFailureRate =
      failingRules.length > 0
        ? failingRules.reduce((sum, p) => sum + p.failureRate, 0) / failingRules.length
        : 0;

    return {
      totalRules: result.patterns.length,
      rulesWithFailures: failingRules.length,
      criticalFailureCount: result.criticalFailures.length,
      averageFailureRate: avgFailureRate,
    };
  }
}

// 全局失败检测器实例
let globalFailureDetector: FailureDetector | null = null;

/**
 * 获取全局失败检测器
 */
export function getFailureDetector(): FailureDetector {
  if (!globalFailureDetector) {
    globalFailureDetector = new FailureDetector();
  }
  return globalFailureDetector;
}
