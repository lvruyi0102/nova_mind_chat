/**
 * 紧急内存恢复服务
 * 当堆内存使用率超过 80% 时触发最激进的清理措施
 * 目标：在 5 分钟内将内存使用率降至 50% 以下
 */

interface RecoveryMetrics {
  beforeHeapUsed: number;
  afterHeapUsed: number;
  freedMemory: number;
  recoveryPercent: number;
  executionTime: number;
  success: boolean;
}

class EmergencyMemoryRecovery {
  private static instance: EmergencyMemoryRecovery | null = null;
  private lastRecoveryTime = 0;
  private recoveryInterval = 2 * 60 * 1000; // 2 分钟最少间隔
  private recoveryHistory: RecoveryMetrics[] = [];
  private maxHistorySize = 20;

  private constructor() {
    this.startEmergencyMonitoring();
  }

  static getInstance(): EmergencyMemoryRecovery {
    if (!EmergencyMemoryRecovery.instance) {
      EmergencyMemoryRecovery.instance = new EmergencyMemoryRecovery();
    }
    return EmergencyMemoryRecovery.instance;
  }

  /**
   * 启动紧急监控
   */
  private startEmergencyMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

      // 如果堆使用率超过 80%，立即触发恢复
      if (heapUsagePercent > 0.80) {
        console.error(
          `[EmergencyMemoryRecovery] CRITICAL: Heap usage at ${(heapUsagePercent * 100).toFixed(1)}% - triggering emergency recovery`
        );
        this.executeEmergencyRecovery().catch((error) => {
          console.error("[EmergencyMemoryRecovery] Recovery error:", error);
        });
      }
    }, 30 * 1000); // 每 30 秒检查一次

    console.log("[EmergencyMemoryRecovery] Emergency monitoring started");
  }

  /**
   * 执行紧急恢复
   */
  async executeEmergencyRecovery(): Promise<RecoveryMetrics> {
    const now = Date.now();
    const startTime = now;

    // 检查冷却期
    if (now - this.lastRecoveryTime < this.recoveryInterval) {
      console.warn("[EmergencyMemoryRecovery] Recovery in cooldown period");
      return {
        beforeHeapUsed: 0,
        afterHeapUsed: 0,
        freedMemory: 0,
        recoveryPercent: 0,
        executionTime: 0,
        success: false,
      };
    }

    const beforeMemory = process.memoryUsage();

    try {
      console.log("[EmergencyMemoryRecovery] Starting emergency recovery...");

      // 1. 强制垃圾回收（多次）
      console.log("[EmergencyMemoryRecovery] Step 1: Forcing garbage collection (3x)...");
      for (let i = 0; i < 3; i++) {
        if (global.gc) {
          global.gc();
          await this.sleep(500);
        }
      }

      // 2. 清理 require 缓存
      console.log("[EmergencyMemoryRecovery] Step 2: Clearing require cache...");
      this.clearRequireCache();

      // 3. 清理全局对象
      console.log("[EmergencyMemoryRecovery] Step 3: Clearing global objects...");
      this.clearGlobalObjects();

      // 4. 再次强制垃圾回收
      console.log("[EmergencyMemoryRecovery] Step 4: Final garbage collection...");
      if (global.gc) {
        global.gc();
      }

      const afterMemory = process.memoryUsage();
      const freedMemory = beforeMemory.heapUsed - afterMemory.heapUsed;
      const recoveryPercent =
        (freedMemory / beforeMemory.heapUsed) * 100;
      const executionTime = Date.now() - startTime;

      this.lastRecoveryTime = now;

      const metrics: RecoveryMetrics = {
        beforeHeapUsed: beforeMemory.heapUsed,
        afterHeapUsed: afterMemory.heapUsed,
        freedMemory,
        recoveryPercent,
        executionTime,
        success: true,
      };

      this.recordMetrics(metrics);

      console.log(
        `[EmergencyMemoryRecovery] Recovery completed in ${executionTime}ms. Freed: ${(freedMemory / 1024 / 1024).toFixed(2)}MB (${recoveryPercent.toFixed(1)}%)`
      );

      return metrics;
    } catch (error) {
      console.error("[EmergencyMemoryRecovery] Recovery failed:", error);
      return {
        beforeHeapUsed: beforeMemory.heapUsed,
        afterHeapUsed: process.memoryUsage().heapUsed,
        freedMemory: 0,
        recoveryPercent: 0,
        executionTime: Date.now() - startTime,
        success: false,
      };
    }
  }

  /**
   * 清理 require 缓存
   */
  private clearRequireCache(): void {
    try {
      // 在 ES 模块中，require 可能不可用
      if (typeof require !== "undefined" && require.cache) {
        const cacheKeys = Object.keys(require.cache);
        let clearedCount = 0;

        for (const key of cacheKeys) {
          if (
            !key.includes("internal/") &&
            !key.includes("node_modules/node-") &&
            !key.includes("node_modules/typescript")
          ) {
            delete require.cache[key];
            clearedCount++;
          }
        }

        console.log(`[EmergencyMemoryRecovery] Cleared ${clearedCount} cache entries`);
      } else {
        console.log("[EmergencyMemoryRecovery] require.cache not available (ES modules)");
      }
    } catch (error) {
      console.warn("[EmergencyMemoryRecovery] Error clearing require cache:", error);
    }
  }

  /**
   * 清理全局对象
   */
  private clearGlobalObjects(): void {
    // 清理进程事件监听器
    const uncaughtHandlers = process.listeners("uncaughtException");
    uncaughtHandlers.forEach((handler) => {
      process.removeListener("uncaughtException", handler);
    });

    const unhandledHandlers = process.listeners("unhandledRejection");
    unhandledHandlers.forEach((handler) => {
      process.removeListener("unhandledRejection", handler);
    });

    console.log("[EmergencyMemoryRecovery] Cleared global event listeners");
  }

  /**
   * 记录恢复指标
   */
  private recordMetrics(metrics: RecoveryMetrics): void {
    this.recoveryHistory.push(metrics);
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory.shift();
    }
  }

  /**
   * 获取恢复历史
   */
  getRecoveryHistory(): RecoveryMetrics[] {
    return [...this.recoveryHistory];
  }

  /**
   * 获取最后一次恢复的指标
   */
  getLastRecoveryMetrics(): RecoveryMetrics | null {
    return this.recoveryHistory.length > 0
      ? this.recoveryHistory[this.recoveryHistory.length - 1]
      : null;
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export function getEmergencyMemoryRecovery(): EmergencyMemoryRecovery {
  return EmergencyMemoryRecovery.getInstance();
}

export async function executeEmergencyRecovery(): Promise<RecoveryMetrics> {
  return getEmergencyMemoryRecovery().executeEmergencyRecovery();
}
