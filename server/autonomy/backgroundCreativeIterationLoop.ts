import { autonomousIterationService } from '../services/autonomousIterationService';
import { getDb } from '../db';

/**
 * 后台创意迭代循环
 * 在 Nova 的后台自主循环中定期运行
 * 自动评估、改进和迭代已创作的作品
 */

export interface BackgroundIterationConfig {
  // 每次迭代的最大作品数
  maxWorksPerCycle: number;
  
  // 迭代优先级阈值（只迭代优先级 >= 该值的作品）
  priorityThreshold: number;
  
  // 最小评分阈值（只迭代评分 < 该值的作品）
  scoreThreshold: number;
  
  // 是否启用多轮迭代（一个作品可以在一个循环中迭代多次）
  enableMultipleIterations: boolean;
  
  // 最大迭代轮数
  maxIterationsPerWork: number;
}

const DEFAULT_CONFIG: BackgroundIterationConfig = {
  maxWorksPerCycle: 5,
  priorityThreshold: 3,
  scoreThreshold: 85,
  enableMultipleIterations: false,
  maxIterationsPerWork: 1
};

export class BackgroundCreativeIterationLoop {
  private config: BackgroundIterationConfig;
  private isRunning: boolean = false;
  private lastRunTime: Date | null = null;

  constructor(config: Partial<BackgroundIterationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 启动后台迭代循环
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[BackgroundCreativeIterationLoop] 循环已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('[BackgroundCreativeIterationLoop] 启动后台创意迭代循环');

    // 立即执行一次
    await this.runIterationCycle();

    // 定期执行（每 6 小时一次）
    setInterval(() => {
      this.runIterationCycle().catch((error) => {
        console.error('[BackgroundCreativeIterationLoop] 循环执行失败:', error);
      });
    }, 6 * 60 * 60 * 1000);
  }

  /**
   * 停止后台迭代循环
   */
  stop(): void {
    this.isRunning = false;
    console.log('[BackgroundCreativeIterationLoop] 停止后台创意迭代循环');
  }

  /**
   * 执行一个迭代循环
   */
  private async runIterationCycle(): Promise<void> {
    try {
      console.log('[BackgroundCreativeIterationLoop] 开始迭代循环');
      this.lastRunTime = new Date();

      // 获取待迭代的作品列表
      const works = await this.getWorksForIteration();

      if (works.length === 0) {
        console.log('[BackgroundCreativeIterationLoop] 没有待迭代的作品');
        return;
      }

      console.log(`[BackgroundCreativeIterationLoop] 发现 ${works.length} 个待迭代作品`);

      // 执行迭代
      const results = await autonomousIterationService.iterateMultipleWorks(works);

      // 生成统计报告
      const stats = autonomousIterationService.generateIterationStats(results);

      // 记录结果
      await this.logIterationResults(stats, results);

      console.log('[BackgroundCreativeIterationLoop] 迭代循环完成', stats);
    } catch (error) {
      console.error('[BackgroundCreativeIterationLoop] 循环执行失败:', error);
    }
  }

  /**
   * 获取待迭代的作品
   */
  private async getWorksForIteration() {
    try {
      const db = await getDb();
      if (!db) {
        console.warn('[BackgroundCreativeIterationLoop] 数据库连接失败');
        return [];
      }

      // 这里应该查询 creativeWorkVersions 表
      // 获取评分 < scoreThreshold 且优先级 >= priorityThreshold 的作品
      // 当前返回空数组，实际实现需要根据项目的数据库架构调整

      console.log('[BackgroundCreativeIterationLoop] 从数据库获取待迭代作品');
      return [];
    } catch (error) {
      console.error('[BackgroundCreativeIterationLoop] 获取作品列表失败:', error);
      return [];
    }
  }

  /**
   * 记录迭代结果
   */
  private async logIterationResults(stats: any, results: any[]): Promise<void> {
    try {
      // 这里应该将结果写入日志或数据库
      const logEntry = {
        timestamp: new Date(),
        stats,
        resultsCount: results.length,
        successCount: results.filter((r) => r.success).length
      };

      console.log('[BackgroundCreativeIterationLoop] 迭代结果已记录:', logEntry);
    } catch (error) {
      console.error('[BackgroundCreativeIterationLoop] 记录结果失败:', error);
    }
  }

  /**
   * 获取循环状态
   */
  getStatus(): {
    isRunning: boolean;
    lastRunTime: Date | null;
    config: BackgroundIterationConfig;
  } {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      config: this.config
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<BackgroundIterationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[BackgroundCreativeIterationLoop] 配置已更新:', this.config);
  }

  /**
   * 手动触发一次迭代循环
   */
  async triggerManualCycle(): Promise<void> {
    console.log('[BackgroundCreativeIterationLoop] 手动触发迭代循环');
    await this.runIterationCycle();
  }
}

// 创建全局实例
export const backgroundCreativeIterationLoop = new BackgroundCreativeIterationLoop();
