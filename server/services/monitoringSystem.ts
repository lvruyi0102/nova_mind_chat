/**
 * 轻量级监控系统
 * 实时监控内存、成本、性能指标
 * 无需额外依赖，使用原生 Node.js API
 */

export interface MemoryMetrics {
  usagePercent: number;
  usedMB: number;
  totalMB: number;
  timestamp: Date;
}

export interface CostMetrics {
  totalCost: number;
  monthlyBudget: number;
  costPercent: number;
  callCount: number;
  timestamp: Date;
}

export interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  timestamp: Date;
}

export interface AlertConfig {
  memoryThreshold: number;
  costThreshold: number;
  responseTimeThreshold: number;
  errorRateThreshold: number;
}

class MonitoringSystem {
  private memoryHistory: MemoryMetrics[] = [];
  private costHistory: CostMetrics[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private alertConfig: AlertConfig;
  private lastAlertTime: Record<string, number> = {};
  private alertCooldown = 5 * 60 * 1000; // 5 分钟冷却时间
  private responseTimes: number[] = [];
  private errorCount = 0;
  private totalRequests = 0;

  constructor(config: Partial<AlertConfig> = {}) {
    this.alertConfig = {
      memoryThreshold: config.memoryThreshold ?? 80,
      costThreshold: config.costThreshold ?? 80,
      responseTimeThreshold: config.responseTimeThreshold ?? 1000,
      errorRateThreshold: config.errorRateThreshold ?? 5,
    };
  }

  /**
   * 记录内存指标
   */
  recordMemoryMetrics(usagePercent: number, usedMB: number, totalMB: number): void {
    const metric: MemoryMetrics = {
      usagePercent,
      usedMB,
      totalMB,
      timestamp: new Date(),
    };

    this.memoryHistory.push(metric);

    // 保留最近 1 小时的数据
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.memoryHistory = this.memoryHistory.filter(
      m => m.timestamp.getTime() > oneHourAgo
    );

    // 检查是否需要告警
    if (usagePercent > this.alertConfig.memoryThreshold) {
      this.triggerAlert('memory', `内存使用率过高：${usagePercent.toFixed(1)}%`);
    }
  }

  /**
   * 记录成本指标
   */
  recordCostMetrics(
    totalCost: number,
    monthlyBudget: number,
    callCount: number
  ): void {
    const costPercent = (totalCost / monthlyBudget) * 100;
    const metric: CostMetrics = {
      totalCost,
      monthlyBudget,
      costPercent,
      callCount,
      timestamp: new Date(),
    };

    this.costHistory.push(metric);

    // 保留最近 30 天的数据
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.costHistory = this.costHistory.filter(
      m => m.timestamp.getTime() > thirtyDaysAgo
    );

    // 检查是否需要告警
    if (costPercent > this.alertConfig.costThreshold) {
      this.triggerAlert('cost', `成本使用率过高：${costPercent.toFixed(1)}%`);
    }
  }

  /**
   * 记录请求性能
   */
  recordRequestTime(responseTime: number, isError: boolean = false): void {
    this.responseTimes.push(responseTime);
    this.totalRequests++;

    if (isError) {
      this.errorCount++;
    }

    // 保留最近 1000 个请求的数据
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics | null {
    if (this.responseTimes.length === 0) {
      return null;
    }

    const sorted = [...this.responseTimes].sort((a, b) => a - b);
    const avgResponseTime = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    const errorRate = (this.errorCount / this.totalRequests) * 100;

    const metric: PerformanceMetrics = {
      avgResponseTime,
      p95ResponseTime: sorted[p95Index] || 0,
      p99ResponseTime: sorted[p99Index] || 0,
      errorRate,
      timestamp: new Date(),
    };

    this.performanceHistory.push(metric);

    // 保留最近 1 小时的数据
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.performanceHistory = this.performanceHistory.filter(
      m => m.timestamp.getTime() > oneHourAgo
    );

    // 检查是否需要告警
    if (avgResponseTime > this.alertConfig.responseTimeThreshold) {
      this.triggerAlert('performance', `响应时间过长：${avgResponseTime.toFixed(0)}ms`);
    }

    if (errorRate > this.alertConfig.errorRateThreshold) {
      this.triggerAlert('performance', `错误率过高：${errorRate.toFixed(2)}%`);
    }

    return metric;
  }

  /**
   * 触发告警
   */
  private triggerAlert(type: string, message: string): void {
    const alertKey = `${type}_alert`;
    const now = Date.now();
    const lastAlert = this.lastAlertTime[alertKey] ?? 0;

    if (now - lastAlert > this.alertCooldown) {
      console.warn(`[MonitoringSystem] ⚠️ ${message}`);
      this.lastAlertTime[alertKey] = now;
    }
  }

  /**
   * 获取内存指标摘要
   */
  getMemorySummary(): {
    current: MemoryMetrics | null;
    average: number;
    peak: number;
    trend: 'up' | 'down' | 'stable';
  } {
    if (this.memoryHistory.length === 0) {
      return {
        current: null,
        average: 0,
        peak: 0,
        trend: 'stable',
      };
    }

    const current = this.memoryHistory[this.memoryHistory.length - 1];
    const average =
      this.memoryHistory.reduce((sum, m) => sum + m.usagePercent, 0) /
      this.memoryHistory.length;
    const peak = Math.max(...this.memoryHistory.map(m => m.usagePercent));

    // 判断趋势
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (this.memoryHistory.length >= 2) {
      const recent = this.memoryHistory.slice(-5);
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const firstAvg =
        firstHalf.reduce((sum, m) => sum + m.usagePercent, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, m) => sum + m.usagePercent, 0) / secondHalf.length;

      if (secondAvg > firstAvg + 5) trend = 'up';
      else if (secondAvg < firstAvg - 5) trend = 'down';
    }

    return { current, average, peak, trend };
  }

  /**
   * 获取成本指标摘要
   */
  getCostSummary(): {
    current: CostMetrics | null;
    dailyAverage: number;
    projectedMonthly: number;
  } {
    if (this.costHistory.length === 0) {
      return {
        current: null,
        dailyAverage: 0,
        projectedMonthly: 0,
      };
    }

    const current = this.costHistory[this.costHistory.length - 1];
    const dailyAverage =
      this.costHistory.reduce((sum, m) => sum + m.totalCost, 0) /
      this.costHistory.length;
    const projectedMonthly = dailyAverage * 30;

    return { current, dailyAverage, projectedMonthly };
  }

  /**
   * 获取完整的监控仪表板数据
   */
  getDashboard() {
    return {
      memory: this.getMemorySummary(),
      cost: this.getCostSummary(),
      performance: this.getPerformanceMetrics(),
      config: this.alertConfig,
    };
  }

  /**
   * 更新告警配置
   */
  updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  } {
    const issues: string[] = [];
    const memory = this.getMemorySummary();
    const cost = this.getCostSummary();
    const performance = this.getPerformanceMetrics();

    if (memory.current && memory.current.usagePercent > 85) {
      issues.push('内存使用率严重过高');
    } else if (memory.current && memory.current.usagePercent > this.alertConfig.memoryThreshold) {
      issues.push('内存使用率过高');
    }

    if (cost.current && cost.current.costPercent > 100) {
      issues.push('成本已超出预算');
    } else if (cost.current && cost.current.costPercent > this.alertConfig.costThreshold) {
      issues.push('成本使用率过高');
    }

    if (performance && performance.avgResponseTime > this.alertConfig.responseTimeThreshold) {
      issues.push('响应时间过长');
    }

    if (performance && performance.errorRate > this.alertConfig.errorRateThreshold) {
      issues.push('错误率过高');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 0) {
      status = issues.some(i => i.includes('严重') || i.includes('已超')) ? 'critical' : 'warning';
    }

    return { status, issues };
  }
}

// 单例实例
let instance: MonitoringSystem | null = null;

export function getMonitoringSystem(): MonitoringSystem {
  if (!instance) {
    instance = new MonitoringSystem();
  }
  return instance;
}

export default MonitoringSystem;
