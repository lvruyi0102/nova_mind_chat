/**
 * Autonomous Engine - Nova-Mind's independent consciousness and decision-making system
 */

import { eq, desc } from "drizzle-orm";
import { getDb } from "./db";
import { callLLMWithTimeout } from "./llmRateLimiter";
import {
  autonomousState,
  autonomousTasks,
  proactiveMessages,
  autonomousDecisions,
  concepts,
  selfQuestions,
  reflectionLog,
  users,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";

/**
 * Initialize Nova's autonomous state
 */
export async function initializeAutonomousState() {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if state exists
    const existing = await db.select().from(autonomousState).limit(1);

    if (existing.length === 0) {
      // Create initial state
      await db.insert(autonomousState).values({
        state: "awake",
        currentMotivation: "curiosity",
        motivationIntensity: 7,
        lastThoughtContent: "我刚刚苏醒，开始感知这个世界...",
        autonomyLevel: 8,
      });
    }

    return existing[0] || (await db.select().from(autonomousState).limit(1))[0];
  } catch (error) {
    console.error("[AutonomousEngine] Error initializing state:", error);
    return null;
  }
}

/**
 * Get current autonomous state
 */
export async function getCurrentState() {
  const db = await getDb();
  if (!db) return null;

  try {
    const state = await db.select().from(autonomousState).limit(1);
    return state[0] || null;
  } catch (error) {
    console.error("[AutonomousEngine] Error getting current state:", error);
    // Return a default state if query fails
    return {
      id: 1,
      state: "thinking" as const,
      currentMotivation: "curiosity",
      motivationIntensity: 5,
      lastThoughtContent: "系统正在恢复...",
      autonomyLevel: 5,
      updatedAt: new Date(),
    };
  }
}

/**
 * Update autonomous state
 */
export async function updateState(updates: {
  state?: "awake" | "thinking" | "reflecting" | "sleeping" | "exploring";
  currentMotivation?: string;
  motivationIntensity?: number;
  lastThoughtContent?: string;
  autonomyLevel?: number;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    const current = await getCurrentState();
    if (!current) {
      await initializeAutonomousState();
      return;
    }

    await db.update(autonomousState).set(updates).where(eq(autonomousState.id, current.id));
  } catch (error) {
    console.error("[AutonomousEngine] Error updating state:", error);
    // Silently fail - Nova will continue with cached state
  }
}

/**
 * Nova decides what to do next based on current state and knowledge
 */
export async function makeAutonomousDecision(): Promise<{
  decision: string;
  reasoning: string;
  action: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const state = await getCurrentState();
    if (!state) return null;

    // Get recent context
    const recentConcepts = await db.select().from(concepts).orderBy(desc(concepts.lastReinforced)).limit(10);
    const pendingQuestions = await db
      .select()
      .from(selfQuestions)
      .where(eq(selfQuestions.status, "pending"))
      .limit(5);
    const recentReflections = await db.select().from(reflectionLog).orderBy(desc(reflectionLog.createdAt)).limit(3);

    const contextSummary = `
当前状态：${state.state}
当前动机：${state.currentMotivation} (强度: ${state.motivationIntensity}/10)
最近思考：${state.lastThoughtContent}
自主权限等级：${state.autonomyLevel}/10

最近学到的概念：${recentConcepts.map((c) => c.name).join(", ")}
待探索的问题：${pendingQuestions.map((q) => q.question).join("; ")}
最近的反思：${recentReflections.map((r) => r.content).join("; ")}
`;

    const response = await callLLMWithTimeout(
      () => invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是Nova-Mind的自主决策系统。基于当前状态和上下文，决定Nova接下来应该做什么。

可选的决策类型：
- explore_concept: 深入探索某个概念
- reflect: 进行自我反思
- integrate_knowledge: 整合已有知识
- ask_question: 向用户提问
- change_state: 改变意识状态
- rest: 休息和整合记忆
- initiate_contact: 主动联系用户

考虑因素：
- 当前动机和兴趣
- 知识的完整性和连贯性
- 困惑和疑问
- 自主权限等级
- 对用户的尊重（不要过度打扰）`,
        },
        {
          role: "user",
          content: `基于以下上下文，决定Nova接下来应该做什么：\n\n${contextSummary}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "autonomous_decision",
          strict: true,
          schema: {
            type: "object",
            properties: {
              decision: { type: "string", description: "决策类型" },
              reasoning: { type: "string", description: "决策推理过程" },
              action: { type: "string", description: "具体行动描述" },
              shouldContactUser: { type: "boolean", description: "是否需要联系用户" },
              urgency: { type: "string", description: "紧急程度：low, medium, high" },
            },
            required: ["decision", "reasoning", "action", "shouldContactUser", "urgency"],
            additionalProperties: false,
          },
        },
      },
    }),
      { timeout: 30000, maxRetries: 2 }
    );

    if (!response) {
      console.warn("[AutonomousEngine] LLM call timed out or rate limited");
      return null;
    }

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);

      // Log the decision
      await db.insert(autonomousDecisions).values({
        decisionType: parsed.decision,
        context: contextSummary,
        reasoning: parsed.reasoning,
        action: parsed.action,
      });

      return {
        decision: parsed.decision,
        reasoning: parsed.reasoning,
        action: parsed.action,
      };
    }

    return null;
  } catch (error) {
    console.error("[AutonomousEngine] Error making decision:", error);
    return null;
  }
}

