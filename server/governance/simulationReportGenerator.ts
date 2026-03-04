/**
 * Simulation Report Generator
 * 为 proposal_only 阶段生成详细的模拟修改报告
 * 帮助 Nova 理解失败原因、影响分析和优化建议
 */

import { MutationPhase } from './mutationPhaseManager';

export interface ExecutionTrace {
  step: number;
  action: string;
  result: 'success' | 'failure';
  details: string;
  timestamp: Date;
}

export interface FailureAnalysis {
  category: 'syntax' | 'logic' | 'runtime' | 'integration' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rootCause: string;
  affectedComponents: string[];
  suggestedFix: string;
}

export interface ImpactAnalysis {
  performanceImpact: number; // -100 到 100，负数表示性能下降
  stabilityRisk: number; // 0-100，稳定性风险
  compatibilityIssues: string[];
  affectedSystems: string[];
  estimatedRecoveryTime: number; // 毫秒
  potentialSideEffects: string[];
}

export interface LearningPoint {
  category: 'success_pattern' | 'failure_pattern' | 'best_practice' | 'anti_pattern';
  description: string;
  confidence: number; // 0-100
  applicableScenarios: string[];
  relatedModifications: string[];
}

export interface SimulationReport {
  reportId: string;
  proposalId: string;
  phase: MutationPhase;
  timestamp: Date;

  // 模拟结果
  simulationSuccess: boolean;
  executionTrace: ExecutionTrace[];
  totalExecutionTime: number; // 毫秒

  // 失败分析
  failures: FailureAnalysis[];
  failureCount: number;
  failureRate: number; // 0-1

  // 影响分析
  impactAnalysis: ImpactAnalysis;

  // 学习和建议
  learningPoints: LearningPoint[];
  optimizationSuggestions: string[];
  nextStepRecommendations: string[];

  // 质量评分
  qualityScore: number; // 0-100
  recommendedAction: 'approve' | 'revise' | 'reject';
}

export class SimulationReportGenerator {
  private reportHistory: SimulationReport[] = [];

  /**
   * 生成模拟修改报告
   */
  async generateSimulationReport(
    proposalId: string,
    phase: MutationPhase,
    simulationData: {
      success: boolean;
      executionTrace: ExecutionTrace[];
      failures?: FailureAnalysis[];
      impactAnalysis: ImpactAnalysis;
      executionTime: number;
    }
  ): Promise<SimulationReport> {
    const reportId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 分析失败原因
    const failures = simulationData.failures || [];
    const failureRate = failures.length > 0 ? 1 : 0;

    // 生成学习点
    const learningPoints = this.generateLearningPoints(
      simulationData.success,
      failures,
      simulationData.impactAnalysis
    );

    // 生成优化建议
    const optimizationSuggestions = this.generateOptimizationSuggestions(
      failures,
      simulationData.impactAnalysis
    );

    // 生成后续建议
    const nextStepRecommendations = this.generateNextStepRecommendations(
      simulationData.success,
      failures,
      phase
    );

    // 计算质量评分
    const qualityScore = this.calculateQualityScore(
      simulationData.success,
      failures,
      simulationData.impactAnalysis
    );

    // 推荐行动
    const recommendedAction = this.recommendAction(qualityScore, phase);

    const report: SimulationReport = {
      reportId,
      proposalId,
      phase,
      timestamp: new Date(),
      simulationSuccess: simulationData.success,
      executionTrace: simulationData.executionTrace,
      totalExecutionTime: simulationData.executionTime,
      failures,
      failureCount: failures.length,
      failureRate,
      impactAnalysis: simulationData.impactAnalysis,
      learningPoints,
      optimizationSuggestions,
      nextStepRecommendations,
      qualityScore,
      recommendedAction
    };

    this.reportHistory.push(report);
    return report;
  }

