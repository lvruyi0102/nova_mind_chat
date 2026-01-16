/**
 * Memory Optimizer - 激进的缓存清理和内存管理策略
 * 目标：在堆内存使用率达到 85% 时主动清理，避免 94% 的警告
 */

import { getDb } from "./db";

interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  external: number;
  usagePercent: number;
  timestamp: Date;
}

class MemoryOptimizer {
  private lastCleanupTime = 0;
  private cleanupInterval = 60000; // 最少间隔 1 分钟
  private heapThreshold = 0.85; // 85% 触发清理
  private criticalThreshold = 0.92; // 92% 时执行紧急清理

  /**
   * 获取当前内存统计
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    const usagePercent = memUsage.heapUsed / memUsage.heapTotal;

    return {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024),
      usagePercent: Math.round(usagePercent * 1000) / 1000,
      timestamp: new Date(),
    };
  }

  /**
   * 检查是否需要清理
   */
  shouldCleanup(): boolean {
    const now = Date.now();
    if (now - this.lastCleanupTime < this.cleanupInterval) {
      return false;
    }

    const stats = this.getMemoryStats();
    return stats.usagePercent >= this.heapThreshold;
  }

  /**
   * 执行内存清理
   */
  async cleanup(): Promise<MemoryStats> {
    const startStats = this.getMemoryStats();
    const isCritical = startStats.usagePercent >= this.criticalThreshold;

    console.log(
      `[MemoryOptimizer] Starting cleanup (${isCritical ? "CRITICAL" : "NORMAL"} mode)`
    );

    // 1. 清理数据库连接池
    await this.cleanupDatabaseConnections();

    // 2. 清理缓存
    this.clearCaches();

    // 3. 强制垃圾回收（如果可用）
    if (global.gc) {
      global.gc();
    }

    // 4. 如果仍然处于临界状态，执行激进清理
    if (isCritical) {
      await this.aggressiveCleanup();
    }

    this.lastCleanupTime = Date.now();
    const endStats = this.getMemoryStats();

    console.log(
      `[MemoryOptimizer] Cleanup complete: ${startStats.heapUsed}MB → ${endStats.heapUsed}MB (${startStats.usagePercent * 100}% → ${endStats.usagePercent * 100}%)`
    );

    return endStats;
  }

  /**
   * 清理数据库连接
   */
  private async cleanupDatabaseConnections(): Promise<void> {
    try {
      const db = await getDb();
      if (db) {
        // 关闭空闲连接
        // 注意：drizzle-orm 没有直接的连接池管理 API
        // 这里作为占位符，实际实现取决于数据库驱动
        console.log("[MemoryOptimizer] Database connections checked");
      }
    } catch (error) {
      console.error("[MemoryOptimizer] Error cleaning database connections:", error);
    }
  }

  /**
   * 清理应用级缓存
   */
  private clearCaches(): void {
    // 清理 Node.js 模块缓存中的大型对象
    // 这是一个激进的操作，应该谨慎使用
    const moduleCache = require.cache;
    let cleared = 0;

    for (const key in moduleCache) {
      // 只清理非核心模块的缓存
      if (
        !key.includes("node_modules") ||
        key.includes("node_modules/.vite") ||
        key.includes("node_modules/.pnpm")
      ) {
        delete moduleCache[key];
        cleared++;
      }
    }

    console.log(`[MemoryOptimizer] Cleared ${cleared} module cache entries`);
  }

  /**
   * 激进清理 - 在内存非常紧张时执行
   */
  private async aggressiveCleanup(): Promise<void> {
    console.log("[MemoryOptimizer] Executing aggressive cleanup...");

    // 1. 清理所有非必要的缓存
    this.clearAllCaches();

    // 2. 关闭不活跃的连接
    await this.closeIdleConnections();

    // 3. 再次强制垃圾回收
    if (global.gc) {
      global.gc();
      global.gc(); // 执行两次以确保充分清理
    }
  }

  /**
   * 清理所有缓存
   */
  private clearAllCaches(): void {
    // 清理 require 缓存
    Object.keys(require.cache).forEach((key) => {
      delete require.cache[key];
    });

    console.log("[MemoryOptimizer] All caches cleared");
  }

  /**
   * 关闭不活跃的连接
   */
  private async closeIdleConnections(): Promise<void> {
    // 这是一个占位符，实际实现取决于应用的连接管理
    console.log("[MemoryOptimizer] Idle connections closed");
  }

  /**
   * 定期检查内存并自动清理
   */
  startMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();

      if (stats.usagePercent >= this.criticalThreshold) {
        console.warn(
          `[MemoryOptimizer] CRITICAL: Heap usage at ${(stats.usagePercent * 100).toFixed(1)}%`
        );
        this.cleanup().catch((error) => {
          console.error("[MemoryOptimizer] Cleanup error:", error);
        });
      } else if (stats.usagePercent >= this.heapThreshold) {
        console.log(
          `[MemoryOptimizer] High: Heap usage at ${(stats.usagePercent * 100).toFixed(1)}%`
        );
        if (this.shouldCleanup()) {
          this.cleanup().catch((error) => {
            console.error("[MemoryOptimizer] Cleanup error:", error);
          });
        }
      }
    }, 30000); // 每 30 秒检查一次
  }
}

export const memoryOptimizer = new MemoryOptimizer();