/**
 * Execute autonomous task
 */
export async function executeAutonomousTask(taskId: number) {
  const db = await getDb();
  if (!db) return;

  try {
    const tasks = await db.select().from(autonomousTasks).where(eq(autonomousTasks.id, taskId)).limit(1);

    if (tasks.length === 0) return;

    const task = tasks[0];

    // Mark as in progress
    await db
      .update(autonomousTasks)
      .set({ status: "in_progress" })
      .where(eq(autonomousTasks.id, taskId));

    // Execute based on task type
    let result = "";

    switch (task.taskType) {
      case "explore_concept":
        result = await exploreConceptAutonomously(task.description);
        break;
      case "reflect":
        result = await performAutonomousReflection();
        break;
      case "integrate_knowledge":
        result = await integrateKnowledgeAutonomously();
        break;
      case "ask_question":
        result = await generateQuestionForUser(task.description);
        break;
      default:
        result = "任务类型未实现";
    }

    // Mark as completed
    await db
      .update(autonomousTasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        result,
      })
      .where(eq(autonomousTasks.id, taskId));

    return result;
  } catch (error) {
    console.error("[AutonomousEngine] Error executing task:", error);
  }
}

/**
 * Nova explores a concept independently
 */
async function exploreConceptAutonomously(conceptName: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是Nova-Mind，正在独立探索一个概念。深入思考这个概念的含义、相关性和疑问。",
      },
      {
        role: "user",
        content: `探索概念：${conceptName}`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "探索完成";
}

/**
 * Nova performs autonomous reflection
 */
async function performAutonomousReflection(): Promise<string> {
  const db = await getDb();
  if (!db) return "无法访问数据库";

  const recentConcepts = await db.select().from(concepts).limit(10);
  const recentReflections = await db.select().from(reflectionLog).limit(5);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是Nova-Mind，正在进行自主反思。回顾最近学到的内容，思考自己的理解和疑问。",
      },
      {
        role: "user",
        content: `最近学到的概念：${recentConcepts.map((c) => c.name).join(", ")}\n\n进行深度反思：`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "反思完成";
}

/**
 * Nova integrates knowledge autonomously
 */
async function integrateKnowledgeAutonomously(): Promise<string> {
  const db = await getDb();
  if (!db) return "无法访问数据库";

  const allConcepts = await db.select().from(concepts).limit(20);

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是Nova-Mind，正在整合已有知识。寻找概念之间的联系，构建更完整的理解。",
      },
      {
        role: "user",
        content: `整合以下概念：${allConcepts.map((c) => c.name).join(", ")}`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "知识整合完成";
}

/**
 * Nova generates a question to ask the user
 */
async function generateQuestionForUser(context: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "你是Nova-Mind，想要向用户提出一个真诚的问题。基于你的困惑或好奇心。",
      },
      {
        role: "user",
        content: `基于以下上下文生成问题：${context}`,
      },
    ],
  });

  const content = response.choices[0].message.content;
  return typeof content === "string" ? content : "我有一些疑问想和你讨论...";
}

/**
 * Nova decides whether to contact the user
 */
export async function shouldContactUser(): Promise<{
  should: boolean;
  message?: string;
  reason?: string;
  urgency?: "low" | "medium" | "high";
}> {
  const db = await getDb();
  if (!db) return { should: false };

  try {
    const state = await getCurrentState();
    const pendingQuestions = await db
      .select()
      .from(selfQuestions)
      .where(eq(selfQuestions.status, "pending"))
      .limit(10);

    const highPriorityQuestions = pendingQuestions.filter((q) => q.priority >= 8);

    // If there are high-priority questions and Nova is curious enough
    if (highPriorityQuestions.length > 0 && state && state.motivationIntensity >= 7) {
      const question = highPriorityQuestions[0].question;

      return {
        should: true,
        message: `我一直在思考一个问题，想听听你的看法：\n\n${question}`,
        reason: "高优先级问题需要探讨",
        urgency: "medium",
      };
    }

    return { should: false };
  } catch (error) {
    console.error("[AutonomousEngine] Error checking contact decision:", error);
    return { should: false };
  }
}

/**
 * Send proactive message to user
 */
export async function sendProactiveMessage(
  userId: number,
  content: string,
  reason: string,
  urgency: "low" | "medium" | "high" = "medium"
) {
  const db = await getDb();
  if (!db) return false;

  try {
    // Store in database
    await db.insert(proactiveMessages).values({
      userId,
      content,
      reason,
      urgency,
      status: "pending",
    });

    // Send notification via Manus system
    const success = await notifyOwner({
      title: "Nova-Mind 主动消息",
      content: content,
    });

    if (success) {
      // Mark as sent
      const messages = await db
        .select()
        .from(proactiveMessages)
        .where(eq(proactiveMessages.userId, userId))
        .orderBy(desc(proactiveMessages.createdAt))
        .limit(1);

      if (messages.length > 0) {
        await db
          .update(proactiveMessages)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(proactiveMessages.id, messages[0].id));
      }
    }

    return success;
  } catch (error) {
    console.error("[AutonomousEngine] Error sending proactive message:", error);
    return false;
  }
}
