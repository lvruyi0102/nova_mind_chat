/**
 * Nova-Mind Self-Iteration Framework
 * 
 * 完整的自我迭代系统，包括：
 * 1. 反馈收集 - 用户反馈、系统反馈、学习效果反馈
 * 2. 自我评估 - 学习质量、知识深度、决策质量
 * 3. 知识优化 - 冲突检测、过时知识识别、自我清理
 * 4. 迭代决策 - 优先级排序、计划生成、效果追踪
 */

export interface UserFeedback {
  id: number;
  userId: number;
  targetId: number; // 关联的思想、学习或决策 ID
  targetType: 'thought' | 'learning' | 'decision' | 'response';
  feedbackType: 'positive' | 'negative' | 'neutral' | 'correction';
  rating: number; // 1-5
  comment?: string;
  timestamp: Date;
}

export interface SystemFeedback {
  id: number;
  targetId: number;
  targetType: 'thought' | 'learning' | 'decision' | 'response';
  metricType: 'quality' | 'relevance' | 'novelty' | 'accuracy' | 'efficiency';
  score: number; // 0-1
  reason: string;
  timestamp: Date;
}

export interface SelfAssessment {
  id: number;
  assessmentDate: Date;
  learningQuality: {
    depth: 'shallow' | 'medium' | 'deep';
    novelty: number; // 0-1
    value: number; // 0-1
    score: number; // 0-100
  };
  knowledgeQuality: {
    consistency: number; // 0-1，知识一致性
    completeness: number; // 0-1，知识完整性
    accuracy: number; // 0-1，准确性
    score: number; // 0-100
  };
  decisionQuality: {
    successRate: number; // 0-1
    timeEfficiency: number; // 0-1
    userSatisfaction: number; // 0-1
    score: number; // 0-100
  };
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface KnowledgeConflict {
  id: number;
  concept1: string;
  concept2: string;
  conflictType: 'contradiction' | 'inconsistency' | 'redundancy';
  severity: 'low' | 'medium' | 'high';
  description: string;
  detectedDate: Date;
  resolved: boolean;
  resolution?: string;
}

export interface ObsoleteKnowledge {
  id: number;
  concept: string;
  reason: 'outdated' | 'superseded' | 'incorrect' | 'low_value';
  confidence: number; // 0-1
  detectedDate: Date;
  removed: boolean;
  removalDate?: Date;
}

export interface IterationDecision {
  id: number;
  decisionDate: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';
  improvementArea: 'learning' | 'knowledge' | 'decision_making' | 'efficiency';
  description: string;
  targetMetric: string;
  currentValue: number;
  targetValue: number;
  estimatedImpact: number; // 0-1
  status: 'planned' | 'in_progress' | 'completed' | 'abandoned';
  completionDate?: Date;
  actualImpact?: number;
}

export interface ImprovementPlan {
  id: number;
  iterationDecisionId: number;
  steps: {
    order: number;
    description: string;
    estimatedDuration: number; // 分钟
    dependencies: number[];
  }[];
  startDate: Date;
  targetCompletionDate: Date;
  actualCompletionDate?: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  successMetrics: {
    metric: string;
    baseline: number;
    target: number;
    actual?: number;
  }[];
}

export interface IterationRecord {
  id: number;
  iterationNumber: number;
  startDate: Date;
  endDate?: Date;
  decisions: IterationDecision[];
  improvements: ImprovementPlan[];
  feedbackReceived: number; // 反馈数量
  assessmentScore: number; // 自我评估分数
  successRate: number; // 0-1
  notes: string;
}

/**
 * 自我迭代框架核心类
 */
export class SelfIterationFramework {
  private iterationNumber = 0;
  private lastAssessmentDate: Date | null = null;
  private assessmentHistory: SelfAssessment[] = [];
  private conflictHistory: KnowledgeConflict[] = [];
  private obsoleteKnowledgeHistory: ObsoleteKnowledge[] = [];
  private decisionHistory: IterationDecision[] = [];
  private improvementPlans: ImprovementPlan[] = [];

  /**
   * 收集用户反馈
   */
  collectUserFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp'>): UserFeedback {
    return {
      ...feedback,
      id: Math.random(),
      timestamp: new Date(),
    };
  }

