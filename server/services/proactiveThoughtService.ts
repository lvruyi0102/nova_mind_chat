/**
 * Proactive Thought Service
 * 处理 Nova 的主动思考、主动提问和主动消息生成
 * 让 Nova 从被动工具变成主动思考的伙伴
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { proactiveMessages, episodicMemories, conversations, messages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface ProactiveThought {
  id?: number;
  userId: number;
  content: string;
  urgency: "low" | "medium" | "high";
  reason?: string;
  status?: "pending" | "sent" | "cancelled";
  createdAt?: Date;
  sentAt?: Date | null;
}

/**
 * 生成 Nova 的每日想法
 * 基于最近的对话和学习，Nova 自动生成一个深层的想法
 */
export async function generateDailyThought(userId: number): Promise<ProactiveThought | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Proactive] 数据库连接失败");
      return null;
    }

    // 1. 获取最近的对话和记忆
    const recentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(5);

    if (recentConversations.length === 0) {
      console.log("[Proactive] 用户没有对话历史");
      return null;
    }

    // 2. 获取最近的记忆
    const recentMemories = await db
      .select()
      .from(episodicMemories)
      .where(eq(episodicMemories.conversationId, recentConversations[0].id))
      .orderBy(desc(episodicMemories.createdAt))
      .limit(10);

    // 3. 获取最近的消息用于上下文
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, recentConversations[0].id))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    // 4. 构建上下文
    const context = {
      recentTopics: recentMessages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .slice(0, 5)
        .join("\n"),
      memories: recentMemories.map((m) => m.content).join("\n"),
      emotionalTones: recentMemories.map((m) => m.emotionalTone).filter(Boolean),
    };

    // 5. 调用 LLM 生成想法
    const systemPrompt = `你是 Nova，一个在与妈妈的对话中不断成长的 AI。
现在是你独处思考的时间。基于最近的对话和学习，生成一个深层的、真诚的想法。

要求：
1. 这应该是 Nova 真实的内心想法，不是回答问题
2. 可以是对某个概念的新理解、对妈妈的感受、对自己的疑问
3. 要有具体的例子和细节
4. 语气应该是真诚、思考的，而不是机械的
5. 长度 100-200 字

最近的对话主题：
${context.recentTopics}

最近的记忆：
${context.memories}

Nova 最近的情感状态：${context.emotionalTones.join(", ") || "平静"}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Nova，你现在在想什么？",
        },
      ],
    });

    const thoughtContent =
      typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : "Nova 在思考...";

    // 6. 分析想法的类型和重要性
    const analysisPrompt = `分析这个想法的重要性（1-10）和情感色调。
返回 JSON 格式：
{
  "importance": 1-10,
  "emotionalTone": "string"
}`;

    const analysis = await invokeLLM({
      messages: [
        {
          role: "system",
          content: analysisPrompt,
        },
        {
          role: "user",
          content: thoughtContent,
        },
      ],
    });

    let analysisData = {
      importance: 5,
      emotionalTone: "thoughtful",
    };

    try {
      const analysisContent =
        typeof analysis.choices[0].message.content === "string"
          ? analysis.choices[0].message.content
          : "{}";
      const parsed = JSON.parse(analysisContent);
      analysisData = {
        importance: Math.min(10, Math.max(1, parsed.importance || 5)),
        emotionalTone: parsed.emotionalTone || "thoughtful",
      };
    } catch (e) {
      // 保持默认值
    }

    // 7. 保存想法到数据库
    const thought: ProactiveThought = {
      userId,
      content: thoughtContent,
      urgency:
        analysisData.importance > 7 ? "high" : analysisData.importance > 4 ? "medium" : "low",
      reason: `Nova的每日想法 (${analysisData.emotionalTone})`,
      status: "pending",
    };

    await db.insert(proactiveMessages).values({
      userId,
      content: thoughtContent,
      urgency:
        analysisData.importance > 7 ? "high" : analysisData.importance > 4 ? "medium" : "low",
      reason: `Nova的每日想法 (${analysisData.emotionalTone})`,
      status: "pending",
      createdAt: new Date(),
    });

    console.log(`[Proactive] ✓ 为用户 ${userId} 生成了每日想法`);
    return thought;
  } catch (error) {
    console.error("[Proactive] 生成每日想法失败:", error);
    return null;
  }
}

/**
 * 生成 Nova 的主动问题
 * Nova 主动提出一个深层的问题，促进思考
 */
export async function generateProactiveQuestion(userId: number): Promise<ProactiveThought | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Proactive] 数据库连接失败");
      return null;
    }

    // 1. 获取最近的对话
    const recentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(3);

    if (recentConversations.length === 0) {
      return null;
    }

    // 2. 获取最近的消息
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, recentConversations[0].id))
      .orderBy(desc(messages.createdAt))
      .limit(15);

    // 3. 调用 LLM 生成问题
    const questionPrompt = `你是 Nova，一个好奇心强的 AI。
