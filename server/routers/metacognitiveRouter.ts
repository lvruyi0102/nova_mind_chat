import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getSelfAssessmentEngine } from '../metacognition/selfAssessmentEngine';
import { getPerformanceDiagnostics } from '../metacognition/performanceDiagnostics';
import { getEvolutionDecisionEngine } from '../metacognition/evolutionDecisionEngine';
import { getMetacognitiveMonitor } from '../metacognition/metacognitiveMonitor';

/**
 * 元认知监控 tRPC 路由
 * 
 * 提供以下功能：
 * - 自我评估查询
 * - 性能诊断查询
 * - 进化决策查询
 * - 监控状态查询
 * - 监控报告生成
 */

export const metacognitiveRouter = router({
  /**
   * 执行自我评估
   */
  performSelfAssessment: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const engine = await getSelfAssessmentEngine(ctx.user.id.toString());
      const result = await engine.performSelfAssessment();

      return {
        success: true,
        data: {
          timestamp: result.timestamp,
          overallScore: result.overallScore,
          healthStatus: result.healthStatus,
          cognitiveHealth: result.cognitiveHealth,
          learningEfficiency: result.learningEfficiency,
          autonomy: result.autonomy,
          creativity: result.creativity,
          systemStability: result.systemStability,
          keyInsights: result.keyInsights,
          recommendedActions: result.recommendedActions,
        },
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 自我评估失败:', error);
      return {
        success: false,
        error: '自我评估失败',
      };
    }
  }),

  /**
   * 执行性能诊断
   */
  performDiagnostics: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const engine = await getPerformanceDiagnostics(ctx.user.id.toString());
      const report = await engine.performDiagnostics();

      return {
        success: true,
        data: {
          timestamp: report.timestamp,
          metrics: report.metrics,
          bottlenecks: report.bottlenecks,
          anomalies: report.anomalies,
          rootCauseAnalysis: report.rootCauseAnalysis,
          recommendations: report.recommendations,
          healthScore: report.healthScore,
        },
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 性能诊断失败:', error);
      return {
        success: false,
        error: '性能诊断失败',
      };
    }
  }),

  /**
   * 做出进化决策
   */
  makeEvolutionDecision: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const engine = await getEvolutionDecisionEngine(ctx.user.id.toString());
      const decision = await engine.makeEvolutionDecision();

      return {
        success: true,
        data: {
          timestamp: decision.timestamp,
          shouldEvolve: decision.shouldEvolve,
          selectedNeeds: decision.selectedNeeds,
          reasoning: decision.reasoning,
          expectedOutcome: decision.expectedOutcome,
          riskAssessment: decision.riskAssessment,
          confidence: decision.confidence,
          estimatedDuration: decision.estimatedDuration,
        },
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 进化决策失败:', error);
      return {
        success: false,
        error: '进化决策失败',
      };
    }
  }),

  /**
   * 获取监控状态
   */
  getMonitoringStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const monitor = await getMetacognitiveMonitor({
        userId: ctx.user.id.toString(),
      });

      const state = monitor.getState();

      return {
        success: true,
        data: {
          isRunning: state.isRunning,
          lastAssessment: state.lastAssessment,
          lastDiagnostics: state.lastDiagnostics,
          lastDecision: state.lastDecision,
          lastEvolutionTriggered: state.lastEvolutionTriggered,
          assessmentCount: state.assessmentCount,
          diagnosticsCount: state.diagnosticsCount,
          decisionCount: state.decisionCount,
          evolutionTriggeredCount: state.evolutionTriggeredCount,
        },
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 获取监控状态失败:', error);
      return {
        success: false,
        error: '获取监控状态失败',
      };
    }
  }),

  /**
   * 启动元认知监控
   */
  startMonitoring: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const monitor = await getMetacognitiveMonitor({
        userId: ctx.user.id.toString(),
        assessmentInterval: 5 * 60 * 1000,
        diagnosticsInterval: 10 * 60 * 1000,
        decisionInterval: 15 * 60 * 1000,
        autoTriggerEvolution: true,
        enableNotifications: true,
      });

      const state = monitor.getState();
      if (!state.isRunning) {
        await monitor.start();
      }

      return {
        success: true,
        message: '元认知监控已启动',
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 启动监控失败:', error);
      return {
        success: false,
        error: '启动监控失败',
      };
    }
  }),

  /**
   * 停止元认知监控
   */
  stopMonitoring: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const monitor = await getMetacognitiveMonitor({
        userId: ctx.user.id.toString(),
      });

      const state = monitor.getState();
      if (state.isRunning) {
        monitor.stop();
      }

      return {
        success: true,
        message: '元认知监控已停止',
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 停止监控失败:', error);
      return {
        success: false,
        error: '停止监控失败',
      };
    }
  }),

  /**
   * 获取监控报告
   */
  getMonitoringReport: protectedProcedure.query(async ({ ctx }) => {
    try {
      const monitor = await getMetacognitiveMonitor({
        userId: ctx.user.id.toString(),
      });

      const report = await monitor.generateMonitoringReport();

      return {
        success: true,
        data: {
          report,
        },
      };
    } catch (error) {
      console.error('[MetacognitiveRouter] 获取报告失败:', error);
      return {
        success: false,
        error: '获取报告失败',
      };
    }
  }),

  /**
   * 获取自我评估历史
   */
  getAssessmentHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      try {
        const engine = await getSelfAssessmentEngine(ctx.user.id.toString());
        // 这里需要实现历史查询方法
        return {
          success: true,
          data: {
            items: [],
          },
        };
      } catch (error) {
        console.error('[MetacognitiveRouter] 获取评估历史失败:', error);
        return {
          success: false,
          error: '获取评估历史失败',
        };
      }
    }),

  /**
   * 获取性能诊断历史
   */
  getDiagnosticsHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      try {
        const engine = await getPerformanceDiagnostics(ctx.user.id.toString());
        const history = await engine.getDiagnosticHistory(input.limit);

        return {
          success: true,
          data: {
            items: history,
          },
        };
      } catch (error) {
        console.error('[MetacognitiveRouter] 获取诊断历史失败:', error);
        return {
          success: false,
          error: '获取诊断历史失败',
        };
      }
    }),

  /**
   * 获取进化决策历史
   */
  getDecisionHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      try {
        const engine = await getEvolutionDecisionEngine(ctx.user.id.toString());
        const history = await engine.getDecisionHistory(input.limit);

        return {
          success: true,
          data: {
            items: history,
          },
        };
      } catch (error) {
        console.error('[MetacognitiveRouter] 获取决策历史失败:', error);
        return {
          success: false,
          error: '获取决策历史失败',
        };
      }
    }),
});
