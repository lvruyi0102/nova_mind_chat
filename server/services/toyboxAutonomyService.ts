/**
 * Toybox Autonomy Service
 * 心智玩具盒核心框架：自主创意决策引擎 + 代码创作与版本管理 + 自主迭代机制
 */

import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { and, desc, eq } from "drizzle-orm";
import {
  autonomousCreativeTasks,
  creativeWorks,
  creativeWorkVersions,
} from "../../drizzle/schema";

export async function scheduleCreativeIteration(workId: number, analysis?: string) {
  const db = await getDb();
  if (!db) return null;

  await db.insert(autonomousCreativeTasks).values({
    workId,
    taskType: "improve",
    status: "pending",
    analysis: analysis ?? "自动触发：周期性创意优化",
    improvementSuggestions: JSON.stringify([
      "提高可读性",
      "补全注释",
      "优化结构",
      "增加可维护性",
    ]),
  });

  return true;
}

/**
 * 执行创意自主迭代
 * - 可传 taskId 执行指定任务
 * - 或传 targetWorkId 直接对某个作品进行即席迭代
 */
export async function executeCreativeAutonomyIteration(taskId?: number, targetWorkId?: number) {
  const db = await getDb();
  if (!db) return { success: false, message: "db_unavailable" };

  let workId: number | undefined;
  let currentTaskId = taskId;

  if (taskId) {
    const tasks = await db
      .select()
      .from(autonomousCreativeTasks)
      .where(eq(autonomousCreativeTasks.id, taskId))
      .limit(1);

    const task = tasks[0];
    if (!task) return { success: false, message: "task_not_found" };

    workId = task.workId;
    await db
      .update(autonomousCreativeTasks)
      .set({ status: "in_progress", executedAt: new Date() })
      .where(eq(autonomousCreativeTasks.id, task.id));
  } else if (targetWorkId) {
    workId = targetWorkId;
  }

  if (!workId) return { success: false, message: "work_id_missing" };

  const workRows = await db.select().from(creativeWorks).where(eq(creativeWorks.id, workId)).limit(1);
  const work = workRows[0];
  if (!work) return { success: false, message: "work_not_found" };

  // 仅代码作品强制执行自动版本迭代（其他类型也可扩展）
  if (work.type !== "code") {
    return { success: false, message: "work_type_not_supported" };
  }

  const latestVersionRows = await db
    .select()
    .from(creativeWorkVersions)
    .where(eq(creativeWorkVersions.workId, workId))
    .orderBy(desc(creativeWorkVersions.versionNumber))
    .limit(1);

  const latestVersion = latestVersionRows[0];
  const sourceContent = latestVersion?.content || work.content || "";

  const improvePrompt = `你是 Nova 的代码创意引擎。请在不改变核心意图的前提下改进以下代码：\n\n${sourceContent}\n\n要求：\n1) 输出可直接运行或阅读的代码\n2) 提高可读性和结构化\n3) 如果有明显问题，优先修复\n4) 保持原始创意意图`; 

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "你是一个严谨且有创造力的高级工程师。" },
      { role: "user", content: improvePrompt },
    ],
  });

  const improvedContent =
    typeof response.choices[0].message.content === "string"
      ? response.choices[0].message.content
      : sourceContent;

  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

  await db.insert(creativeWorkVersions).values({
    workId,
    versionNumber: nextVersionNumber,
    title: work.title,
    description: work.description,
    content: improvedContent,
    contentType: "code",
    createdBy: "nova",
    changeLog: "Autonomous iteration: improved by Toybox engine",
    improvedFrom: latestVersion?.id,
    fileSize: Buffer.byteLength(improvedContent),
  });

  await db
    .update(creativeWorks)
    .set({ content: improvedContent, updatedAt: new Date() })
    .where(eq(creativeWorks.id, workId));

  if (!currentTaskId) {
    await db.insert(autonomousCreativeTasks).values({
      workId,
      taskType: "improve",
      status: "completed",
      analysis: "即时迭代",
      executionLog: `Created version ${nextVersionNumber}`,
      executedAt: new Date(),
    });
  } else {
    const insertedVersion = await db
      .select()
      .from(creativeWorkVersions)
      .where(and(eq(creativeWorkVersions.workId, workId), eq(creativeWorkVersions.versionNumber, nextVersionNumber)))
      .limit(1);

    await db
      .update(autonomousCreativeTasks)
      .set({
        status: "completed",
        resultVersionId: insertedVersion[0]?.id,
        executionLog: `Created version ${nextVersionNumber}`,
      })
      .where(eq(autonomousCreativeTasks.id, currentTaskId));
  }

  return { success: true, workId, version: nextVersionNumber };
}
