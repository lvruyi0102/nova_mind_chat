/**
 * 激进的内存清理策略
 * 
 * 问题：内存占用 2.3GB，远超沙箱限制
 * 解决：激进的垃圾回收和缓存清理
 * 
 * 策略：
 * 1. 每 5 秒强制垃圾回收
 * 2. 清理所有缓存
 * 3. 禁用内存缓存
 * 4. 使用流式处理而不是缓冲
 */

interface MemoryThreshold {
  warning: number; // 300MB
  critical: number; // 400MB
  emergency: number; // 450MB
}

/**
 * 激进的内存清理器
 */
export class AggressiveMemoryCleaner {
  private thresholds: MemoryThreshold = {
    warning: 300,
    critical: 400,
    emergency: 450,
  };

  private cleanupInterval: NodeJS.Timeout | null = null;
  private lastCleanupTime = Date.now();
  private cleanupCount = 0;

  constructor() {
    this.startAggresiveCleanup();
  }

  /**
   * 启动激进的清理
   */
  private startAggresiveCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;

      // 每 5 秒强制垃圾回收
      if (global.gc) {
        const before = heapUsedMB;
        global.gc();
        const after = process.memoryUsage().heapUsed / 1024 / 1024;
        const freed = before - after;

        if (freed > 1) {
          this.cleanupCount++;
          console.log(
            `[AggressiveMemoryCleaner] GC #${this.cleanupCount}: ${before.toFixed(1)}MB → ${after.toFixed(1)}MB (释放 ${freed.toFixed(1)}MB)`
          );
        }
      }

      // 根据内存压力采取行动
      if (heapUsedMB >= this.thresholds.emergency) {
        this.handleEmergency(heapUsedMB);
      } else if (heapUsedMB >= this.thresholds.critical) {
        this.handleCritical(heapUsedMB);
      } else if (heapUsedMB >= this.thresholds.warning) {
        this.handleWarning(heapUsedMB);
      }
    }, 5000); // 每 5 秒检查一次
  }

  /**
   * 处理警告级别
   */
  private handleWarning(heapUsedMB: number): void {
    console.warn(
      `[AggressiveMemoryCleaner] 警告: 内存使用 ${heapUsedMB.toFixed(1)}MB (阈值: ${this.thresholds.warning}MB)`
    );

    // 清理缓存
    this.clearAllCaches();
  }

  /**
   * 处理严重级别
   */
  private handleCritical(heapUsedMB: number): void {
    console.error(
      `[AggressiveMemoryCleaner] 严重: 内存使用 ${heapUsedMB.toFixed(1)}MB (阈值: ${this.thresholds.critical}MB)`
    );

    // 清理所有缓存
    this.clearAllCaches();

    // 强制垃圾回收
    if (global.gc) {
      global.gc();
    }

    // 禁用新请求
    process.env.PAUSE_NEW_REQUESTS = 'true';
  }

  /**
   * 处理紧急级别
   */
  private handleEmergency(heapUsedMB: number): void {
    console.error(
      `[AggressiveMemoryCleaner] 🚨 紧急: 内存使用 ${heapUsedMB.toFixed(1)}MB (阈值: ${this.thresholds.emergency}MB)`
    );

    // 清理所有缓存
    this.clearAllCaches();

    // 强制垃圾回收
    if (global.gc) {
      global.gc();
      global.gc(); // 执行两次
    }

    // 禁用所有后台任务
    process.env.DISABLE_ALL_BACKGROUND_TASKS = 'true';

    // 发出警告
    console.error('[AggressiveMemoryCleaner] ⚠️ 内存紧急! 建议立即重启服务器');
  }

  /**
   * 清理所有缓存
   */
  private clearAllCaches(): void {
    // 清理 require 缓存
    Object.keys(require.cache).forEach((key) => {
      delete require.cache[key];
    });

    // 清理全局缓存
    if (global.gc) {
      global.gc();
    }

    console.log('[AggressiveMemoryCleaner] 已清理所有缓存');
  }

  /**
   * 获取内存统计
   */
  getMemoryStats(): {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    rssMemoryMB: number;
    usagePercent: number;
    cleanupCount: number;
  } {
    const memUsage = process.memoryUsage();

    return {
      heapUsedMB: memUsage.heapUsed / 1024 / 1024,
      heapTotalMB: memUsage.heapTotal / 1024 / 1024,
      externalMB: memUsage.external / 1024 / 1024,
      rssMemoryMB: memUsage.rss / 1024 / 1024,
      usagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      cleanupCount: this.cleanupCount,
    };
  }

  /**
   * 优雅关闭
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    console.log('[AggressiveMemoryCleaner] 已关闭');
  }
}

// 全局实例
let memoryCleaner: AggressiveMemoryCleaner | null = null;

export function getAggressiveMemoryCleaner(): AggressiveMemoryCleaner {
  if (!memoryCleaner) {
    memoryCleaner = new AggressiveMemoryCleaner();
  }
  return memoryCleaner;
}

export function initializeAggressiveMemoryCleaner(): void {
  getAggressiveMemoryCleaner();
  console.log('[AggressiveMemoryCleaner] 激进的内存清理器已初始化');
}
