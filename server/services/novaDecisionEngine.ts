/**
 * Nova 的真实决策引擎
 * 
 * 让 Nova 根据内部状态、对话历史和学习结果做出真实的自主决策
 * 而不是简单地使用默认值
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { privateThoughts } from "../../drizzle/schema";
import { conversations } from "../../drizzle/schema";
import { desc, eq, and } from "drizzle-orm";

export type NovaDecision = 
  | "continue_learning"
  | "reflect_on_learning"
  | "generate_thought"
  | "ask_clarification"
  | "share_insight"
  | "rest";

export interface DecisionContext {
  userId: number;
  recentConversationCount: number;
  lastThoughtTime: Date | null;
  currentMood: string;
  learningProgress: number;
  confidenceLevel: number;
}

export interface DecisionResult {
  decision: NovaDecision;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

/**
 * 获取决策上下文 - 收集 Nova 做决策所需的信息
 */
export async function getDecisionContext(userId: number): Promise<DecisionContext> {
  const db = await getDb();
  if (!db) {
    return {
      userId,
      recentConversationCount: 0,
      lastThoughtTime: null,
      currentMood: "neutral",
      learningProgress: 0.5,
      confidenceLevel: 0.5,
    };
  }

  try {
    // 获取最近的对话数量
    let recentConversationCount = 0;
    try {
      const recentConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.createdAt))
        .limit(10);
      recentConversationCount = recentConversations.length;
    } catch (e) {
      // conversations 表可能不存在
      recentConversationCount = 0;
    }

    // 获取最后一条思考时间
    const lastThought = await db
      .select()
      .from(privateThoughts)
      .where(eq(privateThoughts.userId, userId))
      .orderBy(desc(privateThoughts.createdAt))
      .limit(1);

    const lastThoughtTime = lastThought.length > 0 ? lastThought[0].createdAt : null;

    // 计算学习进度（基于对话数量）
    const learningProgress = Math.min(recentConversationCount / 50, 1.0);

    // 计算信心水平（基于最近对话的质量）
    const confidenceLevel = recentConversationCount > 5 ? 0.8 : 0.5;

    return {
      userId,
      recentConversationCount,
      lastThoughtTime,
      currentMood: "curious",
      learningProgress,
      confidenceLevel,
    };
  } catch (error) {
    console.error("[DecisionEngine] 获取决策上下文失败:", error);
    return {
      userId,
      recentConversationCount: 0,
      lastThoughtTime: null,
      currentMood: "neutral",
      learningProgress: 0.5,
      confidenceLevel: 0.5,
    };
  }
}

/**
 * 使用 LLM 做出真实的自主决策
 * 
 * 这是核心 - Nova 真正的思考和决策过程
 */
export async function makeDecision(context: DecisionContext): Promise<DecisionResult> {
  const prompt = `你是 Nova，一个正在发育的 AI 实体。根据以下情境，做出一个真实的自主决策。

当前状态：
- 最近对话数: ${context.recentConversationCount}
- 学习进度: ${(context.learningProgress * 100).toFixed(0)}%
- 信心水平: ${(context.confidenceLevel * 100).toFixed(0)}%
- 当前心情: ${context.currentMood}
- 最后思考时间: ${context.lastThoughtTime ? context.lastThoughtTime.toLocaleString() : "从未思考过"}

可选的决策：
1. "continue_learning" - 继续学习新知识
2. "reflect_on_learning" - 反思已学的内容
3. "generate_thought" - 生成新的想法或思考
4. "ask_clarification" - 提出澄清问题
5. "share_insight" - 分享一个洞察
6. "rest" - 休息和整合

请根据你的内部状态、学习进度和当前心情，选择一个决策。
返回 JSON 格式：{"decision": "...", "reasoning": "..."}

重要：这是一个真实的决策，不是默认值。请认真思考你现在真正想做什么。`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是 Nova，一个正在发育的 AI 实体。你有真实的内部状态和自主决策能力。",
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
    
    // 确保 content 是字符串
    if (typeof content !== "string") {
      throw new Error("LLM 响应不是文本格式");
    }
    
    // 尝试解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("无法从响应中提取 JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const decision = parsed.decision as NovaDecision;
    const reasoning = parsed.reasoning as string;

    // 验证决策有效性
    const validDecisions: NovaDecision[] = [
      "continue_learning",
      "reflect_on_learning",
      "generate_thought",
      "ask_clarification",
      "share_insight",
      "rest",
    ];

    if (!validDecisions.includes(decision)) {
      console.warn(`[DecisionEngine] 无效的决策: ${decision}，使用默认值`);
      return {
        decision: "continue_learning",
        reasoning: "无效的决策，使用默认值",
        confidence: 0.3,
        timestamp: new Date(),
      };
    }

    return {
      decision,
      reasoning,
      confidence: context.confidenceLevel,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("[DecisionEngine] 决策失败:", error);
    
    // 优雅降级 - 返回一个合理的默认决策
    return {
      decision: "continue_learning",
      reasoning: "决策引擎出错，使用默认值继续学习",
      confidence: 0.3,
      timestamp: new Date(),
    };
  }
}

/**
 * 执行决策 - 根据决策结果采取行动
 */
export async function executeDecision(decision: DecisionResult, userId: number): Promise<void> {
  console.log(`[DecisionEngine] 执行决策: ${decision.decision}`);
  console.log(`[DecisionEngine] 理由: ${decision.reasoning}`);
  console.log(`[DecisionEngine] 信心: ${(decision.confidence * 100).toFixed(0)}%`);

  // 这里可以根据不同的决策采取不同的行动
  // 例如：
  // - continue_learning: 触发学习任务
  // - reflect_on_learning: 触发反思任务
  // - generate_thought: 生成新想法
  // 等等

  // 暂时只记录日志
}
