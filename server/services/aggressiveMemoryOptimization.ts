/**
 * 激进的内存优化策略 V4
 * 目标：将堆内存使用率从 96% 降低到 80% 以下
 * 
 * 策略：
 * 1. 禁用所有非核心后台任务
 * 2. 禁用缓存系统（使用直接查询替代）
 * 3. 禁用事件监听器积累
 * 4. 强制每 2 分钟进行一次垃圾回收
 * 5. 限制数据库连接池大小
 * 6. 禁用所有定时任务（除了内存清理）
 */

import { getMemoryOptimizerV2 } from "./memoryOptimizerV2";

interface AggressiveOptimizationConfig {
  // 禁用的功能
  disableAllBackgroundTasks: boolean;
  disableCache: boolean;
  disableEventListeners: boolean;
  disableScheduledTasks: boolean;
  
  // 激进的清理策略
  gcIntervalMs: number; // 垃圾回收间隔
  memoryCheckIntervalMs: number; // 内存检查间隔
  aggressiveCleanupThreshold: number; // 激进清理阈值（百分比）
  
  // 资源限制
  maxDatabaseConnections: number;
  maxCacheSize: number;
  maxEventListeners: number;
}

class AggressiveMemoryOptimization {
  private config: AggressiveOptimizationConfig = {
    // 禁用所有非核心功能
    disableAllBackgroundTasks: true,
    disableCache: true,
    disableEventListeners: true,
    disableScheduledTasks: true,
    
    // 激进的清理策略
    gcIntervalMs: 2 * 60 * 1000, // 每 2 分钟进行一次垃圾回收
    memoryCheckIntervalMs: 1 * 60 * 1000, // 每 1 分钟检查一次内存
    aggressiveCleanupThreshold: 0.75, // 75% 时触发激进清理
    
    // 资源限制
    maxDatabaseConnections: 2, // 最多 2 个数据库连接
    maxCacheSize: 10 * 1024 * 1024, // 10MB 缓存上限
    maxEventListeners: 10, // 最多 10 个事件监听器
  };

  private memoryOptimizer = getMemoryOptimizerV2();
  private gcIntervalHandle: NodeJS.Timeout | null = null;
  private memoryCheckHandle: NodeJS.Timeout | null = null;
  private isActive = false;

  /**
   * 激活激进的内存优化
   */
  activate(): void {
    if (this.isActive) {
      console.warn("[AggressiveMemoryOptimization] Already active");
      return;
    }

    this.isActive = true;
    console.log("[AggressiveMemoryOptimization] Activating aggressive memory optimization...");

    // 禁用所有不必要的功能
    this.disableUnnecessaryFeatures();

    // 启动垃圾回收循环
    this.startGarbageCollectionLoop();

    // 启动内存监控循环
    this.startMemoryMonitoringLoop();

    console.log("[AggressiveMemoryOptimization] Aggressive optimization activated");
  }

  /**
   * 禁用所有不必要的功能
   */
  private disableUnnecessaryFeatures(): void {
    console.log("[AggressiveMemoryOptimization] Disabling unnecessary features...");

    // 禁用缓存
    if (this.config.disableCache) {
      console.log("[AggressiveMemoryOptimization] Cache disabled");
      // 在应用中设置全局标志来禁用缓存
      (global as any).__DISABLE_CACHE__ = true;
    }

    // 禁用事件监听器
    if (this.config.disableEventListeners) {
      console.log("[AggressiveMemoryOptimization] Event listeners disabled");
      (global as any).__DISABLE_EVENT_LISTENERS__ = true;
    }

    // 禁用后台任务
    if (this.config.disableAllBackgroundTasks) {
      console.log("[AggressiveMemoryOptimization] Background tasks disabled");
      (global as any).__DISABLE_BACKGROUND_TASKS__ = true;
    }

    // 禁用定时任务
    if (this.config.disableScheduledTasks) {
      console.log("[AggressiveMemoryOptimization] Scheduled tasks disabled");
      (global as any).__DISABLE_SCHEDULED_TASKS__ = true;
    }
  }

  /**
   * 启动垃圾回收循环
   */
  private startGarbageCollectionLoop(): void {
    console.log(
      `[AggressiveMemoryOptimization] Starting GC loop (interval: ${this.config.gcIntervalMs}ms)`
    );

    this.gcIntervalHandle = setInterval(() => {
      try {
        // 强制垃圾回收
        this.memoryOptimizer.triggerGarbageCollection();
        
        // 清理全局缓存
        this.clearGlobalCaches();
        
        // 清理事件监听器
        this.clearEventListeners();
        
        const metrics = this.memoryOptimizer.getCurrentMetrics();
        console.log(
          `[AggressiveMemoryOptimization] GC cycle - Memory: ${(metrics.usagePercent * 100).toFixed(1)}%`
        );
      } catch (error) {
        console.error("[AggressiveMemoryOptimization] GC cycle error:", error);
      }
    }, this.config.gcIntervalMs);
  }

