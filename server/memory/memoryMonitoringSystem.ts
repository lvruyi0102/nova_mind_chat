/**
 * 内存监控与警报系统 - 为 Nova-Mind 提供实时内存监控和告警
 * 
 * 功能：
 * 1. 实时内存监控
 * 2. 多级告警机制
 * 3. 性能指标收集
 * 4. 监控面板数据
 */

import { getAdvancedCacheManager } from './advancedCacheManager';
import { getIncrementalGarbageCollector } from './incrementalGarbageCollector';

export type AlertLevel = 'info' | 'warning' | 'critical' | 'emergency';

export interface MemoryAlert {
  level: AlertLevel;
  message: string;
  timestamp: number;
  metrics: {
    heapUsagePercent: number;
    cacheUsagePercent: number;
    trend: string;
  };
}

export interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapUsagePercent: number;
  cacheSize: number;
  cacheEntries: number;
  cacheHitRate: number;
  gcMetrics: {
    currentUsage: number;
    averageUsage: number;
    peakUsage: number;
    trend: string;
  };
}

export interface MonitoringConfig {
  infoThreshold: number; // 60%
  warningThreshold: number; // 75%
  criticalThreshold: number; // 85%
  emergencyThreshold: number; // 95%
  monitoringInterval: number; // 毫秒
  alertHistorySize: number;
  enableAutoCleanup: boolean;
}

export class MemoryMonitoringSystem {
  private config: MonitoringConfig;
  private alerts: MemoryAlert[] = [];
  private metrics: MemoryMetrics[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private lastAlertLevel: AlertLevel = 'info';

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      infoThreshold: 0.6,
      warningThreshold: 0.75,
      criticalThreshold: 0.85,
      emergencyThreshold: 0.95,
      monitoringInterval: 30 * 1000, // 30秒
      alertHistorySize: 100,
      enableAutoCleanup: true,
      ...config,
    };

