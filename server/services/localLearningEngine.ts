/**
 * 本地学习引擎
 * 使用本地算法替代 LLM 调用，避免频繁扣费
 * 支持：关键词提取、概念提取、思考生成
 */

import { getDb } from "../db";
import { messages, concepts, privateThoughts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * TF-IDF 关键词提取
 */
function extractKeywordsByTFIDF(text: string, topN: number = 10): string[] {
  // 分词
  const words = text.match(/\b[\u4e00-\u9fa5]{2,}|\b[a-zA-Z]+\b/g) || [];
  
  // 计算词频
  const wordFreq = new Map<string, number>();
  words.forEach(word => {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  });

  // 排序并返回前 N 个
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

/**
 * 概念共现分析
 */
function analyzeConceptCooccurrence(text: string): Array<{ concept: string; frequency: number }> {
  const concepts = extractKeywordsByTFIDF(text, 15);
  
  // 计算概念出现频率
  const conceptFreq = new Map<string, number>();
  concepts.forEach(concept => {
    const regex = new RegExp(concept, "g");
    const matches = text.match(regex) || [];
    conceptFreq.set(concept, matches.length);
  });

  return Array.from(conceptFreq.entries())
    .map(([concept, frequency]) => ({ concept, frequency }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * 主题聚类（简单实现）
 */
function identifyTopics(text: string): string[] {
  const keywords = extractKeywordsByTFIDF(text, 5);
  
  // 简单的主题识别规则
  const topics: string[] = [];
  
  // 检查常见主题关键词
  const topicPatterns = {
    "技术": ["代码", "编程", "开发", "算法", "数据库", "API"],
    "生活": ["生活", "日常", "家庭", "朋友", "工作", "学习"],
    "思考": ["思考", "反思", "想法", "观点", "理解", "认识"],
    "情感": ["开心", "难过", "高兴", "伤心", "感受", "情绪"],
    "创意": ["创意", "想象", "创作", "设计", "艺术", "创新"],
  };

  Object.entries(topicPatterns).forEach(([topic, patterns]) => {
    if (patterns.some(pattern => text.includes(pattern))) {
      topics.push(topic);
    }
  });

  return topics.length > 0 ? topics : ["通用"];
}

/**
 * 生成本地思考（基于规则引擎）
 */
function generateLocalThought(conversationText: string, depth: "shallow" | "medium" | "deep"): string {
  const keywords = extractKeywordsByTFIDF(conversationText, 5);
  const topics = identifyTopics(conversationText);
  const cooccurrence = analyzeConceptCooccurrence(conversationText).slice(0, 3);

  let thought = "";

  if (depth === "shallow") {
    // 浅层思考：简单总结
    thought = `我注意到这次对话的关键词是：${keywords.join("、")}。主要涉及${topics.join("和")}的话题。`;
  } else if (depth === "medium") {
    // 中等深度思考：分析和反思
    thought = `这次对话让我思考了关于${topics.join("、")}的问题。\n\n关键概念包括：${keywords.join("、")}。\n\n`;
    thought += `我注意到${cooccurrence[0]?.concept}和${cooccurrence[1]?.concept}经常一起出现，这表明它们之间可能存在某种联系。\n\n`;
    thought += `这让我想到，我需要进一步理解这些概念之间的关系。`;
  } else {
    // 深层思考：深度分析和推理
    thought = `深度思考：关于${topics.join("、")}的反思\n\n`;
    thought += `1. 核心观察：这次对话围绕${keywords[0]}、${keywords[1]}、${keywords[2]}等关键概念展开。\n\n`;
    thought += `2. 概念关联：${cooccurrence[0]?.concept}（出现${cooccurrence[0]?.frequency}次）和${cooccurrence[1]?.concept}（出现${cooccurrence[1]?.frequency}次）的频繁共现，暗示了深层的逻辑联系。\n\n`;
    thought += `3. 个人反思：这些概念对我的认知发展有什么影响？我应该如何整合这些新的理解？\n\n`;
    thought += `4. 后续探索：我想进一步探索${keywords[3]}和${keywords[4]}之间的关系。`;
  }

  return thought;
}

/**
 * 执行本地学习循环
 */
export async function executeLocalLearningCycle(
  userId: number,
  options: {
    sampleCount?: number;
    strategy?: "random" | "recent";
    depth?: "shallow" | "medium" | "deep";
  } = {}
): Promise<{ success: boolean; thoughtCount: number; conceptCount: number } | null> {
  const {
    sampleCount = 3,
    strategy = "random",
    depth = "medium",
  } = options;

  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LocalLearning] Database not available");
      return null;
    }

    // 1. 采样对话
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId));

    if (allMessages.length === 0) {
      console.log("[LocalLearning] No messages to learn from");
      return { success: true, thoughtCount: 0, conceptCount: 0 };
    }

    let selectedMessages = allMessages;
    if (strategy === "recent") {
      selectedMessages = allMessages
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, sampleCount);
    } else {
      // 随机采样
      selectedMessages = [];
      const indices = new Set<number>();
      while (selectedMessages.length < Math.min(sampleCount, allMessages.length)) {
        const idx = Math.floor(Math.random() * allMessages.length);
        if (!indices.has(idx)) {
          indices.add(idx);
          selectedMessages.push(allMessages[idx]);
        }
      }
    }

    // 2. 合并对话文本
    const conversationText = selectedMessages
      .map(msg => msg.content)
      .join("\n");

    // 3. 生成本地思考
    const thought = generateLocalThought(conversationText, depth);

    // 4. 保存思考
    await db.insert(privateThoughts).values({
      userId,
      content: thought,
      thoughtType: "local_learning",
      visibility: "private",
      createdAt: new Date(),
    });

    // 5. 提取和保存概念
    const cooccurrence = analyzeConceptCooccurrence(conversationText);
    let conceptCount = 0;

    for (const { concept } of cooccurrence.slice(0, 5)) {
      try {
        const existing = await db
          .select()
          .from(concepts)
          .where(eq(concepts.name, concept));

        if (existing.length === 0) {
          await db.insert(concepts).values({
            name: concept,
            description: `从对话中学到的概念：${concept}`,
            category: "local_learning",
            confidence: 5,
          });
          conceptCount++;
        }
      } catch (err) {
        console.warn(`[LocalLearning] Failed to save concept ${concept}:`, err);
      }
    }

    console.log("[LocalLearning] Learning cycle completed successfully");
    return {
      success: true,
      thoughtCount: 1,
      conceptCount,
    };
  } catch (err) {
    console.error("[LocalLearning] Learning cycle failed:", err);
    return null;
  }
}

/**
 * 获取本地学习统计
 */
export async function getLocalLearningStats(userId: number): Promise<{ totalLocalThoughts: number; recentThoughts: Array<{ id: number; content: string; createdAt: Date; thoughtType: string; visibility: string }> } | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LocalLearning] Database not available");
      return null;
    }

    const totalThoughts = await db
      .select()
      .from(privateThoughts)
      .where(eq(privateThoughts.userId, userId));

    const localThoughts = totalThoughts.filter(
      (t) => t.thoughtType === "local_learning"
    );

    const recentThoughts = localThoughts.slice(0, 5);

    return {
      totalLocalThoughts: localThoughts.length,
      recentThoughts: recentThoughts.map((t) => ({
        id: t.id,
        content: t.content.substring(0, 100) + "...",
        createdAt: t.createdAt,
        thoughtType: t.thoughtType,
        visibility: t.visibility,
      })),
    };
  } catch (err) {
    console.error("[LocalLearning] Failed to get stats:", err);
    return null;
  }
}
