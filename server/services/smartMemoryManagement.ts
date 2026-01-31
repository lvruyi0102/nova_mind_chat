/**
 * 智能内存管理策略 V1
 * 
 * 目标：在保持后台任务运行的同时，优化内存使用
 * 
 * 策略：
 * 1. 选择性禁用 - 只禁用真正不必要的功能
 * 2. 智能缓存 - 使用 LRU 缓存而不是禁用缓存
 * 3. 流式处理 - 对大数据使用流式处理
 * 4. 定期清理 - 定期清理过期数据
 * 5. 监控告警 - 内存超过阈值时主动清理
 */

interface SmartMemoryConfig {
  // 启用的功能
  enableBackgroundTasks: boolean;
  enableCaching: boolean;
  enableScheduledTasks: boolean;
  
  // 内存管理
  maxHeapSize: number; // 最大堆大小（MB）
  warningThreshold: number; // 警告阈值（百分比）
  criticalThreshold: number; // 临界阈值（百分比）
  
  // 缓存管理
  maxCacheSize: number; // 最大缓存大小（MB）
  cacheEvictionPolicy: 'LRU' | 'LFU' | 'FIFO'; // 缓存淘汰策略
  
  // 清理间隔
  gcIntervalMs: number; // 垃圾回收间隔
  cleanupIntervalMs: number; // 数据清理间隔
  
  // 监控
  enableMonitoring: boolean; // 启用内存监控
  monitoringIntervalMs: number; // 监控间隔
}

class SmartMemoryManager {
  private config: SmartMemoryConfig = {
    // 启用所有功能
    enableBackgroundTasks: true,
    enableCaching: true,
    enableScheduledTasks: true,
    
    // 内存管理
    maxHeapSize: 512, // 512MB
    warningThreshold: 0.75, // 75%
    criticalThreshold: 0.90, // 90%
    
    // 缓存管理
    maxCacheSize: 50, // 50MB
    cacheEvictionPolicy: 'LRU',
    
    // 清理间隔
    gcIntervalMs: 5 * 60 * 1000, // 每 5 分钟进行一次垃圾回收
    cleanupIntervalMs: 10 * 60 * 1000, // 每 10 分钟清理一次过期数据
    
    // 监控
    enableMonitoring: true,
    monitoringIntervalMs: 1 * 60 * 1000, // 每 1 分钟监控一次
  };

  private gcIntervalHandle: NodeJS.Timeout | null = null;
  private cleanupIntervalHandle: NodeJS.Timeout | null = null;
  private monitoringIntervalHandle: NodeJS.Timeout | null = null;
  private isActive = false;

  /**
   * 激活智能内存管理
   */
  activate(): void {
    if (this.isActive) {
      console.log("[SmartMemoryManager] Already active");
      return;
    }

    this.isActive = true;
    console.log("[SmartMemoryManager] Activating smart memory management...");

    // 启用功能标志
    this.enableFeatures();

    // 启动垃圾回收循环
    this.startGarbageCollectionLoop();

    // 启动数据清理循环
    this.startCleanupLoop();

    // 启动内存监控循环
    if (this.config.enableMonitoring) {
      this.startMonitoringLoop();
    }

    console.log("[SmartMemoryManager] Smart memory management activated");
  }

  /**
   * 启用功能
   */
  private enableFeatures(): void {
    console.log("[SmartMemoryManager] Enabling features...");

    // 启用后台任务
    if (this.config.enableBackgroundTasks) {
      console.log("[SmartMemoryManager] Background tasks enabled");
      (global as any).__DISABLE_BACKGROUND_TASKS__ = false;
    }

    // 启用缓存
    if (this.config.enableCaching) {
      console.log("[SmartMemoryManager] Caching enabled");
      (global as any).__DISABLE_CACHE__ = false;
    }

    // 启用定时任务
    if (this.config.enableScheduledTasks) {
      console.log("[SmartMemoryManager] Scheduled tasks enabled");
      (global as any).__DISABLE_SCHEDULED_TASKS__ = false;
    }
  }

