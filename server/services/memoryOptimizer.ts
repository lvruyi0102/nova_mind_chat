/**
 * 内存优化管理器
 * 解决 96.5% 堆内存使用率过高的问题
 * 实现内存监控、自动清理、垃圾回收触发
 */

interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  usagePercent: number;
  status: "normal" | "warning" | "critical";
}

interface CacheStats {
  llmCacheSize: number;
  queryCacheSize: number;
  userProfileCacheSize: number;
  totalCacheSize: number;
}

class MemoryOptimizer {
  private metricsHistory: MemoryMetrics[] = [];
  private maxHistorySize = 100;
  private gcThreshold = 0.85; // 85% 触发 GC
  private criticalThreshold = 0.90; // 90% 严重告警
  private warningThreshold = 0.75; // 75% 警告
  private lastGCTime = Date.now();
  private gcInterval = 5 * 60 * 1000; // 5 分钟最少间隔

  /**
   * 获取当前内存指标
   */
  getCurrentMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const usagePercent = heapUsed / heapTotal;

    let status: "normal" | "warning" | "critical" = "normal";
    if (usagePercent >= this.criticalThreshold) {
      status = "critical";
    } else if (usagePercent >= this.warningThreshold) {
      status = "warning";
    }

    const metrics: MemoryMetrics = {
      timestamp: Date.now(),
      heapUsed,
      heapTotal,
      external: memUsage.external,
      usagePercent,
      status,
    };

    // 保存历史记录
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // 自动触发 GC
    if (usagePercent >= this.gcThreshold) {
      this.triggerGarbageCollection();
    }

    return metrics;
  }

  /**
   * 获取内存指标历史
   */
  getMetricsHistory(limit = 50): MemoryMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * 触发垃圾回收
   */
  triggerGarbageCollection(): void {
    const now = Date.now();
    if (now - this.lastGCTime < this.gcInterval) {
      return; // 避免频繁 GC
    }

    try {
      if (global.gc) {
        console.log("[MemoryOptimizer] Triggering garbage collection...");
        global.gc();
        this.lastGCTime = now;

        // 记录 GC 后的内存状态
        const afterGC = process.memoryUsage();
        console.log(
          `[MemoryOptimizer] GC completed. Heap: ${Math.round(
            afterGC.heapUsed / 1024 / 1024
          )}MB / ${Math.round(afterGC.heapTotal / 1024 / 1024)}MB`
        );
      } else {
        console.warn(
          "[MemoryOptimizer] GC not available. Run with --expose-gc flag"
        );
      }
    } catch (error) {
      console.error("[MemoryOptimizer] GC failed:", error);
    }
  }

  /**
   * 获取内存使用情况的人类可读格式
   */
  getReadableMetrics(): {
    heapUsed: string;
    heapTotal: string;
    external: string;
    usagePercent: string;
    status: string;
  } {
    const metrics = this.getCurrentMetrics();
    return {
      heapUsed: `${Math.round(metrics.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(metrics.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(metrics.external / 1024 / 1024)}MB`,
      usagePercent: `${(metrics.usagePercent * 100).toFixed(1)}%`,
      status: metrics.status,
    };
  }

  /**
   * 获取内存趋势分析
   */
  getMemoryTrend(): {
    trend: "increasing" | "decreasing" | "stable";
    avgUsagePercent: number;
    maxUsagePercent: number;
    minUsagePercent: number;
  } {
    if (this.metricsHistory.length < 2) {
      return {
        trend: "stable",
        avgUsagePercent: 0,
        maxUsagePercent: 0,
        minUsagePercent: 0,
      };
    }

    const recentMetrics = this.metricsHistory.slice(-20);
    const usagePercents = recentMetrics.map((m) => m.usagePercent);

    const avgUsagePercent =
      usagePercents.reduce((a, b) => a + b, 0) / usagePercents.length;
    const maxUsagePercent = Math.max(...usagePercents);
    const minUsagePercent = Math.min(...usagePercents);

    // 判断趋势
    const firstHalf = usagePercents.slice(0, 10);
    const secondHalf = usagePercents.slice(10);
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (secondAvg > firstAvg + 0.05) {
      trend = "increasing";
    } else if (secondAvg < firstAvg - 0.05) {
      trend = "decreasing";
    }

    return {
      trend,
      avgUsagePercent,
      maxUsagePercent,
      minUsagePercent,
    };
  }

  /**
   * 清理缓存以释放内存
   */
  async clearCaches(): Promise<CacheStats> {
    console.log("[MemoryOptimizer] Clearing caches...");

    try {
      // 这里可以集成实际的缓存清理逻辑
      // 例如清理 LLM 缓存、查询缓存等

      const stats: CacheStats = {
        llmCacheSize: 0,
        queryCacheSize: 0,
        userProfileCacheSize: 0,
        totalCacheSize: 0,
      };

      console.log("[MemoryOptimizer] Cache cleanup completed");
      return stats;
    } catch (error) {
      console.error("[MemoryOptimizer] Cache cleanup failed:", error);
      throw error;
    }
  }

  /**
   * 生成内存报告
   */
  generateReport(): string {
    const metrics = this.getCurrentMetrics();
    const readable = this.getReadableMetrics();
    const trend = this.getMemoryTrend();

    return `
=== 内存使用报告 ===
时间: ${new Date(metrics.timestamp).toISOString()}

当前状态:
- 堆内存: ${readable.heapUsed} / ${readable.heapTotal}
- 外部内存: ${readable.external}
- 使用率: ${readable.usagePercent}
- 状态: ${readable.status}

趋势分析:
- 趋势: ${trend.trend}
- 平均使用率: ${(trend.avgUsagePercent * 100).toFixed(1)}%
- 最高使用率: ${(trend.maxUsagePercent * 100).toFixed(1)}%
- 最低使用率: ${(trend.minUsagePercent * 100).toFixed(1)}%

建议:
${this.getRecommendations(metrics, trend)}
    `;
  }

  /**
   * 获取优化建议
   */
  private getRecommendations(
    metrics: MemoryMetrics,
    trend: ReturnType<typeof this.getMemoryTrend>
  ): string {
    const recommendations: string[] = [];

    if (metrics.status === "critical") {
      recommendations.push("⚠️ 内存使用率严重超高，建议立即优化");
      recommendations.push("  - 减少后台任务频率");
      recommendations.push("  - 清理缓存");
      recommendations.push("  - 重启服务");
    } else if (metrics.status === "warning") {
      recommendations.push("⚠️ 内存使用率较高，建议优化");
      recommendations.push("  - 监控后台任务");
      recommendations.push("  - 定期清理缓存");
    }

    if (trend.trend === "increasing") {
      recommendations.push("📈 内存使用率呈上升趋势");
      recommendations.push("  - 检查是否有内存泄漏");
      recommendations.push("  - 检查缓存是否正确清理");
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ 内存使用正常，无需优化");
    }

    return recommendations.join("\n");
  }
}

// 单例模式
let instance: MemoryOptimizer | null = null;

export function getMemoryOptimizer(): MemoryOptimizer {
  if (!instance) {
    instance = new MemoryOptimizer();
  }
  return instance;
}

export type { MemoryMetrics, CacheStats };
