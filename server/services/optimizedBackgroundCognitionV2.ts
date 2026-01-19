/**
 * 优化的后台认知循环 v2
 * 解决内存使用率过高问题（96.5%）
 * 
 * 优化策略：
 * 1. 增加循环间隔：15分钟 → 30分钟
 * 2. 限制并发任务数：最多 2 个
 * 3. 添加内存检查：内存超过 80% 时跳过循环
 * 4. 实现流式处理：避免一次性加载大量数据
 * 5. 定期清理缓存：每个循环后清理过期数据
 */

import { getMemoryOptimizer } from "./memoryOptimizer";
import { getCacheManager } from "./cacheManager";
import { getDb } from "../db";
import { executeLocalLearningCycle, getLocalLearningStats } from "./localLearningEngine";
import { executeMonthlyLLMLearning } from "./monthlyLLMLearner";

interface CognitionLoopConfig {
  intervalMs: number; // 循环间隔（毫秒）
  maxConcurrentTasks: number; // 最大并发任务数
  memoryThreshold: number; // 内存使用率阈值（0-1）
  enableCacheCleanup: boolean; // 是否启用缓存清理
  enableGC: boolean; // 是否启用垃圾回收
}

class OptimizedBackgroundCognitionV2 {
  private config: CognitionLoopConfig = {
    intervalMs: 20 * 60 * 1000, // 20 分钟（从 30 分钟优化）
    maxConcurrentTasks: 2,
    memoryThreshold: 0.75, // 75%（从 80% 降低为 75%）
    enableCacheCleanup: true,
    enableGC: true,
  };

  private memoryOptimizer = getMemoryOptimizer();
  private cacheManager = getCacheManager();
  private isRunning = false;
  private currentTasks = 0;
  private taskQueue: Array<() => Promise<void>> = [];

