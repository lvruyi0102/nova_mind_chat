/**
 * 自迭代后台任务
 * 定期检测失败，自动触发改进循环
 */

import { getFailureDetector } from "../selfIteration/failureDetector";
import { SelfIterationController } from "../selfIteration/selfIterationController";
import { getRuleManager } from "../selfIteration/fileBasedRuleManager";

export interface BackgroundTaskConfig {
  enabled: boolean;
  interval: number; // 毫秒
  autoTriggerThreshold: number; // 自动触发改进的失败率阈值
  maxConcurrentIterations: number; // 最大并发迭代数
  logResults: boolean; // 是否记录结果
}

/**
 * 自迭代后台任务
 */
export class SelfIterationBackgroundTask {
  private config: BackgroundTaskConfig;
  private taskId: string;
  private isRunning: boolean = false;
  private lastRun: Date | null = null;
  private iterationCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;

  constructor(config: Partial<BackgroundTaskConfig> = {}) {
    this.config = {
      enabled: true,
      interval: 5 * 60 * 1000, // 5 分钟
      autoTriggerThreshold: 0.3, // 30% 失败率
      maxConcurrentIterations: 2,
      logResults: true,
      ...config,
    };
    this.taskId = `self-iteration-${Date.now()}`;
  }

  /**
   * 启动后台任务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[SelfIterationBackgroundTask] 任务已在运行中");
      return;
    }

    this.isRunning = true;
    console.log(`[SelfIterationBackgroundTask] 启动任务 ${this.taskId}`);

    this.runLoop();
  }

  /**
   * 停止后台任务
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`[SelfIterationBackgroundTask] 停止任务 ${this.taskId}`);
  }

  /**
   * 任务主循环
   */
  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.executeIteration();
      } catch (error) {
        console.error("[SelfIterationBackgroundTask] 执行迭代失败:", error);
      }

      // 等待下一个周期
      await new Promise((resolve) => setTimeout(resolve, this.config.interval));
    }
  }

  /**
   * 执行一次迭代
   */
  private async executeIteration(): Promise<void> {
    this.lastRun = new Date();

    try {
      // 1. 检测失败
      const detector = getFailureDetector();
      const rulesToImprove = await detector.getRulesToImprove();

      if (rulesToImprove.length === 0) {
        if (this.config.logResults) {
          console.log("[SelfIterationBackgroundTask] 没有需要改进的规则");
        }
        return;
      }

      if (this.config.logResults) {
        console.log(
          `[SelfIterationBackgroundTask] 发现 ${rulesToImprove.length} 个需要改进的规则`
        );
      }

      // 2. 为每个需要改进的规则触发改进循环
      const controller = new SelfIterationController();
      const ruleManager = await getRuleManager();
      const concurrentLimit = this.config.maxConcurrentIterations;

      for (let i = 0; i < rulesToImprove.length; i += concurrentLimit) {
        const batch = rulesToImprove.slice(i, i + concurrentLimit);

        const promises = batch.map(async (pattern) => {
          try {
            const rule = await ruleManager.getRule(pattern.ruleId);
            if (!rule) {
              console.warn(
                `[SelfIterationBackgroundTask] 规则 ${pattern.ruleId} 不存在`
              );
              return;
            }

            // 分析失败原因
            const failureAnalysis = `规则 "${rule.name}" 的失败率为 ${(
              pattern.failureRate * 100
            ).toFixed(1)}%，需要改进`;

            // 执行自迭代
            const result = await controller.executeIteration({
              ruleId: pattern.ruleId,
              failureAnalysis,
              improvements: [],
            });

            this.iterationCount++;
            if (result.status === "success") {
              this.successCount++;
              if (this.config.logResults) {
                console.log(
                  `[SelfIterationBackgroundTask] 规则 "${rule.name}" 改进成功`
                );
              }
            } else {
              this.failureCount++;
              if (this.config.logResults) {
                console.log(
                  `[SelfIterationBackgroundTask] 规则 "${rule.name}" 改进失败: ${result.error}`
                );
              }
            }
          } catch (error) {
            this.failureCount++;
            console.error(
              "[SelfIterationBackgroundTask] 处理规则时出错:",
              error
            );
          }
        });

        await Promise.all(promises);
      }
    } catch (error) {
      console.error("[SelfIterationBackgroundTask] 迭代执行失败:", error);
    }
  }

  /**
   * 获取任务状态
   */
  getStatus(): {
    taskId: string;
    isRunning: boolean;
    lastRun: Date | null;
    iterationCount: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  } {
    const successRate =
      this.iterationCount > 0
        ? (this.successCount / this.iterationCount) * 100
        : 0;

    return {
      taskId: this.taskId,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      iterationCount: this.iterationCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.iterationCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.lastRun = null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BackgroundTaskConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[SelfIterationBackgroundTask] 配置已更新:", this.config);
  }
}

// 全局后台任务实例
let globalBackgroundTask: SelfIterationBackgroundTask | null = null;

/**
 * 获取全局后台任务
 */
export function getBackgroundTask(): SelfIterationBackgroundTask {
  if (!globalBackgroundTask) {
    globalBackgroundTask = new SelfIterationBackgroundTask();
  }
  return globalBackgroundTask;
}

/**
 * 启动全局后台任务
 */
export async function startBackgroundTask(): Promise<void> {
  const task = getBackgroundTask();
  await task.start();
}

/**
 * 停止全局后台任务
 */
export async function stopBackgroundTask(): Promise<void> {
  const task = getBackgroundTask();
  await task.stop();
}

/**
 * 获取后台任务状态
 */
export function getBackgroundTaskStatus() {
  const task = getBackgroundTask();
  return task.getStatus();
}
