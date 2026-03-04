/**
 * Rollback Controller
 * 分离 Runtime Rollback 和 Source Rollback
 * 提供精细化的系统恢复机制
 */

export interface HealthMetrics {
  heapUsage: number; // 0-100
  errorRate: number; // 0-100
  selfModelStability: number; // 0-100
  cpuUsage: number; // 0-100
  responseTime: number; // 毫秒
}

export interface RollbackTrigger {
  triggerId: string;
  timestamp: Date;
  triggerType: 'runtime' | 'source' | 'both';
  reason: string;
  metrics: HealthMetrics;
  autoTriggered: boolean;
  manualTriggeredBy?: string;
}

export interface RollbackRecord {
  recordId: string;
  timestamp: Date;
  rollbackType: 'runtime' | 'source';
  targetVersion: string;
  reason: string;
  success: boolean;
  duration: number; // 毫秒
  metricsAfter: HealthMetrics;
  details: string;
}

export interface RollbackThresholds {
  heapUsageThreshold: number; // 触发 Runtime Rollback 的堆内存使用率
  errorRateThreshold: number; // 触发 Runtime Rollback 的错误率
  selfModelStabilityThreshold: number; // 触发 Source Rollback 审查的自我模型稳定性
  consecutiveErrorsThreshold: number; // 连续错误数触发 Rollback
  responseTimeThreshold: number; // 响应时间阈值（毫秒）
}

export class RollbackController {
  private rollbackHistory: RollbackRecord[] = [];
  private triggerHistory: RollbackTrigger[] = [];
  private currentVersion: string = 'v1.0.0';
  private runtimeState: any = {}; // 运行时状态快照
  private sourceVersions: Map<string, string> = new Map(); // 源码版本历史

  private thresholds: RollbackThresholds = {
    heapUsageThreshold: 95, // 堆内存 > 95% 触发 Runtime Rollback
    errorRateThreshold: 20, // 错误率 > 20% 触发 Runtime Rollback
    selfModelStabilityThreshold: 60, // 自我模型稳定性 < 60% 触发 Source Rollback 审查
    consecutiveErrorsThreshold: 5, // 连续 5 个错误触发 Rollback
    responseTimeThreshold: 5000 // 响应时间 > 5000ms 触发 Runtime Rollback
  };

  private consecutiveErrors: number = 0;
  private lastErrorTime: Date = new Date();

  /**
   * 记录源码版本
   */
  recordSourceVersion(version: string, content: string): void {
    this.sourceVersions.set(version, content);
    this.currentVersion = version;
  }

  /**
   * 获取当前版本
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * 检查是否应该触发 Runtime Rollback
   */
  shouldTriggerRuntimeRollback(metrics: HealthMetrics): boolean {
    return (
      metrics.heapUsage > this.thresholds.heapUsageThreshold ||
      metrics.errorRate > this.thresholds.errorRateThreshold ||
      metrics.responseTime > this.thresholds.responseTimeThreshold
    );
  }

  /**
   * 检查是否应该审查 Source Rollback
   */
  shouldReviewSourceRollback(metrics: HealthMetrics): boolean {
    return metrics.selfModelStability < this.thresholds.selfModelStabilityThreshold;
  }

  /**
   * 记录错误
   */
  recordError(): void {
    this.consecutiveErrors++;
    this.lastErrorTime = new Date();

    if (this.consecutiveErrors >= this.thresholds.consecutiveErrorsThreshold) {
      console.warn(
        `[RollbackController] 连续错误数达到阈值: ${this.consecutiveErrors}，应考虑触发 Rollback`
      );
    }
  }

  /**
   * 清除错误计数
   */
  clearErrorCount(): void {
    this.consecutiveErrors = 0;
  }

