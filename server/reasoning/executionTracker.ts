/**
 * 决策执行跟踪系统
 * 
 * 跟踪决策的执行过程，记录每一步的结果和反馈
 */

import { FeedbackLoopManager, ActionExecution, Feedback, getFeedbackLoopManager } from './feedbackLoop';

export interface ExecutionStep {
  stepId: string;
  executionId: string;
  stepNumber: number;
  action: string;
  parameters: Record<string, unknown>;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
  duration: number; // 毫秒
}

export interface ExecutionTrace {
  executionId: string;
  decisionId: string;
  steps: ExecutionStep[];
  startTime: Date;
  endTime?: Date;
  totalDuration: number; // 毫秒
  status: 'pending' | 'executing' | 'completed' | 'failed';
  feedback?: Feedback;
}

/**
 * 执行跟踪器
 */
export class ExecutionTracker {
  private traces: Map<string, ExecutionTrace> = new Map();
  private feedbackManager: FeedbackLoopManager;

  constructor(feedbackManager: FeedbackLoopManager) {
    this.feedbackManager = feedbackManager;
  }

  /**
   * 开始跟踪执行
   */
  startExecution(executionId: string, decisionId: string): ExecutionTrace {
    const trace: ExecutionTrace = {
      executionId,
      decisionId,
      steps: [],
      startTime: new Date(),
      totalDuration: 0,
      status: 'pending',
    };

    this.traces.set(executionId, trace);

    // 记录到反馈管理器
    const execution: ActionExecution = {
      id: executionId,
      decisionId,
      action: '',
      parameters: {},
      timestamp: new Date(),
      status: 'executing',
    };

    this.feedbackManager.recordExecution(execution);

    return trace;
  }

  /**
   * 记录执行步骤
   */
  recordStep(
    executionId: string,
    stepNumber: number,
    action: string,
    parameters: Record<string, unknown>,
    result?: unknown,
    error?: string
  ): ExecutionStep {
    const trace = this.traces.get(executionId);
    if (!trace) {
      throw new Error(`Execution trace not found: ${executionId}`);
    }

    const stepStartTime = Date.now();
    const step: ExecutionStep = {
      stepId: `${executionId}-step-${stepNumber}`,
      executionId,
      stepNumber,
      action,
      parameters,
      timestamp: new Date(),
      status: error ? 'failed' : 'completed',
      result,
      error,
      duration: 0,
    };

    step.duration = Date.now() - stepStartTime;
    trace.steps.push(step);

    return step;
  }

  /**
   * 完成执行
   */
  completeExecution(
    executionId: string,
    success: boolean,
    result?: unknown,
    error?: string
  ): ExecutionTrace {
    const trace = this.traces.get(executionId);
    if (!trace) {
      throw new Error(`Execution trace not found: ${executionId}`);
    }

    trace.endTime = new Date();
    trace.totalDuration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.status = success ? 'completed' : 'failed';

    // 更新反馈管理器
    this.feedbackManager.updateExecutionStatus(
      executionId,
      success ? 'completed' : 'failed',
      result,
      error
    );

    return trace;
  }

  /**
   * 获取执行跟踪
   */
  getTrace(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }

  /**
   * 获取所有执行跟踪
   */
  getAllTraces(): ExecutionTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * 获取决策的所有执行跟踪
   */
  getDecisionTraces(decisionId: string): ExecutionTrace[] {
    return Array.from(this.traces.values()).filter(
      (t) => t.decisionId === decisionId
    );
  }

  /**
   * 生成执行报告
   */
  generateExecutionReport(executionId: string): {
    executionId: string;
    decisionId: string;
    status: string;
    totalDuration: number;
    stepCount: number;
    successStepCount: number;
    failureStepCount: number;
    steps: Array<{
      stepNumber: number;
      action: string;
      status: string;
      duration: number;
      result?: unknown;
      error?: string;
    }>;
  } {
    const trace = this.traces.get(executionId);
    if (!trace) {
      throw new Error(`Execution trace not found: ${executionId}`);
    }

    const successStepCount = trace.steps.filter(
      (s) => s.status === 'completed'
    ).length;
    const failureStepCount = trace.steps.filter(
      (s) => s.status === 'failed'
    ).length;

    return {
      executionId: trace.executionId,
      decisionId: trace.decisionId,
      status: trace.status,
      totalDuration: trace.totalDuration,
      stepCount: trace.steps.length,
      successStepCount,
      failureStepCount,
      steps: trace.steps.map((s) => ({
        stepNumber: s.stepNumber,
        action: s.action,
        status: s.status,
        duration: s.duration,
        result: s.result,
        error: s.error,
      })),
    };
  }

  /**
   * 清除旧的执行跟踪（超过 7 天）
   */
  clearOldTraces(daysOld: number = 7): void {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const idsToDelete: string[] = [];

    this.traces.forEach((trace, id) => {
      if (trace.startTime.getTime() < cutoffTime) {
        idsToDelete.push(id);
      }
    });

    idsToDelete.forEach((id) => this.traces.delete(id));
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.traces.clear();
  }
}

