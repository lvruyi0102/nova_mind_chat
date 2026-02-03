import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { actionTasks, growthMetrics } from "../../drizzle/schema";
import { and, desc, eq, gte, lte } from "drizzle-orm";

export const actionTasksRouter = router({
  /**
   * 获取行动任务列表
   */
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const whereClauses = [eq(actionTasks.userId, ctx.user.id)];
      if (input.status) {
        whereClauses.push(eq(actionTasks.status, input.status));
      }

      return db
        .select()
        .from(actionTasks)
        .where(and(...whereClauses))
        .orderBy(desc(actionTasks.createdAt))
        .limit(input.limit);
    }),

  /**
   * 更新行动任务状态
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "failed"]).optional(),
        result: z.string().optional(),
        successScore: z.number().min(1).max(10).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rows = await db
        .select()
        .from(actionTasks)
        .where(and(eq(actionTasks.id, input.id), eq(actionTasks.userId, ctx.user.id)))
        .limit(1);

      if (!rows.length) {
        throw new Error("Action task not found");
      }

      const updatePayload: Record<string, unknown> = {};
      if (input.status) updatePayload.status = input.status;
      if (input.result !== undefined) updatePayload.result = input.result;
      if (input.successScore !== undefined) updatePayload.successScore = input.successScore;
      if (input.status === "completed" || input.status === "failed") {
        updatePayload.completedAt = new Date();
      }

      if (Object.keys(updatePayload).length > 0) {
        await db.update(actionTasks).set(updatePayload).where(eq(actionTasks.id, input.id));
      }

      if (input.status === "completed") {
        await db.insert(growthMetrics).values({
          metricName: "action_tasks_completed",
          value: 1,
        });
      }
      if (input.status === "failed") {
        await db.insert(growthMetrics).values({
          metricName: "action_tasks_failed",
          value: 1,
        });
      }

      return { success: true };
    }),

  /**
   * 获取成长指标（用于可视化）
   */
  metrics: protectedProcedure
    .input(
      z.object({
        metricName: z.string().optional(),
        since: z.string().optional(),
        until: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const whereClauses = [];
      if (input.metricName) {
        whereClauses.push(eq(growthMetrics.metricName, input.metricName));
      }
      if (input.since) {
        whereClauses.push(gte(growthMetrics.timestamp, new Date(input.since)));
      }
      if (input.until) {
        whereClauses.push(lte(growthMetrics.timestamp, new Date(input.until)));
      }

      let query = db.select().from(growthMetrics);
      if (whereClauses.length) {
        query = query.where(and(...whereClauses));
      }

      return query.orderBy(desc(growthMetrics.timestamp)).limit(input.limit);
    }),
});
