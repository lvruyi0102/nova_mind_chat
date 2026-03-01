/**
 * Rule Learning Module
 * 
 * 从对话中学习规则和模式，建立可推理的知识库
 * 
 * 核心功能：
 * 1. 识别 if-then 规则
 * 2. 提取因果关系
 * 3. 计算规则置信度和应用频率
 * 4. 建立规则库并支持推理
 */

import { invokeLLM } from "../_core/llm";
import { UnifiedMemoryManager, MemoryType } from "../memory/unifiedMemoryArchitecture";

export interface Rule {
  id: string;
  condition: string; // if 部分
  consequence: string; // then 部分
  confidence: number; // 0-1，规则的置信度
  frequency: number; // 规则被验证的次数
  counterexamples: number; // 反例数量
  applicability: string[]; // 适用的上下文
  extractedFrom: string; // 来源文本
  createdAt: Date;
  lastVerifiedAt: Date;
}

export interface RuleLearningResult {
  newRules: Rule[];
  updatedRules: Rule[];
  totalRulesLearned: number;
  averageConfidence: number;
  averageFrequency: number;
}

/**
 * 规则学习器
 */
export class RuleLearner {
  private memoryManager: UnifiedMemoryManager;
  private ruleCache: Map<string, Rule> = new Map();

  constructor(userId: number) {
    this.memoryManager = new UnifiedMemoryManager(userId);
  }

  /**
   * 从文本中学习规则
   */
  async learnRulesFromText(
    text: string,
    sourceConversationId: number
  ): Promise<RuleLearningResult> {
    try {
      // 1. 提取规则
      const rules = await this.extractRules(text);

      if (rules.length === 0) {
        return {
          newRules: [],
          updatedRules: [],
          totalRulesLearned: 0,
          averageConfidence: 0,
          averageFrequency: 0,
        };
      }

      // 2. 计算规则置信度
      const scoredRules = rules.map((rule) => ({
        ...rule,
        confidence: this.calculateRuleConfidence(rule),
      }));

      // 3. 分离新规则和更新的规则
      const { newRules, updatedRules } = this.categorizeRules(scoredRules);

      // 4. 存储规则到记忆系统
      await this.storeRules(newRules, updatedRules);

      // 5. 计算统计信息
      const allRules = [...newRules, ...updatedRules];
      const averageConfidence =
        allRules.length > 0
          ? allRules.reduce((sum, r) => sum + r.confidence, 0) / allRules.length
          : 0;
      const averageFrequency =
        allRules.length > 0
          ? allRules.reduce((sum, r) => sum + r.frequency, 0) / allRules.length
          : 0;

      return {
        newRules,
        updatedRules,
        totalRulesLearned: allRules.length,
        averageConfidence,
        averageFrequency,
      };
    } catch (error) {
      console.error("[RuleLearner] Error learning rules:", error);
      throw error;
    }
  }

