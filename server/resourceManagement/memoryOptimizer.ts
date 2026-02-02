/**
 * 内存优化和自适应限流系统
 * 
 * 解决问题：
 * - TypeScript 编译器占用 340MB 内存
 * - 后台任务无限增长
 * - 没有自动清理机制
 * 
 * 方案：
 * - 定期垃圾回收
 * - 缓存淘汰策略
 * - 自适应限流
 * - 内存压力监控
 */

interface MemoryThreshold {
  warning: number; // 60%
  critical: number; // 80%
  emergency: number; // 95%
}

interface MemoryStats {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMemoryMB: number;
  usagePercent: number;
  timestamp: Date;
}

/**
 * 内存优化器
 */
export class MemoryOptimizer {
  private thresholds: MemoryThreshold = {
    warning: 60,
    critical: 80,
    emergency: 95,
  };

  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryHistory: MemoryStats[] = [];
  private maxHistorySize = 100;

  private caches: Map<string, Map<string, any>> = new Map();
  private cacheSizes: Map<string, number> = new Map();

  constructor() {
    this.startMonitoring();
    this.startGarbageCollection();
  }

  /**
   * 启动内存监控
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      this.memoryHistory.push(stats);

      // 保持历史记录大小
      if (this.memoryHistory.length > this.maxHistorySize) {
        this.memoryHistory.shift();
      }

      // 根据内存压力采取行动
      if (stats.usagePercent >= this.thresholds.emergency) {
        this.handleEmergencyMemoryPressure(stats);
      } else if (stats.usagePercent >= this.thresholds.critical) {
        this.handleCriticalMemoryPressure(stats);
      } else if (stats.usagePercent >= this.thresholds.warning) {
        this.handleWarningMemoryPressure(stats);
      }
    }, 10000); // 每 10 秒检查一次
  }

  /**
   * 启动垃圾回收
   */
  private startGarbageCollection(): void {
    this.gcInterval = setInterval(() => {
      if (global.gc) {
        const before = process.memoryUsage().heapUsed / 1024 / 1024;
        global.gc();
        const after = process.memoryUsage().heapUsed / 1024 / 1024;
        const freed = before - after;

        if (freed > 1) {
          console.log(
            `[MemoryOptimizer] 垃圾回收: 释放 ${freed.toFixed(2)}MB (${before.toFixed(1)}MB → ${after.toFixed(1)}MB)`
          );
        }
      }
    }, 30000); // 每 30 秒执行一次
  }

  /**
   * 获取内存统计信息
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const externalMB = memUsage.external / 1024 / 1024;
    const rssMemoryMB = memUsage.rss / 1024 / 1024;
    const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return {
      heapUsedMB,
      heapTotalMB,
      externalMB,
      rssMemoryMB,
      usagePercent,
      timestamp: new Date(),
    };
  }

  /**
   * 处理警告级别内存压力 (60-80%)
   */
  private handleWarningMemoryPressure(stats: MemoryStats): void {
    console.warn(
      `[MemoryOptimizer] 内存警告: ${stats.usagePercent.toFixed(1)}% (${stats.heapUsedMB.toFixed(1)}MB/${stats.heapTotalMB.toFixed(1)}MB)`
    );

    // 清理过期缓存
    this.evictExpiredCaches();
  }

  /**
   * 处理严重内存压力 (80-95%)
   */
  private handleCriticalMemoryPressure(stats: MemoryStats): void {
    console.error(
      `[MemoryOptimizer] 内存严重: ${stats.usagePercent.toFixed(1)}% (${stats.heapUsedMB.toFixed(1)}MB/${stats.heapTotalMB.toFixed(1)}MB)`
    );

    // 清理所有缓存
    this.clearAllCaches();

    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * 处理紧急内存压力 (95%+)
   */
  private handleEmergencyMemoryPressure(stats: MemoryStats): void {
    console.error(
      `[MemoryOptimizer] 内存紧急: ${stats.usagePercent.toFixed(1)}% (${stats.heapUsedMB.toFixed(1)}MB/${stats.heapTotalMB.toFixed(1)}MB)`
    );

    // 清理所有缓存
    this.clearAllCaches();

    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }

    // 发出警告
    console.error('[MemoryOptimizer] ⚠️ 内存紧急! 建议立即重启服务器');
  }

  /**
   * 注册缓存
   */
  registerCache(name: string): Map<string, any> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new Map());
      this.cacheSizes.set(name, 0);
    }
    return this.caches.get(name)!;
  }

  /**
   * 更新缓存大小
   */
  updateCacheSize(name: string, size: number): void {
    this.cacheSizes.set(name, size);
  }

  /**
   * 清理过期缓存
   */
  private evictExpiredCaches(): void {
    let totalCleared = 0;

    this.caches.forEach((cache, name) => {
      const beforeSize = cache.size;
      
      // 清理 50% 的缓存
      const keysToDelete = Array.from(cache.keys()).slice(0, Math.ceil(cache.size * 0.5));
      keysToDelete.forEach((key) => cache.delete(key));

      const cleared = beforeSize - cache.size;
      if (cleared > 0) {
        console.log(
          `[MemoryOptimizer] 清理缓存 ${name}: ${cleared} 项`
        );
        totalCleared += cleared;
      }
    });

    if (totalCleared > 0) {
      console.log(
        `[MemoryOptimizer] 总共清理 ${totalCleared} 项缓存`
      );
    }
  }

  /**
   * 清理所有缓存
   */
  private clearAllCaches(): void {
    let totalCleared = 0;

    this.caches.forEach((cache, name) => {
      const size = cache.size;
      cache.clear();
      this.cacheSizes.set(name, 0);
      console.log(`[MemoryOptimizer] 清理缓存 ${name}: ${size} 项`);
      totalCleared += size;
    });

    if (totalCleared > 0) {
      console.log(
        `[MemoryOptimizer] 总共清理 ${totalCleared} 项缓存`
      );
    }
  }

  /**
   * 获取内存趋势
   */
  getMemoryTrend(): {
    current: MemoryStats;
    trend: 'increasing' | 'stable' | 'decreasing';
    avgUsagePercent: number;
  } {
    if (this.memoryHistory.length === 0) {
      const current = this.getMemoryStats();
      return {
        current,
        trend: 'stable',
        avgUsagePercent: current.usagePercent,
      };
    }

    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const avgUsagePercent =
      this.memoryHistory.reduce((sum, stat) => sum + stat.usagePercent, 0) /
      this.memoryHistory.length;

    // 计算趋势
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (this.memoryHistory.length >= 3) {
      const recent = this.memoryHistory.slice(-3);
      const oldAvg = (recent[0].usagePercent + recent[1].usagePercent) / 2;
      const newAvg = recent[2].usagePercent;

      if (newAvg > oldAvg + 5) {
        trend = 'increasing';
      } else if (newAvg < oldAvg - 5) {
        trend = 'decreasing';
      }
    }

    return {
      current,
      trend,
      avgUsagePercent,
    };
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }

    this.clearAllCaches();
    console.log('[MemoryOptimizer] 内存优化器已关闭');
  }
}

// 全局实例
let memoryOptimizer: MemoryOptimizer | null = null;

export function getMemoryOptimizer(): MemoryOptimizer {
  if (!memoryOptimizer) {
    memoryOptimizer = new MemoryOptimizer();
  }
  return memoryOptimizer;
}

export async function initializeMemoryOptimizer(): Promise<void> {
  getMemoryOptimizer();
  console.log('[MemoryOptimizer] 内存优化器已初始化');
}