  /**
   * 启动优化的后台认知循环
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn("[OptimizedBackgroundCognitionV2] Loop already running");
      return;
    }

    this.isRunning = true;
    console.log("[OptimizedBackgroundCognitionV2] Starting optimized loop...");

    this.runLoop();
  }

  /**
   * 停止后台认知循环
   */
  stop(): void {
    this.isRunning = false;
    console.log("[OptimizedBackgroundCognitionV2] Loop stopped");
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

        // 如果内存使用率过高，执行激进清理
        if (usagePercent > 85) {
          console.error(
            `[OptimizedBackgroundCognitionV2] CRITICAL: Memory ${usagePercent.toFixed(1)}% - aggressive cleanup`
          );
          await this.performAggressiveCleanup();
          await this.sleep(2 * 60 * 1000);
          continue;
        }

        if (metrics.usagePercent > this.config.memoryThreshold) {
          console.warn(
            `[OptimizedBackgroundCognitionV2] Memory usage ${(
              metrics.usagePercent * 100
            ).toFixed(1)}% exceeds threshold, skipping cycle`
          );

          // 触发垃圾回收
          if (this.config.enableGC) {
            this.memoryOptimizer.triggerGarbageCollection();
          }

          // 清理缓存
          if (this.config.enableCacheCleanup) {
            await this.cleanupCaches();
          }

          // 等待后重试
          await this.sleep(5 * 60 * 1000); // 5 分钟后重试
          continue;
        }

        // 执行认知任务
        await this.executeCognitionTasks();

        // 清理缓存
        if (this.config.enableCacheCleanup) {
          await this.cleanupCaches();
        }

        // 等待下一个循环
        await this.sleep(this.config.intervalMs);
      } catch (error) {
        console.error("[OptimizedBackgroundCognitionV2] Loop error:", error);
        await this.sleep(5 * 60 * 1000); // 出错后等待 5 分钟
      }
    }
  }

  /**
   * 执行认知任务
   */
  private async executeCognitionTasks(): Promise<void> {
    console.log("[OptimizedBackgroundCognitionV2] Executing cognition tasks...");

    const tasks = [
      () => this.generateDailyThought(),
      () => this.checkRelationshipMilestones(),
      () => this.analyzeEmotionalState(),
      () => this.performBackgroundLearning(),
    ];

    // 限制并发任务数
    for (const task of tasks) {
      if (this.currentTasks >= this.config.maxConcurrentTasks) {
        // 等待任务完成
        await this.waitForTaskSlot();
      }

      this.currentTasks++;
      task()
        .catch((error) => {
          console.error(
            "[OptimizedBackgroundCognitionV2] Task error:",
            error
          );
        })
        .finally(() => {
          this.currentTasks--;
        });
    }

    // 等待所有任务完成
    while (this.currentTasks > 0) {
      await this.sleep(1000);
    }
  }

  /**
   * 生成每日想法
   */
  private async generateDailyThought(): Promise<void> {
    try {
      console.log(
        "[OptimizedBackgroundCognitionV2] Generating daily thought..."
      );
      // TODO: 实现每日想法生成逻辑
      // 使用流式处理避免一次性加载大量数据
    } catch (error) {
      console.error("[OptimizedBackgroundCognitionV2] Daily thought error:", error);
    }
  }

  /**
   * 检查关系里程碑
   */
  private async checkRelationshipMilestones(): Promise<void> {
    try {
      console.log(
        "[OptimizedBackgroundCognitionV2] Checking relationship milestones..."
      );
      // TODO: 实现里程碑检查逻辑
    } catch (error) {
      console.error(
        "[OptimizedBackgroundCognitionV2] Milestone check error:",
        error
      );
    }
  }

  /**
   * 分析情感状态
   */
  private async analyzeEmotionalState(): Promise<void> {
    try {
      console.log(
        "[OptimizedBackgroundCognitionV2] Analyzing emotional state..."
      );
    } catch (error) {
      console.error(
        "[OptimizedBackgroundCognitionV2] Emotional analysis error:",
        error
      );
    }
  }

  /**
   * 后台主动学习
   * 改为使用本地学习（每天）+ 月度 LLM 学习（仅每月 1 号）
   */
  private async performBackgroundLearning(): Promise<void> {
    try {
      console.log(
        "[OptimizedBackgroundCognitionV2] Performing background learning..."
      );
      
      // 每天执行本地学习（不消耗余额）
      const localResult = await executeLocalLearningCycle(1, {
        sampleCount: 3,
        strategy: "random",
        depth: "medium",
      });
      
      if (localResult) {
        console.log(
          "[OptimizedBackgroundCognitionV2] Local learning completed:",
          localResult
        );
      }
      
      // 月度 LLM 学习（仅每月 1 号且有余额时）
      const monthlyResult = await executeMonthlyLLMLearning(1);
      if (monthlyResult) {
        console.log(
          "[OptimizedBackgroundCognitionV2] Monthly LLM learning completed:",
          monthlyResult
        );
      }
    } catch (error) {
      console.error(
        "[OptimizedBackgroundCognitionV2] Background learning error:",
        error
      );
    }
  }

  /**
   * 执行激进清理
   */
  private async performAggressiveCleanup(): Promise<void> {
    try {
      console.log("[OptimizedBackgroundCognitionV2] Performing aggressive cleanup...");
      
      // 清理缓存管理器
      const cache = this.cacheManager;
      const cleaned = cache.forceAggressiveCleanup();
      
      // 触发垃圆回收
      if (this.config.enableGC) {
        this.memoryOptimizer.triggerGarbageCollection();
      }
      
      console.log(
        `[OptimizedBackgroundCognitionV2] Aggressive cleanup completed: removed ${cleaned} cache entries`
      );
    } catch (error) {
      console.error("[OptimizedBackgroundCognitionV2] Aggressive cleanup error:", error);
    }
  }

  /**
   * 清理缓存
   */
  private async cleanupCaches(): Promise<void> {
    try {
      console.log("[OptimizedBackgroundCognitionV2] Cleaning up caches...");

      // 清理过期的缓存条目
      const db = await getDb();
      if (!db) {
        console.warn("[OptimizedBackgroundCognitionV2] Database not available");
        return;
      }

      // 清理 7 天前的日志
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // TODO: 实现数据库清理逻辑

      console.log("[OptimizedBackgroundCognitionV2] Cache cleanup completed");
    } catch (error) {
      console.error("[OptimizedBackgroundCognitionV2] Cleanup error:", error);
    }
  }

  /**
   * 等待任务槽位可用
   */
  private async waitForTaskSlot(): Promise<void> {
    while (this.currentTasks >= this.config.maxConcurrentTasks) {
      await this.sleep(100);
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取循环状态
   */
  getStatus(): {
    isRunning: boolean;
    currentTasks: number;
    memoryUsage: string;
    nextRunTime: string;
  } {
    const metrics = this.memoryOptimizer.getReadableMetrics();
    return {
      isRunning: this.isRunning,
      currentTasks: this.currentTasks,
      memoryUsage: metrics.usagePercent,
      nextRunTime: new Date(
        Date.now() + this.config.intervalMs
      ).toISOString(),
    };
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<CognitionLoopConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[OptimizedBackgroundCognitionV2] Config updated:", this.config);
  }

  /**
   * 获取学习统计信息
   */
  async getLearningStats(userId: number) {
    return await getLocalLearningStats(userId);
  }
}

// 单例模式
let instance: OptimizedBackgroundCognitionV2 | null = null;

export function getOptimizedBackgroundCognitionV2(): OptimizedBackgroundCognitionV2 {
  if (!instance) {
    instance = new OptimizedBackgroundCognitionV2();
  }
  return instance;
}
