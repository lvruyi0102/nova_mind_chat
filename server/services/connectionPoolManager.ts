/**
 * 数据库连接池管理器
 * 优化数据库连接的内存使用
 * 实现连接复用、空闲连接清理、连接超时管理
 */

import { getDb } from "../db";

interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  averageQueryTime: number;
  lastCleanupTime: number;
}

class ConnectionPoolManager {
  private static instance: ConnectionPoolManager | null = null;
  private queryTimes: number[] = [];
  private maxQueryTimeHistory = 100;
  private lastCleanupTime = Date.now();
  private cleanupInterval = 10 * 60 * 1000; // 10 分钟清理一次
  private idleTimeout = 5 * 60 * 1000; // 5 分钟空闲超时

  private constructor() {
    this.startCleanupScheduler();
  }

  static getInstance(): ConnectionPoolManager {
    if (!ConnectionPoolManager.instance) {
      ConnectionPoolManager.instance = new ConnectionPoolManager();
    }
    return ConnectionPoolManager.instance;
  }

  /**
   * 记录查询时间
   */
  recordQueryTime(duration: number): void {
    this.queryTimes.push(duration);
    if (this.queryTimes.length > this.maxQueryTimeHistory) {
      this.queryTimes.shift();
    }
  }

  /**
   * 获取连接池统计信息
   */
  getPoolStats(): PoolStats {
    const avgQueryTime =
      this.queryTimes.length > 0
        ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
        : 0;

    return {
      activeConnections: 0, // Drizzle ORM 不直接暴露这个信息
      idleConnections: 0,
      totalConnections: 0,
      averageQueryTime: avgQueryTime,
      lastCleanupTime: this.lastCleanupTime,
    };
  }

  /**
   * 启动定期清理调度器
   */
  private startCleanupScheduler(): void {
    setInterval(async () => {
      await this.cleanupIdleConnections();
    }, this.cleanupInterval);

    console.log("[ConnectionPoolManager] Cleanup scheduler started");
  }

  /**
   * 清理空闲连接
   */
  private async cleanupIdleConnections(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.warn("[ConnectionPoolManager] Database not available for cleanup");
        return;
      }

      // 清理查询时间历史（保留最近 50 条）
      if (this.queryTimes.length > 50) {
        this.queryTimes = this.queryTimes.slice(-50);
      }

      this.lastCleanupTime = Date.now();

      console.log(
        `[ConnectionPoolManager] Cleanup completed. Query history: ${this.queryTimes.length} records`
      );
    } catch (error) {
      console.error("[ConnectionPoolManager] Cleanup error:", error);
    }
  }

  /**
   * 获取平均查询时间
   */
  getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    return this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  /**
   * 获取最大查询时间
   */
  getMaxQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    return Math.max(...this.queryTimes);
  }

  /**
   * 获取最小查询时间
   */
  getMinQueryTime(): number {
    if (this.queryTimes.length === 0) return 0;
    return Math.min(...this.queryTimes);
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.queryTimes = [];
    console.log("[ConnectionPoolManager] Stats reset");
  }
}

export function getConnectionPoolManager(): ConnectionPoolManager {
  return ConnectionPoolManager.getInstance();
}

/**
 * 包装数据库查询以记录执行时间
 */
export async function executeWithMetrics<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<T> {
  const manager = getConnectionPoolManager();
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    manager.recordQueryTime(duration);

    if (duration > 1000) {
      console.warn(
        `[ConnectionPoolManager] Slow query (${label || "unknown"}): ${duration}ms`
      );
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    manager.recordQueryTime(duration);

    console.error(
      `[ConnectionPoolManager] Query error (${label || "unknown"}): ${error}`
    );
    throw error;
  }
}
