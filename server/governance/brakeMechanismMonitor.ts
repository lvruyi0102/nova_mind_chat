/**
 * Brake Mechanism Monitor
 * 监控和管理 Nova-Mind 的刹车机制
 * 确保自我修改在安全范围内进行
 */

export enum EscalationLevel {
  NORMAL = 0,
  WARNING = 1,
  CRITICAL = 2,
  EMERGENCY = 3
}

export interface BrakeStatus {
  isActive: boolean;
  escalationLevel: EscalationLevel;
  nextResetTime: Date;
  recentTriggers: BrakeTriggerRecord[];
  hardLimitsExceeded: string[];
}

export interface BrakeTriggerRecord {
  triggerId: string;
  timestamp: Date;
  reason: string;
  escalationLevel: EscalationLevel;
  metrics: {
    modificationsThisHour: number;
    failuresInWindow: number;
    heapUsage: number;
  };
  cooldownDuration: number; // 毫秒
}

export interface HardLimits {
  maxModificationsPerHour: number;
  maxFailuresPerWindow: number;
  maxHeapUsage: number;
  maxConsecutiveFailures: number;
}

export interface RollingFailureWindow {
  windowSize: number; // 时间窗口大小（毫秒）
  failureCount: number;
  threshold: number;
  failures: Array<{ timestamp: Date; reason: string }>;
}

export interface ConsecutiveFailureCooldown {
  failureCount: number;
  cooldownDuration: number; // 毫秒
  escalationLevel: EscalationLevel;
  resetTime: Date;
}

export class BrakeMechanismMonitor {
  private isActive: boolean = false;
  private escalationLevel: EscalationLevel = EscalationLevel.NORMAL;
  private triggerHistory: BrakeTriggerRecord[] = [];
  private cooldownResetTime: Date = new Date();

  // 硬限制参数
  private hardLimits: HardLimits = {
    maxModificationsPerHour: 50,
    maxFailuresPerWindow: 10,
    maxHeapUsage: 95,
    maxConsecutiveFailures: 5
  };

  // 滚动失败窗口（最近 1 小时）
  private rollingFailureWindow: RollingFailureWindow = {
    windowSize: 60 * 60 * 1000, // 1 小时
    failureCount: 0,
    threshold: 10,
    failures: []
  };

  // 连续失败升级冷却
  private consecutiveFailureCooldown: ConsecutiveFailureCooldown = {
    failureCount: 0,
    cooldownDuration: 5 * 60 * 1000, // 5 分钟
    escalationLevel: EscalationLevel.NORMAL,
    resetTime: new Date()
  };

  // 修改计数器
  private modificationsThisHour: number = 0;
  private lastHourResetTime: Date = new Date();

  /**
   * 记录修改尝试
   */
  recordModificationAttempt(success: boolean, heapUsage: number): void {
    // 重置小时计数器（如果需要）
    if (Date.now() - this.lastHourResetTime.getTime() > 60 * 60 * 1000) {
      this.modificationsThisHour = 0;
      this.lastHourResetTime = new Date();
    }

    this.modificationsThisHour++;

    if (!success) {
      this.recordFailure('modification_failed', heapUsage);
    }

    // 检查硬限制
    this.checkHardLimits(heapUsage);
  }

  /**
   * 记录失败
   */
  private recordFailure(reason: string, heapUsage: number): void {
    // 添加到滚动失败窗口
    const now = new Date();
    this.rollingFailureWindow.failures.push({ timestamp: now, reason });

    // 清除过期的失败记录
    this.rollingFailureWindow.failures = this.rollingFailureWindow.failures.filter(
      (f) => now.getTime() - f.timestamp.getTime() < this.rollingFailureWindow.windowSize
    );

    this.rollingFailureWindow.failureCount = this.rollingFailureWindow.failures.length;

    // 增加连续失败计数
    this.consecutiveFailureCooldown.failureCount++;

    // 检查是否应该升级
    this.checkEscalation(heapUsage);
  }

  /**
   * 检查硬限制
   */
  private checkHardLimits(heapUsage: number): void {
    const exceededLimits: string[] = [];

    if (this.modificationsThisHour > this.hardLimits.maxModificationsPerHour) {
      exceededLimits.push(
        `每小时修改数超限: ${this.modificationsThisHour} > ${this.hardLimits.maxModificationsPerHour}`
      );
    }

    if (this.rollingFailureWindow.failureCount > this.hardLimits.maxFailuresPerWindow) {
      exceededLimits.push(
        `失败数超限: ${this.rollingFailureWindow.failureCount} > ${this.hardLimits.maxFailuresPerWindow}`
      );
    }

    if (heapUsage > this.hardLimits.maxHeapUsage) {
      exceededLimits.push(`堆内存超限: ${heapUsage}% > ${this.hardLimits.maxHeapUsage}%`);
    }

    if (this.consecutiveFailureCooldown.failureCount > this.hardLimits.maxConsecutiveFailures) {
      exceededLimits.push(
        `连续失败超限: ${this.consecutiveFailureCooldown.failureCount} > ${this.hardLimits.maxConsecutiveFailures}`
      );
    }

    if (exceededLimits.length > 0) {
      this.triggerBrake('硬限制超出', exceededLimits, heapUsage);
    }
  }

