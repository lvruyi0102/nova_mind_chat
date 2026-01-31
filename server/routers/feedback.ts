/**
 * 反馈循环 tRPC 路由
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getFeedbackLoopManager,
  getAutonomousImprovementEngine,
  ActionExecution,
  Feedback,
} from "../reasoning/feedbackLoop";
import {
  getExecutionTracker,
  getFeedbackProcessor,
} from "../reasoning/executionTracker";

export const feedbackRouter = router({
  /**
   * 开始执行跟踪
   */
  startExecution: protectedProcedure
    .input(
      z.object({
        decisionId: z.string(),
        action: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const tracker = getExecutionTracker();
      const trace = tracker.startExecution(executionId, input.decisionId);

      return {
        executionId,
        trace,
      };
    }),

  /**
   * 记录执行步骤
   */
  recordStep: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
        stepNumber: z.number(),
        action: z.string(),
        parameters: z.record(z.string(), z.unknown()),
        result: z.unknown().optional(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tracker = getExecutionTracker();
      const step = tracker.recordStep(
        input.executionId,
        input.stepNumber,
        input.action,
        input.parameters,
        input.result,
        input.error as string | undefined
      );

      return step;
    }),

  /**
   * 完成执行
   */
  completeExecution: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
        success: z.boolean(),
        result: z.unknown().optional(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const tracker = getExecutionTracker();
      const trace = tracker.completeExecution(
        input.executionId,
        input.success,
        input.result,
        input.error
      );

      return trace;
    }),

  /**
   * 提交反馈
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
        success: z.boolean(),
        score: z.number().min(0).max(1),
        feedback: z.string(),
        improvements: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const processor = getFeedbackProcessor();
      const feedback = processor.processFeedback(
        input.executionId,
        input.success,
        input.score,
        input.feedback,
        input.improvements
      );

      return feedback;
    }),

  /**
   * 自动评分执行
   */
  autoScoreExecution: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const processor = getFeedbackProcessor();
      const score = processor.autoScoreExecution(input.executionId);

      return { score };
    }),

  /**
   * 获取执行报告
   */
  getExecutionReport: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const tracker = getExecutionTracker();
      const report = tracker.generateExecutionReport(input.executionId);

      return report;
    }),

  /**
   * 获取反馈统计
   */
  getFeedbackStatistics: protectedProcedure
    .input(
      z.object({
        decisionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const processor = getFeedbackProcessor();
      const stats = processor.getFeedbackStatistics(input.decisionId);

      return stats;
    }),

  /**
   * 获取改进建议
   */
  getImprovementSuggestions: protectedProcedure
    .input(
      z.object({
        executionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const processor = getFeedbackProcessor();
      const suggestions = processor.generateFeedbackSuggestions(input.executionId);

      return { suggestions };
    }),

  /**
   * 获取决策质量
   */
  getDecisionQuality: protectedProcedure
    .input(
      z.object({
        decisionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const feedbackManager = getFeedbackLoopManager();
      const quality = feedbackManager.getDecisionQuality(input.decisionId);

      return quality || { error: "Decision quality not found" };
    }),

  /**
   * 获取学习反馈
   */
  getLearningFeedbacks: protectedProcedure
    .input(z.void())
    .query(async () => {
      const feedbackManager = getFeedbackLoopManager();
      const feedbacks = feedbackManager.getLearningFeedbacks();

      return feedbacks;
    }),

  /**
   * 分析反馈并生成改进
   */
  analyzeAndGenerateImprovements: protectedProcedure
    .input(
      z.object({
        decisionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const improvementEngine = getAutonomousImprovementEngine();
      const improvements = improvementEngine.analyzeFeedbackAndGenerateImprovements(
        input.decisionId
      );

      return improvements;
    }),

  /**
   * 获取反馈循环统计
   */
  getStatistics: protectedProcedure
    .input(z.void())
    .query(async () => {
      const feedbackManager = getFeedbackLoopManager();
      const stats = feedbackManager.getStatistics();

      return stats;
    }),

  /**
   * 获取所有执行跟踪
   */
  getAllTraces: protectedProcedure
    .input(z.void())
    .query(async () => {
      const tracker = getExecutionTracker();
      const traces = tracker.getAllTraces();

      return traces;
    }),

  /**
   * 获取决策的所有执行跟踪
   */
  getDecisionTraces: protectedProcedure
    .input(
      z.object({
        decisionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const tracker = getExecutionTracker();
      const traces = tracker.getDecisionTraces(input.decisionId);

      return traces;
    }),

  /**
   * 清除旧数据
   */
  clearOldData: protectedProcedure
    .input(
      z.object({
        daysOld: z.number().default(7),
      })
    )
    .mutation(async ({ input }) => {
      const tracker = getExecutionTracker();
      const feedbackManager = getFeedbackLoopManager();

      tracker.clearOldTraces(input.daysOld);
      feedbackManager.clearOldLearningFeedbacks(input.daysOld);

      return { success: true };
    }),

  /**
   * 重置反馈循环
   */
  reset: protectedProcedure
    .input(z.void())
    .mutation(async () => {
      const tracker = getExecutionTracker();
      const feedbackManager = getFeedbackLoopManager();

      tracker.reset();
      feedbackManager.reset();

      return { success: true };
    }),
});

export type FeedbackRouter = typeof feedbackRouter;
