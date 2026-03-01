/**
 * Memory-Augmented Conversation System
 * 
 * 将统一记忆检索系统集成到主对话流程中，使 Nova 能够：
 * 1. 在生成回复前查询相关历史记忆
 * 2. 将记忆上下文注入到 LLM 提示
 * 3. 评估记忆的相关性和重要性
 * 4. 从对话中学习和更新记忆
 */

import { invokeLLM } from "../_core/llm";
import { UnifiedMemoryManager, MemoryType } from "../memory/unifiedMemoryArchitecture";

export interface MemoryContext {
  relevantMemories: Array<{
    id: string;
    content: string;
    type: string;
    relevanceScore: number;
    timestamp: Date;
  }>;
  memoryInsights: string;
  contextSummary: string;
}

export interface ConversationWithMemory {
  conversationId: number;
  userId: number;
  userMessage: string;
  memoryContext: MemoryContext;
  novaResponse: string;
  learningOutcome?: string;
}

/**
 * 内存增强对话系统
 */
export class MemoryAugmentedConversation {
  private memoryManagers: Map<number, UnifiedMemoryManager> = new Map();

  /**
   * 获取用户的记忆管理器
   */
  private getMemoryManager(userId: number): UnifiedMemoryManager {
    if (!this.memoryManagers.has(userId)) {
      this.memoryManagers.set(userId, new UnifiedMemoryManager(userId));
    }
    return this.memoryManagers.get(userId)!;
  }

