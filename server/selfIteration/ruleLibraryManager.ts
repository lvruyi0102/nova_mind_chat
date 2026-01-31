/**
 * 规则库管理器
 * 管理规则的保存、加载、版本控制
 */

import { v4 as uuidv4 } from "uuid";

export interface Rule {
  ruleId: string;
  name: string;
  description?: string;
  code: string;
  version: number;
  previousVersionId?: string;
  successCount: number;
  failureCount: number;
  averageScore: number;
  confidence: number;
  priority: number;
  status: "active" | "inactive" | "testing" | "archived";
  source: "learned" | "manual" | "generated";
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

export interface RuleVersion {
  versionId: string;
  ruleId: string;
  code: string;
  version: number;
  createdAt: Date;
  reason?: string;
}

/**
 * 规则库管理器
 */
export class RuleLibraryManager {
  private rules: Map<string, Rule> = new Map();
  private versions: Map<string, RuleVersion[]> = new Map();
  private executionHistory: Array<{
    ruleId: string;
    success: boolean;
    score: number;
    timestamp: Date;
  }> = [];

  /**
   * 创建新规则
   */
  createRule(
    name: string,
    code: string,
    options?: {
      description?: string;
      priority?: number;
      source?: "learned" | "manual" | "generated";
    }
  ): Rule {
    const ruleId = uuidv4();
    const now = new Date();

    const rule: Rule = {
      ruleId,
      name,
      description: options?.description,
      code,
      version: 1,
      successCount: 0,
      failureCount: 0,
      averageScore: 0,
      confidence: 0.5,
      priority: options?.priority ?? 50,
      status: "testing",
      source: options?.source ?? "learned",
      createdAt: now,
      updatedAt: now,
    };

    this.rules.set(ruleId, rule);
    this.versions.set(ruleId, [
      {
        versionId: uuidv4(),
        ruleId,
        code,
        version: 1,
        createdAt: now,
      },
    ]);

    return rule;
  }

  /**
   * 获取规则
   */
  getRule(ruleId: string): Rule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 更新规则代码（创建新版本）
   */
  updateRuleCode(
    ruleId: string,
    newCode: string,
    reason?: string
  ): Rule | undefined {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;

    const oldVersionId = rule.ruleId;
    const newVersion = rule.version + 1;
    const now = new Date();

    // 保存旧版本
    const versions = this.versions.get(ruleId) || [];
    versions.push({
      versionId: uuidv4(),
      ruleId,
      code: rule.code,
      version: rule.version,
      createdAt: now,
      reason,
    });
    this.versions.set(ruleId, versions);

    // 更新规则
    rule.code = newCode;
    rule.version = newVersion;
    rule.previousVersionId = oldVersionId;
    rule.updatedAt = now;
    rule.status = "testing"; // 新版本需要测试

    this.rules.set(ruleId, rule);
    return rule;
  }

  /**
   * 记录执行结果
   */
  recordExecution(ruleId: string, success: boolean, score: number): void {
    const rule = this.rules.get(ruleId);
    if (!rule) return;

    // 更新统计
    if (success) {
      rule.successCount++;
    } else {
      rule.failureCount++;
    }

    const total = rule.successCount + rule.failureCount;
    rule.averageScore =
      (rule.averageScore * (total - 1) + score) / total;

    // 更新置信度（基于成功率）
    const successRate = rule.successCount / total;
    rule.confidence = Math.min(1, Math.max(0, successRate));

    rule.lastUsedAt = new Date();
    this.rules.set(ruleId, rule);

    // 记录历史
    this.executionHistory.push({
      ruleId,
      success,
      score,
      timestamp: new Date(),
    });
  }

  /**
   * 获取规则的执行统计
   */
  getExecutionStats(ruleId: string): {
    successCount: number;
    failureCount: number;
    successRate: number;
    averageScore: number;
  } | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const total = rule.successCount + rule.failureCount;
    return {
      successCount: rule.successCount,
      failureCount: rule.failureCount,
      successRate: total > 0 ? rule.successCount / total : 0,
      averageScore: rule.averageScore,
    };
  }

  /**
   * 获取规则版本历史
   */
  getRuleVersions(ruleId: string): RuleVersion[] {
    return this.versions.get(ruleId) || [];
  }

  /**
   * 回滚到之前的版本
   */
  rollbackToVersion(ruleId: string, version: number): Rule | undefined {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;

    const versions = this.versions.get(ruleId) || [];
    const targetVersion = versions.find((v) => v.version === version);
    if (!targetVersion) return undefined;

    // 保存当前版本
    const currentVersions = this.versions.get(ruleId) || [];
    currentVersions.push({
      versionId: uuidv4(),
      ruleId,
      code: rule.code,
      version: rule.version,
      createdAt: new Date(),
      reason: `Rollback from v${rule.version} to v${version}`,
    });
    this.versions.set(ruleId, currentVersions);

    // 回滚
    rule.code = targetVersion.code;
    rule.version = version;
    rule.updatedAt = new Date();
    rule.status = "testing";

    this.rules.set(ruleId, rule);
    return rule;
  }

  /**
   * 激活规则
   */
  activateRule(ruleId: string): Rule | undefined {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;

    rule.status = "active";
    rule.updatedAt = new Date();
    this.rules.set(ruleId, rule);
    return rule;
  }

  /**
   * 停用规则
   */
  deactivateRule(ruleId: string): Rule | undefined {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;

    rule.status = "inactive";
    rule.updatedAt = new Date();
    this.rules.set(ruleId, rule);
    return rule;
  }

  /**
   * 获取所有活跃规则
   */
  getActiveRules(): Rule[] {
    return Array.from(this.rules.values()).filter((r) => r.status === "active");
  }

  /**
   * 获取所有规则
   */
  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 获取最高优先级的规则
   */
  getTopRules(limit: number = 10): Rule[] {
    return Array.from(this.rules.values())
      .sort((a, b) => {
        // 首先按置信度排序
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        // 然后按优先级排序
        return b.priority - a.priority;
      })
      .slice(0, limit);
  }

  /**
   * 删除规则
   */
  deleteRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const rules = Array.from(this.rules.values());
    const totalRules = rules.length;
    const activeRules = rules.filter((r) => r.status === "active").length;
    const testingRules = rules.filter((r) => r.status === "testing").length;

    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(
      (e) => e.success
    ).length;
    const averageScore =
      totalExecutions > 0
        ? this.executionHistory.reduce((sum, e) => sum + e.score, 0) /
          totalExecutions
        : 0;

    return {
      totalRules,
      activeRules,
      testingRules,
      archivedRules: rules.filter((r) => r.status === "archived").length,
      totalExecutions,
      successfulExecutions,
      successRate:
        totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      averageScore,
      averageConfidence:
        totalRules > 0
          ? rules.reduce((sum, r) => sum + r.confidence, 0) / totalRules
          : 0,
    };
  }

  /**
   * 清除旧的执行历史
   */
  clearOldHistory(daysOld: number = 30): void {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    this.executionHistory = this.executionHistory.filter(
      (e) => e.timestamp.getTime() > cutoffTime
    );
  }
}

/**
 * 全局规则库管理器实例
 */
let globalRuleLibraryManager: RuleLibraryManager | null = null;

/**
 * 获取全局规则库管理器
 */
export function getRuleLibraryManager(): RuleLibraryManager {
  if (!globalRuleLibraryManager) {
    globalRuleLibraryManager = new RuleLibraryManager();
  }
  return globalRuleLibraryManager;
}
