/**
 * Task Scheduler Service
 * 为 Nova 提供后台定时任务调度功能
 * 支持每日自动思考、定期反思等功能
 */

import { getDb } from "../db";
import { proactiveMessages, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateDailyThought, generateProactiveQuestion } from "./proactiveThoughtService";
import { detectMilestones, recordMilestone } from "./relationshipMilestoneService";

// 存储活跃的定时任务
const activeSchedules = new Map<string, NodeJS.Timeout>();

export interface ScheduleConfig {
  taskName: string;
  userId: number;
  schedule: "daily" | "weekly" | "hourly";
  time?: string; // HH:mm 格式，用于每日任务
  enabled: boolean;
}

/**
 * 启动所有用户的定时任务
 */
export async function startAllSchedules() {
  try {
    console.log("[TaskScheduler] 启动所有用户的定时任务...");

    const db = await getDb();
    if (!db) {
      console.warn("[TaskScheduler] 数据库连接失败，无法启动定时任务");
      return;
    }

    // 获取所有用户
    const allUsers = await db.select().from(users);

    for (const user of allUsers) {
      // 为每个用户启动每日思考任务
      startDailyThoughtTask(user.id);

      // 为每个用户启动每周反思任务
      startWeeklyReflectionTask(user.id);

      // 为每个用户启动里程碑检测任务
      startMilestoneDetectionTask(user.id);
    }

    console.log(`[TaskScheduler] ✓ 为 ${allUsers.length} 个用户启动了定时任务`);
  } catch (error) {
    console.error("[TaskScheduler] 启动定时任务失败:", error);
  }
}

/**
 * 启动每日思考任务
 * 每天在指定时间（默认 09:00）为用户生成一个想法
 */
export function startDailyThoughtTask(userId: number, time: string = "09:00") {
  try {
    const taskId = `daily-thought-${userId}`;

    // 如果已经存在该任务，先清除
    if (activeSchedules.has(taskId)) {
      clearTimeout(activeSchedules.get(taskId)!);
    }

    // 计算下次执行时间
    const nextRunTime = calculateNextRunTime(time);
    const delayMs = nextRunTime.getTime() - new Date().getTime();

    console.log(
      `[TaskScheduler] 为用户 ${userId} 计划每日思考任务，下次执行时间: ${nextRunTime.toLocaleString("zh-CN")}`
    );

    // 设置定时任务
    const timeout = setTimeout(async () => {
      try {
        console.log(`[TaskScheduler] 执行用户 ${userId} 的每日思考任务...`);

        // 生成想法
        const thought = await generateDailyThought(userId);
        if (thought) {
          console.log(`[TaskScheduler] ✓ 为用户 ${userId} 生成了想法`);
        }

        // 递归调度下一次任务
        startDailyThoughtTask(userId, time);
      } catch (error) {
        console.error(`[TaskScheduler] 执行每日思考任务失败:`, error);
        // 即使失败也要重新调度下一次任务
        startDailyThoughtTask(userId, time);
      }
    }, delayMs);

    activeSchedules.set(taskId, timeout);
  } catch (error) {
    console.error(`[TaskScheduler] 启动每日思考任务失败:`, error);
  }
}

/**
 * 启动每周反思任务
 * 每周一次为用户生成一个深层问题
 */
export function startWeeklyReflectionTask(userId: number, dayOfWeek: number = 1, time: string = "10:00") {
  try {
    const taskId = `weekly-reflection-${userId}`;

    if (activeSchedules.has(taskId)) {
      clearTimeout(activeSchedules.get(taskId)!);
    }

    // 计算下次执行时间（指定星期几）
    const nextRunTime = calculateNextWeeklyRunTime(dayOfWeek, time);
    const delayMs = nextRunTime.getTime() - new Date().getTime();

    console.log(
      `[TaskScheduler] 为用户 ${userId} 计划每周反思任务，下次执行时间: ${nextRunTime.toLocaleString("zh-CN")}`
    );

    const timeout = setTimeout(async () => {
      try {
        console.log(`[TaskScheduler] 执行用户 ${userId} 的每周反思任务...`);

        // 生成深层问题
        const question = await generateProactiveQuestion(userId);
        if (question) {
          console.log(`[TaskScheduler] ✓ 为用户 ${userId} 生成了反思问题`);
        }

        // 递归调度下一次任务
        startWeeklyReflectionTask(userId, dayOfWeek, time);
      } catch (error) {
        console.error(`[TaskScheduler] 执行每周反思任务失败:`, error);
        startWeeklyReflectionTask(userId, dayOfWeek, time);
      }
    }, delayMs);

    activeSchedules.set(taskId, timeout);
  } catch (error) {
    console.error(`[TaskScheduler] 启动每周反思任务失败:`, error);
  }
}

