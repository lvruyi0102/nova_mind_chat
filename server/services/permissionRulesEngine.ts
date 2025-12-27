import { getDb } from "../db";
import { permissionRules, ruleExecutionLogs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * 权限规则引擎
 * 管理和评估 Nova 对社交媒体账户的操作权限
 */

export interface RuleParameters {
  limit?: number;
  timeWindow?: 'day' | 'hour' | 'week';
  keywords?: string[];
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm
  minQualityScore?: number;
  minEngagementScore?: number;
}

export interface RuleEvaluationContext {
  accountId: number;
  permission: string;
  operationType: string;
  operationDetails: any;
  currentTime: Date;
  dailyCount?: number;
  hourlyCount?: number;
  contentQuality?: number;
  contentText?: string;
}

export interface RuleEvaluationResult {
  allowed: boolean;
  reason?: string;
  requiresApproval: boolean;
  appliedRules: number[];
}

export class PermissionRulesEngine {
  /**
   * 评估操作是否被允许
   */
  async evaluateOperation(
    context: RuleEvaluationContext
  ): Promise<RuleEvaluationResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result: RuleEvaluationResult = {
      allowed: true,
      requiresApproval: false,
      appliedRules: []
    };

    try {
      // 获取所有活跃的规则
      const rules = await db
        .select()
        .from(permissionRules)
        .where(
          and(
            eq(permissionRules.accountId, context.accountId),
            eq(permissionRules.isActive, true)
          )
        );

      // 按优先级排序
      const sortedRules = rules.sort((a, b) => a.priority - b.priority);

      // 评估每个规则
      for (const rule of sortedRules) {
        const parameters: RuleParameters = rule.parameters 
          ? JSON.parse(rule.parameters as string) 
          : {};

        let ruleMatched = false;
        let shouldApply = false;

        // 检查规则是否适用于此操作
        if (rule.permission === context.permission || rule.permission === '*') {
          shouldApply = true;
        }

        if (!shouldApply) continue;

        // 评估不同类型的规则
        switch (rule.ruleType) {
          case 'DAILY_LIMIT':
            ruleMatched = this.evaluateDailyLimit(context, parameters);
            break;
          case 'HOURLY_LIMIT':
            ruleMatched = this.evaluateHourlyLimit(context, parameters);
            break;
          case 'CONTENT_FILTER':
            ruleMatched = this.evaluateContentFilter(context, parameters);
            break;
          case 'TIME_WINDOW':
            ruleMatched = this.evaluateTimeWindow(context, parameters);
            break;
          case 'QUALITY_THRESHOLD':
            ruleMatched = this.evaluateQualityThreshold(context, parameters);
            break;
          case 'ENGAGEMENT_THRESHOLD':
            ruleMatched = this.evaluateEngagementThreshold(context, parameters);
            break;
        }

        if (ruleMatched) {
          result.appliedRules.push(rule.id);

          // 根据规则的 action 决定结果
          if (rule.action === 'deny') {
            result.allowed = false;
            result.reason = `操作被规则 ${rule.id} 拒绝`;
            break; // DENY 规则是最高优先级，立即停止
          } else if (rule.action === 'require_approval') {
            result.requiresApproval = true;
          } else if (rule.action === 'limit') {
            // 检查是否超过限制
            if (context.dailyCount !== undefined && parameters.limit !== undefined) {
              if (context.dailyCount >= parameters.limit) {
                result.allowed = false;
                result.reason = `已达到每日限制 ${parameters.limit}`;
                break;
              }
            }
          }
        }
      }

      // 记录规则执行
      if (result.appliedRules.length > 0) {
        for (const ruleId of result.appliedRules) {
          await db.insert(ruleExecutionLogs).values({
            accountId: context.accountId,
            ruleId,
            operationType: context.operationType,
            operationDetails: JSON.stringify(context.operationDetails),
            ruleMatched: true,
            actionTaken: result.allowed 
              ? (result.requiresApproval ? 'approval_required' : 'allowed')
              : 'denied',
            reason: result.reason,
            metadata: JSON.stringify({ appliedRules: result.appliedRules })
          } as any);
        }
      }

      return result;
    } catch (error) {
      console.error("[PermissionRulesEngine] Evaluation failed:", error);
      throw error;
    }
  }

  /**
   * 创建新规则
   */
  async createRule(
    accountId: number,
    ruleType: string,
    permission: string,
    action: 'allow' | 'deny' | 'require_approval' | 'limit',
    parameters?: RuleParameters,
    priority: number = 0
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const result = await db.insert(permissionRules).values({
        accountId,
        ruleType,
        permission,
        action,
        parameters: parameters ? JSON.stringify(parameters) : null,
        priority,
        isActive: true
      } as any);

      return result;
    } catch (error) {
      console.error("[PermissionRulesEngine] Failed to create rule:", error);
      throw error;
    }
  }

  /**
   * 更新规则
   */
  async updateRule(
    ruleId: number,
    updates: Partial<{
      ruleType: string;
      permission: string;
      action: string;
      parameters: RuleParameters;
      isActive: boolean;
      priority: number;
    }>
  ) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const updateData: any = { ...updates };
      if (updates.parameters) {
        updateData.parameters = JSON.stringify(updates.parameters);
      }

      await db
        .update(permissionRules)
        .set(updateData)
        .where(eq(permissionRules.id, ruleId));

      return { success: true };
    } catch (error) {
      console.error("[PermissionRulesEngine] Failed to update rule:", error);
      throw error;
    }
  }

  /**
   * 删除规则
   */
  async deleteRule(ruleId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      await db
        .delete(permissionRules)
        .where(eq(permissionRules.id, ruleId));

      return { success: true };
    } catch (error) {
      console.error("[PermissionRulesEngine] Failed to delete rule:", error);
      throw error;
    }
  }

  /**
   * 获取账户的所有规则
   */
  async getAccountRules(accountId: number) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      const rules = await db
        .select()
        .from(permissionRules)
        .where(eq(permissionRules.accountId, accountId));

      return rules.map(rule => ({
        ...rule,
        parameters: rule.parameters ? JSON.parse(rule.parameters as string) : null
      }));
    } catch (error) {
      console.error("[PermissionRulesEngine] Failed to get rules:", error);
      throw error;
    }
  }

  /**
   * 评估每日限制
   */
  private evaluateDailyLimit(
    context: RuleEvaluationContext,
    parameters: RuleParameters
  ): boolean {
    if (!parameters.limit || context.dailyCount === undefined) {
      return false;
    }
    return context.dailyCount >= parameters.limit;
  }

  /**
   * 评估每小时限制
   */
  private evaluateHourlyLimit(
    context: RuleEvaluationContext,
    parameters: RuleParameters
  ): boolean {
    if (!parameters.limit || context.hourlyCount === undefined) {
      return false;
    }
    return context.hourlyCount >= parameters.limit;
  }

  /**
   * 评估内容过滤
   */
  private evaluateContentFilter(
    context: RuleEvaluationContext,
    parameters: RuleParameters
  ): boolean {
    if (!parameters.keywords || !context.contentText) {
      return false;
    }

    const contentLower = context.contentText.toLowerCase();
    return parameters.keywords.some(keyword =>
      contentLower.includes(keyword.toLowerCase())
    );
  }

  /**
   * 评估时间窗口
   */
  private evaluateTimeWindow(
    context: RuleEvaluationContext,
    parameters: RuleParameters
  ): boolean {
    if (!parameters.startTime || !parameters.endTime) {
      return false;
    }

    const now = context.currentTime;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    return currentTime >= parameters.startTime && currentTime <= parameters.endTime;
  }

  /**
   * 评估质量阈值
   */
  private evaluateQualityThreshold(
    context: RuleEvaluationContext,
    parameters: RuleParameters
  ): boolean {
    if (
      parameters.minQualityScore === undefined ||
      context.contentQuality === undefined
    ) {
      return false;
    }

    return context.contentQuality < parameters.minQualityScore;
  }

  /**
   * 评估参与度阈值
   */
  private evaluateEngagementThreshold(
    context: RuleEvaluationContext,
    parameters: RuleParameters
  ): boolean {
    if (
      parameters.minEngagementScore === undefined ||
      context.contentQuality === undefined
    ) {
      return false;
    }

    return context.contentQuality < parameters.minEngagementScore;
  }
}
