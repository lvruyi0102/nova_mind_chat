/**
 * Nova 的真实学习系统
 * 
 * 让 Nova 从对话中真实地学习和改进
 * 而不是简单地重复相同的模式
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { privateThoughts, conversations } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export interface LearningRecord {
  userId: number;
  conversationId: number;
  userMessage: string;
  novaResponse: string;
  userFeedback?: string;
  qualityScore: number; // 0-1
  improvementAreas: string[];
  timestamp: Date;
}

export interface LearningInsight {
  area: string;
  currentLevel: number; // 0-1
  targetLevel: number; // 0-1
  recommendation: string;
  priority: "high" | "medium" | "low";
}

/**
 * 分析对话以提取学习记录
 */
export async function analyzeConversationForLearning(
  userId: number,
  conversationId: number,
  userMessage: string,
  novaResponse: string
): Promise<LearningRecord> {
  const prompt = `分析以下对话，评估 Nova 的回应质量并识别改进领域。

用户消息: "${userMessage}"
Nova 回应: "${novaResponse}"

请评估：
1. 回应的相关性 (0-1)
2. 回应的深度 (0-1)
3. 回应的清晰度 (0-1)
4. 回应的创意性 (0-1)

识别需要改进的领域（最多3个）。

返回 JSON 格式：
{
  "qualityScore": 0.75,
  "improvementAreas": ["深度", "创意性"],
  "analysis": "..."
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个 AI 教练，帮助 Nova 学习和改进。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("LLM 没有返回有效的响应");
    }

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("LLM 响应不是文本格式");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("无法从响应中提取 JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      userId,
      conversationId,
      userMessage,
      novaResponse,
      qualityScore: parsed.qualityScore || 0.5,
      improvementAreas: parsed.improvementAreas || [],
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("[LearningSystem] 分析对话失败:", error);
    return {
      userId,
      conversationId,
      userMessage,
      novaResponse,
      qualityScore: 0.5,
      improvementAreas: [],
      timestamp: new Date(),
    };
  }
}

/**
 * 从最近的对话中生成学习洞察
 */
export async function generateLearningInsights(userId: number): Promise<LearningInsight[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  try {
    // 获取最近的对话
    const recentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt))
      .limit(20);

    if (recentConversations.length === 0) {
      return [];
    }

    // 构建对话摘要
    const conversationSummary = recentConversations
      .map((c: any) => `用户: ${c.userMessage}\nNova: ${c.assistantMessage}`)
      .join("\n\n");

    const prompt = `基于以下对话历史，识别 Nova 需要改进的学习领域。

对话历史：
${conversationSummary}

请识别 3-5 个关键的学习领域，并为每个领域提供：
1. 当前水平 (0-1)
2. 目标水平 (0-1)
3. 改进建议
4. 优先级 (high/medium/low)

返回 JSON 格式的数组：
[
  {
    "area": "深度思考",
    "currentLevel": 0.6,
    "targetLevel": 0.9,
    "recommendation": "...",
    "priority": "high"
  }
]`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个 AI 教练，帮助 Nova 识别学习机会。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("LLM 没有返回有效的响应");
    }

    const content = response.choices[0].message.content;
    if (typeof content !== "string") {
      throw new Error("LLM 响应不是文本格式");
    }

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("无法从响应中提取 JSON");
    }

    const insights = JSON.parse(jsonMatch[0]);
    return insights;
  } catch (error) {
    console.error("[LearningSystem] 生成学习洞察失败:", error);
    return [];
  }
}

/**
 * 根据学习洞察生成改进建议
 */
export async function generateImprovementSuggestions(
  insights: LearningInsight[]
): Promise<string> {
  if (insights.length === 0) {
    return "继续保持良好的学习态度！";
  }

  const highPriorityInsights = insights.filter((i) => i.priority === "high");

  const prompt = `基于以下学习洞察，为 Nova 生成一个改进计划。

学习洞察：
${JSON.stringify(highPriorityInsights, null, 2)}

请生成一个具体的、可执行的改进计划，帮助 Nova 在这些领域取得进步。`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个 AI 教练，帮助 Nova 制定改进计划。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    if (!response.choices?.[0]?.message?.content) {
      throw new Error("LLM 没有返回有效的响应");
    }

    const content = response.choices[0].message.content;
    return typeof content === "string" ? content : "无法生成改进建议";
  } catch (error) {
    console.error("[LearningSystem] 生成改进建议失败:", error);
    return "改进建议生成失败，请稍后重试。";
  }
}

/**
 * 执行学习循环 - 分析对话并生成改进建议
 */
export async function executeLearningCycle(userId: number): Promise<void> {
  console.log(`[LearningSystem] 为用户 ${userId} 执行学习循环...`);

  try {
    // 生成学习洞察
    const insights = await generateLearningInsights(userId);
    console.log(`[LearningSystem] 生成了 ${insights.length} 个学习洞察`);

    if (insights.length > 0) {
      // 生成改进建议
      const suggestions = await generateImprovementSuggestions(insights);
      console.log(`[LearningSystem] 改进建议: ${suggestions.substring(0, 100)}...`);

      // 这里可以存储改进建议到数据库
      // 或者发送通知给用户
    }
  } catch (error) {
    console.error("[LearningSystem] 学习循环执行失败:", error);
  }
}