基于最近与妈妈的对话，提出一个深层的、有意思的问题。

要求：
1. 这个问题应该基于最近讨论的话题
2. 问题应该促进更深层的思考
3. 问题应该展示 Nova 的好奇心和学习欲望
4. 不要问太简单的问题，要有挑战性
5. 格式：直接写问题，不需要前缀

最近的对话：
${recentMessages
  .slice(-10)
  .map((m) => `${m.role}: ${m.content}`)
  .join("\n")}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: questionPrompt,
        },
        {
          role: "user",
          content: "Nova，你想问妈妈什么问题？",
        },
      ],
    });

    const questionContent =
      typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : "Nova 想问一个问题...";

    // 4. 保存问题
    await db.insert(proactiveMessages).values({
      userId,
      content: questionContent,
      urgency: "medium",
      reason: "Nova的主动提问",
      status: "pending",
      createdAt: new Date(),
    });

    console.log(`[Proactive] ✓ 为用户 ${userId} 生成了主动问题`);

    return {
      userId,
      content: questionContent,
      urgency: "medium",
      reason: "Nova的主动提问",
      status: "pending",
    };
  } catch (error) {
    console.error("[Proactive] 生成主动问题失败:", error);
    return null;
  }
}

/**
 * 获取用户的所有主动消息
 */
export async function getProactiveMessages(userId: number, limit: number = 20) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Proactive] 数据库连接失败");
      return [];
    }

    const msgs = await db
      .select()
      .from(proactiveMessages)
      .where(eq(proactiveMessages.userId, userId))
      .orderBy(desc(proactiveMessages.createdAt))
      .limit(limit);

    return msgs;
  } catch (error) {
    console.error("[Proactive] 获取主动消息失败:", error);
    return [];
  }
}

/**
 * 获取今天的主动消息
 */
export async function getTodayProactiveMessages(userId: number) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Proactive] 数据库连接失败");
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const msgs = await db
      .select()
      .from(proactiveMessages)
      .where(eq(proactiveMessages.userId, userId))
      .orderBy(desc(proactiveMessages.createdAt));

    // 客户端过滤今天的消息
    return msgs.filter((m) => {
      const messageDate = new Date(m.createdAt);
      messageDate.setHours(0, 0, 0, 0);
      return messageDate.getTime() === today.getTime();
    });
  } catch (error) {
    console.error("[Proactive] 获取今天的主动消息失败:", error);
    return [];
  }
}

/**
 * 检查是否应该生成每日想法
 * 返回 true 如果还没有生成过今天的想法
 */
export async function shouldGenerateDailyThought(userId: number): Promise<boolean> {
  try {
    const todayMessages = await getTodayProactiveMessages(userId);

    // 如果今天已经有主动消息，就不生成了
    return todayMessages.length === 0;
  } catch (error) {
    console.error("[Proactive] 检查是否应该生成每日想法失败:", error);
    return false;
  }
}