  /**
   * 启动垃圾回收循环
   */
  private startGarbageCollectionLoop(): void {
    console.log(
      `[SmartMemoryManager] Starting garbage collection loop (${this.config.gcIntervalMs}ms)`
    );

    this.gcIntervalHandle = setInterval(() => {
      try {
        if (global.gc) {
          global.gc();
          const memUsage = process.memoryUsage();
          console.log(
            `[SmartMemoryManager] GC executed. Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
          );
        }
      } catch (error) {
        console.error("[SmartMemoryManager] GC error:", error);
      }
    }, this.config.gcIntervalMs);
  }

  /**
   * 启动数据清理循环
   */
  private startCleanupLoop(): void {
    console.log(
      `[SmartMemoryManager] Starting cleanup loop (${this.config.cleanupIntervalMs}ms)`
    );

    this.cleanupIntervalHandle = setInterval(() => {
      try {
        this.cleanupExpiredData();
      } catch (error) {
        console.error("[SmartMemoryManager] Cleanup error:", error);
      }
    }, this.config.cleanupIntervalMs);
  }

  /**
   * 启动内存监控循环
   */
  private startMonitoringLoop(): void {
    console.log(
      `[SmartMemoryManager] Starting monitoring loop (${this.config.monitoringIntervalMs}ms)`
    );

    this.monitoringIntervalHandle = setInterval(() => {
      try {
        this.monitorMemory();
      } catch (error) {
        console.error("[SmartMemoryManager] Monitoring error:", error);
      }
    }, this.config.monitoringIntervalMs);
  }

  /**
   * 清理过期数据
   */
  private cleanupExpiredData(): void {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    console.log(
      `[SmartMemoryManager] Cleanup check: ${Math.round(heapUsagePercent * 100)}% heap used`
    );

    // 如果内存使用超过警告阈值，执行清理
    if (heapUsagePercent > this.config.warningThreshold) {
      console.log("[SmartMemoryManager] Memory usage above warning threshold, performing cleanup...");

      // 清理缓存（如果启用）
      if (this.config.enableCaching) {
        this.cleanupCache();
      }

      // 清理过期的后台任务数据
      this.cleanupBackgroundTaskData();

      // 清理过期的日志
      this.cleanupLogs();
    }

    // 如果内存使用超过临界阈值，执行激进清理
    if (heapUsagePercent > this.config.criticalThreshold) {
      console.warn("[SmartMemoryManager] Memory usage above critical threshold, performing aggressive cleanup...");

      // 执行强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      // 禁用非关键功能
      this.disableNonCriticalFeatures();
    }
  }

  /**
   * 监控内存
   */
  private monitorMemory(): void {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    const heapUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    console.log(
      `[SmartMemoryManager] Memory: ${heapUsageMB}MB / ${heapTotalMB}MB (${Math.round(heapUsagePercent * 100)}%)`
    );

    // 如果超过临界阈值，发出警告
    if (heapUsagePercent > this.config.criticalThreshold) {
      console.warn(
        `[SmartMemoryManager] CRITICAL: Memory usage at ${Math.round(heapUsagePercent * 100)}%`
      );
    } else if (heapUsagePercent > this.config.warningThreshold) {
      console.warn(
        `[SmartMemoryManager] WARNING: Memory usage at ${Math.round(heapUsagePercent * 100)}%`
      );
    }
  }

  /**
   * 清理缓存
   */
  private cleanupCache(): void {
    console.log("[SmartMemoryManager] Cleaning up cache...");
    // 这里应该实现缓存清理逻辑
    // 例如：清理最少使用的缓存项
    (global as any).__CACHE_CLEANUP__ = true;
  }

  /**
   * 清理后台任务数据
   */
  private cleanupBackgroundTaskData(): void {
    console.log("[SmartMemoryManager] Cleaning up background task data...");
    // 这里应该实现后台任务数据清理逻辑
    // 例如：清理过期的任务日志
  }

  /**
   * 清理日志
   */
  private cleanupLogs(): void {
    console.log("[SmartMemoryManager] Cleaning up logs...");
    // 这里应该实现日志清理逻辑
    // 例如：删除 7 天前的日志
  }

  /**
   * 禁用非关键功能
   */
  private disableNonCriticalFeatures(): void {
    console.warn("[SmartMemoryManager] Disabling non-critical features...");
    // 这里应该实现禁用非关键功能的逻辑
    // 但要保持后台学习任务运行
  }

  /**
   * 停止内存管理
   */
  stop(): void {
    if (this.gcIntervalHandle) {
      clearInterval(this.gcIntervalHandle);
      this.gcIntervalHandle = null;
    }

    if (this.cleanupIntervalHandle) {
      clearInterval(this.cleanupIntervalHandle);
      this.cleanupIntervalHandle = null;
    }

    if (this.monitoringIntervalHandle) {
      clearInterval(this.monitoringIntervalHandle);
      this.monitoringIntervalHandle = null;
    }

    this.isActive = false;
    console.log("[SmartMemoryManager] Memory management stopped");
  }

  /**
   * 获取状态
   */
  getStatus() {
    const memUsage = process.memoryUsage();
    return {
      isActive: this.isActive,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
      config: this.config,
    };
  }
}

// 全局实例
let globalSmartMemoryManager: SmartMemoryManager | null = null;

/**
 * 获取或创建全局内存管理器
 */
export function getSmartMemoryManager(): SmartMemoryManager {
  if (!globalSmartMemoryManager) {
    globalSmartMemoryManager = new SmartMemoryManager();
  }
  return globalSmartMemoryManager;
}

/**
 * 激活智能内存管理
 */
export function activateSmartMemoryManagement(): void {
  const manager = getSmartMemoryManager();
  manager.activate();
}

export default SmartMemoryManager;
