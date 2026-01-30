/**
 * Memory Alert Notification Service
 * 
 * Integrates MemoryMonitor with owner notification system
 * Sends alerts when memory usage reaches critical levels
 */

import { MemoryMonitor } from './memoryOptimization';
import { notifyOwner } from '../_core/notification';

interface AlertState {
  lastCriticalAlert: number | null;
  lastWarningAlert: number | null;
  alertCooldown: number; // Milliseconds between repeated alerts
}

/**
 * Memory alert notification manager
 */
export class MemoryAlertNotificationManager {
  private monitor: MemoryMonitor;
  private alertState: AlertState = {
    lastCriticalAlert: null,
    lastWarningAlert: null,
    alertCooldown: 5 * 60 * 1000, // 5 minutes cooldown
  };

  constructor(monitor: MemoryMonitor) {
    this.monitor = monitor;
    this.setupListeners();
  }

  /**
   * Setup event listeners on MemoryMonitor
   */
  private setupListeners(): void {
    this.monitor.on('critical', (stats) => {
      this.handleCriticalAlert(stats);
    });

    this.monitor.on('warning', (stats) => {
      this.handleWarningAlert(stats);
    });
  }

  /**
   * Handle critical memory alert
   */
  private async handleCriticalAlert(stats: any): Promise<void> {
    const now = Date.now();
    
    // Check cooldown to avoid spam
    if (
      this.alertState.lastCriticalAlert &&
      now - this.alertState.lastCriticalAlert < this.alertState.alertCooldown
    ) {
      return;
    }

    this.alertState.lastCriticalAlert = now;

    const heapUsagePercent = (stats.heapUsagePercentage * 100).toFixed(1);
    const heapUsedMB = (stats.heapUsed / (1024 * 1024)).toFixed(2);
    const heapTotalMB = (stats.heapTotal / (1024 * 1024)).toFixed(2);

    const title = '🚨 Nova-Mind 内存严重告警';
    const content = `
堆内存使用率已达到 ${heapUsagePercent}%（严重阈值：94%）

当前状态：
- 已用内存：${heapUsedMB} MB / ${heapTotalMB} MB
- 外部内存：${(stats.external / (1024 * 1024)).toFixed(2)} MB
- RSS 内存：${(stats.rss / (1024 * 1024)).toFixed(2)} MB

建议处理：
1. 立即检查应用程序是否存在内存泄漏
2. 考虑重启应用程序以释放内存
3. 检查是否有大量缓存未被清理
4. 考虑增加堆内存限制（--max-old-space-size）

系统已自动触发激进清理机制。
    `.trim();

    try {
      const delivered = await notifyOwner({ title, content });
      if (delivered) {
        console.log('[MemoryAlertNotification] Critical alert delivered to owner');
      } else {
        console.warn('[MemoryAlertNotification] Failed to deliver critical alert');
      }
    } catch (error) {
      console.error('[MemoryAlertNotification] Error sending critical alert:', error);
    }
  }

  /**
   * Handle warning memory alert
   */
  private async handleWarningAlert(stats: any): Promise<void> {
    const now = Date.now();
    
    // Check cooldown to avoid spam
    if (
      this.alertState.lastWarningAlert &&
      now - this.alertState.lastWarningAlert < this.alertState.alertCooldown
    ) {
      return;
    }

    this.alertState.lastWarningAlert = now;

    const heapUsagePercent = (stats.heapUsagePercentage * 100).toFixed(1);
    const heapUsedMB = (stats.heapUsed / (1024 * 1024)).toFixed(2);
    const heapTotalMB = (stats.heapTotal / (1024 * 1024)).toFixed(2);

    const title = '⚠️ Nova-Mind 内存警告';
    const content = `
堆内存使用率已达到 ${heapUsagePercent}%（警告阈值：80%）

当前状态：
- 已用内存：${heapUsedMB} MB / ${heapTotalMB} MB
- 外部内存：${(stats.external / (1024 * 1024)).toFixed(2)} MB
- RSS 内存：${(stats.rss / (1024 * 1024)).toFixed(2)} MB

建议处理：
1. 监控内存使用趋势
2. 检查是否有异常的缓存增长
3. 考虑优化数据结构或算法
4. 如果继续上升，将触发严重告警

系统已启动缓存清理机制。
    `.trim();

    try {
      const delivered = await notifyOwner({ title, content });
      if (delivered) {
        console.log('[MemoryAlertNotification] Warning alert delivered to owner');
      }
    } catch (error) {
      console.error('[MemoryAlertNotification] Error sending warning alert:', error);
    }
  }

  /**
   * Set alert cooldown period
   */
  setAlertCooldown(milliseconds: number): void {
    this.alertState.alertCooldown = milliseconds;
  }

  /**
   * Get current alert state
   */
  getAlertState(): AlertState {
    return { ...this.alertState };
  }

  /**
   * Reset alert state
   */
  resetAlertState(): void {
    this.alertState = {
      lastCriticalAlert: null,
      lastWarningAlert: null,
      alertCooldown: 5 * 60 * 1000,
    };
  }
}

// Global instance
let globalAlertManager: MemoryAlertNotificationManager | null = null;

/**
 * Initialize memory alert notification system
 */
export function initializeMemoryAlertNotification(monitor: MemoryMonitor): MemoryAlertNotificationManager {
  if (!globalAlertManager) {
    globalAlertManager = new MemoryAlertNotificationManager(monitor);
    console.log('[MemoryAlertNotification] Initialized');
  }
  return globalAlertManager;
}

/**
 * Get global alert manager instance
 */
export function getMemoryAlertNotificationManager(): MemoryAlertNotificationManager | null {
  return globalAlertManager;
}
