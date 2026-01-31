/**
 * 基于文件系统的规则库管理器
 * 使用 JSON 文件存储规则，避免数据库迁移问题
 * 提供与 PersistentRuleManager 相同的接口
 */

import fs from "fs/promises";
import path from "path";

export interface Rule {
  ruleId: string;
  name: string;
  description: string;
  code: string;
  status: "active" | "testing" | "inactive";
  version: number;
  priority: number;
  confidence: number;
  averageScore: number;
  successCount: number;
  failureCount: number;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionLog {
  ruleId: string;
  success: boolean;
  score: number;
  executionTime: number;
  context: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  timestamp: Date;
}

/**
 * 文件系统持久化的规则库管理器
 */
export class FileBasedRuleManager {
  private rulesDir: string;
  private rulesFile: string;
  private executionLogsFile: string;
  private rules: Map<string, Rule> = new Map();
  private executionLogs: ExecutionLog[] = [];

  constructor() {
    this.rulesDir = path.join(process.cwd(), "data", "rules");
    this.rulesFile = path.join(this.rulesDir, "rules.json");
    this.executionLogsFile = path.join(this.rulesDir, "executionLogs.json");
  }

  /**
   * 初始化规则管理器
   */
  async initialize(): Promise<void> {
    try {
      // 创建规则目录
      await fs.mkdir(this.rulesDir, { recursive: true });

      // 加载规则
      try {
        const rulesData = await fs.readFile(this.rulesFile, "utf-8");
        const rulesArray = JSON.parse(rulesData);
        this.rules.clear();
        for (const rule of rulesArray) {
          rule.createdAt = new Date(rule.createdAt);
          rule.updatedAt = new Date(rule.updatedAt);
          rule.lastUsedAt = new Date(rule.lastUsedAt);
          this.rules.set(rule.ruleId, rule);
        }
      } catch (error) {
        // 规则文件不存在，初始化为空
        this.rules.clear();
      }

      // 加载执行日志
      try {
        const logsData = await fs.readFile(this.executionLogsFile, "utf-8");
        const logsArray = JSON.parse(logsData);
        this.executionLogs = logsArray.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp),
        }));
      } catch (error) {
        // 日志文件不存在，初始化为空
        this.executionLogs = [];
      }

      console.log(`[FileBasedRuleManager] 初始化完成，加载了 ${this.rules.size} 条规则`);
    } catch (error) {
      console.error("[FileBasedRuleManager] 初始化失败:", error);
      throw error;
    }
  }

  /**
   * 保存规则到文件
   */
  private async saveRules(): Promise<void> {
    try {
      const rulesArray = Array.from(this.rules.values());
      await fs.writeFile(this.rulesFile, JSON.stringify(rulesArray, null, 2), "utf-8");
    } catch (error) {
      console.error("[FileBasedRuleManager] 保存规则失败:", error);
      throw error;
    }
  }

  /**
   * 保存执行日志到文件
   */
  private async saveLogs(): Promise<void> {
    try {
      await fs.writeFile(this.executionLogsFile, JSON.stringify(this.executionLogs, null, 2), "utf-8");
    } catch (error) {
      console.error("[FileBasedRuleManager] 保存日志失败:", error);
      throw error;
    }
  }

  /**
   * 添加规则
   */
  async addRule(rule: Omit<Rule, "ruleId" | "version" | "createdAt" | "updatedAt">): Promise<Rule> {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRule: Rule = {
      ...rule,
      ruleId,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, newRule);
    await this.saveRules();

    console.log(`[FileBasedRuleManager] 添加规则: ${newRule.name}`);
    return newRule;
  }

  /**
   * 获取规则
   */
  async getRule(ruleId: string): Promise<Rule | undefined> {
    return this.rules.get(ruleId);
  }

  /**
   * 获取所有活跃规则
   */
  async getActiveRules(): Promise<Rule[]> {
    const activeRules = Array.from(this.rules.values()).filter(
      (r) => r.status === "active" || r.status === "testing"
    );
    return activeRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 更新规则
   */
  async updateRule(ruleId: string, updates: Partial<Rule>): Promise<Rule | undefined> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      return undefined;
    }

    const updatedRule: Rule = {
      ...rule,
      ...updates,
      ruleId: rule.ruleId, // 不能更改 ID
      createdAt: rule.createdAt, // 不能更改创建时间
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, updatedRule);
    await this.saveRules();

    console.log(`[FileBasedRuleManager] 更新规则: ${updatedRule.name}`);
    return updatedRule;
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      await this.saveRules();
      console.log(`[FileBasedRuleManager] 删除规则: ${ruleId}`);
    }
    return deleted;
  }

  /**
   * 记录执行
   */
  async recordExecution(
    ruleId: string,
    success: boolean,
    score: number,
    executionTime: number,
    context: Record<string, unknown>,
    output?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      console.warn(`[FileBasedRuleManager] 规则不存在: ${ruleId}`);
      return;
    }

    // 记录执行日志
    const log: ExecutionLog = {
      ruleId,
      success,
      score,
      executionTime,
      context,
      output,
      error,
      timestamp: new Date(),
    };

    this.executionLogs.push(log);

    // 更新规则统计
    if (success) {
      rule.successCount++;
    } else {
      rule.failureCount++;
    }

    // 更新平均分数
    const totalExecutions = rule.successCount + rule.failureCount;
    rule.averageScore = (rule.averageScore * (totalExecutions - 1) + score) / totalExecutions;
    rule.lastUsedAt = new Date();

    // 根据成功率调整置信度
    const successRate = rule.successCount / totalExecutions;
    rule.confidence = Math.max(0.1, Math.min(1.0, successRate));

    this.rules.set(ruleId, rule);
    await this.saveRules();
    await this.saveLogs();

    console.log(
      `[FileBasedRuleManager] 记录执行: ${rule.name} - 成功: ${success}, 分数: ${score.toFixed(2)}, 平均分: ${rule.averageScore.toFixed(2)}`
    );
  }

  /**
   * 获取规则的执行历史
   */
  async getExecutionHistory(ruleId: string, limit: number = 100): Promise<ExecutionLog[]> {
    return this.executionLogs
      .filter((log) => log.ruleId === ruleId)
      .slice(-limit)
      .reverse();
  }

  /**
   * 获取所有执行日志
   */
  async getAllExecutionLogs(limit: number = 1000): Promise<ExecutionLog[]> {
    return this.executionLogs.slice(-limit).reverse();
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    totalRules: number;
    activeRules: number;
    testingRules: number;
    inactiveRules: number;
    totalExecutions: number;
    successfulExecutions: number;
    averageScore: number;
  }> {
    const rules = Array.from(this.rules.values());
    const activeRules = rules.filter((r) => r.status === "active").length;
    const testingRules = rules.filter((r) => r.status === "testing").length;
    const inactiveRules = rules.filter((r) => r.status === "inactive").length;

    const totalExecutions = this.executionLogs.length;
    const successfulExecutions = this.executionLogs.filter((log) => log.success).length;
    const averageScore =
      this.executionLogs.length > 0
        ? this.executionLogs.reduce((sum, log) => sum + log.score, 0) / this.executionLogs.length
        : 0;

    return {
      totalRules: rules.length,
      activeRules,
      testingRules,
      inactiveRules,
      totalExecutions,
      successfulExecutions,
      averageScore,
    };
  }

  /**
   * 清空所有规则和日志
   */
  async clear(): Promise<void> {
    this.rules.clear();
    this.executionLogs = [];
    await this.saveRules();
    await this.saveLogs();
    console.log("[FileBasedRuleManager] 已清空所有规则和日志");
  }
}

/**
 * 全局规则管理器实例
 */
let globalRuleManager: FileBasedRuleManager | null = null;

export async function getRuleManager(): Promise<FileBasedRuleManager> {
  if (!globalRuleManager) {
    globalRuleManager = new FileBasedRuleManager();
    await globalRuleManager.initialize();
  }
  return globalRuleManager;
}
