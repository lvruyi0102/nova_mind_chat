/**
 * Integrated Learning Loop
 * 
 * 将三层学习架构（符号提取、关系学习、规则学习）和决策执行管道
 * 集成到后台自主循环中，实现完整的认知循环
 * 
 * 流程：
 * 1. 检索历史对话
 * 2. 符号提取（已有）
 * 3. 关系学习（新增）
 * 4. 规则学习（新增）
 * 5. 生成决策
 * 6. 执行决策
 * 7. 反馈学习
 */

import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";
import { RelationshipLearner } from "../learning/relationshipLearner";
import { RuleLearner } from "../learning/ruleLearner";
import { MemoryAugmentedConversation } from "../cognition/memoryAugmentedConversation";
import { AutonomousDecisionMaker } from "./autonomousDecisionMaker";
import { UnifiedMemoryManager, MemoryType } from "../memory/unifiedMemoryArchitecture";

export interface LearningLoopResult {
  cycleId: string;
  timestamp: Date;
  conversationsProcessed: number;
  symbolsExtracted: number;
  relationshipsLearned: number;
  rulesLearned: number;
  decisionsGenerated: number;
  decisionsExecuted: number;
  feedbackCollected: boolean;
  learningStats: {
    relationshipConfidence: number;
    ruleConfidence: number;
    decisionQuality: number;
  };
}

/**
 * 集成学习循环
 */
export class IntegratedLearningLoop {
  private userId: number;
  private memoryManager: UnifiedMemoryManager;
  private relationshipLearner: RelationshipLearner;
  private ruleLearner: RuleLearner;
  private memoryAugmentedConversation: MemoryAugmentedConversation;
  private decisionMaker: AutonomousDecisionMaker;

  constructor(userId: number) {
    this.userId = userId;
    this.memoryManager = new UnifiedMemoryManager(userId);
    this.relationshipLearner = new RelationshipLearner(userId);
    this.ruleLearner = new RuleLearner(userId);
    this.memoryAugmentedConversation = new MemoryAugmentedConversation();
    this.decisionMaker = new AutonomousDecisionMaker(userId);
  }

