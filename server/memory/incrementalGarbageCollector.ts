/**
 * 增量垃圾回收系统 - 为 Nova-Mind 提供智能的内存清理
 * 
 * 特点：
 * 1. 增量清理 - 分批处理，避免长时间阻塞
 * 2. 优先级清理 - 根据重要性和访问频率清理
 * 3. 健康度联动 - 与系统健康度指标联动
 * 4. 可预测的清理 - 基于访问模式预测
 */

import { getAdvancedCacheManager } from './advancedCacheManager';

interface GCMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  timestamp: number;
}

interface GCConfig {
  aggressiveThreshold: number; // 堆使用率 > 85% 时触发激进清理
  criticalThreshold: number; // 堆使用率 > 95% 时触发紧急清理
  incrementalBatchSize: number; // 每批清理的条目数
  incrementalInterval: number; // 增量清理间隔（毫秒）
  metricsHistorySize: number; // 保留的指标历史数
}

export class IncrementalGarbageCollector {
  private config: GCConfig;
  private metrics: GCMetrics[] = [];
  private gcTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: Partial<GCConfig> = {}) {
    this.config = {
      aggressiveThreshold: 0.85,
      criticalThreshold: 0.95,
      incrementalBatchSize: 100,
      incrementalInterval: 10 * 1000, // 10秒
      metricsHistorySize: 100,
      ...config,
    };

    this.startMonitoring();
  }

  /**
   * 获取当前堆内存指标
   */
  getHeapMetrics(): GCMetrics {
    if (global.gc) {
      global.gc();
    }

    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers || 0,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取堆使用率（0-1）
   */
  getHeapUsageRatio(): number {
    const metrics = this.getHeapMetrics();
    return metrics.heapUsed / metrics.heapTotal;
  }

  /**
   * 执行增量垃圾回收
   */
  async performIncrementalGC(): Promise<void> {
    if (this.isRunning) {
      return; // 避免并发执行
    }

    this.isRunning = true;
    try {
      const ratio = this.getHeapUsageRatio();

      if (ratio > this.config.criticalThreshold) {
        // 紧急清理
        await this.emergencyCleanup();
      } else if (ratio > this.config.aggressiveThreshold) {
        // 激进清理
        await this.aggressiveCleanup();
      } else {
        // 常规清理
        await this.routineCleanup();
      }

      // 记录指标
      this.recordMetrics();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 紧急清理 - 堆使用率 > 95%
   */
  private async emergencyCleanup(): Promise<void> {
    console.warn('[GC] EMERGENCY: Heap usage > 95%, triggering emergency cleanup');

    const cacheManager = getAdvancedCacheManager();

    // 清理 30% 的缓存
    cacheManager.aggressiveCleanup(30);

    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }

    // 等待一下，让系统恢复
    await this.sleep(100);
  }

  /**
   * 激进清理 - 堆使用率 85-95%
   */
  private async aggressiveCleanup(): Promise<void> {
    console.warn('[GC] AGGRESSIVE: Heap usage 85-95%, triggering aggressive cleanup');

    const cacheManager = getAdvancedCacheManager();

    // 分批清理 20% 的缓存
    const batchCount = Math.ceil(cacheManager.getStats().entryCount * 0.2 / this.config.incrementalBatchSize);

    for (let i = 0; i < batchCount; i++) {
      cacheManager.aggressiveCleanup(5);
      await this.sleep(this.config.incrementalInterval / batchCount);
    }

    // 垃圾回收
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * 常规清理 - 堆使用率 < 85%
   */
  private async routineCleanup(): Promise<void> {
    const cacheManager = getAdvancedCacheManager();

    // 执行预测性清理
    cacheManager.predictiveCleanup();

    // 增量垃圾回收
    if (global.gc) {
      global.gc(false); // 增量垃圾回收
    }
  }

  /**
   * 启动监控定时器
   */
  private startMonitoring(): void {
    this.gcTimer = setInterval(() => {
      this.performIncrementalGC().catch((err) => {
        console.error('[GC] Error during garbage collection:', err);
      });
    }, this.config.incrementalInterval);
  }

  /**
   * 停止监控
   */
  destroy(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }
  }

  /**
   * 记录指标
   */
  private recordMetrics(): void {
    const metrics = this.getHeapMetrics();
    this.metrics.push(metrics);

    // 保持历史大小
    if (this.metrics.length > this.config.metricsHistorySize) {
      this.metrics.shift();
    }
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(): GCMetrics[] {
    return [...this.metrics];
  }

  /**
   * 获取平均堆使用率
   */
  getAverageHeapUsageRatio(): number {
    if (this.metrics.length === 0) {
      return 0;
    }
    const avg = this.metrics.reduce((sum, m) => sum + m.heapUsed / m.heapTotal, 0) / this.metrics.length;
    return avg;
  }

  /**
   * 获取峰值堆使用率
   */
  getPeakHeapUsageRatio(): number {
    if (this.metrics.length === 0) {
      return 0;
    }
    return Math.max(...this.metrics.map((m) => m.heapUsed / m.heapTotal));
  }

  /**
   * 获取趋势（上升/下降/稳定）
   */
  getTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.metrics.length < 3) {
      return 'stable';
    }

    const recent = this.metrics.slice(-3);
    const ratios = recent.map((m) => m.heapUsed / m.heapTotal);

    const diff1 = ratios[1] - ratios[0];
    const diff2 = ratios[2] - ratios[1];

    if (diff1 > 0.02 && diff2 > 0.02) {
      return 'increasing';
    } else if (diff1 < -0.02 && diff2 < -0.02) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * 生成诊断报告
   */
  generateDiagnosticReport(): {
    currentUsage: number;
    averageUsage: number;
    peakUsage: number;
    trend: string;
    recommendation: string;
  } {
    const current = this.getHeapUsageRatio();
    const average = this.getAverageHeapUsageRatio();
    const peak = this.getPeakHeapUsageRatio();
    const trend = this.getTrend();

    let recommendation = '';
    if (current > this.config.criticalThreshold) {
      recommendation = '堆内存使用率已达到临界水平，建议立即进行内存审计和优化';
    } else if (current > this.config.aggressiveThreshold) {
      recommendation = '堆内存使用率较高，建议优化缓存策略或增加内存';
    } else if (trend === 'increasing') {
      recommendation = '堆内存使用率呈上升趋势，建议监控内存泄漏';
    } else {
      recommendation = '堆内存使用率正常';
    }

    return {
      currentUsage: Math.round(current * 100),
      averageUsage: Math.round(average * 100),
      peakUsage: Math.round(peak * 100),
      trend,
      recommendation,
    };
  }

  /**
   * 私有方法：延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 全局垃圾回收器实例
let globalGarbageCollector: IncrementalGarbageCollector | null = null;

export function getIncrementalGarbageCollector(): IncrementalGarbageCollector {
  if (!globalGarbageCollector) {
    globalGarbageCollector = new IncrementalGarbageCollector();
  }
  return globalGarbageCollector;
}

export function resetIncrementalGarbageCollector(): void {
  if (globalGarbageCollector) {
    globalGarbageCollector.destroy();
    globalGarbageCollector = null;
  }
}