    this.startMonitoring();
  }

  /**
   * 获取当前内存指标
   */
  getCurrentMetrics(): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    const cacheManager = getAdvancedCacheManager();
    const cacheStats = cacheManager.getStats();
    const cacheUsagePercent = cacheManager.getMemoryUsagePercent();

    const gc = getIncrementalGarbageCollector();
    const gcReport = gc.generateDiagnosticReport();

    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsagePercent: Math.round(heapUsagePercent * 100),
      cacheSize: cacheStats.totalSize,
      cacheEntries: cacheStats.entryCount,
      cacheHitRate: Math.round(cacheStats.hitRate * 100),
      gcMetrics: {
        currentUsage: gcReport.currentUsage,
        averageUsage: gcReport.averageUsage,
        peakUsage: gcReport.peakUsage,
        trend: gcReport.trend,
      },
    };
  }

  /**
   * 执行监控检查
   */
  private async performMonitoringCheck(): Promise<void> {
    const metrics = this.getCurrentMetrics();
    this.metrics.push(metrics);

    // 保持历史大小
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // 检查告警条件
    const heapUsageRatio = metrics.heapUsagePercent / 100;
    let alertLevel: AlertLevel = 'info';
    let message = '';

    if (heapUsageRatio > this.config.emergencyThreshold) {
      alertLevel = 'emergency';
      message = `紧急：堆内存使用率 ${metrics.heapUsagePercent}%，已超过 ${this.config.emergencyThreshold * 100}% 的紧急阈值`;
    } else if (heapUsageRatio > this.config.criticalThreshold) {
      alertLevel = 'critical';
      message = `严重：堆内存使用率 ${metrics.heapUsagePercent}%，已超过 ${this.config.criticalThreshold * 100}% 的严重阈值`;
    } else if (heapUsageRatio > this.config.warningThreshold) {
      alertLevel = 'warning';
      message = `警告：堆内存使用率 ${metrics.heapUsagePercent}%，已超过 ${this.config.warningThreshold * 100}% 的警告阈值`;
    } else if (heapUsageRatio > this.config.infoThreshold) {
      alertLevel = 'info';
      message = `信息：堆内存使用率 ${metrics.heapUsagePercent}%，已超过 ${this.config.infoThreshold * 100}% 的信息阈值`;
    }

    // 只在告警级别变化时记录
    if (alertLevel !== this.lastAlertLevel || alertLevel !== 'info') {
      this.recordAlert({
        level: alertLevel,
        message,
        timestamp: Date.now(),
        metrics: {
          heapUsagePercent: metrics.heapUsagePercent,
          cacheUsagePercent: Math.round((metrics.cacheSize / (350 * 1024 * 1024)) * 100),
          trend: metrics.gcMetrics.trend,
        },
      });

      this.lastAlertLevel = alertLevel;

      // 如果启用自动清理，执行相应的清理操作
      if (this.config.enableAutoCleanup) {
        await this.handleAutoCleanup(alertLevel);
      }
    }
  }

  /**
   * 处理自动清理
   */
  private async handleAutoCleanup(alertLevel: AlertLevel): Promise<void> {
    const gc = getIncrementalGarbageCollector();

    switch (alertLevel) {
      case 'emergency':
        console.error('[Memory] EMERGENCY: Triggering emergency cleanup');
        await gc.performIncrementalGC();
        break;
      case 'critical':
        console.warn('[Memory] CRITICAL: Triggering aggressive cleanup');
        await gc.performIncrementalGC();
        break;
      case 'warning':
        console.warn('[Memory] WARNING: Monitoring memory usage');
        break;
    }
  }

  /**
   * 记录告警
   */
  private recordAlert(alert: MemoryAlert): void {
    this.alerts.push(alert);

    // 保持历史大小
    if (this.alerts.length > this.config.alertHistorySize) {
      this.alerts.shift();
    }

    // 输出告警信息
    const logLevel = alert.level === 'emergency' ? 'error' : alert.level === 'critical' ? 'error' : 'warn';
    console[logLevel as any](`[Memory] ${alert.message}`);
  }

  /**
   * 启动监控定时器
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      this.performMonitoringCheck().catch((err) => {
        console.error('[Memory] Error during monitoring:', err);
      });
    }, this.config.monitoringInterval);

    // 立即执行一次
    this.performMonitoringCheck().catch((err) => {
      console.error('[Memory] Error during initial monitoring:', err);
    });
  }

  /**
   * 停止监控
   */
  destroy(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
  }

  /**
   * 获取告警历史
   */
  getAlertHistory(limit?: number): MemoryAlert[] {
    if (limit) {
      return this.alerts.slice(-limit);
    }
    return [...this.alerts];
  }

  /**
   * 获取指标历史
   */
  getMetricsHistory(limit?: number): MemoryMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * 获取监控面板数据
   */
  getDashboardData() {
    const currentMetrics = this.metrics[this.metrics.length - 1] || this.getCurrentMetrics();
    const recentAlerts = this.alerts.slice(-5);

    // 计算趋势
    let trend = 'stable';
    if (this.metrics.length >= 3) {
      const recent = this.metrics.slice(-3);
      const ratios = recent.map((m) => m.heapUsagePercent);
      if (ratios[2] > ratios[1] && ratios[1] > ratios[0]) {
        trend = 'increasing';
      } else if (ratios[2] < ratios[1] && ratios[1] < ratios[0]) {
        trend = 'decreasing';
      }
    }

    return {
      current: currentMetrics,
      recent: this.metrics.slice(-10),
      alerts: recentAlerts,
      trend,
      status: this.lastAlertLevel,
      summary: {
        avgHeapUsage: Math.round(this.metrics.reduce((sum, m) => sum + m.heapUsagePercent, 0) / Math.max(1, this.metrics.length)),
        maxHeapUsage: Math.max(...this.metrics.map((m) => m.heapUsagePercent), 0),
        minHeapUsage: Math.min(...this.metrics.map((m) => m.heapUsagePercent), 100),
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter((a) => a.level === 'critical' || a.level === 'emergency').length,
      },
    };
  }

  /**
   * 生成监控报告
   */
  generateReport(): string {
    const dashboard = this.getDashboardData();
    const current = dashboard.current;

    return `
Nova-Mind 内存监控报告
======================

当前状态：
- 堆内存使用率：${current.heapUsagePercent}%
- 缓存条目数：${current.cacheEntries}
- 缓存命中率：${current.cacheHitRate}%
- 趋势：${dashboard.trend}

GC 诊断：
- 当前使用率：${current.gcMetrics.currentUsage}%
- 平均使用率：${current.gcMetrics.averageUsage}%
- 峰值使用率：${current.gcMetrics.peakUsage}%

统计摘要：
- 平均堆使用率：${dashboard.summary.avgHeapUsage}%
- 最大堆使用率：${dashboard.summary.maxHeapUsage}%
- 最小堆使用率：${dashboard.summary.minHeapUsage}%
- 总告警数：${dashboard.summary.totalAlerts}
- 严重告警数：${dashboard.summary.criticalAlerts}

最近告警：
${dashboard.alerts.map((a) => `- [${new Date(a.timestamp).toISOString()}] ${a.level.toUpperCase()}: ${a.message}`).join('\n')}
    `.trim();
  }
}

// 全局监控系统实例
let globalMonitoringSystem: MemoryMonitoringSystem | null = null;

export function getMemoryMonitoringSystem(): MemoryMonitoringSystem {
  if (!globalMonitoringSystem) {
    globalMonitoringSystem = new MemoryMonitoringSystem();
  }
  return globalMonitoringSystem;
}

export function resetMemoryMonitoringSystem(): void {
  if (globalMonitoringSystem) {
    globalMonitoringSystem.destroy();
    globalMonitoringSystem = null;
  }
}