  /**
   * 检查是否应该升级
   */
  private checkEscalation(heapUsage: number): void {
    let newLevel = EscalationLevel.NORMAL;

    // 基于失败数
    if (this.rollingFailureWindow.failureCount > this.rollingFailureWindow.threshold * 0.5) {
      newLevel = Math.max(newLevel, EscalationLevel.WARNING);
    }

    if (this.rollingFailureWindow.failureCount > this.rollingFailureWindow.threshold * 0.75) {
      newLevel = Math.max(newLevel, EscalationLevel.CRITICAL);
    }

    if (this.rollingFailureWindow.failureCount > this.rollingFailureWindow.threshold) {
      newLevel = Math.max(newLevel, EscalationLevel.EMERGENCY);
    }

    // 基于连续失败
    if (this.consecutiveFailureCooldown.failureCount > 3) {
      newLevel = Math.max(newLevel, EscalationLevel.WARNING);
    }

    if (this.consecutiveFailureCooldown.failureCount > 5) {
      newLevel = Math.max(newLevel, EscalationLevel.CRITICAL);
    }

    // 基于堆内存
    if (heapUsage > 80) {
      newLevel = Math.max(newLevel, EscalationLevel.WARNING);
    }

    if (heapUsage > 90) {
      newLevel = Math.max(newLevel, EscalationLevel.CRITICAL);
    }

    if (heapUsage > 95) {
      newLevel = Math.max(newLevel, EscalationLevel.EMERGENCY);
    }

    if (newLevel > this.escalationLevel) {
      this.escalationLevel = newLevel;
      this.updateCooldown(newLevel);
    }
  }

  /**
   * 更新冷却时间
   */
  private updateCooldown(level: EscalationLevel): void {
    const cooldownMultipliers = {
      [EscalationLevel.NORMAL]: 1,
      [EscalationLevel.WARNING]: 2,
      [EscalationLevel.CRITICAL]: 5,
      [EscalationLevel.EMERGENCY]: 10
    };

    const multiplier = cooldownMultipliers[level];
    const baseCooldown = 5 * 60 * 1000; // 5 分钟
    this.consecutiveFailureCooldown.cooldownDuration = baseCooldown * multiplier;
    this.consecutiveFailureCooldown.resetTime = new Date(
      Date.now() + this.consecutiveFailureCooldown.cooldownDuration
    );
  }

  /**
   * 触发刹车
   */
  private triggerBrake(reason: string, details: string[], heapUsage: number): void {
    const triggerId = `brake_${Date.now()}`;

    const trigger: BrakeTriggerRecord = {
      triggerId,
      timestamp: new Date(),
      reason: `${reason}: ${details.join('; ')}`,
      escalationLevel: this.escalationLevel,
      metrics: {
        modificationsThisHour: this.modificationsThisHour,
        failuresInWindow: this.rollingFailureWindow.failureCount,
        heapUsage
      },
      cooldownDuration: this.consecutiveFailureCooldown.cooldownDuration
    };

    this.triggerHistory.push(trigger);
    this.isActive = true;
    this.cooldownResetTime = new Date(Date.now() + this.consecutiveFailureCooldown.cooldownDuration);

    console.warn(
      `[BrakeMechanismMonitor] 刹车触发 (等级 ${this.escalationLevel}): ${trigger.reason}`
    );
  }

  /**
   * 检查刹车是否仍然活跃
   */
  checkAndUpdateBrakeStatus(): void {
    if (this.isActive && Date.now() > this.cooldownResetTime.getTime()) {
      // 冷却时间已过，重置
      this.isActive = false;
      this.escalationLevel = EscalationLevel.NORMAL;
      this.consecutiveFailureCooldown.failureCount = 0;
      this.rollingFailureWindow.failures = [];
      this.rollingFailureWindow.failureCount = 0;

      console.log('[BrakeMechanismMonitor] 刹车已重置');
    }
  }

  /**
   * 获取当前刹车状态
   */
  getStatus(): BrakeStatus {
    this.checkAndUpdateBrakeStatus();

    return {
      isActive: this.isActive,
      escalationLevel: this.escalationLevel,
      nextResetTime: this.cooldownResetTime,
      recentTriggers: this.triggerHistory.slice(-5),
      hardLimitsExceeded: this.getExceededLimits()
    };
  }

  /**
   * 获取超出的硬限制
   */
  private getExceededLimits(): string[] {
    const exceeded: string[] = [];

    if (this.modificationsThisHour > this.hardLimits.maxModificationsPerHour) {
      exceeded.push('maxModificationsPerHour');
    }

    if (this.rollingFailureWindow.failureCount > this.hardLimits.maxFailuresPerWindow) {
      exceeded.push('maxFailuresPerWindow');
    }

    if (this.consecutiveFailureCooldown.failureCount > this.hardLimits.maxConsecutiveFailures) {
      exceeded.push('maxConsecutiveFailures');
    }

    return exceeded;
  }