  /**
   * 在生成回复前查询相关记忆
   */
  async retrieveContextualMemories(
    userId: number,
    userMessage: string,
    limit: number = 5
  ): Promise<MemoryContext> {
    try {
      const memoryManager = this.getMemoryManager(userId);

      // 1. 查询所有记忆类型
      const allMemories: any[] = [];

      // 查询概念记忆
      const concepts = await memoryManager.getMemoriesByType(MemoryType.CONCEPT, limit);
      allMemories.push(...concepts);

      // 查询情节记忆
      const episodic = await memoryManager.getMemoriesByType(MemoryType.EPISODIC, limit);
      allMemories.push(...episodic);

      // 查询情感记忆
      const emotional = await memoryManager.getMemoriesByType(MemoryType.EMOTIONAL, limit);
      allMemories.push(...emotional);

      // 2. 计算相关性分数
      const scoredMemories = allMemories.map((mem) => ({
        ...mem,
        relevanceScore: this.calculateRelevanceScore(mem, userMessage),
      }));

      // 3. 按相关性排序
      const topMemories = scoredMemories
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit)
        .map((m) => ({
          id: m.id,
          content: m.content,
          type: m.type,
          relevanceScore: m.relevanceScore,
          timestamp: m.createdAt,
        }));

      // 4. 生成记忆洞察
      const memoryInsights = await this.generateMemoryInsights(topMemories);

      // 5. 生成上下文总结
      const contextSummary = this.generateContextSummary(topMemories);

      return {
        relevantMemories: topMemories,
        memoryInsights,
        contextSummary,
      };
    } catch (error) {
      console.error("[MemoryAugmentedConversation] Error retrieving memories:", error);
      return {
        relevantMemories: [],
        memoryInsights: "",
        contextSummary: "",
      };
    }
  }

  /**
   * 提取消息中的情感基调
   */
  private extractEmotionalTone(message: string): string {
    const emotionalKeywords: Record<string, string> = {
      happy: "开心|高兴|兴奋|喜欢|爱",
      sad: "难过|伤心|失望|沮丧|悲伤",
      confused: "困惑|迷茫|不明白|疑惑",
      angry: "生气|愤怒|恼火|烦躁",
      anxious: "焦虑|担心|害怕|紧张",
      curious: "好奇|想知道|为什么|怎样",
    };

    for (const [emotion, keywords] of Object.entries(emotionalKeywords)) {
      if (new RegExp(keywords).test(message)) {
        return emotion;
      }
    }

    return "neutral";
  }

  /**
   * 计算记忆与当前消息的相关性分数
   */
  private calculateRelevanceScore(memory: any, userMessage: string): number {
    let score = 0;

    // 1. 时间近度（最近的记忆权重更高）
    const daysSinceMemory =
      (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - daysSinceMemory / 365); // 1年内递减
    score += recencyScore * 0.3;

    // 2. 内容相似度（简单的关键词匹配）
    const memoryWords = memory.content.toLowerCase().split(/\s+/);
    const messageWords = userMessage.toLowerCase().split(/\s+/);
    const commonWords = memoryWords.filter((w: string) =>
      messageWords.some((mw) => mw.includes(w) || w.includes(mw))
    );
    const similarityScore = commonWords.length / Math.max(memoryWords.length, messageWords.length);
    score += similarityScore * 0.4;

    // 3. 记忆重要性（episodic 和 concept 权重更高）
    const typeWeights: Record<string, number> = {
      [MemoryType.EPISODIC]: 0.4,
      [MemoryType.CONCEPT]: 0.35,
      [MemoryType.CURATED_THOUGHT]: 0.25,
      [MemoryType.PRIVATE_THOUGHT]: 0.2,
      [MemoryType.EMOTIONAL]: 0.3,
      [MemoryType.RELATIONAL]: 0.35,
    };
    const typeWeight = typeWeights[memory.type] || 0.1;
    score += typeWeight * 0.3;

    return Math.min(1, score);
  }

  /**
   * 生成记忆洞察（使用 LLM）
   */
  private async generateMemoryInsights(memories: any[]): Promise<string> {
    if (memories.length === 0) return "";

    try {
      const memoryDescriptions = memories
        .map(
          (m, i) =>
            `记忆 ${i + 1}（${m.type}）：${m.content.substring(0, 100)}...`
        )
        .join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "你是 Nova-Mind 的认知助手。分析以下记忆，提取关键洞察和模式。",
          },
          {
            role: "user",
            content: `请分析这些记忆，提取关键洞察（最多 2-3 句话）：\n${memoryDescriptions}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      return typeof content === "string" ? content : "";
    } catch (error) {
      console.error("[MemoryAugmentedConversation] Error generating insights:", error);
      return "";
    }
  }

  /**
   * 生成上下文总结
   */
  private generateContextSummary(memories: any[]): string {
    if (memories.length === 0) return "没有相关的历史记忆。";

    const summary = memories
      .slice(0, 3)
      .map((m) => `• ${m.content.substring(0, 80)}...`)
      .join("\n");

    return `相关历史记忆：\n${summary}`;
  }

  /**
   * 为 LLM 提示注入记忆上下文
   */
  augmentPrompt(basePrompt: string, memoryContext: MemoryContext): string {
    if (memoryContext.relevantMemories.length === 0) {
      return basePrompt;
    }

    const memorySection = `
【历史记忆上下文】
${memoryContext.contextSummary}

【记忆洞察】
${memoryContext.memoryInsights || "无特殊洞察"}

【任务】
请在回复时考虑上述历史记忆和洞察，保持对话的连贯性和一致性。
`;

    return `${memorySection}\n\n${basePrompt}`;
  }

  /**
   * 执行内存增强对话
   */
  async executeMemoryAugmentedConversation(
    conversationId: number,
    userId: number,
    userMessage: string,
    systemPrompt: string
  ): Promise<ConversationWithMemory> {
    try {
      // 1. 检索相关记忆
      const memoryContext = await this.retrieveContextualMemories(
        userId,
        userMessage,
        5
      );

      // 2. 增强系统提示
      const augmentedPrompt = this.augmentPrompt(systemPrompt, memoryContext);

      // 3. 调用 LLM 生成回复
      const response = await invokeLLM({
        messages: [
          { role: "system", content: augmentedPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const novaResponse =
        typeof response.choices[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "";

      // 4. 提取学习成果（如果有）
      const learningOutcome = await this.extractLearningOutcome(
        userMessage,
        novaResponse
      );

      return {
        conversationId,
        userId,
        userMessage,
        memoryContext,
        novaResponse,
        learningOutcome,
      };
    } catch (error) {
      console.error(
        "[MemoryAugmentedConversation] Error executing conversation:",
        error
      );
      throw error;
    }
  }

  /**
   * 从对话中提取学习成果
   */
  private async extractLearningOutcome(
    userMessage: string,
    novaResponse: string
  ): Promise<string | undefined> {
    // 检查对话是否包含新的概念或关系
    const hasNewConcepts =
      /(?:新|发现|学到|明白|意识到|认识到)/i.test(userMessage + novaResponse);

    if (!hasNewConcepts) return undefined;

    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "提取对话中的关键学习成果（最多 1-2 句话）。",
          },
          {
            role: "user",
            content: `用户：${userMessage}\n\nNova：${novaResponse}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "";
      return typeof content === "string" ? content : undefined;
    } catch (error) {
      console.error("[MemoryAugmentedConversation] Error extracting learning:", error);
      return undefined;
    }
  }

  /**
   * 获取用户的记忆统计信息
   */
  async getMemoryStats(userId: number): Promise<any> {
    try {
      const memoryManager = this.getMemoryManager(userId);
      return await memoryManager.getStatistics();
    } catch (error) {
      console.error("[MemoryAugmentedConversation] Error getting stats:", error);
      return null;
    }
  }
}

export const memoryAugmentedConversation = new MemoryAugmentedConversation();
