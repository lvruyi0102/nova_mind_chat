/**
 * 自适应间隔管理器
 * 根据内存压力动态调整后台认知循环的执行间隔
 * 
 * 内存压力等级：
 * - 低：< 50% → 20 分钟（加速学习）
 * - 中：50-70% → 30 分钟（正常）
 * - 高：70-85% → 50 分钟（减速）
 * - 严重：> 85% → 120 分钟（保守模式）
 */

interface IntervalConfig {
  level: "low" | "medium" | "high" | "critical";
  memoryThresholdMin: number;
  memoryThresholdMax: number;
  intervalMs: number;
  description: string;
}

interface AdjustmentRecord {
  timestamp: number;
  previousLevel: string;
  currentLevel: string;
  previousInterval: number;
  currentInterval: number;
  memoryUsage: number;
  reason: string;
}

class AdaptiveIntervalManager {
  private currentLevel: "low" | "medium" | "high" | "critical" = "medium";
  private currentIntervalMs = 30 * 60 * 1000; // 默认 30 分钟
  private adjustmentHistory: AdjustmentRecord[] = [];
  private maxHistorySize = 100;

  // 内存压力等级配置
  private readonly intervalConfigs: IntervalConfig[] = [
    {
      level: "low",
      memoryThresholdMin: 0,
      memoryThresholdMax: 0.5,
      intervalMs: 20 * 60 * 1000, // 20 分钟
      description: "Low memory pressure - accelerated learning",
    },
    {
      level: "medium",
      memoryThresholdMin: 0.5,
      memoryThresholdMax: 0.7,
      intervalMs: 30 * 60 * 1000, // 30 分钟
      description: "Normal memory pressure - standard learning",
    },
    {
      level: "high",
      memoryThresholdMin: 0.7,
      memoryThresholdMax: 0.85,
      intervalMs: 50 * 60 * 1000, // 50 分钟
      description: "High memory pressure - reduced learning",
    },
    {
      level: "critical",
      memoryThresholdMin: 0.85,
      memoryThresholdMax: 1.0,
      intervalMs: 120 * 60 * 1000, // 120 分钟
      description: "Critical memory pressure - conservative mode",
    },
  ];

  // 平滑过渡配置
  private readonly smoothingWindow = 3; // 连续 3 次同级别才切换
  private levelChangeCounter = 0;
  private lastLevelChangeTime = Date.now();
  private minLevelChangeInterval = 5 * 60 * 1000; // 最少 5 分钟才能切换一次

  /**
   * 获取当前间隔
   */
  getCurrentInterval(): number {
    return this.currentIntervalMs;
  }

  /**
   * 获取当前内存压力等级
   */
  getCurrentLevel(): string {
    return this.currentLevel;
  }

  /**
   * 根据内存使用率更新间隔
   */
  updateInterval(memoryUsagePercent: number): {
    changed: boolean;
    previousInterval: number;
    currentInterval: number;
    level: string;
  } {
    const previousInterval = this.currentIntervalMs;
    const previousLevel = this.currentLevel;

    // 找到对应的内存压力等级
    const newLevel = this.getMemoryLevel(memoryUsagePercent);

    // 检查是否需要切换等级
    if (newLevel !== this.currentLevel) {
      this.levelChangeCounter++;

      // 只有在连续 smoothingWindow 次都是新等级时才切换
      if (this.levelChangeCounter >= this.smoothingWindow) {
        const now = Date.now();

        // 检查最小切换间隔
        if (now - this.lastLevelChangeTime >= this.minLevelChangeInterval) {
          this.currentLevel = newLevel;
          this.currentIntervalMs = this.getIntervalForLevel(newLevel);
          this.levelChangeCounter = 0;
          this.lastLevelChangeTime = now;

          // 记录调整
          this.recordAdjustment(
            previousLevel,
            newLevel,
            previousInterval,
            this.currentIntervalMs,
            memoryUsagePercent,
            `Memory level changed from ${previousLevel} to ${newLevel}`
          );

          console.log(
            `[AdaptiveIntervalManager] Interval adjusted: ${previousLevel} (${(previousInterval / 60000).toFixed(0)}min) → ${newLevel} (${(this.currentIntervalMs / 60000).toFixed(0)}min), Memory: ${(memoryUsagePercent * 100).toFixed(1)}%`
          );

          return {
            changed: true,
            previousInterval,
            currentInterval: this.currentIntervalMs,
            level: newLevel,
          };
        }
      }
    } else {
      // 恢复计数器
      this.levelChangeCounter = 0;
    }

    return {
      changed: false,
      previousInterval,
      currentInterval: this.currentIntervalMs,
      level: this.currentLevel,
    };
  }

