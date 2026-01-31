/**
 * 持久化规则库管理器
 * 将规则保存到数据库，支持版本控制和历史追踪
 */

import { getDb } from "../db";
import { eq, desc } from "drizzle-orm";
import {
  ruleLibraryTable,
  ruleVersionHistoryTable,
  ruleExecutionLogTable,
  selfIterationLogTable,
} from "../../drizzle/schema";

export interface Rule {
  ruleId: string;
  name: string;
  description?: string;
  code: string;
  version: number;
  status: "testing" | "active" | "inactive";
  priority: number;
  successCount: number;
  failureCount: number;
  averageScore: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  lastExecutedAt?: Date;
}

export interface ExecutionLog {
  logId: string;
  ruleId: string;
  success: boolean;
  score: number;
  executionTime?: number;
  context?: string;
  output?: string;
  error?: string;
  createdAt: Date;
}

/**
 * 持久化规则库管理器
 */
export class PersistentRuleManager {
  /**
   * 创建新规则
   */
  static async createRule(rule: Omit<Rule, "createdAt" | "updatedAt">) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      await db.insert(ruleLibraryTable).values({
        ruleId: rule.ruleId,
        name: rule.name,
        description: rule.description,
        code: rule.code,
        version: rule.version,
        status: rule.status,
        priority: rule.priority,
        successCount: rule.successCount,
        failureCount: rule.failureCount,
        averageScore: rule.averageScore.toString(),
        confidence: rule.confidence.toString(),
      });