  /**
   * 触发 Runtime Rollback
   */
  async triggerRuntimeRollback(reason: string, metrics: HealthMetrics): Promise<RollbackRecord> {
    const recordId = `rollback_runtime_${Date.now()}`;
    const startTime = Date.now();

    console.log(`[RollbackController] 触发 Runtime Rollback: ${reason}`);

    try {
      // 保存当前状态
      this.saveRuntimeState();

      // 执行 Rollback（在实际应用中，这会重启进程或清除缓存）
      await this.executeRuntimeRollback();

      const duration = Date.now() - startTime;

      const record: RollbackRecord = {
        recordId,
        timestamp: new Date(),
        rollbackType: 'runtime',
        targetVersion: this.currentVersion,
        reason,
        success: true,
        duration,
        metricsAfter: metrics,
        details: `Runtime Rollback 成功完成，耗时 ${duration}ms`
      };

      this.rollbackHistory.push(record);
      this.clearErrorCount();

      return record;
    } catch (error) {
      const duration = Date.now() - startTime;

      const record: RollbackRecord = {
        recordId,
        timestamp: new Date(),
        rollbackType: 'runtime',
        targetVersion: this.currentVersion,
        reason,
        success: false,
        duration,
        metricsAfter: metrics,
        details: `Runtime Rollback 失败: ${error}`
      };

      this.rollbackHistory.push(record);

      throw error;
    }
  }

  /**
   * 触发 Source Rollback
   */
  async triggerSourceRollback(
    targetVersion: string,
    reason: string,
    metrics: HealthMetrics
  ): Promise<RollbackRecord> {
    const recordId = `rollback_source_${Date.now()}`;
    const startTime = Date.now();

    console.log(`[RollbackController] 触发 Source Rollback 到版本 ${targetVersion}: ${reason}`);

    try {
      // 检查目标版本是否存在
      if (!this.sourceVersions.has(targetVersion)) {
        throw new Error(`目标版本不存在: ${targetVersion}`);
      }

      // 执行 Source Rollback（在实际应用中，这会更新代码仓库）
      await this.executeSourceRollback(targetVersion);

      const duration = Date.now() - startTime;

      const record: RollbackRecord = {
        recordId,
        timestamp: new Date(),
        rollbackType: 'source',
        targetVersion,
        reason,
        success: true,
        duration,
        metricsAfter: metrics,
        details: `Source Rollback 到 ${targetVersion} 成功完成，耗时 ${duration}ms`
      };

      this.rollbackHistory.push(record);
      this.currentVersion = targetVersion;

      return record;
    } catch (error) {
      const duration = Date.now() - startTime;

      const record: RollbackRecord = {
        recordId,
        timestamp: new Date(),
        rollbackType: 'source',
        targetVersion,
        reason,
        success: false,
        duration,
        metricsAfter: metrics,
        details: `Source Rollback 失败: ${error}`
      };

      this.rollbackHistory.push(record);

      throw error;
    }
  }

  /**
   * 自动 Rollback（基于健康度指标）
   */
  async autoRollback(metrics: HealthMetrics): Promise<RollbackRecord | null> {
    // 检查 Runtime Rollback 条件
    if (this.shouldTriggerRuntimeRollback(metrics)) {
      const reason = this.generateRuntimeRollbackReason(metrics);
      return await this.triggerRuntimeRollback(reason, metrics);
    }

    // 检查 Source Rollback 审查条件
    if (this.shouldReviewSourceRollback(metrics)) {
      console.warn(
        `[RollbackController] 自我模型稳定性低于阈值 (${metrics.selfModelStability}%), 建议审查 Source Rollback`
      );
      // 在实际应用中，这会触发人工审查流程
    }

    // 检查连续错误
    if (this.consecutiveErrors >= this.thresholds.consecutiveErrorsThreshold) {
      const reason = `连续错误数达到阈值: ${this.consecutiveErrors}`;
      return await this.triggerRuntimeRollback(reason, metrics);
    }

    return null;
  }

  /**
   * 生成 Runtime Rollback 原因
   */
  private generateRuntimeRollbackReason(metrics: HealthMetrics): string {
    const reasons: string[] = [];

    if (metrics.heapUsage > this.thresholds.heapUsageThreshold) {
      reasons.push(`堆内存使用率过高 (${metrics.heapUsage}%)`);
    }

    if (metrics.errorRate > this.thresholds.errorRateThreshold) {
      reasons.push(`错误率过高 (${metrics.errorRate}%)`);
    }

    if (metrics.responseTime > this.thresholds.responseTimeThreshold) {
      reasons.push(`响应时间过长 (${metrics.responseTime}ms)`);
    }

    return reasons.join('; ');
  }

