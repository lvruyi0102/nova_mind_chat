/**
 * Cognitive Coordination Service
 * 统一协调自主决策、创意玩具盒、主动消息系统，形成闭环认知循环
 */

import { getDb } from "../db";
import { users, autonomousTasks, autonomousCreativeTasks, creativeWorks } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { makeAutonomousDecision, executeAutonomousTask } from "../autonomousEngine";
import { executeCreativeAutonomyIteration } from "./toyboxAutonomyService";
import { generateWeeklyReflection } from "./proactiveThoughtService";

export interface CoordinationCycleResult {
  decisionSummary: string;
  executedTasks: number;
  creativeIterations: number;
  proactiveUpdates: number;
}

/**
 * 统一认知协调入口
 */
export async function runUnifiedCognitiveCycle(): Promise<CoordinationCycleResult> {
  const db = await getDb();
  if (!db) {
    return {
      decisionSummary: "db_unavailable",
      executedTasks: 0,
      creativeIterations: 0,
      proactiveUpdates: 0,
    };
  }

  const decision = await makeAutonomousDecision();

  // 1) 执行一个普通自主任务
  const pendingTask = await db
    .select()
    .from(autonomousTasks)
    .where(eq(autonomousTasks.status, "pending"))
    .orderBy(desc(autonomousTasks.createdAt))
    .limit(1);

  let executedTasks = 0;
  if (pendingTask[0]) {
    await executeAutonomousTask(pendingTask[0].id);
    executedTasks = 1;
  }

  // 2) 执行一个创意任务（玩具盒自主迭代）
  let creativeIterations = 0;
  const pendingCreativeTask = await db
    .select()
    .from(autonomousCreativeTasks)
    .where(eq(autonomousCreativeTasks.status, "pending"))
    .orderBy(desc(autonomousCreativeTasks.createdAt))
    .limit(1);

  if (pendingCreativeTask[0]) {
    await executeCreativeAutonomyIteration(pendingCreativeTask[0].id);
    creativeIterations = 1;
  } else {
    // 若无待执行任务，尝试自动挑选最近一个作品进入迭代
    const latestWork = await db
      .select()
      .from(creativeWorks)
      .orderBy(desc(creativeWorks.updatedAt))
      .limit(1);

    if (latestWork[0]) {
      const result = await executeCreativeAutonomyIteration(undefined, latestWork[0].id);
      if (result.success) creativeIterations = 1;
    }
  }

  // 3) 主动消息系统：为每个用户补齐每周反思
  let proactiveUpdates = 0;
  const allUsers = await db.select().from(users);
  for (const user of allUsers) {
    const reflection = await generateWeeklyReflection(user.id);
    if (reflection) proactiveUpdates += 1;
  }

  return {
    decisionSummary: decision?.decision ?? "no_decision",
    executedTasks,
    creativeIterations,
    proactiveUpdates,
  };
}
