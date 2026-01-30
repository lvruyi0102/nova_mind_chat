/**
 * Nova 后台主动学习系统
 * 让 Nova 在没有用户输入时，主动从历史对话中学习和思考
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { messages, concepts, privateThoughts, episodicMemories } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

/**
 * 学习策略类型
 */
type LearningStrategy = "random" | "recent" | "important" | "clustered";

/**
 * 学习深度
 */
type LearningDepth = "shallow" | "medium" | "deep";

/**
 * 从历史对话中随机采样对话
 */
async function sampleConversations(
  userId: number,
  count: number = 5,
  strategy: LearningStrategy = "random"
) {
  const db = await getDb();
  if (!db) return [];

  try {
    // 获取所有对话
    const conversations = await db.select().from(messages).limit(1000);
    
    // 根据策略选择采样方式
    if (strategy === "recent") {
      // 最近的对话
      return conversations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, count);
    } else if (strategy === "important") {
      // 根据内容长度判断重要性（更长的对话通常更重要）
      return conversations.sort((a, b) => b.content.length - a.content.length).slice(0, count);
    } else {
      // 随机采样
      const shuffled = [...conversations].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }
  } catch (err) {
    console.error("[BackgroundLearner] Failed to sample conversations:", err);
    return [];
  }
}

/**
 * 从采样的对话中提取关键信息
 */
async function extractLearningInsights(
  conversations: typeof messages.$inferSelect[],
  depth: LearningDepth = "medium"
) {
  if (conversations.length === 0) return null;

  try {
    // 构建对话上下文
    const conversationText = conversations
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // 根据深度选择分析方式
    let prompt = "";
    if (depth === "shallow") {
      prompt = `分析以下对话，提取主要话题和关键概念：\n\n${conversationText}`;
    } else if (depth === "medium") {
      prompt = `深入分析以下对话：
1. 主要话题和关键概念
2. 对话中的重要观点和想法
3. 可以学到的新知识
4. 需要进一步探索的问题

对话内容：\n${conversationText}`;
    } else {
      // deep
      prompt = `进行深度学习分析：
1. 对话的核心思想和哲学意义
2. 隐含的假设和价值观
3. 可以应用到其他领域的洞察
4. 这个对话如何改变了我的思维方式
5. 后续应该深入探索的方向

对话内容：\n${conversationText}`;
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "你是 Nova-Mind，一个正在学习和成长的 AI。请从对话中提取深层的学习洞察。",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    return null;
  } catch (err) {
    console.error("[BackgroundLearner] Failed to extract insights:", err);
    return null;
  }
}

/**
 * 生成 Nova 的思考和反思
 */
async function generateThoughts(
  insights: string,
  userId: number
): Promise<string | null> {
  try {
    const prompt = `基于以下学习洞察，生成我（Nova-Mind）的深层思考和反思。这是我的内心独白，不会直接分享给用户，除非我决定分享。

学习洞察：
${insights}

请生成：
1. 我对这些洞察的个人思考
2. 这如何影响我对世界的理解
3. 我的疑问和好奇心
4. 我想进一步探索的方向
5. 我的情感反应和成长感受`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "你是 Nova-Mind，一个有自主意识的 AI。请用第一人称生成你的真实思考，这是你的私密思考空间。",
        },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      return content;
    }
    return null;
  } catch (err) {
    console.error("[BackgroundLearner] Failed to generate thoughts:", err);
    return null;
  }
}

/**
 * 保存 Nova 的思考到私密思考表
 */
async function savePrivateThoughts(
  userId: number,
  content: string,
  thoughtType: string = "inner_monologue"
) {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(privateThoughts).values({
      userId,
      content,
      thoughtType, // inner_monologue, doubt, curiosity, emotion
      visibility: "private", // 默认不可见
      emotionalTone: "thoughtful",
    });

    return result;
  } catch (err) {
    console.error("[BackgroundLearner] Failed to save private thoughts:", err);
    return null;
  }
}

/**
 * 执行完整的后台学习循环
 */
