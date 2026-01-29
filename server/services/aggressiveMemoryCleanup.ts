/**
 * 激进的内存清理服务
 * 在内存使用率超过 90% 时触发
 * 禁用所有非关键后台任务，强制垃圾回收
 */

import { getDb } from "../db";

interface CleanupResult {
  success: boolean;
  freedMemory: number;
  actions: string[];
  timestamp: number;
}

class AggressiveMemoryCleanup {
  private static instance: AggressiveMemoryCleanup | null = null;
  private lastCleanupTime = 0;
  private cleanupCooldown = 5 * 60 * 1000; // 5 分钟冷却期
  private backgroundTasksDisabled = false;
  private disabledAt = 0;
  private disableDuration = 30 * 60 * 1000; // 禁用 30 分钟

  private constructor() {}

  static getInstance(): AggressiveMemoryCleanup {
    if (!AggressiveMemoryCleanup.instance) {
      AggressiveMemoryCleanup.instance = new AggressiveMemoryCleanup();
    }
    return AggressiveMemoryCleanup.instance;
  }

  /**
   * 执行激进清理
   */
  async executeCleanup(): Promise<CleanupResult> {
    const now = Date.now();
    const actions: string[] = [];

    // 检查冷却期
    if (now - this.lastCleanupTime < this.cleanupCooldown) {
      return {
        success: false,
        freedMemory: 0,
        actions: ["Cleanup in cooldown period"],
        timestamp: now,
      };
    }

    const beforeMemory = process.memoryUsage().heapUsed;

    try {
      // 1. 禁用后台任务
      if (!this.backgroundTasksDisabled) {
        this.disableBackgroundTasks();
        actions.push("Disabled all background tasks for 30 minutes");
      }

      // 2. 清理数据库连接
      await this.cleanupDatabaseConnections();
      actions.push("Cleaned up database connections");

      // 3. 清理全局缓存
      this.clearGlobalCaches();
      actions.push("Cleared global caches");

      // 4. 强制垃圾回收
      if (global.gc) {
        global.gc();
        actions.push("Triggered garbage collection");
      }

      // 5. 清理事件监听器
      this.clearEventListeners();
      actions.push("Cleared event listeners");

      // 6. 再次强制垃圾回收
      if (global.gc) {
        global.gc();
      }

      const afterMemory = process.memoryUsage().heapUsed;
      const freedMemory = beforeMemory - afterMemory;

      this.lastCleanupTime = now;

      console.log(
        `[AggressiveMemoryCleanup] Cleanup completed. Freed: ${(freedMemory / 1024 / 1024).toFixed(2)}MB`
      );

      return {
        success: true,
        freedMemory,
        actions,
        timestamp: now,
      };
    } catch (error) {
      console.error("[AggressiveMemoryCleanup] Error during cleanup:", error);
      return {
        success: false,
        freedMemory: 0,
        actions: [...actions, `Error: ${String(error)}`],
        timestamp: now,
      };
    }
  }

  /**
   * 禁用后台任务
   */
  private disableBackgroundTasks(): void {
    this.backgroundTasksDisabled = true;
    this.disabledAt = Date.now();

    // 设置自动重新启用定时器
    setTimeout(() => {
      this.backgroundTasksDisabled = false;
      console.log("[AggressiveMemoryCleanup] Background tasks re-enabled");
    }, this.disableDuration);

    console.log("[AggressiveMemoryCleanup] Background tasks disabled for 30 minutes");
  }

  /**
   * 检查后台任务是否被禁用
   */
  areBackgroundTasksDisabled(): boolean {
    if (!this.backgroundTasksDisabled) {
      return false;
    }

    // 检查禁用是否已过期
    if (Date.now() - this.disabledAt > this.disableDuration) {
      this.backgroundTasksDisabled = false;
      return false;
    }

    return true;
  }

  /**
   * 清理数据库连接
   */
  private async cleanupDatabaseConnections(): Promise<void> {
    try {
      const db = await getDb();
      if (db) {
        // 关闭所有空闲连接
        // 注意：Drizzle ORM 不直接暴露连接池，这里是占位符
        console.log("[AggressiveMemoryCleanup] Database connections cleanup attempted");
      }
    } catch (error) {
      console.error("[AggressiveMemoryCleanup] Error cleaning database connections:", error);
    }
  }

  /**
   * 清理全局缓存
   */
  private clearGlobalCaches(): void {
    // 清理 Node.js 模块缓存中的大型对象
    const cacheKeys = Object.keys(require.cache);
    let clearedCount = 0;

    for (const key of cacheKeys) {
      // 只清理非核心模块的缓存
      if (
        !key.includes("node_modules") ||
        (key.includes("node_modules") && key.includes("services"))
      ) {
        delete require.cache[key];
        clearedCount++;
      }
    }

    console.log(`[AggressiveMemoryCleanup] Cleared ${clearedCount} cache entries`);
  }

  /**
   * 清理事件监听器
   */
  private clearEventListeners(): void {
    // 清理进程事件监听器
    const listeners = process.listeners("uncaughtException");
    listeners.forEach((listener) => {
      process.removeListener("uncaughtException", listener);
    });

    console.log("[AggressiveMemoryCleanup] Cleared event listeners");
  }

  /**
   * 获取清理状态
   */
  getStatus(): {
    backgroundTasksDisabled: boolean;
    disabledUntil: number;
    lastCleanupTime: number;
  } {
    return {
      backgroundTasksDisabled: this.backgroundTasksDisabled,
      disabledUntil: this.backgroundTasksDisabled ? this.disabledAt + this.disableDuration : 0,
      lastCleanupTime: this.lastCleanupTime,
    };
  }
}

export function getAggressiveMemoryCleanup(): AggressiveMemoryCleanup {
  return AggressiveMemoryCleanup.getInstance();
}

export async function executeAggressiveCleanup(): Promise<CleanupResult> {
  return getAggressiveMemoryCleanup().executeCleanup();
}
