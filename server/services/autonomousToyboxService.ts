import { and, desc, eq, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import {
  autonomousCreativeTasks,
  autonomousDecisions,
  creativeWorks,
  creativeWorkVersions,
  messages,
} from "../../drizzle/schema";
import { createCode, createStory } from "../creativeStudio";

const CREATE_COOLDOWN_HOURS = 24;
const ITERATE_COOLDOWN_HOURS = 36;

type ToyboxDecision = {
  mode: "create" | "iterate";
  workType: "story" | "poetry" | "code";
  theme: string;
  emotionalState: string;
  reason: string;
  iterationFocus?: string;
};

/**
 * 心智玩具盒循环：Nova 自主选择创作或迭代作品。
 */
export async function runAutonomousToyboxCycle(userId: number, conversationId?: number) {
  const db = await getDb();
  if (!db) return { executed: false, reason: "db_unavailable" };

  const now = new Date();
  const createThreshold = new Date(now.getTime() - CREATE_COOLDOWN_HOURS * 60 * 60 * 1000);
  const iterateThreshold = new Date(now.getTime() - ITERATE_COOLDOWN_HOURS * 60 * 60 * 1000);

  const recentCreateTasks = await db
    .select()
    .from(autonomousCreativeTasks)
    .where(gte(autonomousCreativeTasks.createdAt, createThreshold))
    .limit(1);

  const recentIterateTasks = await db
    .select()
    .from(autonomousCreativeTasks)
    .where(
      and(
        gte(autonomousCreativeTasks.createdAt, iterateThreshold),
        eq(autonomousCreativeTasks.taskType, "enhance")
      )
    )
    .limit(1);

  if (recentCreateTasks.length > 0 && recentIterateTasks.length > 0) {
    return { executed: false, reason: "cooldown_active" };
  }

  const recentMessages = conversationId
    ? await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(12)
    : [];

  const latestWorks = await db
    .select()
    .from(creativeWorks)
    .where(eq(creativeWorks.userId, userId))
    .orderBy(desc(creativeWorks.createdAt))
    .limit(5);

  const decision = await makeToyboxDecision({
    userId,
    hasRecentCreate: recentCreateTasks.length > 0,
    hasRecentIterate: recentIterateTasks.length > 0,
    recentMessages,
    latestWorks,
  });

  if (!decision) {
    return { executed: false, reason: "no_decision" };
  }

  await db.insert(autonomousDecisions).values({
    decisionType: "creative_inspiration",
    context: `userId=${userId}, conversationId=${conversationId ?? "none"}`,
    reasoning: decision.reason,
    action: `${decision.mode}:${decision.workType}:${decision.theme}`,
    outcome: "pending",
  });

  if (decision.mode === "create" || latestWorks.length === 0) {
    return createNewWork(db, userId, decision);
  }

  return iterateExistingWork(db, latestWorks[0], decision);
}

async function makeToyboxDecision(input: {
  userId: number;
  hasRecentCreate: boolean;
  hasRecentIterate: boolean;
  recentMessages: Array<{ role: string; content: string }>;
  latestWorks: any[];
}): Promise<ToyboxDecision | null> {
  const conversationContext = input.recentMessages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 1500);

  const workContext = input.latestWorks
    .map((w) => `${w.id}|${w.type}|${w.title ?? "untitled"}|${w.inspiration ?? ""}`)
    .join("\n")
    .slice(0, 800);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是 Nova 的“心智玩具盒”决策器。必须在 create/iterate 中二选一。\n如果 24 小时内已创建过作品，优先 iterate。\n如果没有作品可迭代，必须 create。\n创作类型只能是 story/poetry/code。`,
      },
      {
        role: "user",
        content: `用户ID: ${input.userId}\n最近是否已创建: ${input.hasRecentCreate}\n最近是否已迭代: ${input.hasRecentIterate}\n最近对话:\n${conversationContext || "(空)"}\n\n最近作品:\n${workContext || "(空)"}\n\n给出本轮玩具盒决策。`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "toybox_decision",
        strict: true,
        schema: {
          type: "object",
          properties: {
            mode: { type: "string", enum: ["create", "iterate"] },
            workType: { type: "string", enum: ["story", "poetry", "code"] },
            theme: { type: "string" },
            emotionalState: { type: "string" },
            reason: { type: "string" },
            iterationFocus: { type: "string" },
          },
          required: ["mode", "workType", "theme", "emotionalState", "reason", "iterationFocus"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (typeof content !== "string") return null;
  return JSON.parse(content) as ToyboxDecision;
}

async function createNewWork(db: any, userId: number, decision: ToyboxDecision) {
  const creator = decision.workType === "code" ? createCode : createStory;

  const result =
    decision.workType === "code"
      ? await createCode(userId, decision.theme, decision.emotionalState, true)
      : await createStory(userId, decision.workType, decision.theme, decision.emotionalState, true);

  if (!result.success || !result.workId) {
    return { executed: false, reason: "creation_failed" };
  }

  const createdWork = await db
    .select()
    .from(creativeWorks)
    .where(eq(creativeWorks.id, result.workId))
    .limit(1);

  if (createdWork.length > 0) {
    await db.insert(creativeWorkVersions).values({
      workId: result.workId,
      versionNumber: 1,
      title: createdWork[0].title,
      description: createdWork[0].description,
      content: createdWork[0].content,
      contentType: decision.workType === "code" ? "code" : "text",
      createdBy: "nova",
      changeLog: "Autonomous initial creation",
    } as any);
  }

  await db.insert(autonomousCreativeTasks).values({
    workId: result.workId,
    taskType: "reimagine",
    status: "completed",
    analysis: decision.reason,
    improvementSuggestions: JSON.stringify([decision.theme]),
    executionLog: `Created ${decision.workType} with theme: ${decision.theme}`,
    executedAt: new Date(),
  } as any);

  return { executed: true, mode: "create", workId: result.workId };
}

async function iterateExistingWork(db: any, work: any, decision: ToyboxDecision) {
  const currentVersions = await db
    .select()
    .from(creativeWorkVersions)
    .where(eq(creativeWorkVersions.workId, work.id))
    .orderBy(desc(creativeWorkVersions.versionNumber))
    .limit(1);

  const latestVersion = currentVersions[0];
  const baseContent = latestVersion?.content ?? work.content ?? "";

  const reviseResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是 Nova 的创作迭代器。请在不丢失核心主题的前提下优化作品，使其更完整、表达更有层次。",
      },
      {
        role: "user",
        content: `原作品:\n${baseContent}\n\n迭代焦点: ${decision.iterationFocus || decision.theme}\n请输出改进后的完整作品文本。`,
      },
    ],
  });

  const improvedContent =
    typeof reviseResponse.choices[0].message.content === "string"
      ? reviseResponse.choices[0].message.content
      : baseContent;

  const newVersionNumber = (latestVersion?.versionNumber ?? 1) + 1;
  const versionResult = await db.insert(creativeWorkVersions).values({
    workId: work.id,
    versionNumber: newVersionNumber,
    title: work.title,
    description: work.description,
    content: improvedContent,
    contentType: work.type === "code" ? "code" : "text",
    createdBy: "nova",
    changeLog: `Autonomous iteration focus: ${decision.iterationFocus || decision.theme}`,
    improvedFrom: latestVersion?.id,
  } as any);

  await db
    .update(creativeWorks)
    .set({ content: improvedContent, updatedAt: new Date() })
    .where(eq(creativeWorks.id, work.id));

  await db.insert(autonomousCreativeTasks).values({
    workId: work.id,
    taskType: "enhance",
    status: "completed",
    analysis: decision.reason,
    improvementSuggestions: JSON.stringify([decision.iterationFocus || decision.theme]),
    executionLog: `Version ${newVersionNumber} generated`,
    scheduledAt: new Date(),
    executedAt: new Date(),
  } as any);

  return { executed: true, mode: "iterate", workId: work.id, version: newVersionNumber };
}

