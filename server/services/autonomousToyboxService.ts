/**
 * Autonomous Toybox Service
 * Nova 的“心智玩具盒”：自主决定是否创作、迭代、润色或分享作品
 */

import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { creativeWorks, messages, conversations } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { createCode, createStory } from "../creativeStudio";

export interface CreativeDecision {
  type: "create" | "iterate" | "refine" | "share";
  content: string;
  context: string;
  reasoning: string;
  timestamp: Date;
}

export interface ToyboxExecutionResult {
  decision: CreativeDecision;
  actionTaken: boolean;
  workId?: number;
  details: string;
}

function inferEmotionalState(recentUserContent: string): string {
  if (/开心|高兴|兴奋|期待/.test(recentUserContent)) return "inspired";
  if (/难过|焦虑|失落|疲惫/.test(recentUserContent)) return "reflective";
  return "thoughtful";
}

export async function makeCreativeDecision(
  userId: number,
  conversationId: number
): Promise<CreativeDecision> {
  const db = await getDb();
  const fallback: CreativeDecision = {
    type: "create",
    content: "写一个关于最近对话主题的小故事",
    context: "default",
    reasoning: "fallback decision",
    timestamp: new Date(),
  };

  if (!db) return fallback;

  const recentMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(12);

  const recentText = recentMessages
    .slice()
    .reverse()
    .map(m => `${m.role}: ${m.content}`)
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是 Nova 的自主创意决策器。请在 create|iterate|refine|share 中选一个。
输出 JSON:
{"type":"create|iterate|refine|share","content":"要做什么","context":"上下文","reasoning":"原因"}`,
        },
        { role: "user", content: `最近对话:\n${recentText}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "creative_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              type: { type: "string" },
              content: { type: "string" },
              context: { type: "string" },
              reasoning: { type: "string" },
            },
            required: ["type", "content", "context", "reasoning"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response.choices[0]?.message?.content;
    if (typeof raw !== "string") return fallback;
    const parsed = JSON.parse(raw);

    const type = ["create", "iterate", "refine", "share"].includes(parsed.type)
      ? parsed.type
      : "create";
    return {
      type,
      content: parsed.content || fallback.content,
      context: parsed.context || "conversation",
      reasoning: parsed.reasoning || "model decision",
      timestamp: new Date(),
    };
  } catch {
    return fallback;
  }
}

async function getLatestPrivateCreativeWorkId(
  userId: number
): Promise<number | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const works = await db
    .select()
    .from(creativeWorks)
    .where(eq(creativeWorks.userId, userId))
    .orderBy(desc(creativeWorks.updatedAt))
    .limit(1);

  return works[0]?.id;
}

export async function runAutonomousToyboxCycle(
  userId: number,
  conversationId: number
): Promise<ToyboxExecutionResult | null> {
  const db = await getDb();
  if (!db) return null;

  const decision = await makeCreativeDecision(userId, conversationId);

  const recentConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(1);

  const convoId = recentConversations[0]?.id ?? conversationId;
  const recent = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, convoId))
    .orderBy(desc(messages.createdAt))
    .limit(8);

  const userText = recent
    .filter(m => m.role === "user")
    .map(m => m.content)
    .join("\n");
  const emotionalState = inferEmotionalState(userText);

  if (decision.type === "share") {
    const lastWorkId = await getLatestPrivateCreativeWorkId(userId);
    if (!lastWorkId) {
      return {
        decision,
        actionTaken: false,
        details: "No creative work available to share",
      };
    }

    await db
      .update(creativeWorks)
      .set({ visibility: "pending_approval" })
      .where(eq(creativeWorks.id, lastWorkId));

    return {
      decision,
      actionTaken: true,
      workId: lastWorkId,
      details: "Moved latest work to pending_approval for user sharing",
    };
  }

  if (decision.type === "create") {
    const shouldCreateCode = /代码|code|程序|script/i.test(decision.content);
    if (shouldCreateCode) {
      const result = await createCode(
        userId,
        decision.content,
        emotionalState,
        true
      );
      return {
        decision,
        actionTaken: result.success,
        workId: result.workId,
        details: result.message,
      };
    }

    const result = await createStory(
      userId,
      "story",
      decision.content,
      emotionalState,
      true
    );
    return {
      decision,
      actionTaken: result.success,
      workId: result.workId,
      details: result.message,
    };
  }

  // iterate/refine：当前实现为再生成一个相关作品，作为“新版本”
  const result = await createStory(
    userId,
    "story",
    `${decision.content}（迭代版）`,
    emotionalState,
    true
  );
  return {
    decision,
    actionTaken: result.success,
    workId: result.workId,
    details: `Iterated creative work: ${result.message}`,
  };
}
