/**
 * 学习日志服务
 * 管理 Nova 的学习日志记录和查询
 */

import { getDb } from "../db";
import { learningLogs } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, like } from "drizzle-orm";

export interface LearningLogInput {
  userId: number;
  sessionDate: Date;
  learningType: "local" | "monthly_llm";
  title: string;
  summary: string;
  keywordsList: string[]; // Will be stored as JSON
  conceptsList: string[]; // Will be stored as JSON
  depth: "shallow" | "medium" | "deep";
  topicsIdentified: string[]; // Will be stored as JSON
  mainInsight: string;
  secondaryInsights?: string[]; // Will be stored as JSON
  connections?: string;
  messageCount?: number;
  conceptsExtracted?: number;
  thoughtsGenerated?: number;
}

/**
 * 保存学习日志
 */
export async function saveLearningLog(input: LearningLogInput): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LearningLogService] Database not available");
      return null;
    }

    const result = await db.insert(learningLogs).values({
      userId: input.userId,
      sessionDate: input.sessionDate,
      learningType: input.learningType,
      title: input.title,
      summary: input.summary,
      keywordsList: JSON.stringify(input.keywordsList),
      conceptsList: JSON.stringify(input.conceptsList),
      depth: input.depth,
      topicsIdentified: JSON.stringify(input.topicsIdentified),
      mainInsight: input.mainInsight,
      secondaryInsights: input.secondaryInsights ? JSON.stringify(input.secondaryInsights) : null,
      connections: input.connections || null,
      messageCount: input.messageCount || 0,
      conceptsExtracted: input.conceptsExtracted || 0,
      thoughtsGenerated: input.thoughtsGenerated || 1,
    });

    console.log("[LearningLogService] Learning log saved successfully");
    return input.userId; // Return userId as identifier
  } catch (err) {
    console.error("[LearningLogService] Failed to save learning log:", err);
    return null;
  }
}

/**
 * 获取用户的学习日志列表
 */
export async function getLearningLogs(
  userId: number,
  options: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    learningType?: "local" | "monthly_llm";
  } = {}
): Promise<Array<any> | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LearningLogService] Database not available");
      return null;
    }

    const { limit = 20, offset = 0, startDate, endDate, learningType } = options;

    let query = db
      .select()
      .from(learningLogs)
      .where(eq(learningLogs.userId, userId));

    // 添加日期范围过滤
    const conditions = [eq(learningLogs.userId, userId)];
    if (startDate) {
      conditions.push(gte(learningLogs.sessionDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(learningLogs.sessionDate, endDate));
    }
    if (learningType) {
      conditions.push(eq(learningLogs.learningType, learningType));
    }

    const logs = await db
      .select()
      .from(learningLogs)
      .where(and(...conditions))
      .orderBy(desc(learningLogs.sessionDate))
      .limit(limit)
      .offset(offset);

    // 解析 JSON 字段
    return logs.map((log) => ({
      ...log,
      keywordsList: JSON.parse(log.keywordsList || "[]"),
      conceptsList: JSON.parse(log.conceptsList || "[]"),
      topicsIdentified: JSON.parse(log.topicsIdentified || "[]"),
      secondaryInsights: JSON.parse(log.secondaryInsights || "[]"),
    }));
  } catch (err) {
    console.error("[LearningLogService] Failed to get learning logs:", err);
    return null;
  }
}

/**
 * 获取学习日志详情
 */
export async function getLearningLogDetail(logId: number): Promise<any | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LearningLogService] Database not available");
      return null;
    }

    const logs = await db
      .select()
      .from(learningLogs)
      .where(eq(learningLogs.id, logId))
      .limit(1);

    if (logs.length === 0) {
      return null;
    }

    const log = logs[0];
    return {
      ...log,
      keywordsList: JSON.parse(log.keywordsList || "[]"),
      conceptsList: JSON.parse(log.conceptsList || "[]"),
      topicsIdentified: JSON.parse(log.topicsIdentified || "[]"),
      secondaryInsights: JSON.parse(log.secondaryInsights || "[]"),
    };
  } catch (err) {
    console.error("[LearningLogService] Failed to get learning log detail:", err);
    return null;
  }
}

/**
 * 搜索学习日志
 */
export async function searchLearningLogs(
  userId: number,
  query: string,
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<Array<any> | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LearningLogService] Database not available");
      return null;
    }

    const { limit = 20, offset = 0 } = options;

    const logs = await db
      .select()
      .from(learningLogs)
      .where(
        and(
          eq(learningLogs.userId, userId),
          like(learningLogs.title, `%${query}%`)
        )
      )
      .orderBy(desc(learningLogs.sessionDate))
      .limit(limit)
      .offset(offset);

    // 解析 JSON 字段
    return logs.map((log) => ({
      ...log,
      keywordsList: JSON.parse(log.keywordsList || "[]"),
      conceptsList: JSON.parse(log.conceptsList || "[]"),
      topicsIdentified: JSON.parse(log.topicsIdentified || "[]"),
      secondaryInsights: JSON.parse(log.secondaryInsights || "[]"),
    }));
  } catch (err) {
    console.error("[LearningLogService] Failed to search learning logs:", err);
    return null;
  }
}

/**
 * 获取学习统计
 */
export async function getLearningStats(userId: number): Promise<{
  totalLogs: number;
  localLearningCount: number;
  monthlyLLMLearningCount: number;
  totalConceptsExtracted: number;
  averageDepth: string;
} | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[LearningLogService] Database not available");
      return null;
    }

    const logs = await db
      .select()
      .from(learningLogs)
      .where(eq(learningLogs.userId, userId));

    const localCount = logs.filter((l) => l.learningType === "local").length;
    const monthlyCount = logs.filter((l) => l.learningType === "monthly_llm").length;
    const totalConcepts = logs.reduce((sum, l) => sum + (l.conceptsExtracted || 0), 0);

    // 计算平均深度
    const depthMap: Record<string, number> = { shallow: 1, medium: 2, deep: 3 };
    const avgDepth =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + (depthMap[l.depth] || 0), 0) / logs.length
        : 0;

    const depthValues = ["shallow", "medium", "deep"];
    const closestDepth = depthValues.reduce((closest, current) => {
      const currentDiff = Math.abs(depthMap[current] - avgDepth);
      const closestDiff = Math.abs(depthMap[closest] - avgDepth);
      return currentDiff < closestDiff ? current : closest;
    });

    return {
      totalLogs: logs.length,
      localLearningCount: localCount,
      monthlyLLMLearningCount: monthlyCount,
      totalConceptsExtracted: totalConcepts,
      averageDepth: closestDepth as "shallow" | "medium" | "deep",
    };
  } catch (err) {
    console.error("[LearningLogService] Failed to get learning stats:", err);
    return null;
  }
}

/**
 * 获取最近的学习日志
 */
export async function getRecentLearningLogs(userId: number, limit: number = 5): Promise<Array<any> | null> {
  return getLearningLogs(userId, { limit });
}