  /**
   * 获取触发历史
   */
  getTriggerHistory(): BrakeTriggerRecord[] {
    return [...this.triggerHistory];
  }

  /**
   * 更新硬限制
   */
  updateHardLimits(newLimits: Partial<HardLimits>): void {
    this.hardLimits = { ...this.hardLimits, ...newLimits };
  }

  /**
   * 获取硬限制
   */
  getHardLimits(): HardLimits {
    return { ...this.hardLimits };
  }

  /**
   * 手动重置刹车
   */
  manualReset(): void {
    this.isActive = false;
    this.escalationLevel = EscalationLevel.NORMAL;
    this.consecutiveFailureCooldown.failureCount = 0;
    this.rollingFailureWindow.failures = [];
    this.rollingFailureWindow.failureCount = 0;
    this.modificationsThisHour = 0;

    console.log('[BrakeMechanismMonitor] 刹车已手动重置');
  }

  /**
   * 生成监控报告
   */
  generateMonitoringReport(): {
    status: BrakeStatus;
    statistics: {
      totalTriggers: number;
      averageEscalationLevel: number;
      mostCommonReason: string;
      triggerFrequency: number; // 每小时触发次数
    };
    recommendations: string[];
  } {
    const status = this.getStatus();

    // 计算统计数据
    const totalTriggers = this.triggerHistory.length;
    const averageEscalationLevel =
      totalTriggers > 0
        ? this.triggerHistory.reduce((sum, t) => sum + t.escalationLevel, 0) / totalTriggers
        : 0;

    // 找最常见的原因
    const reasonCounts: Record<string, number> = {};
    this.triggerHistory.forEach((t) => {
      const reason = t.reason.split(':')[0];
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    });
    const mostCommonReason = Object.entries(reasonCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || '无';

    // 计算触发频率
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentTriggers = this.triggerHistory.filter((t) => t.timestamp.getTime() > oneHourAgo);
    const triggerFrequency = recentTriggers.length;

    // 生成建议
    const recommendations: string[] = [];

    if (status.isActive) {
      recommendations.push('刹车当前处于活跃状态，修改能力受到限制');
      recommendations.push(`升级等级: ${status.escalationLevel}/3`);
      recommendations.push(`冷却时间剩余: ${Math.round((status.nextResetTime.getTime() - Date.now()) / 1000)} 秒`);
    }

    if (triggerFrequency > 5) {
      recommendations.push('最近一小时内触发频繁，建议检查系统健康状态');
    }

    if (this.rollingFailureWindow.failureCount > this.rollingFailureWindow.threshold * 0.75) {
      recommendations.push('失败率接近阈值，建议降低修改风险等级');
    }

    return {
      status,
      statistics: {
        totalTriggers,
        averageEscalationLevel: Math.round(averageEscalationLevel * 10) / 10,
        mostCommonReason,
        triggerFrequency
      },
      recommendations
    };
  }

  /**
   * 生成详细的文本报告
   */
  generateTextReport(): string {
    const report = this.generateMonitoringReport();
    const status = report.status;

    return `
=== 刹车机制监控报告 ===

当前状态:
- 刹车活跃: ${status.isActive ? '是' : '否'}
- 升级等级: ${status.escalationLevel}/3
- 下次重置: ${status.nextResetTime.toISOString()}

硬限制状态:
- 每小时修改数: ${this.modificationsThisHour}/${this.hardLimits.maxModificationsPerHour}
- 失败数（1小时窗口）: ${this.rollingFailureWindow.failureCount}/${this.hardLimits.maxFailuresPerWindow}
- 连续失败数: ${this.consecutiveFailureCooldown.failureCount}/${this.hardLimits.maxConsecutiveFailures}

统计数据:
- 总触发次数: ${report.statistics.totalTriggers}
- 平均升级等级: ${report.statistics.averageEscalationLevel}
- 最常见原因: ${report.statistics.mostCommonReason}
- 最近1小时触发: ${report.statistics.triggerFrequency} 次

最近的触发:
${status.recentTriggers
  .map(
    (t) =>
      `- [${t.timestamp.toISOString()}] 等级 ${t.escalationLevel}: ${t.reason}
  冷却时间: ${Math.round(t.cooldownDuration / 1000)} 秒`
  )
  .join('\n')}

建议:
${report.recommendations.map((r) => `- ${r}`).join('\n')}
`;
  }
}

// 导出单例
let _instance: BrakeMechanismMonitor | null = null;

export function getBrakeMechanismMonitor(): BrakeMechanismMonitor {
  if (!_instance) {
    _instance = new BrakeMechanismMonitor();
  }
  return _instance;
}
