/**
 * 内存优化管理器 V2
 * 解决 95%+ 堆内存使用率过高的问题
 * 实现激进的缓存清理、内存泄漏检测、自动垃圾回收
 */

interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  usagePercent: number;
  status: "normal" | "warning" | "critical";
  trend: "stable" | "increasing" | "decreasing";
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

class MemoryOptimizerV2 {
  private metricsHistory: MemoryMetrics[] = [];
  private maxHistorySize = 50; // 从 100 降低为 50
  
  // 更激进的阈值
  private criticalThreshold = 0.85; // 85% 触发激进清理
  private warningThreshold = 0.70; // 70% 警告
  private normalThreshold = 0.60; // 60% 正常
  
  private lastGCTime = Date.now();
  private gcInterval = 2 * 60 * 1000; // 2 分钟最少间隔（从 5 分钟优化）
  private lastAggressiveCleanupTime = Date.now();
  private aggressiveCleanupInterval = 10 * 60 * 1000; // 10 分钟执行一次激进清理

  private memoryLeakDetectionWindow: number[] = []; // 最近 10 次的内存使用率
  private maxLeakDetectionWindow = 10;

  /**
   * 获取当前内存指标
   */
  getCurrentMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const usagePercent = heapUsed / heapTotal;

    // 检测内存趋势
    let trend: "stable" | "increasing" | "decreasing" = "stable";
    if (this.memoryLeakDetectionWindow.length > 0) {
      const previousUsage = this.memoryLeakDetectionWindow[this.memoryLeakDetectionWindow.length - 1];
      if (usagePercent > previousUsage + 0.05) {
        trend = "increasing";
      } else if (usagePercent < previousUsage - 0.05) {
        trend = "decreasing";
      }
    }

    this.memoryLeakDetectionWindow.push(usagePercent);
    if (this.memoryLeakDetectionWindow.length > this.maxLeakDetectionWindow) {
      this.memoryLeakDetectionWindow.shift();
    }

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
      trend,
    };

    // 保存历史记录
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }

    // 自动触发 GC
    if (usagePercent >= this.criticalThreshold) {
      this.triggerGarbageCollection();
    }

    // 检测内存泄漏
    if (trend === "increasing" && this.memoryLeakDetectionWindow.length >= 5) {
      const recentAvg = this.memoryLeakDetectionWindow.slice(-5).reduce((a, b) => a + b) / 5;
      if (recentAvg > 0.80) {
        console.error(
          "[MemoryOptimizerV2] POTENTIAL MEMORY LEAK DETECTED: Memory usage consistently high"
        );
      }
    }

    return metrics;
  }

  /**
   * 获取内存指标历史
   */
  getMetricsHistory(limit = 30): MemoryMetrics[] {
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

    this.lastGCTime = now;

    try {
      if (global.gc) {
        console.log("[MemoryOptimizerV2] Triggering garbage collection...");
        global.gc();
        
        const memUsage = process.memoryUsage();
        const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        console.log(
          `[MemoryOptimizerV2] GC completed. Heap usage: ${usagePercent.toFixed(1)}%`
        );
      }
    } catch (error) {
      console.error("[MemoryOptimizerV2] GC error:", error);
    }
  }

  /**
   * 执行激进清理
   */
  async performAggressiveCleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastAggressiveCleanupTime < this.aggressiveCleanupInterval) {
      return; // 避免频繁激进清理
    }

    this.lastAggressiveCleanupTime = now;

    console.log("[MemoryOptimizerV2] Starting aggressive cleanup...");

    try {
      // 1. 清理缓存
      const cacheManager = getCacheManager();
      const cleaned = cacheManager.forceAggressiveCleanup();
      console.log(`[MemoryOptimizerV2] Cleared ${cleaned} cache entries`);

      // 2. 触发垃圾回收
      this.triggerGarbageCollection();

      // 3. 清理历史记录
      if (this.metricsHistory.length > 20) {
        this.metricsHistory = this.metricsHistory.slice(-20);
      }

      // 4. 获取清理后的内存使用率
      const memUsage = process.memoryUsage();
      const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      console.log(
        `[MemoryOptimizerV2] Aggressive cleanup completed. Heap usage: ${usagePercent.toFixed(1)}%`
      );
    } catch (error) {
      console.error("[MemoryOptimizerV2] Aggressive cleanup error:", error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): CacheStats {
    const cacheManager = getCacheManager();
    return cacheManager.getStats();
  }

  /**
   * 获取内存诊断报告
   */
  getDiagnosticReport() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const trend = this.memoryLeakDetectionWindow.length > 0
      ? this.memoryLeakDetectionWindow[this.memoryLeakDetectionWindow.length - 1] > 0.80
        ? "CRITICAL"
        : "NORMAL"
      : "UNKNOWN";

    return {
      timestamp: Date.now(),
      heapUsedMB: parseFloat(heapUsedMB.toFixed(2)),
      heapTotalMB: parseFloat(heapTotalMB.toFixed(2)),
      externalMB: parseFloat(externalMB.toFixed(2)),
      usagePercent: parseFloat(usagePercent.toFixed(1)),
      trend,
      recentMetrics: this.getMetricsHistory(5),
      cacheStats: this.getCacheStats(),
    };
  }
}

let instance: MemoryOptimizerV2 | null = null;

export function getMemoryOptimizerV2(): MemoryOptimizerV2 {
  if (!instance) {
    instance = new MemoryOptimizerV2();
  }
  return instance;
}

// 导入 getCacheManager
import { getCacheManager } from "./cacheManager";
