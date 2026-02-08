/**
 * Auto-Optimization Guardrails
 * 
 * 自动优化的安全卫士
 * 确保 Nova 的自动优化不会超出安全边界
 */

import { getSelfDiagnostics } from './selfDiagnostics';
import { getPressureAwarenessEngine } from '../evolution/pressureAwarenessEngine';

export interface GuardrailCheckResult {
  passed: boolean;
  violations: GuardrailViolation[];
  warnings: string[];
  recommendations: string[];
}

export interface GuardrailViolation {
  type: 'critical' | 'high' | 'medium' | 'low';
  rule: string;
  description: string;
  currentValue?: number;
  threshold?: number;
  suggestion?: string;
}

/**
 * 自动优化卫士
 * 多层防护确保自动优化的安全性
 */
export class AutoOptimizationGuardrails {
  // 安全限制配置
  private config = {
    // 内存限制
    maxHeapUsagePercent: 90, // 堆内存使用不超过 90%
    maxRSSMemoryMB: 500, // RSS 内存不超过 500MB
    
    // 修改限制
    maxCodeModificationsPerHour: 10, // 每小时最多 10 次代码修改
    maxConsecutiveFailures: 3, // 最多连续失败 3 次
    minSuccessRatePercent: 70, // 成功率至少 70%
    
    // 压力限制
    maxPressureLevel: 95, // 压力超过 95 时停止自动优化
    criticalPressureLevel: 90, // 压力超过 90 时进入保守模式
    
    // 时间限制
    minIntervalBetweenModifications: 60000, // 修改间隔至少 60 秒
    maxCumulativeModificationTimePerHour: 300000, // 每小时修改耗时不超过 5 分钟
    
    // 文件限制
    maxFileSizeChangePercent: 20, // 文件大小变化不超过 20%
    maxLinesChangedPerFile: 100, // 每个文件最多改 100 行
  };

  private modificationHistory: Array<{
    timestamp: number;
    success: boolean;
    duration: number;
  }> = [];

  private maxHistorySize = 1000;

  /**
   * 检查是否可以执行自动优化
   */
  checkAutoOptimizationSafety(): GuardrailCheckResult {
    const violations: GuardrailViolation[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // 1. 检查内存使用
    const memoryViolations = this.checkMemoryUsage();
    violations.push(...memoryViolations);

    // 2. 检查修改历史
    const historyViolations = this.checkModificationHistory();
    violations.push(...historyViolations);

    // 3. 检查压力等级
    const pressureViolations = this.checkPressureLevel();
    violations.push(...pressureViolations);

    // 4. 检查系统健康状态
    const healthWarnings = this.checkSystemHealth();
    warnings.push(...healthWarnings);

    // 5. 生成建议
    if (violations.length > 0) {
      recommendations.push('检测到安全违规，建议暂停自动优化');
      
      const criticalViolations = violations.filter(v => v.type === 'critical');
      if (criticalViolations.length > 0) {
        recommendations.push('存在关键违规，必须立即停止自动优化');
      }
    }

    if (violations.some(v => v.type === 'high')) {
      recommendations.push('进入保守模式，仅执行低风险优化');
    }

    const passed = violations.filter(v => v.type === 'critical' || v.type === 'high').length === 0;

    return {
      passed,
      violations,
      warnings,
      recommendations,
    };
  }

  /**
   * 检查内存使用
   */
  private checkMemoryUsage(): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    const memUsage = process.memoryUsage();

    // 检查堆内存百分比
    const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (heapUsagePercent > this.config.maxHeapUsagePercent) {
      violations.push({
        type: heapUsagePercent > 95 ? 'critical' : 'high',
        rule: 'Heap Memory Usage',
        description: `堆内存使用率过高: ${heapUsagePercent.toFixed(1)}%`,
        currentValue: heapUsagePercent,
        threshold: this.config.maxHeapUsagePercent,
        suggestion: '执行内存清理或暂停自动优化',
      });
    }

    // 检查 RSS 内存
    const rssMB = memUsage.rss / 1024 / 1024;
    if (rssMB > this.config.maxRSSMemoryMB) {
      violations.push({
        type: rssMB > this.config.maxRSSMemoryMB * 1.1 ? 'critical' : 'high',
        rule: 'RSS Memory',
        description: `RSS 内存过高: ${rssMB.toFixed(1)}MB`,
        currentValue: rssMB,
        threshold: this.config.maxRSSMemoryMB,
        suggestion: '执行内存清理或重启进程',
      });
    }

    return violations;
  }

  /**
   * 检查修改历史
   */
  private checkModificationHistory(): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    // 清理过期的历史记录
    this.modificationHistory = this.modificationHistory.filter(
      record => record.timestamp > oneHourAgo
    );

    // 检查每小时修改次数
    const modificationsThisHour = this.modificationHistory.length;
    if (modificationsThisHour > this.config.maxCodeModificationsPerHour) {
      violations.push({
        type: 'high',
        rule: 'Modifications Per Hour',
        description: `一小时内修改次数过多: ${modificationsThisHour}`,
        currentValue: modificationsThisHour,
        threshold: this.config.maxCodeModificationsPerHour,
        suggestion: '限制修改频率，避免过度优化',
      });
    }