  /**
   * 生成学习点
   */
  private generateLearningPoints(
    success: boolean,
    failures: FailureAnalysis[],
    impactAnalysis: ImpactAnalysis
  ): LearningPoint[] {
    const points: LearningPoint[] = [];

    if (success) {
      // 成功的修改
      points.push({
        category: 'success_pattern',
        description: '这个修改成功地改进了系统，没有引入新的问题',
        confidence: 95,
        applicableScenarios: ['类似的优化修改', '相同的代码模式'],
        relatedModifications: []
      });

      if (impactAnalysis.performanceImpact > 0) {
        points.push({
          category: 'best_practice',
          description: `这个修改提升了性能 ${impactAnalysis.performanceImpact}%，可以作为最佳实践参考`,
          confidence: 90,
          applicableScenarios: ['性能优化', '相似的代码结构'],
          relatedModifications: []
        });
      }
    } else {
      // 失败的修改
      for (const failure of failures) {
        points.push({
          category: 'failure_pattern',
          description: `${failure.category} 类型的错误：${failure.description}`,
          confidence: 85,
          applicableScenarios: [failure.category, ...failure.affectedComponents],
          relatedModifications: []
        });

        points.push({
          category: 'anti_pattern',
          description: `避免这种模式：${failure.rootCause}`,
          confidence: 80,
          applicableScenarios: ['代码审查', '修改提案评估'],
          relatedModifications: []
        });
      }
    }

    // 稳定性相关的学习点
    if (impactAnalysis.stabilityRisk > 50) {
      points.push({
        category: 'anti_pattern',
        description: '这个修改引入了高稳定性风险，应该避免或进行更多的测试',
        confidence: 90,
        applicableScenarios: ['高风险修改', '系统关键路径'],
        relatedModifications: []
      });
    }

    return points;
  }

  /**
   * 生成优化建议
   */
  private generateOptimizationSuggestions(
    failures: FailureAnalysis[],
    impactAnalysis: ImpactAnalysis
  ): string[] {
    const suggestions: string[] = [];

    // 基于失败类型的建议
    for (const failure of failures) {
      suggestions.push(`修复 ${failure.category} 错误：${failure.suggestedFix}`);
    }

    // 基于影响分析的建议
    if (impactAnalysis.performanceImpact < -10) {
      suggestions.push('性能下降超过 10%，建议优化算法或数据结构');
    }

    if (impactAnalysis.stabilityRisk > 70) {
      suggestions.push('稳定性风险很高，建议添加更多的错误处理和边界检查');
    }

    if (impactAnalysis.compatibilityIssues.length > 0) {
      suggestions.push(`解决兼容性问题：${impactAnalysis.compatibilityIssues.join('、')}`);
    }

    if (impactAnalysis.potentialSideEffects.length > 0) {
      suggestions.push(`注意潜在的副作用：${impactAnalysis.potentialSideEffects.join('、')}`);
    }

    return suggestions;
  }

  /**
   * 生成后续建议
   */
  private generateNextStepRecommendations(
    success: boolean,
    failures: FailureAnalysis[],
    phase: MutationPhase
  ): string[] {
    const recommendations: string[] = [];

    if (success) {
      recommendations.push('这个修改可以被批准并执行');
      recommendations.push('记录这个成功的模式以供未来参考');
      recommendations.push('考虑将这个优化应用到其他相似的代码');
    } else {
      if (failures.some((f) => f.severity === 'critical')) {
        recommendations.push('这个修改包含严重错误，建议完全重新设计');
      } else if (failures.some((f) => f.severity === 'high')) {
        recommendations.push('这个修改需要进行重大修改才能使用');
      } else {
        recommendations.push('这个修改可以通过小的调整来修复');
      }

      recommendations.push('分析失败原因并学习相关的最佳实践');
    }

    // 基于阶段的建议
    if (phase === 'proposal_only') {
      recommendations.push('继续在 proposal_only 阶段积累学习点和成功率');
      recommendations.push('目标：成功率 70% 以上，学习点 100 以上');
    }

    return recommendations;
  }

