/**
 * 自主行动和反馈循环系统
 * 
 * 让 Nova-Mind 能够：
 * 1. 执行决策并跟踪结果
 * 2. 根据反馈评估决策质量
 * 3. 更新规则和关系的置信度
 * 4. 自主改进决策和学习算法
 */

export interface ActionExecution {
  id: string;
  decisionId: string;
  action: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface Feedback {
  id: string;
  executionId: string;
  decisionId: string;
  success: boolean;
  score: number; // 0-1，表示决策的成功程度
  feedback: string; // 用户或系统反馈
  timestamp: Date;
  improvements?: string[]; // 改进建议
}

export interface DecisionQuality {
  decisionId: string;
  ruleId: string;
  successCount: number;
  failureCount: number;
  averageScore: number;
  lastUpdated: Date;
  trend: 'improving' | 'stable' | 'declining'; // 趋势
}

export interface LearningFeedback {
  symbolId: string;
  ruleId: string;
  relationshipId: string;
  confidenceAdjustment: number; // -1 到 1，表示置信度的调整
  reason: string;
  timestamp: Date;
}

/**
 * 反馈循环管理器
 */
export class FeedbackLoopManager {
  private executions: Map<string, ActionExecution> = new Map();
  private feedbacks: Map<string, Feedback> = new Map();
  private decisionQuality: Map<string, DecisionQuality> = new Map();
  private learningFeedbacks: LearningFeedback[] = [];

  /**
   * 记录行动执行
   */
  recordExecution(execution: ActionExecution): void {
    this.executions.set(execution.id, execution);
  }

  /**
   * 获取行动执行记录
   */
  getExecution(executionId: string): ActionExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * 更新行动执行状态
   */
  updateExecutionStatus(
    executionId: string,
    status: ActionExecution['status'],
    result?: unknown,
    error?: string
  ): void {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = status;
      if (result !== undefined) execution.result = result;
      if (error !== undefined) execution.error = error;
    }
  }

  /**
   * 记录反馈
   */
  recordFeedback(feedback: Feedback): void {
    this.feedbacks.set(feedback.id, feedback);
    this.updateDecisionQuality(feedback);
    this.generateLearningFeedback(feedback);
  }

  /**
   * 获取反馈
   */
  getFeedback(feedbackId: string): Feedback | undefined {
    return this.feedbacks.get(feedbackId);
  }

  /**
   * 获取决策的所有反馈
   */
  getDecisionFeedbacks(decisionId: string): Feedback[] {
    return Array.from(this.feedbacks.values()).filter(
      (f) => f.decisionId === decisionId
    );
  }

  /**
   * 更新决策质量
   */
  private updateDecisionQuality(feedback: Feedback): void {
    const key = feedback.decisionId;
    let quality = this.decisionQuality.get(key);

    if (!quality) {
      quality = {
        decisionId: feedback.decisionId,
        ruleId: '', // 从决策中提取
        successCount: 0,
        failureCount: 0,
        averageScore: 0,
        lastUpdated: new Date(),
        trend: 'stable',
      };
    }

    // 更新成功/失败计数
    if (feedback.success) {
      quality.successCount++;
    } else {
      quality.failureCount++;
    }

    // 更新平均分数
    const totalCount = quality.successCount + quality.failureCount;
    quality.averageScore =
      (quality.averageScore * (totalCount - 1) + feedback.score) / totalCount;

    // 计算趋势
    const recentFeedbacks = Array.from(this.feedbacks.values())
      .filter((f) => f.decisionId === feedback.decisionId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);

    if (recentFeedbacks.length >= 3) {
      const oldScore =
        recentFeedbacks.slice(3).reduce((sum, f) => sum + f.score, 0) /
        Math.max(recentFeedbacks.length - 2, 1);
      const newScore =
        recentFeedbacks.slice(0, 2).reduce((sum, f) => sum + f.score, 0) / 2;

      if (newScore > oldScore + 0.1) {
        quality.trend = 'improving';
      } else if (newScore < oldScore - 0.1) {
        quality.trend = 'declining';
      } else {
        quality.trend = 'stable';
      }
    }

    quality.lastUpdated = new Date();
    this.decisionQuality.set(key, quality);
  }

  /**
   * 获取决策质量
   */
  getDecisionQuality(decisionId: string): DecisionQuality | undefined {
    return this.decisionQuality.get(decisionId);
  }

  /**
   * 生成学习反馈
   */
  private generateLearningFeedback(feedback: Feedback): void {
    // 根据反馈生成对规则和关系的调整建议
    const confidenceAdjustment = feedback.success ? 0.1 : -0.15;
    const reason = feedback.success
      ? `决策成功，置信度提高 (得分: ${feedback.score})`
      : `决策失败，置信度降低 (得分: ${feedback.score})`;

    this.learningFeedbacks.push({
      symbolId: '', // 从决策中提取
      ruleId: '', // 从决策中提取
      relationshipId: '', // 从决策中提取
      confidenceAdjustment,
      reason,
      timestamp: new Date(),
    });
  }

  /**
   * 获取学习反馈
   */
  getLearningFeedbacks(): LearningFeedback[] {
    return this.learningFeedbacks;
  }