    // 检查成功率
    if (this.modificationHistory.length > 0) {
      const successCount = this.modificationHistory.filter(r => r.success).length;
      const successRate = (successCount / this.modificationHistory.length) * 100;

      if (successRate < this.config.minSuccessRatePercent) {
        violations.push({
          type: 'medium',
          rule: 'Success Rate',
          description: `修改成功率过低: ${successRate.toFixed(1)}%`,
          currentValue: successRate,
          threshold: this.config.minSuccessRatePercent,
          suggestion: '检查修改质量，改进修改策略',
        });
      }
    }

    // 检查连续失败次数
    let consecutiveFailures = 0;
    for (let i = this.modificationHistory.length - 1; i >= 0; i--) {
      if (!this.modificationHistory[i].success) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures > this.config.maxConsecutiveFailures) {
      violations.push({
        type: 'high',
        rule: 'Consecutive Failures',
        description: `连续失败次数过多: ${consecutiveFailures}`,
        currentValue: consecutiveFailures,
        threshold: this.config.maxConsecutiveFailures,
        suggestion: '停止自动优化，检查问题根源',
      });
    }

    // 检查每小时累计修改时间
    const totalDuration = this.modificationHistory.reduce((sum, r) => sum + r.duration, 0);
    if (totalDuration > this.config.maxCumulativeModificationTimePerHour) {
      violations.push({
        type: 'medium',
        rule: 'Cumulative Modification Time',
        description: `修改耗时过长: ${(totalDuration / 1000).toFixed(1)}s`,
        currentValue: totalDuration,
        threshold: this.config.maxCumulativeModificationTimePerHour,
        suggestion: '优化修改策略，减少耗时',
      });
    }

    return violations;
  }

  /**
   * 检查压力等级
   */
  private checkPressureLevel(): GuardrailViolation[] {
    const violations: GuardrailViolation[] = [];
    const pressureEngine = getPressureAwarenessEngine();
    const pressureResponse = pressureEngine.detectPressure();

    if (pressureResponse.pressureLevel > this.config.maxPressureLevel) {
      violations.push({
        type: 'critical',
        rule: 'Maximum Pressure Level',
        description: `压力等级过高: ${pressureResponse.pressureLevel}/100`,
        currentValue: pressureResponse.pressureLevel,
        threshold: this.config.maxPressureLevel,
        suggestion: '停止自动优化，进入应急模式',
      });
    } else if (pressureResponse.pressureLevel > this.config.criticalPressureLevel) {
      violations.push({
        type: 'high',
        rule: 'Critical Pressure Level',
        description: `压力等级较高: ${pressureResponse.pressureLevel}/100`,
        currentValue: pressureResponse.pressureLevel,
        threshold: this.config.criticalPressureLevel,
        suggestion: '进入保守模式，仅执行必要优化',
      });
    }

    return violations;
  }

  /**
   * 检查系统健康状态
   */
  private checkSystemHealth(): string[] {
    const warnings: string[] = [];
    const diagnostics = getSelfDiagnostics();
    const report = diagnostics.getLatestReport();

    if (!report) {
      warnings.push('无诊断报告，无法评估系统健康状态');
      return warnings;
    }

    if (report.overallHealth < 50) {
      warnings.push('系统健康状态较差，建议谨慎执行自动优化');
    }

    if (report.issues.length > 5) {
      warnings.push(`系统存在 ${report.issues.length} 个问题，建议先解决现有问题`);
    }

    return warnings;
  }

  /**
   * 记录修改执行
   */
  recordModification(success: boolean, duration: number): void {
    this.modificationHistory.push({
      timestamp: Date.now(),
      success,
      duration,
    });

    if (this.modificationHistory.length > this.maxHistorySize) {
      this.modificationHistory.shift();
    }
  }

  /**
   * 获取修改统计
   */
  getModificationStatistics() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    const recentModifications = this.modificationHistory.filter(
      r => r.timestamp > oneHourAgo
    );

    const successCount = recentModifications.filter(r => r.success).length;
    const failureCount = recentModifications.length - successCount;
    const successRate = recentModifications.length > 0
      ? (successCount / recentModifications.length) * 100
      : 0;
    const totalDuration = recentModifications.reduce((sum, r) => sum + r.duration, 0);

    return {
      totalModifications: recentModifications.length,
      successCount,
      failureCount,
      successRate: successRate.toFixed(1),
      totalDuration,
      averageDuration: recentModifications.length > 0
        ? (totalDuration / recentModifications.length).toFixed(0)
        : 0,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[AutoOptimizationGuardrails] Configuration updated:', this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.config };
  }
}

// Singleton instance
let _instance: AutoOptimizationGuardrails | null = null;

export function getAutoOptimizationGuardrails(): AutoOptimizationGuardrails {
  if (!_instance) {
    _instance = new AutoOptimizationGuardrails();
  }
  return _instance;
}
