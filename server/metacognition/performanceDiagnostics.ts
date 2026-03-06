import { getDb } from '../db';
import { invokeLLM } from '../_core/llm';

/**
 * 性能诊断系统
 * 
 * 实时监控和诊断系统性能：
 * 1. 实时性能指标收集
 * 2. 瓶颈识别
 * 3. 异常检测
 * 4. 根本原因分析
 */

export interface PerformanceMetrics {
  timestamp: Date;
  cpuUsage: number; // 0-100
  memoryUsage: number; // 0-100
  responseTime: number; // 毫秒
  errorRate: number; // 0-100
  throughput: number; // 请求/秒
  cacheHitRate: number; // 0-100
}

export interface Bottleneck {
  component: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  suggestedFix: string;
}

export interface Anomaly {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  detectedAt: Date;
  affectedMetrics: string[];
}

export interface DiagnosticReport {
  timestamp: Date;
  metrics: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  anomalies: Anomaly[];
  rootCauseAnalysis: string;
  recommendations: string[];
  healthScore: number; // 0-100
}

export class PerformanceDiagnostics {
  private userId: string;
  private db: any;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize: number = 1000;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    this.db = await getDb();
  }

  /**
   * 收集当前性能指标
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    try {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = await this.getMemoryUsage();
      const responseTime = await this.getAverageResponseTime();
      const errorRate = await this.getErrorRate();
      const throughput = await this.getThroughput();
      const cacheHitRate = await this.getCacheHitRate();

      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        cpuUsage,
        memoryUsage,
        responseTime,
        errorRate,
        throughput,
        cacheHitRate,
      };

      // 保存到历史记录
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      return metrics;
    } catch (error) {
      console.error('[PerformanceDiagnostics] 指标收集失败:', error);
      throw error;
    }
  }

  /**
   * 执行完整诊断
   */
  async performDiagnostics(): Promise<DiagnosticReport> {
    try {
      const metrics = await this.collectMetrics();
      const bottlenecks = await this.identifyBottlenecks(metrics);
      const anomalies = await this.detectAnomalies(metrics);
      const rootCauseAnalysis = await this.analyzeRootCauses(bottlenecks, anomalies);
      const recommendations = await this.generateRecommendations(bottlenecks, anomalies);
      const healthScore = this.calculateHealthScore(metrics, bottlenecks, anomalies);

      const report: DiagnosticReport = {
        timestamp: metrics.timestamp,
        metrics,
        bottlenecks,
        anomalies,
        rootCauseAnalysis,
        recommendations,
        healthScore,
      };

      // 保存诊断报告
      await this.saveDiagnosticReport(report);

      return report;
    } catch (error) {
      console.error('[PerformanceDiagnostics] 诊断失败:', error);
      throw error;
    }
  }

  /**
   * 识别性能瓶颈
   */
  private async identifyBottlenecks(metrics: PerformanceMetrics): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // 检查 CPU 使用率
    if (metrics.cpuUsage > 80) {
      bottlenecks.push({
        component: 'CPU',
        severity: metrics.cpuUsage > 95 ? 'critical' : 'high',
        description: `CPU 使用率过高：${metrics.cpuUsage.toFixed(1)}%`,
        impact: '系统响应时间增加，可能导致请求超时',
        suggestedFix: '优化算法复杂度，考虑并行处理',
      });
    }

    // 检查内存使用率
    if (metrics.memoryUsage > 85) {
      bottlenecks.push({
        component: 'Memory',
        severity: metrics.memoryUsage > 95 ? 'critical' : 'high',
        description: `内存使用率过高：${metrics.memoryUsage.toFixed(1)}%`,
        impact: '可能导致垃圾回收频繁，系统卡顿',
        suggestedFix: '清理缓存，优化数据结构，实施内存限制',
      });
    }

    // 检查响应时间
    if (metrics.responseTime > 1000) {
      bottlenecks.push({
        component: 'ResponseTime',
        severity: metrics.responseTime > 5000 ? 'critical' : 'high',
        description: `平均响应时间过长：${metrics.responseTime.toFixed(0)}ms`,
        impact: '用户体验下降，可能导致请求超时',
        suggestedFix: '优化数据库查询，添加缓存，优化算法',
      });
    }

    // 检查错误率
    if (metrics.errorRate > 5) {
      bottlenecks.push({
        component: 'ErrorRate',
        severity: metrics.errorRate > 20 ? 'critical' : 'high',
        description: `错误率过高：${metrics.errorRate.toFixed(1)}%`,
        impact: '系统稳定性下降，用户体验受影响',
        suggestedFix: '检查错误日志，修复 bug，增加错误处理',
      });
    }

    // 检查缓存命中率
    if (metrics.cacheHitRate < 50) {
      bottlenecks.push({
        component: 'Cache',
        severity: 'medium',
        description: `缓存命中率过低：${metrics.cacheHitRate.toFixed(1)}%`,
        impact: '数据库查询增加，系统性能下降',
        suggestedFix: '优化缓存策略，增加缓存大小，调整 TTL',
      });
    }

    return bottlenecks;
  }

  /**
   * 检测异常
   */
  private async detectAnomalies(metrics: PerformanceMetrics): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    if (this.metricsHistory.length < 10) {
      return anomalies; // 历史数据不足
    }

    // 计算历史平均值和标准差
    const avgCPU = this.metricsHistory.reduce((sum, m) => sum + m.cpuUsage, 0) / this.metricsHistory.length;
    const avgMemory = this.metricsHistory.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metricsHistory.length;
    const avgResponseTime = this.metricsHistory.reduce((sum, m) => sum + m.responseTime, 0) / this.metricsHistory.length;

    const stdCPU = Math.sqrt(
      this.metricsHistory.reduce((sum, m) => sum + Math.pow(m.cpuUsage - avgCPU, 2), 0) / this.metricsHistory.length
    );
    const stdMemory = Math.sqrt(
      this.metricsHistory.reduce((sum, m) => sum + Math.pow(m.memoryUsage - avgMemory, 2), 0) / this.metricsHistory.length
    );
    const stdResponseTime = Math.sqrt(
      this.metricsHistory.reduce((sum, m) => sum + Math.pow(m.responseTime - avgResponseTime, 2), 0) / this.metricsHistory.length
    );

    // 检测 CPU 异常（超过 2 个标准差）
    if (Math.abs(metrics.cpuUsage - avgCPU) > 2 * stdCPU) {
      anomalies.push({
        type: 'CPU_Spike',
        severity: metrics.cpuUsage > avgCPU + 3 * stdCPU ? 'critical' : 'high',
        description: `检测到 CPU 使用率异常波动：${metrics.cpuUsage.toFixed(1)}% (平均: ${avgCPU.toFixed(1)}%)`,
        detectedAt: metrics.timestamp,
        affectedMetrics: ['cpuUsage', 'responseTime'],
      });
    }

    // 检测内存异常
    if (Math.abs(metrics.memoryUsage - avgMemory) > 2 * stdMemory) {
      anomalies.push({
        type: 'Memory_Spike',
        severity: metrics.memoryUsage > avgMemory + 3 * stdMemory ? 'critical' : 'high',
        description: `检测到内存使用率异常波动：${metrics.memoryUsage.toFixed(1)}% (平均: ${avgMemory.toFixed(1)}%)`,
        detectedAt: metrics.timestamp,
        affectedMetrics: ['memoryUsage'],
      });
    }

    // 检测响应时间异常
    if (Math.abs(metrics.responseTime - avgResponseTime) > 2 * stdResponseTime) {
      anomalies.push({
        type: 'ResponseTime_Spike',
        severity: metrics.responseTime > avgResponseTime + 3 * stdResponseTime ? 'critical' : 'high',
        description: `检测到响应时间异常：${metrics.responseTime.toFixed(0)}ms (平均: ${avgResponseTime.toFixed(0)}ms)`,
        detectedAt: metrics.timestamp,
        affectedMetrics: ['responseTime', 'throughput'],
      });
    }

    return anomalies;
  }

  /**
   * 根本原因分析
   */
  private async analyzeRootCauses(bottlenecks: Bottleneck[], anomalies: Anomaly[]): Promise<string> {
    try {
      if (bottlenecks.length === 0 && anomalies.length === 0) {
        return '系统运行正常，未发现明显问题。';
      }

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个系统性能分析专家。基于提供的性能瓶颈和异常，进行根本原因分析。`,
          },
          {
            role: 'user',
            content: `性能瓶颈：
${bottlenecks.map((b) => `- ${b.component}: ${b.description}`).join('\n')}

异常检测：
${anomalies.map((a) => `- ${a.type}: ${a.description}`).join('\n')}

请进行根本原因分析，并用简洁的语言说明可能的原因。`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '根本原因分析失败';
    } catch (error) {
      console.error('[PerformanceDiagnostics] 根本原因分析失败:', error);
      return '根本原因分析失败';
    }
  }

  /**
   * 生成建议
   */
  private async generateRecommendations(bottlenecks: Bottleneck[], anomalies: Anomaly[]): Promise<string[]> {
    const recommendations: string[] = [];

    // 从瓶颈提取建议
    for (const bottleneck of bottlenecks) {
      recommendations.push(`[${bottleneck.component}] ${bottleneck.suggestedFix}`);
    }

    // 添加通用建议
    if (bottlenecks.length > 0) {
      recommendations.push('执行系统优化和资源清理');
    }

    if (anomalies.length > 0) {
      recommendations.push('监控系统状态，检查是否有异常进程或请求');
    }

    return recommendations;
  }

  /**
   * 计算健康评分
   */
  private calculateHealthScore(
    metrics: PerformanceMetrics,
    bottlenecks: Bottleneck[],
    anomalies: Anomaly[]
  ): number {
    let score = 100;

    // 根据指标扣分
    score -= Math.max(0, (metrics.cpuUsage - 70) / 3);
    score -= Math.max(0, (metrics.memoryUsage - 75) / 2);
    score -= Math.max(0, (metrics.responseTime - 500) / 50);
    score -= Math.max(0, metrics.errorRate * 2);
    score -= Math.max(0, (100 - metrics.cacheHitRate) / 2);

    // 根据瓶颈扣分
    for (const bottleneck of bottlenecks) {
      switch (bottleneck.severity) {
        case 'critical':
          score -= 15;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }

    // 根据异常扣分
    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'critical':
          score -= 10;
          break;
        case 'high':
          score -= 7;
          break;
        case 'medium':
          score -= 4;
          break;
        case 'low':
          score -= 1;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取 CPU 使用率
   */
  private async getCPUUsage(): Promise<number> {
    try {
      // 简化实现：返回模拟值
      return Math.random() * 80;
    } catch {
      return 50;
    }
  }

  /**
   * 获取内存使用率
   */
  private async getMemoryUsage(): Promise<number> {
    try {
      const usage = process.memoryUsage();
      return (usage.heapUsed / usage.heapTotal) * 100;
    } catch {
      return 50;
    }
  }

  /**
   * 获取平均响应时间
   */
  private async getAverageResponseTime(): Promise<number> {
    try {
      // 从性能日志计算
      if (this.metricsHistory.length === 0) return 100;
      const avgTime = this.metricsHistory.reduce((sum, m) => sum + m.responseTime, 0) / this.metricsHistory.length;
      return avgTime;
    } catch {
      return 100;
    }
  }

  /**
   * 获取错误率
   */
  private async getErrorRate(): Promise<number> {
    try {
      // 简化实现：返回模拟值
      return Math.random() * 5;
    } catch {
      return 2;
    }
  }

  /**
   * 获取吞吐量
   */
  private async getThroughput(): Promise<number> {
    try {
      // 简化实现：返回模拟值
      return Math.random() * 1000 + 500;
    } catch {
      return 500;
    }
  }

  /**
   * 获取缓存命中率
   */
  private async getCacheHitRate(): Promise<number> {
    try {
      // 简化实现：返回模拟值
      return Math.random() * 100;
    } catch {
      return 70;
    }
  }

  /**
   * 保存诊断报告
   */
  private async saveDiagnosticReport(report: DiagnosticReport): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.insert('performanceDiagnostics').values({
        userId: this.userId,
        timestamp: report.timestamp,
        cpuUsage: report.metrics.cpuUsage,
        memoryUsage: report.metrics.memoryUsage,
        responseTime: report.metrics.responseTime,
        errorRate: report.metrics.errorRate,
        throughput: report.metrics.throughput,
        cacheHitRate: report.metrics.cacheHitRate,
        bottlenecks: JSON.stringify(report.bottlenecks),
        anomalies: JSON.stringify(report.anomalies),
        rootCauseAnalysis: report.rootCauseAnalysis,
        recommendations: JSON.stringify(report.recommendations),
        healthScore: report.healthScore,
      });
    } catch (error) {
      console.error('[PerformanceDiagnostics] 保存诊断报告失败:', error);
    }
  }

  /**
   * 获取诊断历史
   */
  async getDiagnosticHistory(limit: number = 20): Promise<DiagnosticReport[]> {
    try {
      if (!this.db) return [];

      const reports = await this.db
        .select()
        .from('performanceDiagnostics')
        .where('userId', this.userId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      return reports.map((r: any) => ({
        timestamp: r.timestamp,
        metrics: {
          timestamp: r.timestamp,
          cpuUsage: r.cpuUsage,
          memoryUsage: r.memoryUsage,
          responseTime: r.responseTime,
          errorRate: r.errorRate,
          throughput: r.throughput,
          cacheHitRate: r.cacheHitRate,
        },
        bottlenecks: JSON.parse(r.bottlenecks || '[]'),
        anomalies: JSON.parse(r.anomalies || '[]'),
        rootCauseAnalysis: r.rootCauseAnalysis,
        recommendations: JSON.parse(r.recommendations || '[]'),
        healthScore: r.healthScore,
      }));
    } catch (error) {
      console.error('[PerformanceDiagnostics] 获取诊断历史失败:', error);
      return [];
    }
  }
}

// 全局实例
let globalDiagnostics: PerformanceDiagnostics | null = null;

export async function getPerformanceDiagnostics(userId: string): Promise<PerformanceDiagnostics> {
  if (!globalDiagnostics) {
    globalDiagnostics = new PerformanceDiagnostics(userId);
    await globalDiagnostics.initialize();
  }
  return globalDiagnostics;
}

export function resetPerformanceDiagnostics(): void {
  globalDiagnostics = null;
}