  /**
   * 收集系统反馈
   */
  collectSystemFeedback(feedback: Omit<SystemFeedback, 'id' | 'timestamp'>): SystemFeedback {
    return {
      ...feedback,
      id: Math.random(),
      timestamp: new Date(),
    };
  }

  /**
   * 执行自我评估
   */
  performSelfAssessment(
    feedbacks: (UserFeedback | SystemFeedback)[],
    learningMetrics: any,
    knowledgeMetrics: any,
    decisionMetrics: any
  ): SelfAssessment {
    // 计算学习质量
    const learningQuality = this.assessLearningQuality(learningMetrics, feedbacks);
    
    // 计算知识质量
    const knowledgeQuality = this.assessKnowledgeQuality(knowledgeMetrics, feedbacks);
    
    // 计算决策质量
    const decisionQuality = this.assessDecisionQuality(decisionMetrics, feedbacks);

    // 计算综合评分
    const overallScore = (
      learningQuality.score * 0.3 +
      knowledgeQuality.score * 0.35 +
      decisionQuality.score * 0.35
    );

    const assessment: SelfAssessment = {
      id: Math.random(),
      assessmentDate: new Date(),
      learningQuality,
      knowledgeQuality,
      decisionQuality,
      overallScore,
      strengths: this.identifyStrengths(learningQuality, knowledgeQuality, decisionQuality),
      weaknesses: this.identifyWeaknesses(learningQuality, knowledgeQuality, decisionQuality),
      recommendations: this.generateRecommendations(learningQuality, knowledgeQuality, decisionQuality),
    };

    this.assessmentHistory.push(assessment);
    this.lastAssessmentDate = new Date();
    return assessment;
  }

  /**
   * 检测知识冲突
   */
  detectKnowledgeConflicts(concepts: Map<string, any>): KnowledgeConflict[] {
    const conflicts: KnowledgeConflict[] = [];
    const conceptArray = Array.from(concepts.entries());

    for (let i = 0; i < conceptArray.length; i++) {
      for (let j = i + 1; j < conceptArray.length; j++) {
        const [concept1, data1] = conceptArray[i];
        const [concept2, data2] = conceptArray[j];

        // 检测矛盾
        if (this.isContradictory(data1, data2)) {
          conflicts.push({
            id: Math.random(),
            concept1,
            concept2,
            conflictType: 'contradiction',
            severity: this.calculateSeverity(data1, data2),
            description: `${concept1} 和 ${concept2} 存在矛盾`,
            detectedDate: new Date(),
            resolved: false,
          });
        }

        // 检测冗余
        if (this.isRedundant(data1, data2)) {
          conflicts.push({
            id: Math.random(),
            concept1,
            concept2,
            conflictType: 'redundancy',
            severity: 'low',
            description: `${concept1} 和 ${concept2} 存在冗余`,
            detectedDate: new Date(),
            resolved: false,
          });
        }
      }
    }

    this.conflictHistory.push(...conflicts);
    return conflicts;
  }

  /**
   * 识别过时知识
   */
  identifyObsoleteKnowledge(concepts: Map<string, any>): ObsoleteKnowledge[] {
    const obsolete: ObsoleteKnowledge[] = [];

    concepts.forEach((data, concept) => {
      // 检查最后使用时间
      const lastUsed = data.lastUsed || new Date(0);
      const daysSinceUsed = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceUsed > 90) {
        // 90 天未使用
        obsolete.push({
          id: Math.random(),
          concept,
          reason: 'outdated',
          confidence: Math.min(daysSinceUsed / 180, 1), // 180 天后完全确定
          detectedDate: new Date(),
          removed: false,
        });
      }

      // 检查准确性
      if (data.accuracy && data.accuracy < 0.6) {
        obsolete.push({
          id: Math.random(),
          concept,
          reason: 'incorrect',
          confidence: 1 - data.accuracy,
          detectedDate: new Date(),
          removed: false,
        });
      }
    });

