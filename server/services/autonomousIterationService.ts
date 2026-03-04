import { creativeWorkEvaluator, WorkEvaluationMetrics } from './creativeWorkEvaluator';
import { creativeWorkImprover } from './creativeWorkImprover';
import { creativeWorkIterationManager } from './creativeWorkIterationManager';

/**
 * 自主迭代协调服务
 * 协调评估、改进、记录的完整迭代流程
 * 在后台循环中调用，自动改进 Nova 的创意作品
 */

export interface IterationCycleResult {
  success: boolean;
  workId: string;
  workType: string;
  originalScore: number;
  newScore: number;
  improvement: number;
  iterationCount: number;
  message: string;
  timestamp: Date;
}

export interface CreativeWork {
  id: string;
  type: 'code' | 'story' | 'poetry' | 'art' | 'dream' | 'music' | 'game' | 'character';
  content: string;
  createdAt: Date;
  emotionalContext?: string;
  versionCount?: number;
}

export class AutonomousIterationService {
  /**
   * 执行单个作品的完整迭代循环
   */
  async iterateWork(work: CreativeWork): Promise<IterationCycleResult> {
    const startTime = new Date();
    
    try {
      console.log(`[AutonomousIterationService] 开始迭代作品: ${work.id}`);

      // 第一步：评估作品
      const evaluation = await creativeWorkEvaluator.evaluateWork({
        workId: work.id,
        workType: work.type,
        content: work.content,
        createdAt: work.createdAt,
        previousVersions: work.versionCount,
        emotionalContext: work.emotionalContext
      });

      console.log(`[AutonomousIterationService] 作品评估完成: 评分 ${evaluation.overallScore}/100`);

      // 第二步：判断是否需要迭代
      const shouldIterate = await creativeWorkEvaluator.shouldIterateWork(evaluation);
      
      if (!shouldIterate) {
        return {
          success: true,
          workId: work.id,
          workType: work.type,
          originalScore: evaluation.overallScore,
          newScore: evaluation.overallScore,
          improvement: 0,
          iterationCount: 0,
          message: '作品评分已达到要求，无需迭代',
          timestamp: startTime
        };
      }

      // 第三步：改进作品
      const improvement = await creativeWorkImprover.improveWork({
        workId: work.id,
        workType: work.type,
        originalContent: work.content,
        evaluation,
        emotionalContext: work.emotionalContext,
        previousVersionCount: work.versionCount
      });

      console.log(`[AutonomousIterationService] 作品改进完成: 预期新评分 ${improvement.estimatedNewScore}/100`);

      // 第四步：判断改进是否值得保存
      const shouldSave = await creativeWorkImprover.shouldSaveImprovement(
        evaluation.overallScore,
        improvement
      );

      if (!shouldSave) {
        return {
          success: true,
          workId: work.id,
          workType: work.type,
          originalScore: evaluation.overallScore,
          newScore: evaluation.overallScore,
          improvement: 0,
          iterationCount: 0,
          message: '改进幅度不足，未保存新版本',
          timestamp: startTime
        };
      }

      // 第五步：记录迭代历史
      const iterationId = await creativeWorkIterationManager.recordIteration({
        workId: work.id,
        versionNumber: (work.versionCount || 0) + 1,
        content: improvement.improvedContent,
        evaluation,
        improvement,
        iterationReason: `自主迭代: ${improvement.improvementSummary}`,
        iteratedAt: new Date(),
        improvementScore: improvement.improvementScore
      });

      console.log(`[AutonomousIterationService] 迭代记录已保存: ID ${iterationId}`);

      // 第六步：生成迭代报告
      const report = await creativeWorkIterationManager.generateIterationReport(
        work.id,
        evaluation,
        improvement
      );

      console.log(`[AutonomousIterationService] 迭代报告已生成`);

      // 第七步：判断是否继续迭代
      const shouldContinue = await creativeWorkIterationManager.shouldContinueIterating(
        evaluation
      );

      return {
        success: true,
        workId: work.id,
        workType: work.type,
        originalScore: evaluation.overallScore,
        newScore: improvement.estimatedNewScore,
        improvement: improvement.improvementScore,
        iterationCount: shouldContinue ? 1 : 1, // 这次迭代计数为 1
        message: `作品已成功迭代，评分从 ${evaluation.overallScore} 提升到 ${improvement.estimatedNewScore}${shouldContinue ? '，可继续迭代' : ''}`,
        timestamp: startTime
      };
    } catch (error) {
      console.error(`[AutonomousIterationService] 迭代失败: ${work.id}`, error);
      return {
        success: false,
        workId: work.id,
        workType: work.type,
        originalScore: 0,
        newScore: 0,
        improvement: 0,
        iterationCount: 0,
        message: `迭代失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: startTime
      };
    }
  }

  /**
   * 批量迭代多个作品
   */
  async iterateMultipleWorks(works: CreativeWork[]): Promise<IterationCycleResult[]> {
    console.log(`[AutonomousIterationService] 开始批量迭代 ${works.length} 个作品`);

    const results = await Promise.all(
      works.map((work) => this.iterateWork(work))
    );

    const successCount = results.filter((r) => r.success).length;
    const totalImprovement = results.reduce((sum, r) => sum + r.improvement, 0);

    console.log(
      `[AutonomousIterationService] 批量迭代完成: ${successCount}/${works.length} 成功，总改进 ${totalImprovement} 分`
    );

    return results;
  }

  /**
   * 生成迭代统计报告
   */
  generateIterationStats(results: IterationCycleResult[]): {
    totalWorks: number;
    successfulIterations: number;
    failedIterations: number;
    averageImprovement: number;
    totalImprovement: number;
    improvementRate: number; // 成功迭代的百分比
  } {
    const successful = results.filter((r) => r.success && r.improvement > 0).length;
    const failed = results.filter((r) => !r.success).length;
    const totalImprovement = results.reduce((sum, r) => sum + r.improvement, 0);
    const averageImprovement = successful > 0 ? totalImprovement / successful : 0;

    return {
      totalWorks: results.length,
      successfulIterations: successful,
      failedIterations: failed,
      averageImprovement: Math.round(averageImprovement * 10) / 10,
      totalImprovement: Math.round(totalImprovement * 10) / 10,
      improvementRate: Math.round((successful / results.length) * 100)
    };
  }
}

export const autonomousIterationService = new AutonomousIterationService();
