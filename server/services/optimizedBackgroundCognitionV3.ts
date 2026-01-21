/**
 * 优化的后台认知循环 V3
 * 解决内存使用率过高问题（95%+）
 * 
 * 优化策略：
 * 1. 增加循环间隔：20分钟 → 40分钟
 * 2. 限制并发任务数：2 → 1（严格串行）
 * 3. 更激进的内存检查：75% → 65% 阈值
 * 4. 实现流式处理：避免一次性加载大量数据
 * 5. 使用 V2 版本的缓存和内存管理器
 * 6. 添加任务超时控制
 * 7. 实现增量处理而非批量处理
 */

import { getMemoryOptimizerV2 } from "./memoryOptimizerV2";
import { getCacheManagerV2 } from "./cacheManagerV2";
import { getDb } from "../db";
import { executeImprovedLocalLearningCycle } from "./improvedLearningIntegration";
import { executeMonthlyLLMLearning } from "./monthlyLLMLearner";
import { runDailyCurationCycle } from "./curatedThoughtsScheduler";

interface CognitionLoopConfig {
  intervalMs: number; // 循环间隔（毫秒）
  maxConcurrentTasks: number; // 最大并发任务数
  memoryThreshold: number; // 内存使用率阈值（0-1）
  taskTimeoutMs: number; // 单个任务超时时间
  enableCacheCleanup: boolean; // 是否启用缓存清理
  enableGC: boolean; // 是否启用垃圾回收
}

class OptimizedBackgroundCognitionV3 {
  private config: CognitionLoopConfig = {
    intervalMs: 40 * 60 * 1000, // 40 分钟（从 20 分钟增加）
    maxConcurrentTasks: 1, // 严格串行执行
    memoryThreshold: 0.65, // 65%（更激进）
    taskTimeoutMs: 5 * 60 * 1000, // 5 分钟任务超时
    enableCacheCleanup: true,
    enableGC: true,
  };

  private memoryOptimizer = getMemoryOptimizerV2();
  private cacheManager = getCacheManagerV2();
  private isRunning = false;
  private currentTask: Promise<void> | null = null;
  private lastSuccessfulCycleTime = Date.now();
  private failedCycleCount = 0;
  private maxFailedCycles = 3; // 连续失败 3 次后停止

  /**
   * 启动优化的后台认知循环
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[OptimizedBackgroundCognitionV3] Loop already running");
      return;
    }

    this.isRunning = true;
    console.log("[OptimizedBackgroundCognitionV3] Starting optimized loop...");

    this.runLoop();
  }

  /**
   * 停止后台认知循环
   */
  stop(): void {
    this.isRunning = false;
    console.log("[OptimizedBackgroundCognitionV3] Loop stopped");
  }

  /**
   * 主循环
   */
  private async runLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // 检查内存使用率
        const metrics = this.memoryOptimizer.getCurrentMetrics();
        const usagePercent = metrics.usagePercent * 100;

        console.log(
          `[OptimizedBackgroundCognitionV3] Cycle check - Memory: ${usagePercent.toFixed(1)}%, Status: ${metrics.status}, Trend: ${metrics.trend}`
        );

        // 如果内存使用率过高，执行激进清理
        if (usagePercent > 85) {
          console.error(
            `[OptimizedBackgroundCognitionV3] CRITICAL: Memory ${usagePercent.toFixed(1)}% - aggressive cleanup`
          );
          await this.memoryOptimizer.performAggressiveCleanup();
          await this.sleep(5 * 60 * 1000); // 等待 5 分钟
          continue;
        }

        // 如果内存超过阈值，跳过循环
        if (metrics.usagePercent > this.config.memoryThreshold) {
          console.warn(
            `[OptimizedBackgroundCognitionV3] Memory usage ${usagePercent.toFixed(1)}% exceeds threshold (${(this.config.memoryThreshold * 100).toFixed(0)}%), skipping cycle`
          );

          // 触发垃圾回收
          if (this.config.enableGC) {
            this.memoryOptimizer.triggerGarbageCollection();
          }

          // 清理缓存
          if (this.config.enableCacheCleanup) {
            this.cacheManager.forceAggressiveCleanup();
          }

          await this.sleep(10 * 60 * 1000); // 等待 10 分钟
          continue;
        }

        // 执行认知任务（串行执行，带超时）
        await this.executeCognitionTasksWithTimeout();

        // 清理缓存
        if (this.config.enableCacheCleanup) {
          this.cacheManager.forceAggressiveCleanup();
        }