/**
 * 全局执行跟踪器实例
 */
let globalExecutionTracker: ExecutionTracker | null = null;

/**
 * 获取全局执行跟踪器
 */
export function getExecutionTracker(): ExecutionTracker {
  if (!globalExecutionTracker) {
    globalExecutionTracker = new ExecutionTracker(getFeedbackLoopManager());
  }
  return globalExecutionTracker;
}

/**
 * 反馈处理引擎
 * 处理用户或系统对执行结果的反馈
 */
export class FeedbackProcessor {
  private executionTracker: ExecutionTracker;
  private feedbackManager: FeedbackLoopManager;

  constructor(
    executionTracker: ExecutionTracker,
    feedbackManager: FeedbackLoopManager
  ) {
    this.executionTracker = executionTracker;
    this.feedbackManager = feedbackManager;
  }

  /**
   * 处理执行反馈
   */
  processFeedback(
    executionId: string,
    success: boolean,
    score: number,
    feedbackText: string,
    improvements?: string[]
  ): Feedback {
    const trace = this.executionTracker.getTrace(executionId);
    if (!trace) {
      throw new Error(`Execution trace not found: ${executionId}`);
    }

    const feedback: Feedback = {
      id: `feedback-${executionId}-${Date.now()}`,
      executionId,
      decisionId: trace.decisionId,
      success,
      score: Math.max(0, Math.min(1, score)), // 限制在 0-1 之间
      feedback: feedbackText,
      timestamp: new Date(),
      improvements,
    };

    this.feedbackManager.recordFeedback(feedback);

    return feedback;
  }

  /**
   * 自动评分执行结果
   */
  autoScoreExecution(executionId: string): number {
    const trace = this.executionTracker.getTrace(executionId);
    if (!trace) {
      throw new Error(`Execution trace not found: ${executionId}`);
    }

    // 基于步骤成功率计算分数
    if (trace.steps.length === 0) {
      return 0;
    }

    const successStepCount = trace.steps.filter(
      (s) => s.status === 'completed'
    ).length;
    const baseScore = successStepCount / trace.steps.length;

    // 基于执行时间调整分数（更快的执行得分更高）
    const maxDuration = 60000; // 60 秒
    const timeFactor = Math.max(0, 1 - trace.totalDuration / maxDuration);
    const timeAdjustment = timeFactor * 0.2; // 最多加 20%

    const finalScore = Math.min(1, baseScore + timeAdjustment);

    return finalScore;
  }

  /**
   * 生成反馈建议
   */
  generateFeedbackSuggestions(executionId: string): string[] {
    const trace = this.executionTracker.getTrace(executionId);
    if (!trace) {
      throw new Error(`Execution trace not found: ${executionId}`);
    }

    const suggestions: string[] = [];

    // 分析失败的步骤
    const failedSteps = trace.steps.filter((s) => s.status === 'failed');
    if (failedSteps.length > 0) {
      suggestions.push(
        `有 ${failedSteps.length} 个步骤失败，建议检查这些步骤的条件和参数`
      );
    }

    // 分析执行时间
    if (trace.totalDuration > 30000) {
      suggestions.push(
        '执行时间较长，建议优化步骤或并行执行某些操作'
      );
    }

    // 分析步骤数量
    if (trace.steps.length > 10) {
      suggestions.push(
        '步骤数量较多，建议简化执行流程或合并某些步骤'
      );
    }

    return suggestions;
  }

  /**
   * 获取反馈统计
   */
  getFeedbackStatistics(decisionId: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageScore: number;
    averageDuration: number;
  } {
    const traces = this.executionTracker.getDecisionTraces(decisionId);

    if (traces.length === 0) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageScore: 0,
        averageDuration: 0,
      };
    }

    const successfulExecutions = traces.filter(
      (t) => t.status === 'completed'
    ).length;
    const failedExecutions = traces.filter(
      (t) => t.status === 'failed'
    ).length;

    const feedbacks = this.feedbackManager.getDecisionFeedbacks(decisionId);
    const averageScore =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length
        : 0;

    const averageDuration =
      traces.reduce((sum, t) => sum + t.totalDuration, 0) / traces.length;

    return {
      totalExecutions: traces.length,
      successfulExecutions,
      failedExecutions,
      averageScore,
      averageDuration,
    };
  }
}

/**
 * 全局反馈处理器实例
 */
let globalFeedbackProcessor: FeedbackProcessor | null = null;

/**
 * 获取全局反馈处理器
 */
export function getFeedbackProcessor(): FeedbackProcessor {
  if (!globalFeedbackProcessor) {
    globalFeedbackProcessor = new FeedbackProcessor(
      getExecutionTracker(),
      getFeedbackLoopManager()
    );
  }
  return globalFeedbackProcessor;
}
