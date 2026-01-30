/**
 * 监控仪表板 tRPC 路由
 */

import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import { getMonitoringSystem } from '../services/monitoringSystem';
import { getCacheManager } from '../services/cacheManager';

export const monitoringRouter = router({
  /**
   * 获取完整的监控仪表板数据
   */
  getDashboard: protectedProcedure.query(() => {
    const monitoring = getMonitoringSystem();
    const dashboard = monitoring.getDashboard();

    return {
      memory: dashboard.memory,
      cost: dashboard.cost,
      performance: dashboard.performance,
      config: dashboard.config,
    };
  }),

  /**
   * 获取系统状态
   */
  getSystemStatus: protectedProcedure.query(() => {
    const monitoring = getMonitoringSystem();
    return monitoring.getSystemStatus();
  }),

  /**
   * 获取内存监控数据
   */
  getMemoryMetrics: protectedProcedure.query(() => {
    const monitoring = getMonitoringSystem();
    return monitoring.getMemorySummary();
  }),

  /**
   * 获取成本监控数据
   */
  getCostMetrics: protectedProcedure.query(() => {
    const monitoring = getMonitoringSystem();
    return monitoring.getCostSummary();
  }),

  /**
   * 获取性能监控数据
   */
  getPerformanceMetrics: protectedProcedure.query(() => {
    const monitoring = getMonitoringSystem();
    return monitoring.getPerformanceMetrics();
  }),

  /**
   * 手动触发缓存清理（仅 admin）
   */
  triggerCacheCleanup: adminProcedure.mutation(() => {
    const cache = getCacheManager();
    const cleaned = cache.forceAggressiveCleanup();

    return {
      success: true,
      entriesRemoved: cleaned,
      message: `Successfully removed ${cleaned} cache entries`,
    };
  }),

  /**
   * 更新告警配置（仅 admin）
   */
  updateAlertConfig: adminProcedure.input(
    (val: unknown) => {
      if (typeof val !== 'object' || val === null) {
        throw new Error('Invalid input');
      }
      return val as {
        memoryThreshold?: number;
        costThreshold?: number;
        responseTimeThreshold?: number;
        errorRateThreshold?: number;
      };
    }
  ).mutation(({ input }) => {
    const monitoring = getMonitoringSystem();
    monitoring.updateAlertConfig({
      memoryThreshold: input.memoryThreshold,
      costThreshold: input.costThreshold,
      responseTimeThreshold: input.responseTimeThreshold,
      errorRateThreshold: input.errorRateThreshold,
    });

    return {
      success: true,
      message: 'Alert configuration updated',
    };
  }),
});