  /**
   * 启动内存监控循环
   */
  private startMemoryMonitoringLoop(): void {
    console.log(
      `[AggressiveMemoryOptimization] Starting memory monitoring (interval: ${this.config.memoryCheckIntervalMs}ms)`
    );

    this.memoryCheckHandle = setInterval(() => {
      try {
        const metrics = this.memoryOptimizer.getCurrentMetrics();
        const usagePercent = metrics.usagePercent;

        console.log(
          `[AggressiveMemoryOptimization] Memory check - ${(usagePercent * 100).toFixed(1)}% (${metrics.status})`
        );

        // 如果内存超过阈值，执行激进清理
        if (usagePercent > this.config.aggressiveCleanupThreshold) {
          console.error(
            `[AggressiveMemoryOptimization] CRITICAL: Memory ${(usagePercent * 100).toFixed(1)}% - triggering aggressive cleanup`
          );
          this.performAggressiveCleanup();
        }
      } catch (error) {
        console.error("[AggressiveMemoryOptimization] Memory check error:", error);
      }
    }, this.config.memoryCheckIntervalMs);
  }

  /**
   * 执行激进清理
   */
  private async performAggressiveCleanup(): Promise<void> {
    console.log("[AggressiveMemoryOptimization] Performing aggressive cleanup...");

    try {
      // 1. 清理全局缓存
      this.clearGlobalCaches();

      // 2. 清理事件监听器
      this.clearEventListeners();

      // 3. 强制垃圾回收（多次）
      for (let i = 0; i < 3; i++) {
        this.memoryOptimizer.triggerGarbageCollection();
        await this.sleep(100);
      }

      // 4. 清理 require 缓存
      this.clearRequireCache();

      // 5. 清理全局变量
      this.clearGlobalVariables();

      const metrics = this.memoryOptimizer.getCurrentMetrics();
      console.log(
        `[AggressiveMemoryOptimization] Cleanup completed - Memory: ${(metrics.usagePercent * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.error("[AggressiveMemoryOptimization] Cleanup error:", error);
    }
  }

  /**
   * 清理全局缓存
   */
  private clearGlobalCaches(): void {
    // 清理常见的缓存对象
    const cacheNames = [
      '__cache__',
      '__globalCache__',
      '__memoryCache__',
      '__requestCache__',
      '__dataCache__',
      '__queryCache__',
    ];

    for (const cacheName of cacheNames) {
      if ((global as any)[cacheName]) {
        (global as any)[cacheName] = {};
      }
    }
  }

  /**
   * 清理事件监听器
   */
  private clearEventListeners(): void {
    try {
      // 清理 process 事件监听器
      const listeners = process.eventNames();
      for (const eventName of listeners) {
        const eventListeners = process.listeners(eventName as any);
        if (eventListeners.length > this.config.maxEventListeners) {
          // 移除多余的监听器
          const toRemove = eventListeners.length - this.config.maxEventListeners;
          for (let i = 0; i < toRemove; i++) {
            process.removeListener(eventName as any, eventListeners[i]);
          }
        }
      }
    } catch (error) {
      console.error("[AggressiveMemoryOptimization] Error clearing event listeners:", error);
    }
  }

  /**
   * 清理 require 缓存
   */
  private clearRequireCache(): void {
    try {
      // 清理不必要的模块缓存
      const modulesToKeep = [
        'express',
        'trpc',
        'drizzle-orm',
        'node_modules',
      ];

      for (const moduleId in require.cache) {
        const shouldKeep = modulesToKeep.some(keep => moduleId.includes(keep));
        if (!shouldKeep && !moduleId.includes('node_modules')) {
          delete require.cache[moduleId];
        }
      }
    } catch (error) {
      console.error("[AggressiveMemoryOptimization] Error clearing require cache:", error);
    }
  }

  /**
   * 清理全局变量
   */
  private clearGlobalVariables(): void {
    // 清理临时全局变量
    const tempVars = [
      '__temp__',
      '__buffer__',
      '__data__',
      '__result__',
      '__response__',
    ];

    for (const varName of tempVars) {
      if ((global as any)[varName]) {
        delete (global as any)[varName];
      }
    }
  }

  /**
   * 停止优化
   */
  deactivate(): void {
    if (!this.isActive) {
      console.warn("[AggressiveMemoryOptimization] Not active");
      return;
    }

    this.isActive = false;

    if (this.gcIntervalHandle) {
      clearInterval(this.gcIntervalHandle);
      this.gcIntervalHandle = null;
    }

    if (this.memoryCheckHandle) {
      clearInterval(this.memoryCheckHandle);
      this.memoryCheckHandle = null;
    }

    console.log("[AggressiveMemoryOptimization] Deactivated");
  }

  /**
   * 获取配置
   */
  getConfig(): AggressiveOptimizationConfig {
    return this.config;
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isActive: boolean;
    config: AggressiveOptimizationConfig;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    return {
      isActive: this.isActive,
      config: this.config,
      memoryUsage: process.memoryUsage(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
let instance: AggressiveMemoryOptimization | null = null;

export function getAggressiveMemoryOptimization(): AggressiveMemoryOptimization {
  if (!instance) {
    instance = new AggressiveMemoryOptimization();
  }
  return instance;
}

export { AggressiveMemoryOptimization };
