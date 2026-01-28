import { emotionalMemoryAutonomousLearning } from './emotionalMemoryAutonomousLearning';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';

/**
 * 自主学习任务调度器
 * 定期触发 Nova 的自主学习过程
 */

export class AutonomousLearningScheduler {
  private isRunning = false;
  private checkInterval = 15 * 60 * 1000; // 每 15 分钟检查一次
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.log('[AutonomousLearningScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[AutonomousLearningScheduler] Started');

    // 立即执行一次
    this.executeAutonomousLearning();

    // 定期执行
    this.intervalId = setInterval(() => {
      this.executeAutonomousLearning();
    }, this.checkInterval);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[AutonomousLearningScheduler] Stopped');
  }

  /**
   * 执行自主学习
   */
  private async executeAutonomousLearning(): Promise<void> {
    try {
      const db = await getDb();
      if (!db) {
        console.warn('[AutonomousLearningScheduler] Database not available');
        return;
      }

      // 获取所有活跃用户
      const activeUsers = await db.select().from(users).limit(100);

      console.log(
        `[AutonomousLearningScheduler] Processing ${activeUsers.length} users for autonomous learning`
      );

      // 为每个用户执行自主学习
      for (const user of activeUsers) {
        try {
          const shouldAnalyze = await emotionalMemoryAutonomousLearning.shouldPerformAnalysis(
            user.id
          );

          if (shouldAnalyze) {
            console.log(`[AutonomousLearningScheduler] Analyzing user ${user.id}`);

            // 执行分析
            const insights = await emotionalMemoryAutonomousLearning.performAutonomousAnalysis(
              user.id
            );

            if (insights.length > 0) {
              console.log(
                `[AutonomousLearningScheduler] Generated ${insights.length} insights for user ${user.id}`
              );
            }

            // 识别情感转折点
            const turningPoints =
              await emotionalMemoryAutonomousLearning.identifyEmotionalTurningPoints(user.id);

            if (turningPoints.length > 0) {
              console.log(
                `[AutonomousLearningScheduler] Identified ${turningPoints.length} turning points for user ${user.id}`
              );
            }

            // 预测下一个情感状态
            const prediction = await emotionalMemoryAutonomousLearning.predictNextEmotionalState(
              user.id
            );

            if (prediction) {
              console.log(
                `[AutonomousLearningScheduler] Predicted emotion for user ${user.id}: ${prediction.predictedEmotion} (confidence: ${prediction.confidence})`
              );
            }
          }
        } catch (error) {
          console.error(
            `[AutonomousLearningScheduler] Error processing user ${user.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[AutonomousLearningScheduler] Error during autonomous learning:', error);
    }
  }

  /**
   * 手动触发特定用户的学习
   */
  async triggerUserLearning(userId: number): Promise<void> {
    try {
      console.log(`[AutonomousLearningScheduler] Manually triggering learning for user ${userId}`);

      const insights = await emotionalMemoryAutonomousLearning.performAutonomousAnalysis(userId);
      const turningPoints =
        await emotionalMemoryAutonomousLearning.identifyEmotionalTurningPoints(userId);
      const prediction = await emotionalMemoryAutonomousLearning.predictNextEmotionalState(userId);

      console.log(
        `[AutonomousLearningScheduler] Learning completed for user ${userId}: ${insights.length} insights, ${turningPoints.length} turning points`
      );
    } catch (error) {
      console.error(
        `[AutonomousLearningScheduler] Error triggering learning for user ${userId}:`,
        error
      );
    }
  }
}

// 导出单例
export const autonomousLearningScheduler = new AutonomousLearningScheduler();