  /**
   * 清除旧的学习反馈（超过 7 天）
   */
  clearOldLearningFeedbacks(daysOld: number = 7): void {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    this.learningFeedbacks = this.learningFeedbacks.filter(
      (f) => f.timestamp.getTime() > cutoffTime
    );
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const totalExecutions = this.executions.size;
    const completedExecutions = Array.from(this.executions.values()).filter(
      (e) => e.status === 'completed'
    ).length;
    const failedExecutions = Array.from(this.executions.values()).filter(
      (e) => e.status === 'failed'
    ).length;

    const totalFeedbacks = this.feedbacks.size;
    const successfulFeedbacks = Array.from(this.feedbacks.values()).filter(
      (f) => f.success
    ).length;
    const averageScore =
      totalFeedbacks > 0
        ? Array.from(this.feedbacks.values()).reduce((sum, f) => sum + f.score, 0) /
          totalFeedbacks
        : 0;

    return {
      totalExecutions,
      completedExecutions,
      failedExecutions,
      executionSuccessRate:
        totalExecutions > 0 ? completedExecutions / totalExecutions : 0,
      totalFeedbacks,
      successfulFeedbacks,
      feedbackSuccessRate:
        totalFeedbacks > 0 ? successfulFeedbacks / totalFeedbacks : 0,
      averageScore,
      learningFeedbackCount: this.learningFeedbacks.length,
    };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.executions.clear();
    this.feedbacks.clear();
    this.decisionQuality.clear();
    this.learningFeedbacks = [];
  }
}

/**
 * 全局反馈循环管理器实例
 */
let globalFeedbackLoopManager: FeedbackLoopManager | null = null;

/**
 * 获取全局反馈循环管理器
 */
export function getFeedbackLoopManager(): FeedbackLoopManager {
  if (!globalFeedbackLoopManager) {
    globalFeedbackLoopManager = new FeedbackLoopManager();
  }
  return globalFeedbackLoopManager;
}

/**
 * 自主改进引擎
 * 根据反馈自动改进规则和关系
 */
export class AutonomousImprovementEngine {
  private feedbackManager: FeedbackLoopManager;

  constructor(feedbackManager: FeedbackLoopManager) {
    this.feedbackManager = feedbackManager;
  }

  /**
   * 分析反馈并生成改进建议
   */
  analyzeFeedbackAndGenerateImprovements(
    decisionId: string
  ): {
    improvements: string[];
    ruleAdjustments: Array<{ ruleId: string; adjustment: number }>;
    relationshipAdjustments: Array<{
      relationshipId: string;
      adjustment: number;
    }>;
  } {
    const feedbacks = this.feedbackManager.getDecisionFeedbacks(decisionId);
    const quality = this.feedbackManager.getDecisionQuality(decisionId);

    const improvements: string[] = [];
    const ruleAdjustments: Array<{ ruleId: string; adjustment: number }> = [];
    const relationshipAdjustments: Array<{
      relationshipId: string;
      adjustment: number;
    }> = [];

    if (!quality) {
      return { improvements, ruleAdjustments, relationshipAdjustments };
    }

    // 分析趋势
    if (quality.trend === 'declining') {
      improvements.push(
        '决策质量下降，建议重新评估规则和关系的有效性'
      );
      ruleAdjustments.push({ ruleId: quality.ruleId, adjustment: -0.2 });
    } else if (quality.trend === 'improving') {
      improvements.push('决策质量改善，建议增加该规则的权重');
      ruleAdjustments.push({ ruleId: quality.ruleId, adjustment: 0.1 });
    }

    // 分析成功率
    const successRate =
      quality.successCount / (quality.successCount + quality.failureCount);
    if (successRate < 0.5) {
      improvements.push(
        `成功率低于 50%，建议审查决策条件和规则`
      );
    } else if (successRate > 0.8) {
      improvements.push(
        `成功率高于 80%，该规则表现良好，可以增加其优先级`
      );
    }

    // 分析平均分数
    if (quality.averageScore < 0.5) {
      improvements.push(
        '平均得分低于 0.5，建议重新设计决策逻辑'
      );
    } else if (quality.averageScore > 0.8) {
      improvements.push(
        '平均得分高于 0.8，该决策规则表现优秀'
      );
    }

    return { improvements, ruleAdjustments, relationshipAdjustments };
  }

  /**
   * 自动应用改进
   */
  applyImprovements(
    decisionId: string,
    ruleUpdater: (ruleId: string, adjustment: number) => void,
    relationshipUpdater: (relationshipId: string, adjustment: number) => void
  ): void {
    const { ruleAdjustments, relationshipAdjustments } =
      this.analyzeFeedbackAndGenerateImprovements(decisionId);

    ruleAdjustments.forEach(({ ruleId, adjustment }) => {
      ruleUpdater(ruleId, adjustment);
    });

    relationshipAdjustments.forEach(({ relationshipId, adjustment }) => {
      relationshipUpdater(relationshipId, adjustment);
    });
  }

  /**
   * 获取改进历史
   */
  getImprovementHistory(): {
    timestamp: Date;
    decisionId: string;
    improvements: string[];
  }[] {
    // 这是一个简化的实现，实际应该从数据库中获取
    return [];
  }
}

/**
 * 全局自主改进引擎实例
 */
let globalAutonomousImprovementEngine: AutonomousImprovementEngine | null =
  null;

/**
 * 获取全局自主改进引擎
 */
export function getAutonomousImprovementEngine(): AutonomousImprovementEngine {
  if (!globalAutonomousImprovementEngine) {
    globalAutonomousImprovementEngine = new AutonomousImprovementEngine(
      getFeedbackLoopManager()
    );
  }
  return globalAutonomousImprovementEngine;
}