  /**
   * 执行 Runtime Rollback（模拟实现）
   */
  private async executeRuntimeRollback(): Promise<void> {
    // 在实际应用中，这会：
    // 1. 清除缓存
    // 2. 重置内存池
    // 3. 重启关键服务
    // 4. 恢复运行时状态

    console.log('[RollbackController] 执行 Runtime Rollback...');

    // 模拟清除缓存
    this.runtimeState = {};

    // 模拟等待
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log('[RollbackController] Runtime Rollback 完成');
  }

  /**
   * 执行 Source Rollback（模拟实现）
   */
  private async executeSourceRollback(targetVersion: string): Promise<void> {
    // 在实际应用中，这会：
    // 1. 检出目标版本的代码
    // 2. 运行迁移脚本
    // 3. 重启应用
    // 4. 验证健康状态

    console.log(`[RollbackController] 执行 Source Rollback 到 ${targetVersion}...`);

    // 模拟等待
    await new Promise((resolve) => setTimeout(resolve, 200));

    console.log('[RollbackController] Source Rollback 完成');
  }

  /**
   * 保存运行时状态
   */
  private saveRuntimeState(): void {
    this.runtimeState = {
      timestamp: new Date(),
      version: this.currentVersion,
      consecutiveErrors: this.consecutiveErrors
    };
  }

  /**
   * 获取 Rollback 历史
   */
  getRollbackHistory(): RollbackRecord[] {
    return [...this.rollbackHistory];
  }

  /**
   * 获取触发历史
   */
  getTriggerHistory(): RollbackTrigger[] {
    return [...this.triggerHistory];
  }

  /**
   * 更新阈值
   */
  updateThresholds(newThresholds: Partial<RollbackThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  /**
   * 获取当前阈值
   */
  getThresholds(): RollbackThresholds {
    return { ...this.thresholds };
  }

  /**
   * 生成 Rollback 状态报告
   */
  generateStatusReport(): {
    currentVersion: string;
    consecutiveErrors: number;
    lastRollback: RollbackRecord | null;
    rollbackCount: number;
    successRate: number;
    thresholds: RollbackThresholds;
  } {
    const successCount = this.rollbackHistory.filter((r) => r.success).length;
    const successRate =
      this.rollbackHistory.length > 0 ? successCount / this.rollbackHistory.length : 0;

    return {
      currentVersion: this.currentVersion,
      consecutiveErrors: this.consecutiveErrors,
      lastRollback: this.rollbackHistory[this.rollbackHistory.length - 1] || null,
      rollbackCount: this.rollbackHistory.length,
      successRate: Math.round(successRate * 100) / 100,
      thresholds: this.getThresholds()
    };
  }

  /**
   * 生成详细的文本报告
   */
  generateTextReport(): string {
    const status = this.generateStatusReport();

    return `
=== Rollback 控制器状态报告 ===

当前版本: ${status.currentVersion}
连续错误数: ${status.consecutiveErrors}
总 Rollback 次数: ${status.rollbackCount}
成功率: ${(status.successRate * 100).toFixed(1)}%

最后一次 Rollback:
${
  status.lastRollback
    ? `- 类型: ${status.lastRollback.rollbackType}
- 时间: ${status.lastRollback.timestamp.toISOString()}
- 原因: ${status.lastRollback.reason}
- 成功: ${status.lastRollback.success ? '是' : '否'}
- 耗时: ${status.lastRollback.duration}ms`
    : '无'
}

当前阈值:
- 堆内存使用率: ${status.thresholds.heapUsageThreshold}%
- 错误率: ${status.thresholds.errorRateThreshold}%
- 自我模型稳定性: ${status.thresholds.selfModelStabilityThreshold}%
- 连续错误数: ${status.thresholds.consecutiveErrorsThreshold}
- 响应时间: ${status.thresholds.responseTimeThreshold}ms
`;
  }
}

// 导出单例
let _instance: RollbackController | null = null;

export function getRollbackController(): RollbackController {
  if (!_instance) {
    _instance = new RollbackController();
  }
  return _instance;
}
