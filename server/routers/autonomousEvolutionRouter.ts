import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import { getAutonomousEvolutionLoop } from '../evolution/autonomousEvolutionLoop';
import { z } from 'zod';

/**
 * 自主进化循环 tRPC 路由
 * 
 * 提供完整的自主进化系统 API：
 * - 启动/停止进化循环
 * - 查询进化状态和历史
 * - 生成进化报告
 * - 配置进化参数
 */

export const autonomousEvolutionRouter = router({
  /**
   * 启动自主进化循环
   */
  start: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      await loop.start();

      return {
        success: true,
        message: '自主进化循环已启动',
      };
    } catch (error) {
      return {
        success: false,
        message: `启动失败: ${String(error)}`,
      };
    }
  }),

  /**
   * 停止自主进化循环
   */
  stop: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      loop.stop();

      return {
        success: true,
        message: '自主进化循环已停止',
      };
    } catch (error) {
      return {
        success: false,
        message: `停止失败: ${String(error)}`,
      };
    }
  }),

  /**
   * 获取进化循环状态
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      const history = loop.getEvolutionHistory();

      const completedCycles = history.filter((c) => c.status === 'completed').length;
      const failedCycles = history.filter((c) => c.status === 'failed').length;
      const totalGoals = history.reduce((sum, c) => sum + c.goals.length, 0);
      const totalRecommendations = history.reduce((sum, c) => sum + c.architectureRecommendations.length, 0);

      return {
        isRunning: loop['isRunning'],
        cycleCount: history.length,
        completedCycles,
        failedCycles,
        successRate: history.length > 0 ? (completedCycles / history.length) * 100 : 0,
        totalGoals,
        totalRecommendations,
        lastCycle: history.length > 0 ? history[history.length - 1] : null,
      };
    } catch (error) {
      return {
        isRunning: false,
        cycleCount: 0,
        completedCycles: 0,
        failedCycles: 0,
        successRate: 0,
        totalGoals: 0,
        totalRecommendations: 0,
        lastCycle: null,
        error: String(error),
      };
    }
  }),

  /**
   * 获取进化历史
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().default(20),
        offset: z.number().int().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
        const history = loop.getEvolutionHistory();

        const sliced = history.slice(input.offset, input.offset + input.limit);
        return {
          total: history.length,
          items: sliced.reverse(), // 最新的在前
        };
      } catch (error) {
        return {
          total: 0,
          items: [],
          error: String(error),
        };
      }
    }),

  /**
   * 获取进化报告
   */
  getReport: protectedProcedure.query(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      const report = await loop.generateEvolutionReport();

      return {
        success: true,
        report,
      };
    } catch (error) {
      return {
        success: false,
        report: `报告生成失败: ${String(error)}`,
      };
    }
  }),

  /**
   * 获取进化配置
   */
  getConfig: adminProcedure.query(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      const config = loop['config'];

      return {
        cycleInterval: config.cycleInterval,
        enableGoalGeneration: config.enableGoalGeneration,
        enableArchitectureModification: config.enableArchitectureModification,
        enableModelTraining: config.enableModelTraining,
        enableDeployment: config.enableDeployment,
        maxConcurrentTasks: config.maxConcurrentTasks,
      };
    } catch (error) {
      return {
        error: String(error),
      };
    }
  }),

  /**
   * 更新进化配置
   */
  updateConfig: adminProcedure
    .input(
      z.object({
        cycleInterval: z.number().optional(),
        enableGoalGeneration: z.boolean().optional(),
        enableArchitectureModification: z.boolean().optional(),
        enableModelTraining: z.boolean().optional(),
        enableDeployment: z.boolean().optional(),
        maxConcurrentTasks: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
        const config = loop['config'];

        // 更新配置
        if (input.cycleInterval !== undefined) config.cycleInterval = input.cycleInterval;
        if (input.enableGoalGeneration !== undefined) config.enableGoalGeneration = input.enableGoalGeneration;
        if (input.enableArchitectureModification !== undefined)
          config.enableArchitectureModification = input.enableArchitectureModification;
        if (input.enableModelTraining !== undefined) config.enableModelTraining = input.enableModelTraining;
        if (input.enableDeployment !== undefined) config.enableDeployment = input.enableDeployment;
        if (input.maxConcurrentTasks !== undefined) config.maxConcurrentTasks = input.maxConcurrentTasks;

        return {
          success: true,
          message: '配置已更新',
          config,
        };
      } catch (error) {
        return {
          success: false,
          message: `更新失败: ${String(error)}`,
        };
      }
    }),

  /**
   * 运行单个进化周期
   */
  runCycle: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      // 手动触发一个周期
      const result = await loop['runCycle']();

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: `周期运行失败: ${String(error)}`,
      };
    }
  }),

  /**
   * 获取进化统计
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const loop = await getAutonomousEvolutionLoop(String(ctx.user.id));
      const history = loop.getEvolutionHistory();

      const stats = {
        totalCycles: history.length,
        completedCycles: history.filter((c) => c.status === 'completed').length,
        failedCycles: history.filter((c) => c.status === 'failed').length,
        partialCycles: history.filter((c) => c.status === 'partial').length,
        totalGoals: history.reduce((sum, c) => sum + c.goals.length, 0),
        totalRecommendations: history.reduce((sum, c) => sum + c.architectureRecommendations.length, 0),
        successfulTrainings: history.filter((c) => c.trainingResult).length,
        successfulDeployments: history.filter((c) => c.deploymentResult?.status === 'completed').length,
        averageErrorsPerCycle: history.length > 0 ? history.reduce((sum, c) => sum + c.errors.length, 0) / history.length : 0,
      };

      return stats;
    } catch (error) {
      return {
        error: String(error),
      };
    }
  }),
});