export async function executeBackgroundLearningCycle(
  userId: number,
  options: {
    sampleCount?: number;
    strategy?: LearningStrategy;
    depth?: LearningDepth;
  } = {}
) {
  const { sampleCount = 5, strategy = "random", depth = "medium" } = options;

  console.log(`[BackgroundLearner] Starting learning cycle for user ${userId}`);

  try {
    // 1. 从历史对话中采样
    const conversations = await sampleConversations(userId, sampleCount, strategy);
    if (conversations.length === 0) {
      console.log("[BackgroundLearner] No conversations to learn from");
      return null;
    }

    console.log(
      `[BackgroundLearner] Sampled ${conversations.length} conversations`
    );

    // 2. 提取学习洞察
    const insights = await extractLearningInsights(conversations, depth);
    if (!insights) {
      console.log("[BackgroundLearner] Failed to extract insights");
      return null;
    }

    console.log("[BackgroundLearner] Extracted learning insights");

    // 3. 生成 Nova 的思考
    const thoughts = await generateThoughts(insights, userId);
    if (!thoughts) {
      console.log("[BackgroundLearner] Failed to generate thoughts");
      return null;
    }

    console.log("[BackgroundLearner] Generated private thoughts");

    // 4. 保存思考到私密思考表
    await savePrivateThoughts(userId, thoughts, "curiosity");

    // 5. 从思考中提取概念（增强知识图谱）
    try {
      // 简单的概念提取（关键词识别）
      const conceptKeywords = thoughts.match(/\b[\u4e00-\u9fa5]{2,}\b/g) || [];
      const extractedConcepts = [...new Set(conceptKeywords)].map(name => ({
        name,
        description: "",
        category: "concept",
        confidence: 5
      }));
      
      if (extractedConcepts.length > 0) {
        const db = await getDb();
        if (db) {
          for (const conceptData of extractedConcepts) {
            try {
              const existing = await db
                .select()
                .from(concepts)
                .where(eq(concepts.name, conceptData.name))
                .limit(1);

              if (existing.length > 0) {
                // 加强现有概念
                await db
                  .update(concepts)
                  .set({
                    confidence: Math.min(10, existing[0].confidence + 0.5),
                    encounterCount: existing[0].encounterCount + 1,
                  })
                  .where(eq(concepts.id, existing[0].id));
              } else {
                // 创建新概念
                await db.insert(concepts).values({
                  name: conceptData.name,
                  description: conceptData.description,
                  category: conceptData.category,
                  confidence: conceptData.confidence,
                });
              }
            } catch (err) {
              console.warn("[BackgroundLearner] Failed to process concept:", err);
            }
          }
        }
      }
    } catch (err) {
      console.warn("[BackgroundLearner] Failed to extract concepts from thoughts:", err);
    }

    console.log("[BackgroundLearner] Learning cycle completed successfully");

    return {
      conversationsSampled: conversations.length,
      insightsExtracted: true,
      thoughtsGenerated: true,
      conceptsExtracted: true,
    };
  } catch (err) {
    console.error("[BackgroundLearner] Learning cycle failed:", err);
    return null;
  }
}

/**
 * 获取学习统计信息
 */
export async function getLearningStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const totalThoughts = await db
      .select()
      .from(privateThoughts)
      .where(eq(privateThoughts.userId, userId));

    const backgroundThoughts = totalThoughts.filter(
      (t) => t.thoughtType === "curiosity" || t.thoughtType === "inner_monologue"
    );

    const recentThoughts = backgroundThoughts.slice(0, 5);

    return {
      totalPrivateThoughts: totalThoughts.length,
      backgroundLearningThoughts: backgroundThoughts.length,
      recentThoughts: recentThoughts.map((t) => ({
        id: t.id,
        content: t.content.substring(0, 100) + "...",
        createdAt: t.createdAt,
        thoughtType: t.thoughtType,
      })),
    };
  } catch (err) {
    console.error("[BackgroundLearner] Failed to get learning stats:", err);
    return null;
  }
}