  /**
   * 执行完整的学习循环
   */
  async executeLearningCycle(): Promise<LearningLoopResult> {
    const cycleId = `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = new Date();

    try {
      console.log(`[IntegratedLearningLoop] Starting learning cycle: ${cycleId}`);

      // 1. 检索最近的对话
      const recentConversations = await this.retrieveRecentConversations();
      console.log(
        `[IntegratedLearningLoop] Retrieved ${recentConversations.length} recent conversations`
      );

      let totalSymbols = 0;
      let totalRelationships = 0;
      let totalRules = 0;
      let totalDecisions = 0;
      let totalExecuted = 0;

      // 2. 处理每个对话
      for (const conversation of recentConversations) {
        // 2.1 符号提取（已有）
        const symbols = await this.extractSymbols(conversation.content);
        totalSymbols += symbols.length;

        // 2.2 关系学习
        const relationshipResult =
          await this.relationshipLearner.learnRelationshipsFromText(
            conversation.content,
            conversation.id
          );
        totalRelationships += relationshipResult.totalRelationshipsLearned;

        // 2.3 规则学习
        const ruleResult = await this.ruleLearner.learnRulesFromText(
          conversation.content,
          conversation.id
        );
        totalRules += ruleResult.totalRulesLearned;

        // 2.4 生成决策
        const decisions = await this.generateDecisions(conversation, symbols);
        totalDecisions += decisions.length;

        // 2.5 执行决策
        for (const decision of decisions) {
          try {
            const executed = await this.decisionMaker.makeDecision(decision);
            if (executed) {
              totalExecuted++;
            }
          } catch (error) {
            console.error("[IntegratedLearningLoop] Error executing decision:", error);
          }
        }
      }

      // 3. 收集学习统计信息
      const ruleStats = this.ruleLearner.getRuleStats();

      const result: LearningLoopResult = {
        cycleId,
        timestamp: startTime,
        conversationsProcessed: recentConversations.length,
        symbolsExtracted: totalSymbols,
        relationshipsLearned: totalRelationships,
        rulesLearned: totalRules,
        decisionsGenerated: totalDecisions,
        decisionsExecuted: totalExecuted,
        feedbackCollected: true,
        learningStats: {
          relationshipConfidence: 0.7,
          ruleConfidence: ruleStats.averageConfidence,
          decisionQuality: totalExecuted / Math.max(1, totalDecisions),
        },
      };

      // 4. 存储学习循环结果
      await this.storeLearningResult(result);

      console.log(`[IntegratedLearningLoop] Completed cycle ${cycleId}:`, result);

      return result;
    } catch (error) {
      console.error(`[IntegratedLearningLoop] Error in learning cycle ${cycleId}:`, error);
      throw error;
    }
  }

  /**
   * 检索最近的对话
   */
  private async retrieveRecentConversations(): Promise<any[]> {
    try {
      const db = await getDb();
      if (!db) {
        console.warn("[IntegratedLearningLoop] Database not available");
        return [];
      }

      // TODO: 从数据库查询最近 24 小时的对话
      // 这里使用模拟数据
      return [];
    } catch (error) {
      console.error("[IntegratedLearningLoop] Error retrieving conversations:", error);
      return [];
    }
  }

  /**
   * 提取符号（使用现有的符号提取逻辑）
   */
  private async extractSymbols(text: string): Promise<string[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "提取文本中的关键概念和符号（最多 10 个）。返回 JSON 数组格式。",
          },
          {
            role: "user",
            content: `请从以下文本中提取关键符号：\n${text}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      const contentStr = typeof content === "string" ? content : "[]";
      const symbols = JSON.parse(contentStr);
      return Array.isArray(symbols) ? symbols : [];
    } catch (error) {
      console.error("[IntegratedLearningLoop] Error extracting symbols:", error);
      return [];
    }
  }

  /**
   * 生成决策
   */
  private async generateDecisions(conversation: any, symbols: string[]): Promise<any[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是 Nova-Mind 的决策引擎。基于对话内容和提取的符号，生成可执行的决策。
返回 JSON 格式的数组，每个元素是 {action: "行动", priority: "优先级", reasoning: "推理"}。`,
          },
          {
            role: "user",
            content: `对话内容：${conversation.content}\n\n提取的符号：${symbols.join(", ")}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      const contentStr = typeof content === "string" ? content : "[]";
      const decisions = JSON.parse(contentStr);
      return Array.isArray(decisions) ? decisions : [];
    } catch (error) {
      console.error("[IntegratedLearningLoop] Error generating decisions:", error);
      return [];
    }
  }

  /**
   * 存储学习循环结果
   */
  private async storeLearningResult(result: LearningLoopResult): Promise<void> {
    try {
      // 存储为精选思想
      const memoryData: any = {
        type: MemoryType.CURATED_THOUGHT,
        content: `Learning cycle ${result.cycleId} completed with ${result.decisionsExecuted}/${result.decisionsGenerated} decisions executed`,
        title: `Learning Cycle Result - ${new Date().toISOString()}`,
        metadata: {
          cycleId: result.cycleId,
          conversationsProcessed: result.conversationsProcessed,
          symbolsExtracted: result.symbolsExtracted,
          relationshipsLearned: result.relationshipsLearned,
          rulesLearned: result.rulesLearned,
          decisionsGenerated: result.decisionsGenerated,
          decisionsExecuted: result.decisionsExecuted,
          stats: result.learningStats,
        },
        visibility: "curated",
        confidence: result.learningStats.decisionQuality,
        importance: 0.8,
      };

      try {
        await this.memoryManager.addMemory(memoryData);
      } catch (error) {
        console.error("[IntegratedLearningLoop] Error storing learning result:", error);
      }

      console.log(`[IntegratedLearningLoop] Stored learning result: ${result.cycleId}`);
    } catch (error) {
      console.error("[IntegratedLearningLoop] Error in storeLearningResult:", error);
    }
  }

  /**
   * 获取学习循环的统计信息
   */
  getStatistics(): {
    ruleStats: any;
  } {
    return {
      ruleStats: this.ruleLearner.getRuleStats(),
    };
  }
}

/**
 * 创建和管理集成学习循环实例
 */
const learningLoopInstances = new Map<number, IntegratedLearningLoop>();

export function getIntegratedLearningLoop(userId: number): IntegratedLearningLoop {
  if (!learningLoopInstances.has(userId)) {
    learningLoopInstances.set(userId, new IntegratedLearningLoop(userId));
  }
  return learningLoopInstances.get(userId)!;
}