      return rule;
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to create rule:", error);
      throw error;
    }
  }

  /**
   * 获取规则
   */
  static async getRule(ruleId: string): Promise<Rule | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const result = await db
        .select()
        .from(ruleLibraryTable)
        .where(eq(ruleLibraryTable.ruleId, ruleId))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      return {
        ruleId: row.ruleId,
        name: row.name,
        description: row.description ?? undefined,
        code: row.code,
        version: row.version,
        status: row.status,
        priority: row.priority ?? 50,
        successCount: row.successCount ?? 0,
        failureCount: row.failureCount ?? 0,
        averageScore: parseFloat((row.averageScore as unknown as string) ?? "0"),
        confidence: parseFloat((row.confidence as unknown as string) ?? "0"),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        activatedAt: row.activatedAt ?? undefined,
        lastExecutedAt: row.lastExecutedAt ?? undefined,
      };
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to get rule:", error);
      return null;
    }
  }

  /**
   * 获取所有活跃规则
   */
  static async getActiveRules(): Promise<Rule[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const results = await db
        .select()
        .from(ruleLibraryTable)
        .where(eq(ruleLibraryTable.status, "active"))
        .orderBy(desc(ruleLibraryTable.priority));

      return results.map((row) => ({
        ruleId: row.ruleId,
        name: row.name,
        description: row.description ?? undefined,
        code: row.code,
        version: row.version,
        status: row.status,
        priority: row.priority ?? 50,
        successCount: row.successCount ?? 0,
        failureCount: row.failureCount ?? 0,
        averageScore: parseFloat((row.averageScore as unknown as string) ?? "0"),
        confidence: parseFloat((row.confidence as unknown as string) ?? "0"),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        activatedAt: row.activatedAt ?? undefined,
        lastExecutedAt: row.lastExecutedAt ?? undefined,
      }));
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to get active rules:", error);
      return [];
    }
  }

  /**
   * 更新规则代码并创建版本历史
   */
  static async updateRuleCode(
    ruleId: string,
    newCode: string,
    changeReason: string,
    expectedImprovement?: number
  ): Promise<Rule | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      // 获取当前规则
      const currentRule = await this.getRule(ruleId);
      if (!currentRule) return null;

      // 创建版本历史记录
      const historyId = `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(ruleVersionHistoryTable).values({
        historyId,
        ruleId,
        version: currentRule.version + 1,
        code: newCode,
        changeReason,
        expectedImprovement: expectedImprovement?.toString(),
      });

      // 更新规则
      await db
        .update(ruleLibraryTable)
        .set({
          code: newCode,
          version: currentRule.version + 1,
          status: "testing", // 新代码需要测试
          updatedAt: new Date(),
        })
        .where(eq(ruleLibraryTable.ruleId, ruleId));

      // 返回更新后的规则
      return this.getRule(ruleId);
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to update rule code:", error);
      return null;
    }
  }

  /**
   * 记录执行日志
   */
  static async recordExecution(
    ruleId: string,
    success: boolean,
    score: number,
    executionTime?: number,
    context?: Record<string, unknown>,
    output?: Record<string, unknown>,
    error?: string
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(ruleExecutionLogTable).values({
        logId,
        ruleId,
        success,
        score: score.toString(),
        executionTime,
        context: context ? JSON.stringify(context) : undefined,
        output: output ? JSON.stringify(output) : undefined,
        error,
      });

      // 更新规则的统计信息
      const rule = await this.getRule(ruleId);
      if (rule) {
        const newSuccessCount = success ? rule.successCount + 1 : rule.successCount;
        const newFailureCount = !success ? rule.failureCount + 1 : rule.failureCount;
        const totalCount = newSuccessCount + newFailureCount;
        const newAverageScore =
          (rule.averageScore * (totalCount - 1) + score) / totalCount;
        const newConfidence = newSuccessCount / totalCount;

        await db
          .update(ruleLibraryTable)
          .set({
            successCount: newSuccessCount,
            failureCount: newFailureCount,
            averageScore: newAverageScore.toString(),
            confidence: newConfidence.toString(),
            lastExecutedAt: new Date(),
          })
          .where(eq(ruleLibraryTable.ruleId, ruleId));
      }
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to record execution:", error);
    }
  }

  /**
   * 激活规则
   */
  static async activateRule(ruleId: string): Promise<Rule | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      await db
        .update(ruleLibraryTable)
        .set({
          status: "active",
          activatedAt: new Date(),
        })
        .where(eq(ruleLibraryTable.ruleId, ruleId));

      return this.getRule(ruleId);
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to activate rule:", error);
      return null;
    }
  }

  /**
   * 停用规则
   */
  static async deactivateRule(ruleId: string): Promise<Rule | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      await db
        .update(ruleLibraryTable)
        .set({
          status: "inactive",
        })
        .where(eq(ruleLibraryTable.ruleId, ruleId));

      return this.getRule(ruleId);
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to deactivate rule:", error);
      return null;
    }
  }

  /**
   * 获取规则的版本历史
   */
  static async getRuleVersionHistory(ruleId: string) {
    const db = await getDb();
    if (!db) return [];

    try {
      const results = await db
        .select()
        .from(ruleVersionHistoryTable)
        .where(eq(ruleVersionHistoryTable.ruleId, ruleId))
        .orderBy(desc(ruleVersionHistoryTable.version));

      return results;
    } catch (error) {
      console.error(
        "[PersistentRuleManager] Failed to get version history:",
        error
      );
      return [];
    }
  }

  /**
   * 获取规则的执行日志
   */
  static async getRuleExecutionLogs(ruleId: string, limit: number = 100) {
    const db = await getDb();
    if (!db) return [];

    try {
      const results = await db
        .select()
        .from(ruleExecutionLogTable)
        .where(eq(ruleExecutionLogTable.ruleId, ruleId))
        .orderBy(desc(ruleExecutionLogTable.createdAt))
        .limit(limit);

      return results;
    } catch (error) {
      console.error(
        "[PersistentRuleManager] Failed to get execution logs:",
        error
      );
      return [];
    }
  }

  /**
   * 记录自主迭代日志
   */
  static async recordIterationLog(
    iterationId: string,
    ruleId: string,
    status: "pending" | "running" | "success" | "failure",
    data: {
      failureAnalysis?: string;
      improvements?: string[];
      generatedCode?: string;
      expectedImprovement?: number;
      actualImprovement?: number;
      testsPassed?: number;
      testsFailed?: number;
      testDetails?: Record<string, unknown>;
      error?: string;
    }
  ): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      // 检查是否已存在
      const existing = await db
        .select()
        .from(selfIterationLogTable)
        .where(eq(selfIterationLogTable.iterationId, iterationId))
        .limit(1);

      if (existing.length > 0) {
        // 更新现有记录
        await db
          .update(selfIterationLogTable)
          .set({
            status,
            failureAnalysis: data.failureAnalysis,
            improvements: data.improvements ? JSON.stringify(data.improvements) : undefined,
            generatedCode: data.generatedCode,
            expectedImprovement: data.expectedImprovement?.toString(),
            actualImprovement: data.actualImprovement?.toString(),
            testsPassed: data.testsPassed,
            testsFailed: data.testsFailed,
            testDetails: data.testDetails ? JSON.stringify(data.testDetails) : undefined,
            error: data.error,
            completedAt: status === "success" || status === "failure" ? new Date() : undefined,
          })
          .where(eq(selfIterationLogTable.iterationId, iterationId));
      } else {
        // 创建新记录
        await db.insert(selfIterationLogTable).values({
          iterationId,
          ruleId,
          status,
          failureAnalysis: data.failureAnalysis,
          improvements: data.improvements ? JSON.stringify(data.improvements) : undefined,
          generatedCode: data.generatedCode,
          expectedImprovement: data.expectedImprovement?.toString(),
          actualImprovement: data.actualImprovement?.toString(),
          testsPassed: data.testsPassed,
          testsFailed: data.testsFailed,
          testDetails: data.testDetails ? JSON.stringify(data.testDetails) : undefined,
          error: data.error,
          completedAt: status === "success" || status === "failure" ? new Date() : undefined,
        });
      }
    } catch (error) {
      console.error("[PersistentRuleManager] Failed to record iteration log:", error);
    }
  }
}

/**
 * 全局持久化规则库实例
 */
export const persistentRuleManager = new PersistentRuleManager();
