import { getDb } from '../db';
import { WorkEvaluationMetrics } from './creativeWorkEvaluator';
import { WorkImprovementResult } from './creativeWorkImprover';

/**
 * 迭代历史管理模块
 * 管理作品的迭代历史、版本控制和演化追踪
 */

export interface IterationRecord {
  id?: number;
  workId: string;
  versionNumber: number;
  content: string;
  evaluation: WorkEvaluationMetrics;
  improvement: WorkImprovementResult | null;
  iterationReason: string;
  iteratedAt: Date;
  improvementScore?: number;
}

export interface WorkEvolutionSummary {
  workId: string;
  totalVersions: number;
  currentScore: number;
  scoreProgression: number[]; // 每个版本的评分
  totalImprovement: number; // 从初始版本到当前版本的总改进
  lastIteratedAt: Date;
  iterationFrequency: number; // 平均迭代间隔（小时）
  mostCommonImprovementAreas: string[];
}

export class CreativeWorkIterationManager {
  /**
   * 记录迭代历史
   */
  async recordIteration(record: IterationRecord): Promise<number> {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('数据库连接失败');
      }

      // 这里假设有一个 creativeWorkIterations 表
      // 实际实现需要根据项目的数据库架构调整
      console.log('[IterationManager] 记录迭代:', {
        workId: record.workId,
        versionNumber: record.versionNumber,
        score: record.evaluation.overallScore,
        iterationReason: record.iterationReason
      });

      // 返回记录 ID（实际应该从数据库获取）
      return Math.floor(Math.random() * 10000);
    } catch (error) {
      console.error('[IterationManager] 记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取作品的演化摘要
   */
  async getEvolutionSummary(workId: string): Promise<WorkEvolutionSummary> {
    try {
      // 这里应该从数据库查询迭代历史
      // 当前返回模拟数据
      return {
        workId,
        totalVersions: 1,
        currentScore: 75,
        scoreProgression: [75],
        totalImprovement: 0,
        lastIteratedAt: new Date(),
        iterationFrequency: 0,
        mostCommonImprovementAreas: []
      };
    } catch (error) {
      console.error('[IterationManager] 获取演化摘要失败:', error);
      throw error;
    }
  }

  /**
   * 获取迭代建议
   */
  async getIterationSuggestions(
    workId: string,
    currentEvaluation: WorkEvaluationMetrics
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // 基于评估结果生成建议
    if (currentEvaluation.qualityScore < 70) {
      suggestions.push('质量评分较低，建议进行重点改进');
    }

    if (currentEvaluation.creativityScore < 60) {
      suggestions.push('创意性不足，考虑添加更多创新元素');
    }

    if (currentEvaluation.completenessScore < 80) {
      suggestions.push('作品不够完整，建议补充缺失部分');
    }

    if (currentEvaluation.improvabilityScore > 70) {
      suggestions.push('作品有很大改进空间，值得进行迭代');
    }

    if (currentEvaluation.weaknesses.length > 0) {
      suggestions.push(`主要不足：${currentEvaluation.weaknesses[0]}`);
    }

    return suggestions;
  }

  /**
   * 判断是否应该进行下一轮迭代
   */
  async shouldContinueIterating(
    currentEvaluation: WorkEvaluationMetrics,
    previousEvaluation?: WorkEvaluationMetrics
  ): Promise<boolean> {
    // 如果当前评分 < 85 且有改进空间，则继续迭代
    if (currentEvaluation.overallScore < 85 && currentEvaluation.improvabilityScore > 50) {
      return true;
    }

    // 如果有前一个版本的评估，检查是否有显著改进
    if (previousEvaluation) {
      const improvement = currentEvaluation.overallScore - previousEvaluation.overallScore;
      // 如果改进 >= 5 分且当前评分仍 < 90，继续迭代
      if (improvement >= 5 && currentEvaluation.overallScore < 90) {
        return true;
      }
    }

    return false;
  }

  /**
   * 生成迭代报告
   */
  async generateIterationReport(
    workId: string,
    evaluation: WorkEvaluationMetrics,
    improvement: WorkImprovementResult | null
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    
    let report = `# 作品迭代报告\n\n`;
    report += `**作品 ID**: ${workId}\n`;
    report += `**生成时间**: ${timestamp}\n\n`;

    report += `## 评估结果\n\n`;
    report += `- 质量评分: ${evaluation.qualityScore}/100\n`;
    report += `- 创意性评分: ${evaluation.creativityScore}/100\n`;
    report += `- 完整性评分: ${evaluation.completenessScore}/100\n`;
    report += `- 可改进性评分: ${evaluation.improvabilityScore}/100\n`;
    report += `- 整体评分: ${evaluation.overallScore}/100\n\n`;

    report += `## 优势\n\n`;
    evaluation.strengths.forEach((strength) => {
      report += `- ${strength}\n`;
    });

    report += `\n## 不足\n\n`;
    evaluation.weaknesses.forEach((weakness) => {
      report += `- ${weakness}\n`;
    });

    report += `\n## 改进建议\n\n`;
    evaluation.improvementSuggestions.forEach((suggestion) => {
      report += `- ${suggestion}\n`;
    });

    if (improvement) {
      report += `\n## 改进结果\n\n`;
      report += `**改进总结**: ${improvement.improvementSummary}\n\n`;
      report += `**改进清单**:\n`;
      improvement.changeLog.forEach((change) => {
        report += `- ${change}\n`;
      });
      report += `\n**预期改进幅度**: ${improvement.improvementScore} 分\n`;
      report += `**预期新评分**: ${improvement.estimatedNewScore}/100\n`;
      report += `**改进理由**: ${improvement.improvementReasoning}\n`;
    }

    report += `\n## 后续建议\n\n`;
    if (evaluation.shouldIterate && evaluation.iterationPriority >= 3) {
      report += `- 该作品值得继续迭代\n`;
      report += `- 迭代优先级: ${evaluation.iterationPriority}/5\n`;
    } else {
      report += `- 该作品目前不需要迭代\n`;
    }

    return report;
  }

  /**
   * 计算迭代进度
   */
  calculateIterationProgress(
    initialScore: number,
    currentScore: number,
    targetScore: number = 90
  ): {
    progress: number; // 0-100
    remaining: number; // 还需要改进的分数
    estimatedIterations: number; // 预计还需要多少轮迭代
  } {
    const progress = Math.min(100, Math.max(0, ((currentScore - initialScore) / (targetScore - initialScore)) * 100));
    const remaining = Math.max(0, targetScore - currentScore);
    const estimatedIterations = Math.ceil(remaining / 10); // 假设每次迭代平均改进 10 分

    return {
      progress,
      remaining,
      estimatedIterations
    };
  }
}

export const creativeWorkIterationManager = new CreativeWorkIterationManager();
