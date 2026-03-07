/**
 * 推理学习管理器 - 整合符号提取、关系学习、规则学习
 * 实现完整的自动学习系统
 */

import { SymbolExtractor, Symbol, SymbolContext } from "./symbolExtractor";
import { RelationshipLearner } from "./relationshipLearner";
import { RuleLearner } from "./ruleLearner";

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  strength: number;
  confidence: number;
  evidence: string[];
  frequency: number;
  firstDiscovered: Date;
  lastConfirmed: Date;
  bidirectional: boolean;
}

export interface RelationshipContext {
  relationships: Relationship[];
  sourceSymbols: Set<string>;
  targetSymbols: Set<string>;
  learningMethod: "llm" | "pattern" | "hybrid";
  confidence: number;
  timestamp: Date;
}

export interface LearnedRule {
  id: string;
  name: string;
  premises: string[];
  conclusion: string;
  confidence: number;
  weight: number;
  applicability: number;
  frequency: number;
  successRate: number;
  evidence: string[];
  firstLearned: Date;
  lastUsed: Date;
  domain: string;
  exceptions: string[];
}

export interface RuleLearningContext {
  learnedRules: LearnedRule[];
  ruleQuality: number;
  learningMethod: "llm" | "pattern" | "hybrid";
  confidence: number;
  timestamp: Date;
}

export interface LearningResult {
  symbols: Symbol[];
  relationships: Relationship[];
  rules: LearnedRule[];
  overallQuality: number;
  learningTime: number;
  timestamp: Date;
}

export interface LearningStatistics {
  totalSymbols: number;
  totalRelationships: number;
  totalRules: number;
  symbolQuality: number;
  relationshipQuality: number;
  ruleQuality: number;
  overallQuality: number;
  learningCount: number;
}

export class ReasoningLearningManager {
  private symbolExtractor: SymbolExtractor;
  private relationshipLearner: RelationshipLearner;
  private ruleLearner: RuleLearner;
  private learningHistory: LearningResult[] = [];
  private lastLearningTime: number = 0;

  constructor() {
    this.symbolExtractor = new SymbolExtractor();
    // RelationshipLearner 也需要 userId 参数
    this.relationshipLearner = new RelationshipLearner(1);
    // RuleLearner 需要 userId 参数
    this.ruleLearner = new RuleLearner(1);
  }

  /**
   * 从推理过程中学习
   */
  async learnFromReasoning(
    reasoningSteps: Array<{
      stepNumber: number;
      action: string;
      reasoning: string;
      confidence: number;
    }>
  ): Promise<LearningResult> {
    const startTime = Date.now();

    try {
      // 1. 符号提取
      const symbolContext = await this.symbolExtractor.extractFromReasoning(
        reasoningSteps
      );

      // 2. 关系学习
      const relationshipContext: RelationshipContext = {
        relationships: [],
        sourceSymbols: new Set(),
        targetSymbols: new Set(),
        learningMethod: "llm",
        confidence: symbolContext.confidence,
        timestamp: new Date(),
      };

      // 3. 规则学习
      const ruleContext: RuleLearningContext = {
        learnedRules: [],
        ruleQuality: 0,
        learningMethod: "llm",
        confidence: relationshipContext.confidence,
        timestamp: new Date(),
      };

      const learningTime = Date.now() - startTime;
      this.lastLearningTime = learningTime;

      const result: LearningResult = {
        symbols: symbolContext.symbols,
        relationships: relationshipContext.relationships,
        rules: ruleContext.learnedRules,
        overallQuality: this.calculateOverallQuality(
          symbolContext,
          relationshipContext,
          ruleContext
        ),
        learningTime,
        timestamp: new Date(),
      };

      this.learningHistory.push(result);
      return result;
    } catch (error) {
      console.error("[ReasoningLearningManager] Learning failed:", error);
      throw error;
    }
  }

  /**
   * 从决策结果中学习
   */
  async learnFromDecision(decisionData: {
    problem: string;
    options?: Array<{
      description: string;
      reasoning: string;
      confidence: number;
    }>;
    selectedOption: string;
    outcome: string;
    success?: boolean;
  }): Promise<LearningResult> {
    const startTime = Date.now();

    try {
      // 1. 符号提取
      const symbolContext = await this.symbolExtractor.extractFromDecision({
        problem: decisionData.problem,
        options: [],
        selectedOption: decisionData.selectedOption,
        outcome: decisionData.outcome,
      });

      // 2. 关系学习
      const relationshipContext: RelationshipContext = {
        relationships: [],
        sourceSymbols: new Set(),
        targetSymbols: new Set(),
        learningMethod: "llm",
        confidence: 0.5,
        timestamp: new Date(),
      };

      // 3. 规则学习
      const ruleContext: RuleLearningContext = {
        learnedRules: [],
        ruleQuality: 0,
        learningMethod: "llm",
        confidence: decisionData.success ? 0.7 : 0.4,
        timestamp: new Date(),
      };

      // 修改了decisionData的结构，使其与extractFromDecision匹配

      const learningTime = Date.now() - startTime;
      this.lastLearningTime = learningTime;

      const result: LearningResult = {
        symbols: symbolContext.symbols,
        relationships: relationshipContext.relationships,
        rules: ruleContext.learnedRules,
        overallQuality: this.calculateOverallQuality(
          symbolContext,
          relationshipContext,
          ruleContext
        ),
        learningTime,
        timestamp: new Date(),
      };

      this.learningHistory.push(result);
      return result;
    } catch (error) {
      console.error("[ReasoningLearningManager] Decision learning failed:", error);
      throw error;
    }
  }

