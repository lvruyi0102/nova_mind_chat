/**
 * 增强型内存优化器 V5
 * 
 * 集成知识压缩系统，进一步优化内存占用
 * 
 * 优化策略：
 * 1. 激进内存优化（禁用后台任务）
 * 2. LRU 缓存（自动删除最少使用的项）
 * 3. 数据去重（共享相同对象引用）
 * 4. 垃圾回收（定期强制清理）
 * 5. 内存监控（实时统计和告警）
 */

import {
  getGlobalCache,
  getGlobalDeduplicator,
  getCompressionStats,
  clearCompressionResources,
} from './knowledgeCompression';
import { getAggressiveMemoryOptimization } from './aggressiveMemoryOptimization';

interface EnhancedOptimizationStats {
  heapUsage: number;
  heapUsagePercent: number;
  cacheStats: any;
  deduplicatorStats: any;
  timestamp: number;
}

class EnhancedMemoryOptimizer {
  private isRunning = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private stats: EnhancedOptimizationStats[] = [];

  /**
   * 启动增强型内存优化
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[EnhancedMemoryOptimizer] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[EnhancedMemoryOptimizer] Starting...');

    // 启动激进内存优化
    // 激进优化器已经自动运行，这里不需要执行额外的启动
    const aggressiveOptimization = getAggressiveMemoryOptimization();

    // 启动监控循环
    this.startMonitoring();

    console.log('[EnhancedMemoryOptimizer] Started successfully');
  }

  /**
   * 停止增强型内存优化
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // 清理压缩资源
    clearCompressionResources();

    console.log('[EnhancedMemoryOptimizer] Stopped');
  }

  /**
   * 启动监控循环
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performMonitoring();
    }, 60 * 1000); // 每 60 秒监控一次

    // 立即执行第一次监控
    this.performMonitoring();
  }

  /**
   * 执行监控和优化
   */
  private performMonitoring(): void {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const stats: EnhancedOptimizationStats = {
      heapUsage: memUsage.heapUsed,
      heapUsagePercent,
      cacheStats: getCompressionStats().cache,
      deduplicatorStats: getCompressionStats().deduplicator,
      timestamp: Date.now(),
    };

    this.stats.push(stats);

    // 只保留最近 100 条记录
    if (this.stats.length > 100) {
      this.stats.shift();
    }

    // 如果内存使用率超过 85%，执行清理
    if (heapUsagePercent > 85) {
      this.performCleanup();
    }

    // 定期清理缓存中的过期项
    this.cleanupCache();

    console.log(
      `[EnhancedMemoryOptimizer] Heap: ${(heapUsagePercent).toFixed(1)}% | ` +
        `Cache: ${stats.cacheStats.totalItems} items (${(stats.cacheStats.totalMemory / 1024 / 1024).toFixed(1)}MB) | ` +
        `Hit Rate: ${(stats.cacheStats.hitRate * 100).toFixed(1)}%`
    );
  }

  /**
   * 执行清理操作
   */
  private performCleanup(): void {
    console.log('[EnhancedMemoryOptimizer] Performing cleanup...');

    // 清理缓存
    const cache = getGlobalCache();
    const beforeSize = cache.getStats().totalMemory;
    
    // 清理去重器
    const deduplicator = getGlobalDeduplicator();
    deduplicator.clear();

    const afterSize = cache.getStats().totalMemory;
    const freed = beforeSize - afterSize;

    console.log(
      `[EnhancedMemoryOptimizer] Cleanup completed. Freed: ${(freed / 1024 / 1024).toFixed(2)}MB`
    );

    // 触发垃圾回收
    if (global.gc) {
      global.gc();
      console.log('[EnhancedMemoryOptimizer] Garbage collection triggered');
    }
  }

  /**
   * 清理缓存中的过期项
   */
  private cleanupCache(): void {
    const cache = getGlobalCache();
    const stats = cache.getStats();

    // 如果缓存命中率低于 30%，清空缓存
    if (stats.hitRate < 0.3 && stats.totalItems > 100) {
      console.log(
        `[EnhancedMemoryOptimizer] Cache hit rate too low (${(stats.hitRate * 100).toFixed(1)}%), clearing cache`
      );
      cache.clear();
    }
  }

  /**
   * 获取优化统计信息
   */
  getStats(): {
    current: EnhancedOptimizationStats | null;
    history: EnhancedOptimizationStats[];
    trend: string;
  } {
    const current = this.stats[this.stats.length - 1] || null;
    const history = this.stats.slice(-10); // 最近 10 条记录

    // 计算趋势
    let trend = 'stable';
    if (history.length >= 2) {
      const recent = history[history.length - 1];
      const previous = history[0];
      const diff = recent.heapUsagePercent - previous.heapUsagePercent;

      if (diff > 5) {
        trend = 'increasing';
      } else if (diff < -5) {
        trend = 'decreasing';
      }
    }

    return {
      current,
      history,
      trend,
    };
  }

  /**
   * 获取缓存
   */
  getCache() {
    return getGlobalCache();
  }

  /**
   * 获取去重器
   */
  getDeduplicator() {
    return getGlobalDeduplicator();
  }
}

// 全局实例
let instance: EnhancedMemoryOptimizer | null = null;

/**
 * 获取增强型内存优化器实例
 */
export function getEnhancedMemoryOptimizer(): EnhancedMemoryOptimizer {
  if (!instance) {
    instance = new EnhancedMemoryOptimizer();
  }
  return instance;
}

/**
 * 导出类供直接使用
 */
export { EnhancedMemoryOptimizer };