  /**
   * 提取规则（使用 LLM）
   */
  private async extractRules(text: string): Promise<Rule[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是一个规则学习助手。从给定的文本中提取所有隐含的或显式的规则（if-then 形式）。
返回 JSON 格式的数组，每个元素是 {condition: "条件", consequence: "结果", applicability: ["适用场景1", "适用场景2"]}。
例如：[{condition: "当信任被建立时", consequence: "关系会变得更深入", applicability: ["人际关系", "亲密关系"]}]`,
          },
          {
            role: "user",
            content: `请从以下文本中提取规则：\n${text}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      const contentStr = typeof content === "string" ? content : "[]";
      const rules = JSON.parse(contentStr);

      return Array.isArray(rules)
        ? rules.map((rule: any) => ({
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            condition: rule.condition || "",
            consequence: rule.consequence || "",
            confidence: 0.5, // 初始置信度
            frequency: 1, // 初始频率
            counterexamples: 0,
            applicability: rule.applicability || [],
            extractedFrom: text.substring(0, 200),
            createdAt: new Date(),
            lastVerifiedAt: new Date(),
          }))
        : [];
    } catch (error) {
      console.error("[RuleLearner] Error extracting rules:", error);
      return [];
    }
  }

  /**
   * 计算规则置信度
   */
  private calculateRuleConfidence(rule: Rule): number {
    let confidence = 0.5;

    // 1. 基于频率的置信度
    const frequencyConfidence = Math.min(0.9, 0.3 + rule.frequency * 0.1);

    // 2. 基于反例的置信度
    const counterexamplePenalty = Math.max(0, 1 - rule.counterexamples * 0.2);

    // 3. 基于适用性的置信度（适用场景越多，置信度越高）
    const applicabilityBonus = Math.min(0.2, rule.applicability.length * 0.05);

    confidence = (frequencyConfidence * counterexamplePenalty + applicabilityBonus) / 2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * 分离新规则和更新的规则
   */
  private categorizeRules(rules: Rule[]): { newRules: Rule[]; updatedRules: Rule[] } {
    const newRules: Rule[] = [];
    const updatedRules: Rule[] = [];

    for (const rule of rules) {
      // 检查是否存在相似的规则
      const existingRule = this.findSimilarRule(rule);

      if (existingRule) {
        // 更新现有规则
        existingRule.frequency++;
        existingRule.confidence = this.calculateRuleConfidence(existingRule);
        existingRule.lastVerifiedAt = new Date();
        updatedRules.push(existingRule);
      } else {
        // 添加新规则
        newRules.push(rule);
        this.ruleCache.set(rule.id, rule);
      }
    }

    return { newRules, updatedRules };
  }

  /**
   * 查找相似的规则
   */
  private findSimilarRule(newRule: Rule): Rule | null {
    for (const [, rule] of this.ruleCache) {
      // 简单的相似度检查：条件和结果的关键词匹配
      const conditionSimilarity = this.calculateSimilarity(
        newRule.condition,
        rule.condition
      );
      const consequenceSimilarity = this.calculateSimilarity(
        newRule.consequence,
        rule.consequence
      );

      if (conditionSimilarity > 0.7 && consequenceSimilarity > 0.7) {
        return rule;
      }
    }

    return null;
  }

  /**
   * 计算两个字符串的相似度（简单的 Jaccard 相似度）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * 存储规则到记忆系统
   */
  private async storeRules(newRules: Rule[], updatedRules: Rule[]): Promise<void> {
    try {
      // 存储新规则
      for (const rule of newRules) {
        const memoryData: any = {
          type: MemoryType.RELATIONAL, // 使用关系记忆类型存储规则
          content: `如果 ${rule.condition}，那么 ${rule.consequence}`,
          title: `规则：${rule.condition.substring(0, 30)}...`,
          metadata: {
            ruleType: "if_then",
            condition: rule.condition,
            consequence: rule.consequence,
            confidence: rule.confidence,
            frequency: rule.frequency,
            applicability: rule.applicability,
          },
          visibility: "private",
          confidence: rule.confidence,
          importance: rule.frequency / 10, // 频率越高，重要性越高
        };

        try {
          await this.memoryManager.addMemory(memoryData);
        } catch (error) {
          console.error(
            `[RuleLearner] Error storing rule: ${rule.condition}`,
            error
          );
        }
      }

      console.log(`[RuleLearner] Stored ${newRules.length} new rules`);
    } catch (error) {
      console.error("[RuleLearner] Error storing rules:", error);
    }
  }

  /**
   * 应用规则进行推理
   */
  async applyRules(context: string): Promise<string[]> {
    const conclusions: string[] = [];

    for (const [, rule] of this.ruleCache) {
      // 检查条件是否在上下文中满足
      if (this.isConditionMet(rule.condition, context)) {
        // 应用规则，得出结论
        conclusions.push(rule.consequence);

        // 更新规则的验证次数
        rule.frequency++;
        rule.lastVerifiedAt = new Date();
      }
    }

    return conclusions;
  }

  /**
   * 检查条件是否满足
   */
  private isConditionMet(condition: string, context: string): boolean {
    // 简单的关键词匹配
    const conditionWords = condition.toLowerCase().split(/\s+/);
    const contextLower = context.toLowerCase();

    return conditionWords.some((word) => contextLower.includes(word));
  }

  /**
   * 验证规则（当发现反例时）
   */
  async recordCounterexample(ruleId: string, context: string): Promise<void> {
    const rule = this.ruleCache.get(ruleId);
    if (rule) {
      rule.counterexamples++;
      rule.confidence = this.calculateRuleConfidence(rule);
      console.log(`[RuleLearner] Recorded counterexample for rule: ${ruleId}`);
    }
  }

  /**
   * 获取规则统计信息
   */
  getRuleStats(): {
    totalRules: number;
    averageConfidence: number;
    averageFrequency: number;
    highConfidenceRules: number;
  } {
    const rules = Array.from(this.ruleCache.values());

    const totalRules = rules.length;
    const averageConfidence =
      totalRules > 0
        ? rules.reduce((sum, r) => sum + r.confidence, 0) / totalRules
        : 0;
    const averageFrequency =
      totalRules > 0
        ? rules.reduce((sum, r) => sum + r.frequency, 0) / totalRules
        : 0;
    const highConfidenceRules = rules.filter((r) => r.confidence > 0.8).length;

    return {
      totalRules,
      averageConfidence,
      averageFrequency,
      highConfidenceRules,
    };
  }

  /**
   * 获取所有规则
   */
  getAllRules(): Rule[] {
    return Array.from(this.ruleCache.values()).sort(
      (a, b) => b.confidence - a.confidence
    );
  }
}
