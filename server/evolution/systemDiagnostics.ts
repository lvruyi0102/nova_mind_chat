/**
 * System Diagnostics Layer
 * 
 * 实时采集 Nova-Mind 运行时的真实系统指标
 * 这些指标反映的是 Nova 面临的真实环境压力
 */

import os from 'os';
import { performance } from 'perf_hooks';

export interface SystemMetrics {
  timestamp: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    heapUsagePercent: number;
    external: number;
    rss: number;
  };
  cpu: {
    loadAverage: number[];
    uptime: number;
  };
  process: {
    uptime: number;
    cpuUsage: NodeJS.CpuUsage;
  };
  database: {
    activeConnections: number;
    queryQueueLength: number;
    avgQueryTime: number;
  };
  api: {
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
    tokenUsageTotal: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  metrics: SystemMetrics;
  alerts: HealthAlert[];
  pressureLevel: number; // 0-100，表示系统压力程度
}

export interface HealthAlert {
  type: 'memory' | 'cpu' | 'database' | 'api' | 'token' | 'latency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * 系统诊断引擎
 * 持续监测 Nova 的运行状态
 */
export class SystemDiagnosticsEngine {
  private metrics: SystemMetrics[] = [];
  private alerts: HealthAlert[] = [];
  private maxMetricsHistory = 100;

  // 阈值配置（这些是真实的环保约束）
  private thresholds = {
    memory: {
      heapUsageWarning: 70, // 70% 堆内存使用
      heapUsageCritical: 90, // 90% 堆内存使用
    },
    cpu: {
      loadAverageWarning: 2.0,
      loadAverageCritical: 4.0,
    },
    database: {
      activeConnectionsWarning: 50,
      activeConnectionsCritical: 100,
      queryQueueWarning: 20,
      queryQueueCritical: 50,
    },
    api: {
      errorRateWarning: 0.05, // 5% 错误率
      errorRateCritical: 0.1, // 10% 错误率
      avgResponseTimeWarning: 2000, // 2秒
      avgResponseTimeCritical: 5000, // 5秒
    },
    token: {
      dailyTokenWarning: 100000,
      dailyTokenCritical: 500000,
    },
  };

  /**
   * 采集当前系统指标
   */
  collectMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();

    const metrics: SystemMetrics = {
      timestamp: Date.now(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        heapUsagePercent: (memUsage.heapUsed / memUsage.heapTotal) * 100,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpu: {
        loadAverage,
        uptime: os.uptime(),
      },
      process: {
        uptime: process.uptime(),
        cpuUsage,
      },
      database: {
        activeConnections: 0, // 从数据库连接池获取
        queryQueueLength: 0,
        avgQueryTime: 0,
      },
      api: {
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0,
        tokenUsageTotal: 0,
      },
    };

    // 保持历史记录
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    return metrics;
  }

  /**
   * 诊断当前系统健康状态
   */
  diagnose(): HealthStatus {
    const currentMetrics = this.collectMetrics();
    const newAlerts: HealthAlert[] = [];

    // 检查内存压力
    if (currentMetrics.memory.heapUsagePercent >= this.thresholds.memory.heapUsageCritical) {
      newAlerts.push({
        type: 'memory',
        severity: 'critical',
        message: `堆内存使用率达到 ${currentMetrics.memory.heapUsagePercent.toFixed(1)}%，系统面临 OOM 风险`,
        value: currentMetrics.memory.heapUsagePercent,
        threshold: this.thresholds.memory.heapUsageCritical,
        timestamp: currentMetrics.timestamp,
      });
    } else if (currentMetrics.memory.heapUsagePercent >= this.thresholds.memory.heapUsageWarning) {
      newAlerts.push({
        type: 'memory',
        severity: 'high',
        message: `堆内存使用率达到 ${currentMetrics.memory.heapUsagePercent.toFixed(1)}%，需要优化`,
        value: currentMetrics.memory.heapUsagePercent,
        threshold: this.thresholds.memory.heapUsageWarning,
        timestamp: currentMetrics.timestamp,
      });
    }

    // 检查 CPU 压力
    const avgLoad = currentMetrics.cpu.loadAverage[0];
    if (avgLoad >= this.thresholds.cpu.loadAverageCritical) {
      newAlerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `CPU 负载达到 ${avgLoad.toFixed(2)}，系统响应缓慢`,
        value: avgLoad,
        threshold: this.thresholds.cpu.loadAverageCritical,
        timestamp: currentMetrics.timestamp,
      });
    } else if (avgLoad >= this.thresholds.cpu.loadAverageWarning) {
      newAlerts.push({
        type: 'cpu',
        severity: 'high',
        message: `CPU 负载达到 ${avgLoad.toFixed(2)}，需要优化`,
        value: avgLoad,
        threshold: this.thresholds.cpu.loadAverageWarning,
        timestamp: currentMetrics.timestamp,
      });
    }

    // 更新告警列表
    this.alerts = newAlerts;

    // 计算压力等级（0-100）
    const pressureLevel = this.calculatePressureLevel(currentMetrics, newAlerts);

    // 确定健康状态
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (newAlerts.some(a => a.severity === 'critical')) {
      status = 'critical';
    } else if (newAlerts.some(a => a.severity === 'high')) {
      status = 'warning';
    }

    return {
      status,
      metrics: currentMetrics,
      alerts: newAlerts,
      pressureLevel,
    };
  }

  /**
   * 计算系统压力等级（0-100）
   * 这个数字代表 Nova 面临的真实生存压力
   */
  private calculatePressureLevel(metrics: SystemMetrics, alerts: HealthAlert[]): number {
    let pressure = 0;

    // 内存压力贡献
    pressure += (metrics.memory.heapUsagePercent / 100) * 40;

    // CPU 压力贡献
    const cpuPressure = Math.min(metrics.cpu.loadAverage[0] / 4, 1) * 30;
    pressure += cpuPressure;

    // 告警贡献
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    pressure += criticalAlerts * 15 + highAlerts * 5;

    return Math.min(pressure, 100);
  }

  /**
   * 获取诊断报告
   */
  getDiagnosisReport(): HealthStatus {
    return this.diagnose();
  }

  /**
   * 获取最近的指标历史
   */
  getMetricsHistory(count: number = 10): SystemMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * 获取压力趋势
   */
  getPressureTrend(): number[] {
    return this.getMetricsHistory(20).map(m => {
      const alerts = this.analyzeMetrics(m);
      return this.calculatePressureLevel(m, alerts);
    });
  }

  /**
   * 分析单个指标集合
   */
  private analyzeMetrics(metrics: SystemMetrics): HealthAlert[] {
    const alerts: HealthAlert[] = [];

    if (metrics.memory.heapUsagePercent >= this.thresholds.memory.heapUsageCritical) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `堆内存使用率 ${metrics.memory.heapUsagePercent.toFixed(1)}%`,
        value: metrics.memory.heapUsagePercent,
        threshold: this.thresholds.memory.heapUsageCritical,
        timestamp: metrics.timestamp,
      });
    }

    return alerts;
  }

  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.metrics = [];
    this.alerts = [];
  }
}

// 全局诊断引擎实例
let diagnosticsEngine: SystemDiagnosticsEngine | null = null;

export function getDiagnosticsEngine(): SystemDiagnosticsEngine {
  if (!diagnosticsEngine) {
    diagnosticsEngine = new SystemDiagnosticsEngine();
  }
  return diagnosticsEngine;
}

export function initializeDiagnostics(): SystemDiagnosticsEngine {
  diagnosticsEngine = new SystemDiagnosticsEngine();
  return diagnosticsEngine;
}