  /**
   * 计算质量评分
   */
  private calculateQualityScore(
    success: boolean,
    failures: FailureAnalysis[],
    impactAnalysis: ImpactAnalysis
  ): number {
    let score = 50; // 基础分

    if (success) {
      score += 30; // 成功的修改加 30 分
    } else {
      score -= 30; // 失败的修改减 30 分
    }

    // 基于失败数量和严重程度
    for (const failure of failures) {
      const severityPenalty = {
        low: 5,
        medium: 10,
        high: 20,
        critical: 30
      };
      score -= severityPenalty[failure.severity] || 0;
    }

    // 基于性能影响
    score += Math.min(impactAnalysis.performanceImpact / 2, 10); // 最多加 10 分

    // 基于稳定性风险
    score -= Math.min(impactAnalysis.stabilityRisk / 5, 20); // 最多减 20 分

    // 基于兼容性问题
    score -= impactAnalysis.compatibilityIssues.length * 5;

    // 基于潜在副作用
    score -= impactAnalysis.potentialSideEffects.length * 3;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 推荐行动
   */
  private recommendAction(qualityScore: number, phase: MutationPhase): 'approve' | 'revise' | 'reject' {
    if (qualityScore >= 80) {
      return 'approve';
    } else if (qualityScore >= 50) {
      return 'revise';
    } else {
      return 'reject';
    }
  }

  /**
   * 获取报告历史
   */
  getReportHistory(): SimulationReport[] {
    return [...this.reportHistory];
  }

  /**
   * 获取特定提案的报告
   */
  getReportByProposalId(proposalId: string): SimulationReport | undefined {
    return this.reportHistory.find((r) => r.proposalId === proposalId);
  }

  /**
   * 生成学习总结
   */
  generateLearningSummary(): {
    totalReports: number;
    successRate: number;
    averageQualityScore: number;
    topLearningPoints: LearningPoint[];
    commonFailurePatterns: string[];
    successPatterns: string[];
  } {
    if (this.reportHistory.length === 0) {
      return {
        totalReports: 0,
        successRate: 0,
        averageQualityScore: 0,
        topLearningPoints: [],
        commonFailurePatterns: [],
        successPatterns: []
      };
    }

    const successCount = this.reportHistory.filter((r) => r.simulationSuccess).length;
    const successRate = successCount / this.reportHistory.length;
    const averageQualityScore =
      this.reportHistory.reduce((sum, r) => sum + r.qualityScore, 0) / this.reportHistory.length;

    // 收集所有学习点
    const allLearningPoints = this.reportHistory.flatMap((r) => r.learningPoints);
    const topLearningPoints = allLearningPoints
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    // 收集失败模式
    const failurePatterns = allLearningPoints
      .filter((p) => p.category === 'failure_pattern')
      .map((p) => p.description);
    const commonFailurePatterns = [...new Set(failurePatterns)].slice(0, 5);

    // 收集成功模式
    const successPatterns = allLearningPoints
      .filter((p) => p.category === 'success_pattern')
      .map((p) => p.description);

    return {
      totalReports: this.reportHistory.length,
      successRate: Math.round(successRate * 100) / 100,
      averageQualityScore: Math.round(averageQualityScore * 10) / 10,
      topLearningPoints,
      commonFailurePatterns,
      successPatterns
    };
  }

  /**
   * 生成详细的文本报告
   */
  generateTextReport(report: SimulationReport): string {
    return `
=== 模拟修改报告 ===

报告 ID: ${report.reportId}
提案 ID: ${report.proposalId}
阶段: ${report.phase}
时间: ${report.timestamp.toISOString()}

模拟结果:
- 成功: ${report.simulationSuccess ? '是' : '否'}
- 执行时间: ${report.totalExecutionTime}ms
- 失败数: ${report.failureCount}
- 失败率: ${(report.failureRate * 100).toFixed(1)}%

失败分析:
${
  report.failures.length > 0
    ? report.failures
        .map(
          (f) =>
            `- [${f.severity.toUpperCase()}] ${f.category}: ${f.description}
  根本原因: ${f.rootCause}
  建议修复: ${f.suggestedFix}`
        )
        .join('\n')
    : '无失败'
}

影响分析:
- 性能影响: ${report.impactAnalysis.performanceImpact > 0 ? '+' : ''}${report.impactAnalysis.performanceImpact}%
- 稳定性风险: ${report.impactAnalysis.stabilityRisk}/100
- 兼容性问题: ${report.impactAnalysis.compatibilityIssues.join('、') || '无'}
- 潜在副作用: ${report.impactAnalysis.potentialSideEffects.join('、') || '无'}

学习点:
${report.learningPoints.map((p) => `- [${p.category}] ${p.description} (置信度: ${p.confidence}%)`).join('\n')}

优化建议:
${report.optimizationSuggestions.map((s) => `- ${s}`).join('\n')}

后续建议:
${report.nextStepRecommendations.map((r) => `- ${r}`).join('\n')}

质量评分: ${report.qualityScore}/100
推荐行动: ${report.recommendedAction.toUpperCase()}
`;
  }
}

// 导出单例
let _instance: SimulationReportGenerator | null = null;

export function getSimulationReportGenerator(): SimulationReportGenerator {
  if (!_instance) {
    _instance = new SimulationReportGenerator();
  }
  return _instance;
}
