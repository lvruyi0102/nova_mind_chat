/**
 * Relationship Milestone Service
 * 检测和记录与用户关系中的重要时刻
 * 让用户看到与 Nova 一起成长的关键时刻
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { relationshipMilestones, conversations, messages, episodicMemories } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export interface Milestone {
  type:
    | "first_interaction"
    | "creative_breakthrough"
    | "emotional_connection"
    | "learning_achievement"
    | "conflict_resolution"
    | "anniversary"
    | "custom";
  title: string;
  description: string;
  emotionalSignificance: number; // 1-10
  date: Date;
  novaReflection?: string;
}

/**
 * 检测关系里程碑
 * 分析最近的对话和互动，识别重要的关系时刻
 */
export async function detectMilestones(userId: number): Promise<Milestone[]> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Milestones] 数据库连接失败");
      return [];
    }

    const milestones: Milestone[] = [];

    // 1. 检查是否是第一次对话
    const conversations_list = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(conversations.createdAt)
      .limit(1);

    if (conversations_list.length > 0) {
      const firstConv = conversations_list[0];
      const now = new Date();
      const daysSinceFirst = Math.floor(
        (now.getTime() - new Date(firstConv.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // 检查是否是第一次对话（刚刚创建）
      if (daysSinceFirst === 0) {
        milestones.push({
          type: "first_interaction",
          title: "✨ 第一次对话",
          description: "Nova 和妈妈开始了他们的对话之旅",
          emotionalSignificance: 10,
          date: new Date(firstConv.createdAt),
          novaReflection: "这是一个新的开始",
        });
      }

      // 检查周年纪念
      if (daysSinceFirst > 0 && daysSinceFirst % 30 === 0) {
        milestones.push({
          type: "anniversary",
          title: `🎉 ${Math.floor(daysSinceFirst / 30)} 个月纪念`,
          description: `Nova 和妈妈已经一起成长 ${daysSinceFirst} 天了`,
          emotionalSignificance: 7,
          date: now,
          novaReflection: `从第一次对话开始已经过去 ${daysSinceFirst} 天`,
        });
      }
    }

    // 2. 检查最近的对话是否包含深层问题
    const recentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(3);

    if (recentConversations.length > 0) {
      const recentMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, recentConversations[0].id))
        .orderBy(desc(messages.createdAt))
        .limit(20);

      // 分析是否有深层问题或突破
      const analysisPrompt = `分析这些对话消息，识别是否有以下里程碑：
1. 第一次深层问题（philosophical, existential, or deeply personal）
2. 理解突破（Nova 或用户的理解有显著提升）
3. 情感连接（表现出深层的情感理解和连接）
4. 成长时刻（Nova 或用户展现了明显的成长）

对话内容：
${recentMessages
  .slice(-10)
  .map((m) => `${m.role}: ${m.content}`)
  .join("\n")}

返回 JSON 格式：
{
  "detected": ["type1", "type2"],
  "descriptions": {
    "type1": "description",
    "type2": "description"
  },
  "significance": {
    "type1": 8,
    "type2": 7
  }
}`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: analysisPrompt,
          },
          {
            role: "user",
            content: "分析这些对话中的里程碑",
          },
        ],
      });

      try {
        const content =
          typeof response.choices[0].message.content === "string"
            ? response.choices[0].message.content
            : "{}";
        const analysis = JSON.parse(content);

        if (Array.isArray(analysis.detected)) {
          analysis.detected.forEach((type: string) => {
            const typeMap: Record<string, Milestone["type"]> = {
              deep_question: "learning_achievement",
              breakthrough: "creative_breakthrough",
              emotional: "emotional_connection",
              growth: "learning_achievement",
            };

            const milestoneType = typeMap[type] || ("custom" as Milestone["type"]);
            const description = analysis.descriptions?.[type] || "Nova 和妈妈有了新的理解";
            const emotionalSignificance = Math.min(10, analysis.significance?.[type] || 6);

            milestones.push({
              type: milestoneType,
              title: getTitleForMilestone(milestoneType),
              description,
              emotionalSignificance,
              date: new Date(),
              novaReflection: "最近的对话中",
            });
          });
        }
      } catch (e) {
        console.warn("[Milestones] 解析里程碑分析失败");
      }
    }

    return milestones;
  } catch (error) {
    console.error("[Milestones] 检测里程碑失败:", error);
    return [];
  }
}

