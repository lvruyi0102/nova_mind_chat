/**
 * 自动重启管理器
 * 当内存使用率超过阈值时自动重启应用
 */

import { getMemoryOptimizerV2 } from "./memoryOptimizerV2";

interface AutoRestartConfig {
  // 重启触发条件
  memoryThreshold: number; // 内存使用率阈值（0-1）
  checkIntervalMs: number; // 检查间隔（毫秒）
  warningThreshold: number; // 警告阈值（0-1）
  
  // 重启策略
  enableAutoRestart: boolean; // 是否启用自动重启
  maxRestarts: number; // 最大重启次数（防止无限重启）
  restartCooldownMs: number; // 重启冷却时间
  
  // 定时重启
  enableScheduledRestart: boolean; // 是否启用定时重启
  scheduledRestartIntervalMs: number; // 定时重启间隔
}

class AutoRestartManager {
  private config: AutoRestartConfig = {
    // 重启触发条件
    memoryThreshold: 0.90, // 90% 时重启
    checkIntervalMs: 1 * 60 * 1000, // 每 1 分钟检查一次
    warningThreshold: 0.85, // 85% 时发出警告
    
    // 重启策略
    enableAutoRestart: true,
    maxRestarts: 5, // 最多重启 5 次
    restartCooldownMs: 5 * 60 * 1000, // 5 分钟冷却时间
    
    // 定时重启
    enableScheduledRestart: true,
    scheduledRestartIntervalMs: 12 * 60 * 60 * 1000, // 每 12 小时重启一次
  };

  private memoryOptimizer = getMemoryOptimizerV2();
  private checkIntervalHandle: NodeJS.Timeout | null = null;
  private scheduledRestartHandle: NodeJS.Timeout | null = null;
  private restartCount = 0;
  private lastRestartTime = 0;
  private isActive = false;

  /**
   * 激活自动重启管理器
   */
  activate(): void {
    if (this.isActive) {
      console.warn("[AutoRestartManager] Already active");
      return;
    }

    this.isActive = true;
    console.log("[AutoRestartManager] Activating auto-restart manager...");

    // 启动内存监控和重启检查
    this.startMemoryMonitoring();

    // 启动定时重启
    if (this.config.enableScheduledRestart) {
      this.startScheduledRestart();
    }

    console.log("[AutoRestartManager] Auto-restart manager activated");
  }

  /**
   * 启动内存监控
   */
  private startMemoryMonitoring(): void {
    console.log(
      `[AutoRestartManager] Starting memory monitoring (interval: ${this.config.checkIntervalMs}ms)`
    );

    this.checkIntervalHandle = setInterval(() => {
      try {
        const metrics = this.memoryOptimizer.getCurrentMetrics();
        const usagePercent = metrics.usagePercent;

        // 检查是否超过警告阈值
        if (usagePercent > this.config.warningThreshold && usagePercent < this.config.memoryThreshold) {
          console.warn(
            `[AutoRestartManager] WARNING: Memory ${(usagePercent * 100).toFixed(1)}% (threshold: ${(this.config.memoryThreshold * 100).toFixed(0)}%)`
          );
        }

        // 检查是否超过重启阈值
        if (usagePercent > this.config.memoryThreshold) {
          console.error(
            `[AutoRestartManager] CRITICAL: Memory ${(usagePercent * 100).toFixed(1)}% - triggering restart`
          );
          this.triggerRestart("memory_threshold_exceeded");
        }
      } catch (error) {
        console.error("[AutoRestartManager] Memory monitoring error:", error);
      }
    }, this.config.checkIntervalMs);
  }

  /**
   * 启动定时重启
   */
  private startScheduledRestart(): void {
    console.log(
      `[AutoRestartManager] Starting scheduled restart (interval: ${(this.config.scheduledRestartIntervalMs / 1000 / 60 / 60).toFixed(1)} hours)`
    );

    this.scheduledRestartHandle = setInterval(() => {
      console.log("[AutoRestartManager] Scheduled restart triggered");
      this.triggerRestart("scheduled");
    }, this.config.scheduledRestartIntervalMs);
  }

  /**
   * 触发重启
   */
  private triggerRestart(reason: string): void {
    // 检查冷却时间
    const now = Date.now();
    if (now - this.lastRestartTime < this.config.restartCooldownMs) {
      console.warn(
        `[AutoRestartManager] Restart cooldown active (${((this.config.restartCooldownMs - (now - this.lastRestartTime)) / 1000).toFixed(0)}s remaining)`
      );
      return;
    }

    // 检查重启次数
    if (this.restartCount >= this.config.maxRestarts) {
      console.error(
        `[AutoRestartManager] Max restart count (${this.config.maxRestarts}) reached - cannot restart`
      );
      return;
    }

    this.restartCount++;
    this.lastRestartTime = now;

    console.error(
      `[AutoRestartManager] Restarting application (reason: ${reason}, count: ${this.restartCount}/${this.config.maxRestarts})`
    );

    // 执行重启
    this.performRestart();
  }

  /**
   * 执行重启
   */
  private performRestart(): void {
    try {
      // 清理资源
      this.cleanup();

      // 记录重启信息
      console.log(`[AutoRestartManager] Restart #${this.restartCount} at ${new Date().toISOString()}`);

      // 延迟 1 秒后退出进程，让系统重启应用
      setTimeout(() => {
        console.log("[AutoRestartManager] Exiting process...");
        process.exit(1);
      }, 1000);
    } catch (error) {
      console.error("[AutoRestartManager] Restart error:", error);
    }
  }

  /**
   * 停止管理器
   */
  deactivate(): void {
    if (!this.isActive) {
      console.warn("[AutoRestartManager] Not active");
      return;
    }

    this.isActive = false;
    this.cleanup();

    console.log("[AutoRestartManager] Deactivated");
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    if (this.checkIntervalHandle) {
      clearInterval(this.checkIntervalHandle);
      this.checkIntervalHandle = null;
    }

    if (this.scheduledRestartHandle) {
      clearInterval(this.scheduledRestartHandle);
      this.scheduledRestartHandle = null;
    }
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isActive: boolean;
    config: AutoRestartConfig;
    restartCount: number;
    lastRestartTime: number;
    nextScheduledRestart: number;
  } {
    return {
      isActive: this.isActive,
      config: this.config,
      restartCount: this.restartCount,
      lastRestartTime: this.lastRestartTime,
      nextScheduledRestart: this.lastRestartTime + this.config.scheduledRestartIntervalMs,
    };
  }

  /**
   * 重置重启计数
   */
  resetRestartCount(): void {
    this.restartCount = 0;
    console.log("[AutoRestartManager] Restart count reset");
  }

  /**
   * 手动触发重启
   */
  manualRestart(reason: string = "manual"): void {
    console.log(`[AutoRestartManager] Manual restart triggered (reason: ${reason})`);
    this.triggerRestart(reason);
  }
}

// 单例实例
let instance: AutoRestartManager | null = null;

export function getAutoRestartManager(): AutoRestartManager {
  if (!instance) {
    instance = new AutoRestartManager();
  }
  return instance;
}

export { AutoRestartManager };
