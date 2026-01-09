/**
 * 成本预算 API 路由
 * 提供成本预算管理、告警配置和报告生成接口
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getCostBudgetManager } from "../services/costBudgetManager";
import { getAutoOptimizationManager } from "../services/autoOptimizationManager";

export const costBudgetRouter = router({
  /**
   * 获取预算状态
   */
  getBudgetStatus: protectedProcedure.query(({ ctx }) => {
    const budgetManager = getCostBudgetManager();
    const status = budgetManager.getBudgetStatus();

    return {
      success: true,
      data: status,
    };
  }),

  /**
   * 获取预算配置
   */
  getBudgetConfig: protectedProcedure.query(({ ctx }) => {
    const budgetManager = getCostBudgetManager();
    const config = budgetManager.getConfig();

    return {
      success: true,
      data: config,
    };
  }),

  /**
   * 更新预算配置
   */
  updateBudgetConfig: protectedProcedure
    .input(
      z.object({
        monthlyBudget: z.number().optional(),
        alertThreshold: z.number().optional(),
        criticalThreshold: z.number().optional(),
        enableAlerts: z.boolean().optional(),
        enableAutoOptimization: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      const budgetManager = getCostBudgetManager();
      budgetManager.updateConfig(input);

      return {
        success: true,
        message: "预算配置已更新",
      };
    }),

  /**
   * 手动检查预算并触发告警
   */
  checkBudgetNow: protectedProcedure.mutation(async ({ ctx }) => {
    const budgetManager = getCostBudgetManager();
    await budgetManager.checkBudgetAndAlert();

    const status = budgetManager.getBudgetStatus();

    return {
      success: true,
      data: status,
      message: `预算检查完成，当前状态: ${status.status}`,
    };
  }),

  /**
   * 生成预算报告
   */
  generateBudgetReport: protectedProcedure.query(({ ctx }) => {
    const budgetManager = getCostBudgetManager();
    const report = budgetManager.generateReport();

    return {
      success: true,
      data: report,
    };
  }),

  /**
   * 获取优化策略
   */
  getOptimizationStrategy: protectedProcedure.query(({ ctx }) => {
    const autoOptimizer = getAutoOptimizationManager();
    const strategy = autoOptimizer.getCurrentStrategy();
    const policy = autoOptimizer.getCurrentPolicy();

    return {
      success: true,
      data: {
        strategy,
        policy,
      },
    };
  }),

  /**
   * 获取所有优化策略
   */
  getAllOptimizationStrategies: protectedProcedure.query(({ ctx }) => {
    const autoOptimizer = getAutoOptimizationManager();
    const policies = autoOptimizer.getAllPolicies();

    return {
      success: true,
      data: policies,
    };
  }),

  /**
   * 手动设置优化策略
   */
  setOptimizationStrategy: protectedProcedure
    .input(
      z.object({
        strategy: z.enum(["cost", "quality", "speed", "balanced", "aggressive"]),
      })
    )
    .mutation(({ input }) => {
      const autoOptimizer = getAutoOptimizationManager();
      autoOptimizer.setStrategy(input.strategy);

      return {
        success: true,
        message: `优化策略已设置为: ${input.strategy}`,
      };
    }),

  /**
   * 自动调整优化策略
   */
  autoAdjustStrategy: protectedProcedure.mutation(async ({ ctx }) => {
    const autoOptimizer = getAutoOptimizationManager();
    const newStrategy = await autoOptimizer.autoAdjustStrategy();

    return {
      success: true,
      data: {
        strategy: newStrategy,
      },
      message: `优化策略已自动调整为: ${newStrategy}`,
    };
  }),

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions: protectedProcedure.query(({ ctx }) => {
    const autoOptimizer = getAutoOptimizationManager();
    const suggestions = autoOptimizer.getOptimizationSuggestions();

    return {
      success: true,
      data: suggestions,
    };
  }),

  /**
   * 生成优化报告
   */
  generateOptimizationReport: protectedProcedure.query(({ ctx }) => {
    const autoOptimizer = getAutoOptimizationManager();
    const report = autoOptimizer.generateReport();

    return {
      success: true,
      data: report,
    };
  }),

  /**
   * 获取完整的成本和优化报告
   */
  getCompleteReport: protectedProcedure.query(({ ctx }) => {
    const budgetManager = getCostBudgetManager();
    const autoOptimizer = getAutoOptimizationManager();

    const budgetReport = budgetManager.generateReport();
    const optimizationReport = autoOptimizer.generateReport();

    return {
      success: true,
      data: {
        budgetReport,
        optimizationReport,
        timestamp: new Date().toISOString(),
      },
    };
  }),
});