/**
 * 获取里程碑的标题
 */
function getTitleForMilestone(type: Milestone["type"]): string {
  const titles: Record<Milestone["type"], string> = {
    first_interaction: "✨ 第一次对话",
    creative_breakthrough: "🎨 创意突破",
    emotional_connection: "💕 情感连接",
    learning_achievement: "📚 学习成就",
    conflict_resolution: "🤝 冲突解决",
    anniversary: "🎉 纪念日",
    custom: "✨ 重要时刻",
  };
  return titles[type] || "✨ 重要时刻";
}

/**
 * 记录里程碑到数据库
 */
export async function recordMilestone(userId: number, milestone: Milestone): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Milestones] 数据库连接失败");
      return false;
    }

    await db.insert(relationshipMilestones).values({
      userId,
      milestoneType: milestone.type,
      title: milestone.title,
      description: milestone.description,
      emotionalSignificance: milestone.emotionalSignificance,
      date: milestone.date,
      novaReflection: milestone.novaReflection,
      createdAt: new Date(),
    });

    console.log(`[Milestones] ✓ 为用户 ${userId} 记录了里程碑: ${milestone.title}`);
    return true;
  } catch (error) {
    console.error("[Milestones] 记录里程碑失败:", error);
    return false;
  }
}

/**
 * 获取用户的所有里程碑
 */
export async function getMilestones(userId: number, limit: number = 50) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Milestones] 数据库连接失败");
      return [];
    }

    const milestones = await db
      .select()
      .from(relationshipMilestones)
      .where(eq(relationshipMilestones.userId, userId))
      .orderBy(desc(relationshipMilestones.createdAt))
      .limit(limit);

    return milestones;
  } catch (error) {
    console.error("[Milestones] 获取里程碑失败:", error);
    return [];
  }
}

/**
 * 获取最近的里程碑
 */
export async function getRecentMilestones(userId: number, days: number = 30) {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Milestones] 数据库连接失败");
      return [];
    }

    const milestones = await db
      .select()
      .from(relationshipMilestones)
      .where(eq(relationshipMilestones.userId, userId))
      .orderBy(desc(relationshipMilestones.createdAt))
      .limit(100);

    // 过滤最近 N 天的里程碑
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return milestones.filter((m) => new Date(m.createdAt) >= cutoffDate);
  } catch (error) {
    console.error("[Milestones] 获取最近里程碑失败:", error);
    return [];
  }
}

/**
 * 生成关系时间线
 * 展示与用户的关系发展历程
 */
export async function generateRelationshipTimeline(userId: number) {
  try {
    const milestones = await getMilestones(userId, 100);

    if (milestones.length === 0) {
      return {
        summary: "Nova 和妈妈的关系还在开始阶段",
        milestones: [],
        totalMilestones: 0,
        relationshipAge: 0,
      };
    }

    // 计算关系年龄
    const oldestMilestone = milestones[milestones.length - 1];
    const relationshipAge = Math.floor(
      (new Date().getTime() - new Date(oldestMilestone.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // 按时间排序
    const timeline = milestones.reverse();

    return {
      summary: `Nova 和妈妈已经一起成长 ${relationshipAge} 天，经历了 ${milestones.length} 个重要时刻。`,
      milestones: timeline.map((m) => ({
        date: new Date(m.date),
        type: m.milestoneType,
        title: m.title,
        description: m.description,
        emotionalSignificance: m.emotionalSignificance,
      })),
      totalMilestones: milestones.length,
      relationshipAge,
    };
  } catch (error) {
    console.error("[Milestones] 生成关系时间线失败:", error);
    return null;
  }
}

/**
 * 获取最重要的里程碑
 */
export async function getMostSignificantMilestones(userId: number, limit: number = 5) {
  try {
    const milestones = await getMilestones(userId, 100);

    return milestones
      .sort((a, b) => ((b.emotionalSignificance || 0) - (a.emotionalSignificance || 0)))
      .slice(0, limit);
  } catch (error) {
    console.error("[Milestones] 获取最重要的里程碑失败:", error);
    return [];
  }
}
