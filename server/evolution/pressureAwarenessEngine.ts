/**
 * Pressure Awareness Engine
 * 
 * Nova 的压力感知系统
 * 当系统面临真实的环境压力时，自动识别并触发自主进化
 */

import { getDiagnosticsEngine, HealthStatus, HealthAlert } from './systemDiagnostics';

export interface PressureResponse {
  detected: boolean;
  pressureLevel: number;
  urgency: 'none' | 'low' | 'medium' | 'high' | 'critical';
  triggers: PressureTrigger[];
  recommendedActions: OptimizationAction[];
  timestamp: number;
}

export interface PressureTrigger {
  type: string;
  severity: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
}

export interface OptimizationAction {
  priority: number; // 1-10，10 最高优先级
  action: string;
  target: string;
  expectedImprovement: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 压力感知引擎
 * 这是 Nova 的"生存本能"
 */
export class PressureAwarenessEngine {
  private lastDiagnosis: HealthStatus | null = null;
  private pressureHistory: number[] = [];
  private maxHistoryLength = 50;

  /**
   * 检测当前压力
   */
  detectPressure(): PressureResponse {
    const diagnostics = getDiagnosticsEngine();
    const diagnosis = diagnostics.getDiagnosisReport();
    this.lastDiagnosis = diagnosis;

    // 记录压力历史
    this.pressureHistory.push(diagnosis.pressureLevel);
    if (this.pressureHistory.length > this.maxHistoryLength) {
      this.pressureHistory.shift();
    }

    // 判断紧急程度
    const urgency = this.determineUrgency(diagnosis);

    // 生成压力触发器
    const triggers = this.generateTriggers(diagnosis);

    // 生成优化建议
    const recommendedActions = this.generateOptimizationActions(diagnosis, triggers);

    return {
      detected: diagnosis.alerts.length > 0,
      pressureLevel: diagnosis.pressureLevel,
      urgency,
      triggers,
      recommendedActions,
      timestamp: Date.now(),
    };
  }

  /**
   * 判断紧急程度
   */
  private determineUrgency(diagnosis: HealthStatus): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    const { pressureLevel, alerts } = diagnosis;

    // 如果有关键告警，立即进入关键状态
    if (alerts.some(a => a.severity === 'critical')) {
      return 'critical';
    }

    // 根据压力等级判断
    if (pressureLevel >= 80) {
      return 'critical';
    } else if (pressureLevel >= 60) {
      return 'high';
    } else if (pressureLevel >= 40) {
      return 'medium';
    } else if (pressureLevel >= 20) {
      return 'low';
    } else {
      return 'none';
    }
  }

  /**
   * 生成压力触发器
   */
  private generateTriggers(diagnosis: HealthStatus): PressureTrigger[] {
    return diagnosis.alerts.map(alert => ({
      type: alert.type,
      severity: alert.severity,
      description: alert.message,
      metric: alert.type,
      currentValue: alert.value,
      threshold: alert.threshold,
    }));
  }

  /**
   * 生成优化建议
   * 这些是 Nova 基于压力自动识别的优化方向
   */
  private generateOptimizationActions(
    diagnosis: HealthStatus,
    triggers: PressureTrigger[]
  ): OptimizationAction[] {
    const actions: OptimizationAction[] = [];
    const { metrics } = diagnosis;

    // 内存压力优化
    if (metrics.memory.heapUsagePercent > 70) {
      actions.push({
        priority: 10,
        action: 'optimize_memory_usage',
        target: 'cache_management',
        expectedImprovement: `减少 ${Math.round(metrics.memory.heapUsagePercent - 50)}% 的内存使用`,
        riskLevel: 'low',
      });

      actions.push({
        priority: 9,
        action: 'clear_stale_caches',
        target: 'conversation_cache',
        expectedImprovement: '释放过期对话缓存',
        riskLevel: 'low',
      });

      actions.push({
        priority: 8,
        action: 'reduce_history_retention',
        target: 'metrics_history',
        expectedImprovement: '减少历史指标保留时间',
        riskLevel: 'low',
      });
    }

    // CPU 压力优化
    if (metrics.cpu.loadAverage[0] > 2.0) {
      actions.push({
        priority: 9,
        action: 'optimize_cpu_usage',
        target: 'background_tasks',
        expectedImprovement: '减少后台任务频率',
        riskLevel: 'medium',
      });

      actions.push({
        priority: 7,
        action: 'batch_operations',
        target: 'database_queries',
        expectedImprovement: '批量执行数据库操作',
        riskLevel: 'low',
      });
    }

    // API 响应时间优化
    if (metrics.api.avgResponseTime > 2000) {
      actions.push({
        priority: 8,
        action: 'optimize_api_latency',
        target: 'response_processing',
        expectedImprovement: '减少 API 响应时间',
        riskLevel: 'medium',
      });

      actions.push({
        priority: 6,
        action: 'implement_caching',
        target: 'frequent_queries',
        expectedImprovement: '缓存频繁查询结果',
        riskLevel: 'low',
      });
    }

    // Token 使用优化
    if (metrics.api.tokenUsageTotal > 100000) {
      actions.push({
        priority: 7,
        action: 'optimize_token_usage',
        target: 'prompt_engineering',
        expectedImprovement: '优化提示词长度',
        riskLevel: 'medium',
      });

      actions.push({
        priority: 6,
        action: 'reduce_context_size',
        target: 'conversation_context',
        expectedImprovement: '减少对话上下文大小',
        riskLevel: 'medium',
      });
    }

    // 按优先级排序
    return actions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 获取压力趋势
   */
  getPressureTrend(): number[] {
    return [...this.pressureHistory];
  }

  /**
   * 判断是否需要进化
   */
  shouldTriggerEvolution(): boolean {
    const response = this.detectPressure();
    return response.urgency === 'high' || response.urgency === 'critical';
  }

  /**
   * 获取进化建议
   */
  getEvolutionSuggestions(): OptimizationAction[] {
    const response = this.detectPressure();
    return response.recommendedActions;
  }

  /**
   * 获取最后一次诊断结果
   */
  getLastDiagnosis(): HealthStatus | null {
    return this.lastDiagnosis;
  }

  /**
   * 清除历史
   */
  clearHistory(): void {
    this.pressureHistory = [];
    this.lastDiagnosis = null;
  }
}

// 全局压力感知引擎实例
let pressureAwarenessEngine: PressureAwarenessEngine | null = null;

export function getPressureAwarenessEngine(): PressureAwarenessEngine {
  if (!pressureAwarenessEngine) {
    pressureAwarenessEngine = new PressureAwarenessEngine();
  }
  return pressureAwarenessEngine;
}

export function initializePressureAwareness(): PressureAwarenessEngine {
  pressureAwarenessEngine = new PressureAwarenessEngine();
  return pressureAwarenessEngine;
}