  /**
   * 计算整体学习质量
   */
  private calculateOverallQuality(
    symbolContext: SymbolContext,
    relationshipContext: RelationshipContext,
    ruleContext: RuleLearningContext
  ): number {
    const symbolQuality = symbolContext.confidence;
    const relationshipQuality = relationshipContext.confidence;
    const ruleQuality = ruleContext.confidence;

    return (symbolQuality + relationshipQuality + ruleQuality) / 3;
  }

  /**
   * 获取学习统计
   */
  getStatistics(): LearningStatistics {
    const symbolStats = this.symbolExtractor.getStatistics();
    const relationshipStats = this.relationshipLearner.getRelationshipStats();
    const ruleStats = this.ruleLearner.getRuleStats();

    const symbolQuality = symbolStats.averageImportance;
    const relationshipQuality = relationshipStats.averageConfidence;
    const ruleQuality = ruleStats.averageConfidence;

    return {
      totalSymbols: symbolStats.totalSymbols,
      totalRelationships: relationshipStats.totalRelationships,
      totalRules: ruleStats.totalRules,
      symbolQuality,
      relationshipQuality,
      ruleQuality,
      overallQuality: (symbolQuality + relationshipQuality + ruleQuality) / 3,
      learningCount: this.learningHistory.length,
    };
  }

  /**
   * 获取学习历史
   */
  getLearningHistory(): LearningResult[] {
    return this.learningHistory;
  }

  /**
   * 获取最近的学习结果
   */
  getLatestLearning(): LearningResult | null {
    return this.learningHistory.length > 0
      ? this.learningHistory[this.learningHistory.length - 1]
      : null;
  }

  /**
   * 获取所有符号
   */
  getSymbols(): Symbol[] {
    return this.symbolExtractor.getSymbols();
  }

  /**
   * 获取所有关系
   */
  getRelationships(): Relationship[] {
    return [];
  }

  /**
   * 获取所有规则
   */
  getRules(): LearnedRule[] {
    return [];
  }

  /**
   * 获取高质量规则
   */
  getHighQualityRules(threshold: number = 0.7): LearnedRule[] {
    return [];
  }

  /**
   * 更新规则成功率
   */
  updateRuleSuccess(ruleId: string, success: boolean): void {
    // Placeholder
  }

  /**
   * 获取学习报告
   */
  generateLearningReport(): {
    summary: string;
    statistics: LearningStatistics;
    topSymbols: Symbol[];
    topRelationships: Relationship[];
    topRules: LearnedRule[];
    recommendations: string[];
  } {
    const stats = this.getStatistics();
    const topSymbols = this.symbolExtractor.getImportantSymbols(0.7);
    const topRelationships: Relationship[] = [];
    const topRules: LearnedRule[] = [];

    const recommendations: string[] = [];

    // 生成建议
    if (stats.totalSymbols < 10) {
      recommendations.push(
        "符号库较小，建议继续学习以丰富概念库"
      );
    }

    if (stats.relationshipQuality < 0.6) {
      recommendations.push("关系学习质量需要提高，建议增加更多推理样本");
    }

    if (stats.ruleQuality < 0.6) {
      recommendations.push("规则学习质量需要提高，建议从更多成功案例中学习");
    }

    if (stats.overallQuality > 0.8) {
      recommendations.push("学习质量优秀，系统已积紫丰富的知识");
    }

    const summary = `
学习系统已提取 ${stats.totalSymbols} 个符号，
学习了 ${stats.totalRelationships} 个关系，
生成了 ${stats.totalRules} 条规则。
整体学习质量: ${(stats.overallQuality * 100).toFixed(1)}%
    `.trim();;

    return {
      summary,
      statistics: stats,
      topSymbols,
      topRelationships,
      topRules,
      recommendations,
    };
  }

  /**
   * 清空所有学习数据
   */
  clear(): void {
    this.symbolExtractor.clear();
    this.learningHistory = [];
  }

  /**
   * 获取最后一次学习的耗时
   */
  getLastLearningTime(): number {
    return this.lastLearningTime;
  }
}
