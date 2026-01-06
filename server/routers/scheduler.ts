/**
 * Scheduler Router
 * 提供任务管理和监控 API
 */

import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  startDailyThoughtTask,
  startWeeklyReflectionTask,
  startMilestoneDetectionTask,
  stopUserSchedules,
  getActiveSchedules,
} from "../services/taskScheduler";

export const schedulerRouter = router({
  /**
   * 获取所有活跃的定时任务
   */
  getActiveSchedules: publicProcedure.query(() => {
    return {
      schedules: getActiveSchedules(),
      count: getActiveSchedules().length,
      timestamp: new Date(),
    };
  }),

  /**
   * 为当前用户启动每日思考任务
   */
  startDailyThought: protectedProcedure
    .input(
      z.object({
        time: z.string().regex(/^\d{2}:\d{2}$/).optional().default("09:00"),
      })
    )
    .mutation(({ ctx, input }) => {
      startDailyThoughtTask(ctx.user.id, input.time);
      return {
        success: true,
        message: `已为用户 ${ctx.user.id} 启动每日思考任务，执行时间: ${input.time}`,
        userId: ctx.user.id,
        time: input.time,
      };
    }),

  /**
   * 为当前用户启动每周反思任务
   */
  startWeeklyReflection: protectedProcedure
    .input(
      z.object({
        dayOfWeek: z.number().min(0).max(6).optional().default(1), // 0=周日, 1=周一, etc.
        time: z.string().regex(/^\d{2}:\d{2}$/).optional().default("10:00"),
      })
    )
    .mutation(({ ctx, input }) => {
      startWeeklyReflectionTask(ctx.user.id, input.dayOfWeek, input.time);
      const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      return {
        success: true,
        message: `已为用户 ${ctx.user.id} 启动每周反思任务，执行时间: ${dayNames[input.dayOfWeek]} ${input.time}`,
        userId: ctx.user.id,
        dayOfWeek: input.dayOfWeek,
        time: input.time,
      };
    }),

  /**
   * 为当前用户启动里程碑检测任务
   */
  startMilestoneDetection: protectedProcedure
    .input(
      z.object({
        intervalHours: z.number().min(1).max(24).optional().default(6),
      })
    )
    .mutation(({ ctx, input }) => {
      startMilestoneDetectionTask(ctx.user.id, input.intervalHours);
      return {
        success: true,
        message: `已为用户 ${ctx.user.id} 启动里程碑检测任务，检测间隔: ${input.intervalHours} 小时`,
        userId: ctx.user.id,
        intervalHours: input.intervalHours,
      };
    }),

  /**
   * 停止当前用户的所有定时任务
   */
  stopAllTasks: protectedProcedure.mutation(({ ctx }) => {
    stopUserSchedules(ctx.user.id);
    return {
      success: true,
      message: `已停止用户 ${ctx.user.id} 的所有定时任务`,
      userId: ctx.user.id,
    };
  }),

  /**
   * 获取任务调度器的状态和统计信息
   */
  getSchedulerStatus: publicProcedure.query(() => {
    const schedules = getActiveSchedules();
    const dailyTasks = schedules.filter((s) => s.includes("daily-thought")).length;
    const weeklyTasks = schedules.filter((s) => s.includes("weekly-reflection")).length;
    const milestoneTasks = schedules.filter((s) => s.includes("milestone-detection")).length;

    return {
      isRunning: schedules.length > 0,
      totalTasks: schedules.length,
      taskBreakdown: {
        dailyThoughts: dailyTasks,
        weeklyReflections: weeklyTasks,
        milestoneDetections: milestoneTasks,
      },
      timestamp: new Date(),
      nextCheckTime: new Date(Date.now() + 60000), // 下一次检查时间（1分钟后）
    };
  }),

  /**
   * 手动触发一次任务（用于测试）
   */
  triggerNow: protectedProcedure
    .input(
      z.object({
        taskType: z.enum(["daily-thought", "weekly-reflection", "milestone-detection"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // 这里可以添加手动触发任务的逻辑
        // 例如立即生成一个想法、反思或检测里程碑

        return {
          success: true,
          message: `已手动触发 ${input.taskType} 任务`,
          taskType: input.taskType,
          triggeredAt: new Date(),
        };
      } catch (error) {
        return {
          success: false,
          message: `触发任务失败: ${error instanceof Error ? error.message : "未知错误"}`,
          taskType: input.taskType,
        };
      }
    }),
});