        // 记录成功
        this.lastSuccessfulCycleTime = Date.now();
        this.failedCycleCount = 0;

        // 等待下一个循环
        console.log(
          `[OptimizedBackgroundCognitionV3] Cycle completed. Next cycle in ${(this.config.intervalMs / 60000).toFixed(0)} minutes`
        );
        await this.sleep(this.config.intervalMs);
      } catch (error) {
        this.failedCycleCount++;
        console.error(
          `[OptimizedBackgroundCognitionV3] Cycle error (${this.failedCycleCount}/${this.maxFailedCycles}):`,
          error
        );

        // 如果连续失败过多次，停止循环
        if (this.failedCycleCount >= this.maxFailedCycles) {
          console.error(
            "[OptimizedBackgroundCognitionV3] Too many failures, stopping loop"
          );
          this.isRunning = false;
          break;
        }

        await this.sleep(5 * 60 * 1000); // 出错后等待 5 分钟
      }
    }
  }

  /**
   * 执行认知任务（带超时）
   */
  private async executeCognitionTasksWithTimeout(): Promise<void> {
    console.log("[OptimizedBackgroundCognitionV3] Executing cognition tasks...");

    const tasks = [
      { name: "Daily Curation", fn: () => this.generateCuratedThoughts() },
      { name: "Local Learning", fn: () => this.performBackgroundLearning() },
      { name: "Monthly LLM Learning", fn: () => this.performMonthlyLearning() },
    ];

    for (const task of tasks) {
      try {
        console.log(`[OptimizedBackgroundCognitionV3] Starting task: ${task.name}`);

        // 执行任务，带超时
        await this.executeWithTimeout(task.fn(), this.config.taskTimeoutMs);

        console.log(`[OptimizedBackgroundCognitionV3] Task completed: ${task.name}`);
      } catch (error) {
        console.error(
          `[OptimizedBackgroundCognitionV3] Task error (${task.name}):`,
          error
        );
        // 继续执行下一个任务
      }
    }
  }

  /**
   * 执行带超时的异步操作
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Task timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * 生成精选思想
   */
  private async generateCuratedThoughts(): Promise<void> {
    try {
      const result = await runDailyCurationCycle();

      if (result.success) {
        console.log(
          `[OptimizedBackgroundCognitionV3] Curated ${result.totalCurated} thoughts`
        );
      }
    } catch (error) {
      console.error(
        "[OptimizedBackgroundCognitionV3] Curated thoughts error:",
        error
      );
    }
  }

  /**
   * 后台学习（本地）
   */
  private async performBackgroundLearning(): Promise<void> {
    try {
      const result = await executeImprovedLocalLearningCycle(1, {
        sampleCount: 3, // 减少采样数量
        strategy: "random",
      });

      if (result) {
        console.log(
          "[OptimizedBackgroundCognitionV3] Local learning completed"
        );
      }
    } catch (error) {
      console.error(
        "[OptimizedBackgroundCognitionV3] Background learning error:",
        error
      );
    }
  }

  /**
   * 月度 LLM 学习
   */
  private async performMonthlyLearning(): Promise<void> {
    try {
      const result = await executeMonthlyLLMLearning(1);

      if (result) {
        console.log(
          "[OptimizedBackgroundCognitionV3] Monthly LLM learning completed"
        );
      }
    } catch (error) {
      console.error(
        "[OptimizedBackgroundCognitionV3] Monthly learning error:",
        error
      );
    }
  }

  /**
   * 获取循环状态
   */
  getStatus() {
    const metrics = this.memoryOptimizer.getCurrentMetrics();
    const cacheStats = this.cacheManager.getStats();

    return {
      isRunning: this.isRunning,
      lastSuccessfulCycle: new Date(this.lastSuccessfulCycleTime),
      failedCycleCount: this.failedCycleCount,
      memory: {
        usagePercent: (metrics.usagePercent * 100).toFixed(1),
        status: metrics.status,
        trend: metrics.trend,
      },
      cache: {
        entries: cacheStats.totalEntries,
        hitRate: cacheStats.hitRate.toFixed(1),
        memoryMB: cacheStats.totalMemoryMB,
      },
      config: this.config,
    };
  }

  /**
   * 获取诊断报告
   */
  getDiagnosticReport() {
    return this.memoryOptimizer.getDiagnosticReport();
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let instance: OptimizedBackgroundCognitionV3 | null = null;

export function getOptimizedBackgroundCognitionV3(): OptimizedBackgroundCognitionV3 {
  if (!instance) {
    instance = new OptimizedBackgroundCognitionV3();
  }
  return instance;
}