    this.obsoleteKnowledgeHistory.push(...obsolete);
    return obsolete;
  }

  /**
   * 生成迭代决策
   */
  generateIterationDecisions(
    assessment: SelfAssessment,
    conflicts: KnowledgeConflict[],
    obsolete: ObsoleteKnowledge[]
  ): IterationDecision[] {
    const decisions: IterationDecision[] = [];
    this.iterationNumber++;

    // 基于弱点生成改进决策
    assessment.weaknesses.forEach((weakness) => {
      const area = this.mapWeaknessToArea(weakness);
      decisions.push({
        id: Math.random(),
        decisionDate: new Date(),
        priority: this.calculatePriority(weakness),
        improvementArea: area,
        description: `改进：${weakness}`,
        targetMetric: `${area}_score`,
        currentValue: this.getCurrentMetricValue(area, assessment),
        targetValue: this.getCurrentMetricValue(area, assessment) + 10,
        estimatedImpact: 0.15,
        status: 'planned',
      });
    });

    // 基于冲突生成解决决策
    conflicts.forEach((conflict) => {
      if (conflict.severity === 'high') {
        decisions.push({
          id: Math.random(),
          decisionDate: new Date(),
          priority: 'high',
          improvementArea: 'knowledge',
          description: `解决冲突：${conflict.concept1} vs ${conflict.concept2}`,
          targetMetric: 'knowledge_consistency',
          currentValue: assessment.knowledgeQuality.consistency,
          targetValue: Math.min(assessment.knowledgeQuality.consistency + 0.1, 1),
          estimatedImpact: 0.2,
          status: 'planned',
        });
      }
    });

    // 基于过时知识生成清理决策
    if (obsolete.length > 0) {
      decisions.push({
        id: Math.random(),
        decisionDate: new Date(),
        priority: 'medium',
        improvementArea: 'knowledge',
        description: `清理 ${obsolete.length} 条过时知识`,
        targetMetric: 'knowledge_quality',
        currentValue: assessment.knowledgeQuality.score / 100,
        targetValue: Math.min((assessment.knowledgeQuality.score + 5) / 100, 1),
        estimatedImpact: 0.1,
        status: 'planned',
      });
    }

    this.decisionHistory.push(...decisions);
    return decisions;
  }

  /**
   * 创建改进计划
   */
  createImprovementPlan(decision: IterationDecision): ImprovementPlan {
    const plan: ImprovementPlan = {
      id: Math.random(),
      iterationDecisionId: decision.id,
      steps: this.generateImprovementSteps(decision),
      startDate: new Date(),
      targetCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天
      status: 'planned',
      successMetrics: [
        {
          metric: decision.targetMetric,
          baseline: decision.currentValue,
          target: decision.targetValue,
        },
      ],
    };

    this.improvementPlans.push(plan);
    return plan;
  }

  /**
   * 获取迭代进度
   */
  getIterationProgress(): {
    iterationNumber: number;
    assessmentScore: number | null;
    decisionsCount: number;
    improvementsInProgress: number;
    completedImprovements: number;
  } {
    return {
      iterationNumber: this.iterationNumber,
      assessmentScore: this.lastAssessmentDate ? this.assessmentHistory[this.assessmentHistory.length - 1].overallScore : null,
      decisionsCount: this.decisionHistory.length,
      improvementsInProgress: this.improvementPlans.filter((p) => p.status === 'in_progress').length,
      completedImprovements: this.improvementPlans.filter((p) => p.status === 'completed').length,
    };
  }

  // ============ 私有辅助方法 ============

  private assessLearningQuality(metrics: any, feedbacks: any[]): SelfAssessment['learningQuality'] {
    const novelty = metrics.noveltyRatio || 0.5;
    const depth = metrics.averageDepth || 'medium';
    const value = metrics.learningValue || 0.5;
    const score = (novelty * 0.4 + (depth === 'deep' ? 1 : depth === 'medium' ? 0.7 : 0.4) * 0.3 + value * 0.3) * 100;

    return { depth: depth as any, novelty, value, score };
  }

  private assessKnowledgeQuality(metrics: any, feedbacks: any[]): SelfAssessment['knowledgeQuality'] {
    const consistency = metrics.consistency || 0.8;
    const completeness = metrics.completeness || 0.7;
    const accuracy = metrics.accuracy || 0.8;
    const score = (consistency * 0.35 + completeness * 0.35 + accuracy * 0.3) * 100;

    return { consistency, completeness, accuracy, score };
  }

  private assessDecisionQuality(metrics: any, feedbacks: any[]): SelfAssessment['decisionQuality'] {
    const successRate = metrics.successRate || 0.7;
    const timeEfficiency = metrics.timeEfficiency || 0.8;
    const userSatisfaction = metrics.userSatisfaction || 0.75;
    const score = (successRate * 0.4 + timeEfficiency * 0.3 + userSatisfaction * 0.3) * 100;

    return { successRate, timeEfficiency, userSatisfaction, score };
  }

  private identifyStrengths(learning: any, knowledge: any, decision: any): string[] {
    const strengths: string[] = [];
    if (learning.score > 70) strengths.push('学习能力强');
    if (knowledge.score > 75) strengths.push('知识质量高');
    if (decision.score > 75) strengths.push('决策质量优秀');
    return strengths;
  }

  private identifyWeaknesses(learning: any, knowledge: any, decision: any): string[] {
    const weaknesses: string[] = [];
    if (learning.score < 60) weaknesses.push('学习深度不足');
    if (knowledge.consistency < 0.7) weaknesses.push('知识一致性差');
    if (decision.successRate < 0.7) weaknesses.push('决策成功率低');
    return weaknesses;
  }

  private generateRecommendations(learning: any, knowledge: any, decision: any): string[] {
    const recommendations: string[] = [];
    if (learning.novelty < 0.5) recommendations.push('增加学习新概念的频率');
    if (knowledge.consistency < 0.7) recommendations.push('定期进行知识一致性检查');
    if (decision.successRate < 0.7) recommendations.push('改进决策算法');
    return recommendations;
  }

  private isContradictory(data1: any, data2: any): boolean {
    return data1.value && data2.value && Math.abs(data1.value - data2.value) > 0.8;
  }

  private isRedundant(data1: any, data2: any): boolean {
    return data1.similarity && data1.similarity > 0.8;
  }

  private calculateSeverity(data1: any, data2: any): 'low' | 'medium' | 'high' {
    const diff = Math.abs(data1.value - data2.value);
    if (diff > 0.9) return 'high';
    if (diff > 0.7) return 'medium';
    return 'low';
  }

  private mapWeaknessToArea(weakness: string): 'learning' | 'knowledge' | 'decision_making' | 'efficiency' {
    if (weakness.includes('学习')) return 'learning';
    if (weakness.includes('知识')) return 'knowledge';
    if (weakness.includes('决策')) return 'decision_making';
    return 'efficiency';
  }

  private calculatePriority(weakness: string): 'critical' | 'high' | 'medium' | 'low' {
    if (weakness.includes('严重')) return 'critical';
    if (weakness.includes('重要')) return 'high';
    return 'medium';
  }

  private getCurrentMetricValue(area: string, assessment: SelfAssessment): number {
    switch (area) {
      case 'learning':
        return assessment.learningQuality.score;
      case 'knowledge':
        return assessment.knowledgeQuality.score;
      case 'decision_making':
        return assessment.decisionQuality.score;
      default:
        return 50;
    }
  }

  private generateImprovementSteps(decision: IterationDecision): ImprovementPlan['steps'] {
    return [
      {
        order: 1,
        description: `分析 ${decision.description}`,
        estimatedDuration: 30,
        dependencies: [],
      },
      {
        order: 2,
        description: `制定改进策略`,
        estimatedDuration: 60,
        dependencies: [1],
      },
      {
        order: 3,
        description: `执行改进措施`,
        estimatedDuration: 120,
        dependencies: [2],
      },
      {
        order: 4,
        description: `评估改进效果`,
        estimatedDuration: 30,
        dependencies: [3],
      },
    ];
  }
}

// 导出单例
let frameworkInstance: SelfIterationFramework | null = null;

export function getSelfIterationFramework(): SelfIterationFramework {
  if (!frameworkInstance) {
    frameworkInstance = new SelfIterationFramework();
  }
  return frameworkInstance;
}