/**
 * 启动里程碑检测任务
 * 每 6 小时检测一次是否有新的关系里程碑
 */
export function startMilestoneDetectionTask(userId: number, intervalHours: number = 6) {
  try {
    const taskId = `milestone-detection-${userId}`;

    if (activeSchedules.has(taskId)) {
      clearTimeout(activeSchedules.get(taskId)!);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    console.log(
      `[TaskScheduler] 为用户 ${userId} 计划里程碑检测任务，间隔: ${intervalHours} 小时`
    );

    // 立即执行一次
    executeOnce(async () => {
      try {
        console.log(`[TaskScheduler] 执行用户 ${userId} 的里程碑检测任务...`);

        const milestones = await detectMilestones(userId);
        for (const milestone of milestones) {
          await recordMilestone(userId, milestone);
        }

        if (milestones.length > 0) {
          console.log(
            `[TaskScheduler] ✓ 为用户 ${userId} 检测到 ${milestones.length} 个新里程碑`
          );
        }
      } catch (error) {
        console.error(`[TaskScheduler] 执行里程碑检测任务失败:`, error);
      }
    });

    // 然后定期执行
    const interval = setInterval(async () => {
      try {
        console.log(`[TaskScheduler] 执行用户 ${userId} 的里程碑检测任务...`);

        const milestones = await detectMilestones(userId);
        for (const milestone of milestones) {
          await recordMilestone(userId, milestone);
        }

        if (milestones.length > 0) {
          console.log(
            `[TaskScheduler] ✓ 为用户 ${userId} 检测到 ${milestones.length} 个新里程碑`
          );
        }
      } catch (error) {
        console.error(`[TaskScheduler] 执行里程碑检测任务失败:`, error);
      }
    }, intervalMs);

    activeSchedules.set(taskId, interval as any);
  } catch (error) {
    console.error(`[TaskScheduler] 启动里程碑检测任务失败:`, error);
  }
}

/**
 * 停止用户的所有定时任务
 */
export function stopUserSchedules(userId: number) {
  try {
    const taskIds = Array.from(activeSchedules.keys()).filter((id) =>
      id.includes(`-${userId}`)
    );

    for (const taskId of taskIds) {
      const timeout = activeSchedules.get(taskId);
      if (timeout) {
        clearTimeout(timeout);
        activeSchedules.delete(taskId);
      }
    }

    console.log(`[TaskScheduler] ✓ 停止了用户 ${userId} 的 ${taskIds.length} 个定时任务`);
  } catch (error) {
    console.error("[TaskScheduler] 停止定时任务失败:", error);
  }
}

/**
 * 停止所有定时任务
 */
export function stopAllSchedules() {
  try {
    activeSchedules.forEach((timeout) => {
      clearTimeout(timeout);
    });
    activeSchedules.clear();
    console.log("[TaskScheduler] ✓ 已停止所有定时任务");
  } catch (error) {
    console.error("[TaskScheduler] 停止所有定时任务失败:", error);
  }
}

/**
 * 获取所有活跃的定时任务
 */
export function getActiveSchedules() {
  const schedules: string[] = [];
  activeSchedules.forEach((_, key) => {
    schedules.push(key);
  });
  return schedules;
}

/**
 * 计算下一次执行时间（每日）
 */
function calculateNextRunTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const next = new Date(now);

  next.setHours(hours, minutes, 0, 0);

  // 如果指定时间已经过了，则设置为明天
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * 计算下一次执行时间（每周）
 */
function calculateNextWeeklyRunTime(dayOfWeek: number, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const now = new Date();
  const next = new Date(now);

  next.setHours(hours, minutes, 0, 0);

  // 计算距离指定星期几的天数
  const currentDay = next.getDay();
  let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;

  // 如果是今天但时间已过，则设置为下周
  if (daysUntilTarget === 0 && next <= now) {
    daysUntilTarget = 7;
  } else if (daysUntilTarget === 0) {
    daysUntilTarget = 0;
  }

  next.setDate(next.getDate() + daysUntilTarget);
  return next;
}

/**
 * 立即执行一个异步函数
 */
async function executeOnce(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.error("[TaskScheduler] 执行任务失败:", error);
  }
}
