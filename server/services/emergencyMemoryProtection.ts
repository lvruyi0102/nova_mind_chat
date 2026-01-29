/**
 * Emergency Memory Protection Service
 * 
 * Implements critical memory overflow protection mechanisms
 * Triggers aggressive cleanup when heap memory exceeds 95%
 * 
 * Features:
 * - Real-time memory monitoring with 5-second intervals
 * - Automatic emergency cleanup at 95% threshold
 * - Service shutdown at 98% threshold to prevent crashes
 * - Owner notification system
 * - Cleanup event logging and analytics
 */

import { EventEmitter } from 'events';
import { notifyOwner } from '../_core/notification';
import { getMemoryOptimizationManager } from './memoryOptimization';

interface EmergencyMemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapUsagePercentage: number;
  externalMemory: number;
  rss: number;
  timestamp: number;
  status: 'normal' | 'warning' | 'critical' | 'emergency';
}

interface CleanupEvent {
  timestamp: number;
  heapBefore: number;
  heapAfter: number;
  freed: number;
  reason: string;
  success: boolean;
}

/**
 * Emergency Memory Protection Service
 */
export class EmergencyMemoryProtection extends EventEmitter {
  private static _instance: EmergencyMemoryProtection | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  private criticalThreshold = 0.95; // 95% - trigger emergency cleanup
  private emergencyThreshold = 0.98; // 98% - shutdown services
  private cleanupEvents: CleanupEvent[] = [];
  private lastNotificationTime = 0;
  private notificationCooldown = 60 * 60 * 1000; // 60 minutes between notifications (reduced frequency)
  private notificationsDisabled = false; // 禁用通知开关
  private lastStats: EmergencyMemoryStats | null = null;
  private cleanupAttempts = 0;
  private maxCleanupAttempts = 3;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): EmergencyMemoryProtection {
    if (!EmergencyMemoryProtection._instance) {
      EmergencyMemoryProtection._instance = new EmergencyMemoryProtection();
    }
    return EmergencyMemoryProtection._instance;
  }

  /**
   * Start emergency memory monitoring
   */
  start(intervalMs: number = 5 * 1000): void {
    if (this.isMonitoring) {
      console.warn('[EmergencyMemoryProtection] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    console.log('[EmergencyMemoryProtection] Starting emergency memory monitoring...');

    this.monitorInterval = setInterval(() => {
      this.checkMemoryStatus();
    }, intervalMs);

    // Allow interval to be garbage collected
    if (this.monitorInterval.unref) {
      this.monitorInterval.unref();
    }
  }

  /**
   * Stop emergency memory monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log('[EmergencyMemoryProtection] Stopped monitoring');
  }

  /**
   * Check current memory status
   */
  private checkMemoryStatus(): void {
    const stats = this.getCurrentStats();
    this.lastStats = stats;

    // Determine status
    let status: 'normal' | 'warning' | 'critical' | 'emergency' = 'normal';
    if (stats.heapUsagePercentage >= this.emergencyThreshold) {
      status = 'emergency';
    } else if (stats.heapUsagePercentage >= this.criticalThreshold) {
      status = 'critical';
    } else if (stats.heapUsagePercentage >= 0.85) {
      status = 'warning';
    }

    stats.status = status;

    // Emit status event
    this.emit('status', stats);

    // Handle different status levels
    switch (status) {
      case 'emergency':
        this.handleEmergencyStatus(stats);
        break;
      case 'critical':
        this.handleCriticalStatus(stats);
        break;
      case 'warning':
        this.handleWarningStatus(stats);
        break;
    }
  }

  /**
   * Handle emergency status (98%+ heap usage)
   */
  private async handleEmergencyStatus(stats: EmergencyMemoryStats): Promise<void> {
    console.error(
      `[EmergencyMemoryProtection] EMERGENCY: Heap usage at ${(stats.heapUsagePercentage * 100).toFixed(1)}%`
    );

    this.emit('emergency', stats);

    // Attempt cleanup
    await this.performEmergencyCleanup(stats);

    // Send critical notification
    await this.sendCriticalNotification(stats);

    // If still above threshold after cleanup, consider shutting down
    if (stats.heapUsagePercentage >= this.emergencyThreshold) {
      console.error('[EmergencyMemoryProtection] CRITICAL: Unable to reduce memory below threshold');
      this.emit('shutdown-required', stats);
    }
  }

  /**
   * Handle critical status (95%+ heap usage)
   */
  private async handleCriticalStatus(stats: EmergencyMemoryStats): Promise<void> {
    console.error(
      `[EmergencyMemoryProtection] CRITICAL: Heap usage at ${(stats.heapUsagePercentage * 100).toFixed(1)}%`
    );

    this.emit('critical', stats);

    // Perform aggressive cleanup
    await this.performEmergencyCleanup(stats);

    // Send warning notification (with cooldown)
    await this.sendWarningNotification(stats);
  }

  /**
   * Handle warning status (85%+ heap usage)
   */
  private handleWarningStatus(stats: EmergencyMemoryStats): void {
    console.warn(
      `[EmergencyMemoryProtection] WARNING: Heap usage at ${(stats.heapUsagePercentage * 100).toFixed(1)}%`
    );

    this.emit('warning', stats);
  }

  /**
   * Perform emergency cleanup
   */
  private async performEmergencyCleanup(stats: EmergencyMemoryStats): Promise<void> {
    try {
      const heapBefore = stats.heapUsed;

      console.log('[EmergencyMemoryProtection] Starting emergency cleanup...');

      // Get memory optimization manager
      const memoryManager = getMemoryOptimizationManager();

      // Clear cache aggressively
      const cache = memoryManager.getCache();
      cache.clear();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Get updated stats
      const updatedStats = this.getCurrentStats();
      const heapAfter = updatedStats.heapUsed;
      const freed = heapBefore - heapAfter;

      // Record cleanup event
      this.recordCleanupEvent({
        timestamp: Date.now(),
        heapBefore,
        heapAfter,
        freed,
        reason: 'emergency_cleanup',
        success: freed > 0,
      });

      console.log(
        `[EmergencyMemoryProtection] Cleanup completed: freed ${(freed / 1024 / 1024).toFixed(2)}MB ` +
        `(${(heapBefore / 1024 / 1024).toFixed(0)}MB → ${(heapAfter / 1024 / 1024).toFixed(0)}MB)`
      );

      this.emit('cleanup-completed', {
        heapBefore,
        heapAfter,
        freed,
        percentage: (freed / heapBefore) * 100,
      });

      this.cleanupAttempts = 0;
    } catch (error) {
      console.error('[EmergencyMemoryProtection] Cleanup failed:', error);
      this.cleanupAttempts++;

      this.emit('cleanup-failed', {
        error,
        attempts: this.cleanupAttempts,
      });
    }
  }

  /**
   * Send warning notification (with cooldown)
   */
  private async sendWarningNotification(stats: EmergencyMemoryStats): Promise<void> {
    // 禁用通知以防止邮件轰炸
    if (this.notificationsDisabled) {
      return;
    }

    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return; // Skip if within cooldown period
    }

    try {
      await notifyOwner({
        title: '⚠️ Nova-Mind Memory Warning',
        content: `Heap memory usage is at ${(stats.heapUsagePercentage * 100).toFixed(1)}%. ` +
          `Emergency cleanup has been triggered. ` +
          `Current: ${(stats.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(stats.heapTotal / 1024 / 1024).toFixed(0)}MB`,
      });

      this.lastNotificationTime = now;
    } catch (error) {
      console.error('[EmergencyMemoryProtection] Failed to send warning notification:', error);
    }
  }

  /**
   * Send critical notification
   */
  private async sendCriticalNotification(stats: EmergencyMemoryStats): Promise<void> {
    // 禁用通知以防止邮件轰炸
    if (this.notificationsDisabled) {
      return;
    }

    try {
      await notifyOwner({
        title: '🚨 Nova-Mind CRITICAL Memory Alert',
        content: `CRITICAL: Heap memory usage is at ${(stats.heapUsagePercentage * 100).toFixed(1)}%! ` +
          `Immediate action required. Current: ${(stats.heapUsed / 1024 / 1024).toFixed(0)}MB / ${(stats.heapTotal / 1024 / 1024).toFixed(0)}MB. ` +
          `Multiple emergency cleanup attempts have been performed.`,
      });
    } catch (error) {
      console.error('[EmergencyMemoryProtection] Failed to send critical notification:', error);
    }
  }

  /**
   * Get current memory stats
   */
  private getCurrentStats(): EmergencyMemoryStats {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsagePercentage: memUsage.heapUsed / memUsage.heapTotal,
      externalMemory: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now(),
      status: 'normal',
    };
  }

  /**
   * Record cleanup event
   */
  private recordCleanupEvent(event: CleanupEvent): void {
    this.cleanupEvents.push(event);

    // Keep only last 50 events
    if (this.cleanupEvents.length > 50) {
      this.cleanupEvents.shift();
    }
  }

  /**
   * Get last recorded stats
   */
  getLastStats(): EmergencyMemoryStats | null {
    return this.lastStats;
  }

  /**
   * Get cleanup history
   */
  getCleanupHistory(): CleanupEvent[] {
    return [...this.cleanupEvents];
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats() {
    if (this.cleanupEvents.length === 0) {
      return {
        totalCleanups: 0,
        successfulCleanups: 0,
        failedCleanups: 0,
        totalFreed: 0,
        averageFreed: 0,
      };
    }

    const successful = this.cleanupEvents.filter(e => e.success);
    const totalFreed = successful.reduce((sum, e) => sum + e.freed, 0);

    return {
      totalCleanups: this.cleanupEvents.length,
      successfulCleanups: successful.length,
      failedCleanups: this.cleanupEvents.length - successful.length,
      totalFreed,
      averageFreed: totalFreed / successful.length || 0,
    };
  }

  /**
   * 禁用/启用通知
   */
  disableNotifications(): void {
    this.notificationsDisabled = true;
    console.log('[EmergencyMemoryProtection] Notifications disabled');
  }

  enableNotifications(): void {
    this.notificationsDisabled = false;
    console.log('[EmergencyMemoryProtection] Notifications enabled');
  }
}

// Global instance
let globalInstance: EmergencyMemoryProtection | null = null;

/**
 * Get global emergency memory protection instance
 */
export function getEmergencyMemoryProtection(): EmergencyMemoryProtection {
  if (!globalInstance) {
    globalInstance = EmergencyMemoryProtection.getInstance();
  }
  return globalInstance;
}

/**
 * Initialize emergency memory protection
 */
export function initializeEmergencyMemoryProtection(): void {
  const protection = getEmergencyMemoryProtection();
  protection.start();
  console.log('[EmergencyMemoryProtection] Initialized and started');
}
