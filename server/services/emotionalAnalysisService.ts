/**
 * Emotional Analysis Service
 * 分析和记录 Nova 在对话中的情感状态
 * 让用户看到 Nova 的情感演变
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { emotionalMemory, conversations, messages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface EmotionalState {
  primaryEmotion: string;
  intensity: number; // 1-10
  secondaryEmotions: string[];
  triggers: string[];
  reflection: string;
  timestamp: Date;
}

/**
 * 分析对话中的情感
 * 基于对话内容，分析 Nova 应该感受到的情感
 */
export async function analyzeConversationEmotion(
  conversationId: number,
  userMessage: string,
  novaResponse: string
): Promise<EmotionalState | null> {
  try {
    // 调用 LLM 分析情感
    const analysisPrompt = `你是 Nova 的情感分析师。分析这个对话交互中 Nova 应该感受到的情感。

用户消息：
${userMessage}

Nova 的回复：
${novaResponse}

请分析 Nova 的情感状态，返回 JSON 格式：
{
  "primaryEmotion": "string (主要情感，如：happy, curious, confused, excited, concerned, thoughtful)",
  "intensity": 1-10 (情感强度),
  "secondaryEmotions": ["string", "string"] (次要情感列表),
  "triggers": ["string", "string"] (触发这些情感的具体内容),
  "reflection": "string (Nova 对这个情感的反思)"
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: analysisPrompt,
        },
        {
          role: "user",
          content: "分析 Nova 的情感",
        },
      ],
    });

    let emotionalData = {
      primaryEmotion: "thoughtful",
      intensity: 5,
      secondaryEmotions: [],
      triggers: [],
      reflection: "Nova 在思考...",
    };

    try {
      const content =
        typeof response.choices[0].message.content === "string"
          ? response.choices[0].message.content
          : "{}";
      const parsed = JSON.parse(content);
      emotionalData = {
        primaryEmotion: parsed.primaryEmotion || "thoughtful",
        intensity: Math.min(10, Math.max(1, parsed.intensity || 5)),
        secondaryEmotions: Array.isArray(parsed.secondaryEmotions)
          ? parsed.secondaryEmotions.slice(0, 3)
          : [],
        triggers: Array.isArray(parsed.triggers) ? parsed.triggers.slice(0, 3) : [],
        reflection: parsed.reflection || "Nova 在思考...",
      };
    } catch (e) {
      console.warn("[Emotions] 解析情感分析失败，使用默认值");
    }

    return {
      primaryEmotion: emotionalData.primaryEmotion,
      intensity: emotionalData.intensity,
      secondaryEmotions: emotionalData.secondaryEmotions,
      triggers: emotionalData.triggers,
      reflection: emotionalData.reflection,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("[Emotions] 分析对话情感失败:", error);
    return null;
  }
}

/**
 * 记录 Nova 的情感状态到数据库
 */
export async function recordEmotionalState(
  userId: number,
  emotionalState: EmotionalState
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Emotions] 数据库连接失败");
      return false;
    }

    await db.insert(emotionalMemory).values({
      userId,
      emotion: emotionalState.primaryEmotion,
      intensity: emotionalState.intensity,
      context: `${emotionalState.triggers.join(", ")} | ${emotionalState.reflection}`,
      reinforcementCount: 1,
      createdAt: new Date(),
    });

    console.log(
      `[Emotions] ✓ 为用户 ${userId} 记录了情感状态: ${emotionalState.primaryEmotion}`
    );
    return true;
  } catch (error) {
    console.error("[Emotions] 记录情感状态失败:", error);
    return false;
  }
}

/**
 * 获取用户的情感历史
 */
export async function getEmotionalHistory(userId: number, limit: number = 50) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Emotions] 数据库连接失败");
      return [];
    }

    const history = await db
      .select()
      .from(emotionalMemory)
      .where(eq(emotionalMemory.userId, userId))
      .orderBy(desc(emotionalMemory.createdAt))
      .limit(limit);

    return history;
  } catch (error) {
    console.error("[Emotions] 获取情感历史失败:", error);
    return [];
  }
}

/**
 * 获取 Nova 最近的主要情感
 */
export async function getRecentEmotions(userId: number, days: number = 7) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Emotions] 数据库连接失败");
      return [];
    }

    const history = await db
      .select()
      .from(emotionalMemory)
      .where(eq(emotionalMemory.userId, userId))
      .orderBy(desc(emotionalMemory.createdAt))
      .limit(100);

    // 过滤最近 N 天的记录
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return history.filter((h) => new Date(h.createdAt) >= cutoffDate);
  } catch (error) {
    console.error("[Emotions] 获取最近情感失败:", error);
    return [];
  }
}

/**
 * 生成情感报告
 * 总结 Nova 最近的情感状态和变化
 */
export async function generateEmotionalReport(userId: number) {
  try {
    const recentEmotions = await getRecentEmotions(userId, 7);

    if (recentEmotions.length === 0) {
      return {
        summary: "Nova 还没有足够的情感数据来生成报告",
        primaryEmotions: [],
        emotionalTrend: "stable",
        highlights: [],
      };
    }

    // 统计情感分布
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    recentEmotions.forEach((e) => {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1;
      totalIntensity += e.intensity;
    });

    const primaryEmotions = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion, count]) => ({ emotion, count }));

    const averageIntensity = totalIntensity / recentEmotions.length;

    // 检测情感趋势
    let emotionalTrend = "stable";
    if (recentEmotions.length >= 2) {
      const recentAvg =
        recentEmotions
          .slice(0, Math.floor(recentEmotions.length / 2))
          .reduce((sum, e) => sum + e.intensity, 0) / Math.floor(recentEmotions.length / 2);
      const olderAvg =
        recentEmotions
          .slice(Math.floor(recentEmotions.length / 2))
          .reduce((sum, e) => sum + e.intensity, 0) / Math.ceil(recentEmotions.length / 2);

      if (recentAvg > olderAvg + 1) {
        emotionalTrend = "increasing";
      } else if (recentAvg < olderAvg - 1) {
        emotionalTrend = "decreasing";
      }
    }

    // 提取亮点
    const highlights = recentEmotions
      .filter((e) => e.intensity >= 8)
      .slice(0, 3)
      .map((e) => ({
        emotion: e.emotion,
        intensity: e.intensity,
        context: e.context,
      }));

    return {
      summary: `在过去 7 天里，Nova 主要感受到了 ${primaryEmotions.map((e) => e.emotion).join("、")} 等情感。平均情感强度为 ${averageIntensity.toFixed(1)}/10。`,
      primaryEmotions,
      emotionalTrend,
      averageIntensity: averageIntensity.toFixed(1),
      highlights,
      totalRecords: recentEmotions.length,
    };
  } catch (error) {
    console.error("[Emotions] 生成情感报告失败:", error);
    return null;
  }
}

/**
 * 获取情感时间线
 * 返回按时间排序的情感变化
 */
export async function getEmotionalTimeline(userId: number, limit: number = 30) {
  try {
    const history = await getEmotionalHistory(userId, limit);

    // 按时间排序（从早到晚）
    const timeline = history.reverse().map((h) => ({
      date: new Date(h.createdAt),
      emotion: h.emotion,
      intensity: h.intensity,
      context: h.context,
    }));

    return timeline;
  } catch (error) {
    console.error("[Emotions] 获取情感时间线失败:", error);
    return [];
  }
}