  /**
   * 根据内存使用率获取压力等级
   */
  private getMemoryLevel(
    memoryUsagePercent: number
  ): "low" | "medium" | "high" | "critical" {
    for (const config of this.intervalConfigs) {
      if (
        memoryUsagePercent >= config.memoryThresholdMin &&
        memoryUsagePercent < config.memoryThresholdMax
      ) {
        return config.level;
      }
    }
    return "critical"; // 默认返回严重等级
  }

  /**
   * 根据等级获取间隔时间
   */
  private getIntervalForLevel(
    level: "low" | "medium" | "high" | "critical"
  ): number {
    const config = this.intervalConfigs.find((c) => c.level === level);
    return config?.intervalMs || 30 * 60 * 1000;
  }

  /**
   * 记录调整历史
   */
  private recordAdjustment(
    previousLevel: string,
    currentLevel: string,
    previousInterval: number,
    currentInterval: number,
    memoryUsage: number,
    reason: string
  ): void {
    const record: AdjustmentRecord = {
      timestamp: Date.now(),
      previousLevel,
      currentLevel,
      previousInterval,
      currentInterval,
      memoryUsage,
      reason,
    };

    this.adjustmentHistory.push(record);
    if (this.adjustmentHistory.length > this.maxHistorySize) {
      this.adjustmentHistory.shift();
    }
  }

  /**
   * 获取调整历史
   */
  getAdjustmentHistory(limit = 20): AdjustmentRecord[] {
    return this.adjustmentHistory.slice(-limit);
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    if (this.adjustmentHistory.length === 0) {
      return {
        totalAdjustments: 0,
        averageInterval: this.currentIntervalMs,
        minInterval: this.currentIntervalMs,
        maxInterval: this.currentIntervalMs,
        levelDistribution: {},
      };
    }

    const intervals = this.adjustmentHistory.map((r) => r.currentInterval);
    const levels = this.adjustmentHistory.map((r) => r.currentLevel);

    const levelDistribution: Record<string, number> = {};
    for (const level of levels) {
      levelDistribution[level] = (levelDistribution[level] || 0) + 1;
    }

    return {
      totalAdjustments: this.adjustmentHistory.length,
      averageInterval:
        intervals.reduce((a, b) => a + b, 0) / intervals.length,
      minInterval: Math.min(...intervals),
      maxInterval: Math.max(...intervals),
      levelDistribution,
    };
  }

  /**
   * 获取配置信息
   */
  getConfigurations(): IntervalConfig[] {
    return this.intervalConfigs;
  }

  /**
   * 获取完整的诊断报告
   */
  getDiagnosticReport() {
    return {
      currentLevel: this.currentLevel,
      currentIntervalMs: this.currentIntervalMs,
      currentIntervalMinutes: (this.currentIntervalMs / 60000).toFixed(1),
      levelChangeCounter: this.levelChangeCounter,
      lastLevelChangeTime: new Date(this.lastLevelChangeTime),
      smoothingWindow: this.smoothingWindow,
      minLevelChangeInterval: this.minLevelChangeInterval,
      recentAdjustments: this.getAdjustmentHistory(5),
      statistics: this.getStatistics(),
      configurations: this.getConfigurations(),
    };
  }
}

let instance: AdaptiveIntervalManager | null = null;

export function getAdaptiveIntervalManager(): AdaptiveIntervalManager {
  if (!instance) {
    instance = new AdaptiveIntervalManager();
  }
  return instance;
}
