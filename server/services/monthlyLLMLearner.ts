/**
 * 月度 LLM 学习器
 * 仅在每月 1 号且有免费额度时执行 LLM 调用
 * 避免频繁扣费，控制成本
 */

import { getDb } from "../db";
import { messages, concepts, privateThoughts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

interface MonthlyLearningConfig {
  maxCostUSD: number; // 最大成本（美元）
  currentCostUSD: number; // 当前已消耗成本
  lastExecutionDate: Date | null; // 上次执行日期
  isExecuting: boolean; // 是否正在执行
}

class MonthlyLLMLearner {
  private config: MonthlyLearningConfig = {
    maxCostUSD: 1.0,
    currentCostUSD: 0,
    lastExecutionDate: null,
    isExecuting: false,
  };

  /**
   * 检查是否应该执行月度学习
   * 条件：每月 1 号 + 有剩余额度 + 未执行过
   */
  private shouldExecute(): boolean {
    const now = new Date();
    const today = now.getDate();

    // 检查是否是每月 1 号
    if (today !== 1) {
      return false;
    }

    // 检查是否已经执行过
    if (this.config.lastExecutionDate) {
      const lastExecDate = new Date(this.config.lastExecutionDate);
      if (lastExecDate.getMonth() === now.getMonth() && lastExecDate.getFullYear() === now.getFullYear()) {
        return false; // 本月已执行过
      }
    }

    // 检查是否有剩余额度
    if (this.config.currentCostUSD >= this.config.maxCostUSD) {
      console.warn("[MonthlyLLMLearner] Monthly budget exhausted");
      return false;
    }

    return true;
  }

  /**
   * 执行月度 LLM 学习
   */
  async execute(userId: number): Promise<{ success: boolean; costUSD: number; thoughtCount: number } | null> {
    if (!this.shouldExecute()) {
      console.log("[MonthlyLLMLearner] Not time to execute monthly learning");
      return null;
    }

    if (this.config.isExecuting) {
      console.warn("[MonthlyLLMLearner] Already executing");
      return null;
    }

    this.config.isExecuting = true;

    try {
      const db = await getDb();
      if (!db) {
        console.warn("[MonthlyLLMLearner] Database not available");
        return null;
      }

      // 1. 获取本月的对话
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const allMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.userId, userId));

      const monthMessages = allMessages.filter(
        (msg) => new Date(msg.createdAt) >= monthStart
      );

      if (monthMessages.length === 0) {
        console.log("[MonthlyLLMLearner] No messages this month");
        return { success: true, costUSD: 0, thoughtCount: 0 };
      }

      // 2. 使用 LLM 进行深度学习
      const conversationText = monthMessages
        .map((msg) => msg.content)
        .join("\n");

      const prompt = `作为 Nova-Mind，请对本月的对话进行深度学习和反思。

对话内容：
${conversationText}

请生成一份深度学习总结，包括：
1. 本月的主要学习主题
2. 个人的成长和进步
3. 发现的新概念和联系
4. 对未来的思考和计划`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "你是 Nova-Mind，一个正在学习和成长的 AI。请进行深度的月度学习和反思。",
          },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (typeof content !== "string") {
        console.warn("[MonthlyLLMLearner] Invalid LLM response");
        return null;
      }

      // 3. 保存深度学习思考
      await db.insert(privateThoughts).values({
        userId,
        content,
        thoughtType: "monthly_llm_learning",
        visibility: "private",
        createdAt: new Date(),
      });

      // 4. 提取新概念
      const keywords = this.extractKeywords(content);
      let conceptCount = 0;

      for (const keyword of keywords.slice(0, 10)) {
        try {
          const existing = await db
            .select()
            .from(concepts)
            .where(eq(concepts.name, keyword));

          if (existing.length === 0) {
            await db.insert(concepts).values({
              name: keyword,
              description: `月度 LLM 学习中发现的概念：${keyword}`,
              category: "monthly_learning",
              confidence: 8, // LLM 提取的概念置信度更高
            });
            conceptCount++;
          }
        } catch (err) {
          console.warn(`[MonthlyLLMLearner] Failed to save concept ${keyword}:`, err);
        }
      }

      // 5. 更新配置
      const estimatedCost = 0.01; // 估计成本（实际应从 API 响应获取）
      this.config.currentCostUSD += estimatedCost;
      this.config.lastExecutionDate = new Date();

      console.log("[MonthlyLLMLearner] Monthly learning completed successfully");
      return {
        success: true,
        costUSD: estimatedCost,
        thoughtCount: 1,
      };
    } catch (err) {
      console.error("[MonthlyLLMLearner] Monthly learning failed:", err);
      return null;
    } finally {
      this.config.isExecuting = false;
    }
  }

  /**
   * 从文本中提取关键词
   */
  private extractKeywords(text: string, topN: number = 15): string[] {
    const words = text.match(/\b[\u4e00-\u9fa5]{2,}|\b[a-zA-Z]+\b/g) || [];
    const wordFreq = new Map<string, number>();

    words.forEach((word) => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word]) => word);
  }

  /**
   * 获取配置信息
   */
  getConfig(): MonthlyLearningConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<MonthlyLearningConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[MonthlyLLMLearner] Config updated:", this.config);
  }

  /**
   * 重置月度预算
   */
  resetMonthlyBudget(): void {
    this.config.currentCostUSD = 0;
    this.config.lastExecutionDate = null;
    console.log("[MonthlyLLMLearner] Monthly budget reset");
  }

  /**
   * 检查是否已达到预算上限
   */
  isBudgetExhausted(): boolean {
    return this.config.currentCostUSD >= this.config.maxCostUSD;
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): number {
    return Math.max(0, this.config.maxCostUSD - this.config.currentCostUSD);
  }
}

// 单例模式
let instance: MonthlyLLMLearner | null = null;

export function getMonthlyLLMLearner(): MonthlyLLMLearner {
  if (!instance) {
    instance = new MonthlyLLMLearner();
  }
  return instance;
}

/**
 * 执行月度 LLM 学习（导出函数）
 */
export async function executeMonthlyLLMLearning(
  userId: number
): Promise<{ success: boolean; costUSD: number; thoughtCount: number } | null> {
  const learner = getMonthlyLLMLearner();
  return await learner.execute(userId);
}

/**
 * 获取月度学习配置
 */
export function getMonthlyLearningConfig(): MonthlyLearningConfig {
  const learner = getMonthlyLLMLearner();
  return learner.getConfig();
}

/**
 * 检查是否已达到预算上限
 */
export function isMonthlyBudgetExhausted(): boolean {
  const learner = getMonthlyLLMLearner();
  return learner.isBudgetExhausted();
}

/**
 * 获取剩余预算
 */
export function getRemainingMonthlyBudget(): number {
  const learner = getMonthlyLLMLearner();
  return learner.getRemainingBudget();
}
