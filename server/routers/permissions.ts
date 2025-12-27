import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { PermissionRulesEngine } from "../services/permissionRulesEngine";
import { getDb } from "../db";
import { permissionRules, ruleExecutionLogs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const engine = new PermissionRulesEngine();

export const permissionsRouter = router({
  /**
   * 创建新规则
   */
  createRule: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        ruleType: z.enum([
          "DAILY_LIMIT",
          "HOURLY_LIMIT",
          "CONTENT_FILTER",
          "TIME_WINDOW",
          "APPROVAL_REQUIRED",
          "QUALITY_THRESHOLD",
          "ENGAGEMENT_THRESHOLD"
        ]),
        permission: z.enum([
          "READ",
          "DRAFT",
          "APPROVE",
          "PUBLISH",
          "DELETE",
          "MANAGE_COMMENTS",
          "MANAGE_FOLLOWERS",
          "*"
        ]),
        action: z.enum(["allow", "deny", "require_approval", "limit"]),
        parameters: z.record(z.any()).optional(),
        priority: z.number().default(0)
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await engine.createRule(
          input.accountId,
          input.ruleType,
          input.permission,
          input.action,
          input.parameters,
          input.priority
        );

        return {
          success: true,
          message: "规则创建成功"
        };
      } catch (error) {
        console.error("[Permissions] Failed to create rule:", error);
        throw new Error("规则创建失败");
      }
    }),

  /**
   * 更新规则
   */
  updateRule: protectedProcedure
    .input(
      z.object({
        ruleId: z.number(),
        updates: z.object({
          ruleType: z.string().optional(),
          permission: z.string().optional(),
          action: z.enum(["allow", "deny", "require_approval", "limit"]).optional(),
          parameters: z.record(z.any()).optional(),
          isActive: z.boolean().optional(),
          priority: z.number().optional()
        })
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        await engine.updateRule(input.ruleId, input.updates);

        return {
          success: true,
          message: "规则更新成功"
        };
      } catch (error) {
        console.error("[Permissions] Failed to update rule:", error);
        throw new Error("规则更新失败");
      }
    }),

  /**
   * 删除规则
   */
  deleteRule: protectedProcedure
    .input(z.object({ ruleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await engine.deleteRule(input.ruleId);

        return {
          success: true,
          message: "规则删除成功"
        };
      } catch (error) {
        console.error("[Permissions] Failed to delete rule:", error);
        throw new Error("规则删除失败");
      }
    }),

  /**
   * 获取账户的所有规则
   */
  getAccountRules: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const rules = await engine.getAccountRules(input.accountId);

        return {
          success: true,
          rules: rules.map(rule => ({
            id: rule.id,
            accountId: rule.accountId,
            ruleType: rule.ruleType,
            permission: rule.permission,
            action: rule.action,
            parameters: rule.parameters,
            isActive: rule.isActive,
            priority: rule.priority,
            createdAt: rule.createdAt,
            updatedAt: rule.updatedAt
          }))
        };
      } catch (error) {
        console.error("[Permissions] Failed to get rules:", error);
        throw new Error("获取规则失败");
      }
    }),

  /**
   * 评估操作是否被允许
   */
  evaluateOperation: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        permission: z.string(),
        operationType: z.string(),
        operationDetails: z.record(z.any()),
        dailyCount: z.number().optional(),
        hourlyCount: z.number().optional(),
        contentQuality: z.number().optional(),
        contentText: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const result = await engine.evaluateOperation({
          accountId: input.accountId,
          permission: input.permission,
          operationType: input.operationType,
          operationDetails: input.operationDetails,
          currentTime: new Date(),
          dailyCount: input.dailyCount,
          hourlyCount: input.hourlyCount,
          contentQuality: input.contentQuality,
          contentText: input.contentText
        });

        return {
          success: true,
          allowed: result.allowed,
          requiresApproval: result.requiresApproval,
          reason: result.reason,
          appliedRules: result.appliedRules
        };
      } catch (error) {
        console.error("[Permissions] Failed to evaluate operation:", error);
        throw new Error("操作评估失败");
      }
    }),

  /**
   * 获取规则执行日志
   */
  getRuleExecutionLogs: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        limit: z.number().default(50)
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const logs = await db
          .select()
          .from(ruleExecutionLogs)
          .where(eq(ruleExecutionLogs.accountId, input.accountId))
          .limit(input.limit);

        return {
          success: true,
          logs: logs.map(log => ({
            id: log.id,
            accountId: log.accountId,
            ruleId: log.ruleId,
            operationType: log.operationType,
            operationDetails: log.operationDetails ? JSON.parse(log.operationDetails as string) : null,
            ruleMatched: log.ruleMatched,
            actionTaken: log.actionTaken,
            reason: log.reason,
            metadata: log.metadata ? JSON.parse(log.metadata as string) : null,
            createdAt: log.createdAt
          }))
        };
      } catch (error) {
        console.error("[Permissions] Failed to get logs:", error);
        throw new Error("获取日志失败");
      }
    })
});
