import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getCostTracker } from "../services/costTracker";
import { getLLMOptimizer } from "../services/llmOptimizer";
import { getQueryOptimizer } from "../services/queryOptimizer";
import { z } from "zod";

export const costMonitoringRouter = router({
  /**
   * 获取总成本统计
   */
  getStats: protectedProcedure.query(({ ctx }) => {
    const tracker = getCostTracker();
    return tracker.getStats();
  }),

  /**
   * 获取每日成本汇总
   */
  getDailySummaries: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(({ input }) => {
      const tracker = getCostTracker();
      return tracker.getDailySummaries(input.days);
    }),

  /**
   * 获取最近 N 天的总成本
   */
  getCostForLastDays: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }))
    .query(({ input }) => {
      const tracker = getCostTracker();
      return {
        days: input.days,
        totalCost: tracker.getCostForLastDays(input.days),
        predictedMonthlyCost: tracker.predictMonthlyCost(),
      };
    }),

  /**
   * 获取缓存效率
   */
  getCacheEfficiency: protectedProcedure.query(() => {
    const tracker = getCostTracker();
    return tracker.getCacheEfficiency();
  }),

  /**
   * 获取服务成本分布
   */
  getServiceCostBreakdown: protectedProcedure.query(() => {
    const tracker = getCostTracker();
    return tracker.getServiceCostBreakdown();
  }),

  /**
   * 获取 LLM 优化指标
   */
  getLLMMetrics: protectedProcedure.query(() => {
    const optimizer = getLLMOptimizer();
    const metrics = optimizer.getMetrics();
    return {
      ...metrics,
      cacheHitRate: optimizer.getCacheHitRate(),
      costSavingsRate: optimizer.getCostSavingsRate(),
    };
  }),

  /**
   * 获取数据库查询优化指标
   */
  getQueryMetrics: protectedProcedure.query(() => {
    const optimizer = getQueryOptimizer();
    const metrics = optimizer.getMetrics();
    return {
      ...metrics,
      cacheHitRate: optimizer.getCacheHitRate(),
      querySavings: optimizer.getQuerySavings(),
    };
  }),

  /**
   * 生成成本报告
   */
  generateReport: protectedProcedure.query(() => {
    const tracker = getCostTracker();
    return {
      report: tracker.generateReport(),
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * 预测月成本
   */
  predictMonthlyCost: protectedProcedure.query(() => {
    const tracker = getCostTracker();
    return {
      predictedCost: tracker.predictMonthlyCost(),
      currentDailyCost: tracker.getStats().averageDailyCost,
    };
  }),

  /**
   * 获取成本优化建议
   */
  getOptimizationRecommendations: protectedProcedure.query(() => {
    const tracker = getCostTracker();
    const llmOptimizer = getLLMOptimizer();
    const queryOptimizer = getQueryOptimizer();

    const stats = tracker.getStats();
    const cacheEfficiency = tracker.getCacheEfficiency();
    const llmMetrics = llmOptimizer.getMetrics();
    const queryMetrics = queryOptimizer.getMetrics();

    const recommendations: string[] = [];

    // LLM 优化建议
    if (llmMetrics.cachedCalls < llmMetrics.totalCalls * 0.3) {
      recommendations.push(
        "LLM 缓存命中率较低（<30%），建议增加缓存 TTL 或调整缓存策略"
      );
    }

    if (stats.llmCost > stats.totalCost * 0.8) {
      recommendations.push(
        "LLM 成本占比过高（>80%），建议使用批量调用或降低后台任务频率"
      );
    }

    // 数据库优化建议
    if (queryMetrics.cachedQueries < queryMetrics.totalQueries * 0.4) {
      recommendations.push(
        "数据库查询缓存命中率较低（<40%），建议增加缓存覆盖范围"
      );
    }

    // 成本趋势建议
    if (stats.costTrend === "increasing") {
      recommendations.push(
        "成本呈上升趋势，建议检查后台任务频率和 LLM 调用模式"
      );
    }

    // 缓存效率建议
    if (cacheEfficiency.costReduction < 20) {
      recommendations.push(
        "缓存节省效果不明显（<20%），建议优化缓存策略"
      );
    }

    return {
      recommendations,
      priority: recommendations.length > 2 ? "high" : "normal",
    };
  }),

  /**
   * 清除缓存（管理员功能）
   */
  clearCache: protectedProcedure
    .input(z.object({ type: z.enum(["all", "llm", "query"]) }))
    .mutation(({ input }) => {
      if (input.type === "llm") {
        const optimizer = getLLMOptimizer();
        const cleared = optimizer.clearCache();
        return { success: true, cleared, type: "llm" };
      }

      if (input.type === "query") {
        const optimizer = getQueryOptimizer();
        const cleared = optimizer.clearAllCache();
        return { success: true, cleared, type: "query" };
      }

      // 清除所有缓存
      const llmOptimizer = getLLMOptimizer();
      const queryOptimizer = getQueryOptimizer();
      const clearedLLM = llmOptimizer.clearCache();
      const clearedQuery = queryOptimizer.clearAllCache();

      return {
        success: true,
        cleared: clearedLLM + clearedQuery,
        type: "all",
      };
    }),

  /**
   * 重置成本追踪数据（管理员功能）
   */
  resetMetrics: protectedProcedure.mutation(({ ctx }) => {
    // 只允许管理员重置
    if (ctx.user?.role !== "admin") {
      throw new Error("Only admins can reset metrics");
    }

    const tracker = getCostTracker();
    const llmOptimizer = getLLMOptimizer();
    const queryOptimizer = getQueryOptimizer();

    tracker.reset();
    llmOptimizer.resetMetrics();
    queryOptimizer.resetMetrics();

    return { success: true, message: "Metrics reset successfully" };
  }),
});
