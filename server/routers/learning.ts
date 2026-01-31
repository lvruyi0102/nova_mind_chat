/**
 * Nova-Mind 学习循环 tRPC 路由
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import LearningCycleManager, { LearningContext } from '../learning/learningCycle';
import {
  getBackgroundLearningTask,
  startBackgroundLearning,
  stopBackgroundLearning,
} from '../learning/backgroundLearningTask';

// 创建全局学习管理器
const globalLearningManager = new LearningCycleManager();

export const learningRouter = router({
  /**
   * 获取学习状态
   */
  getStatus: protectedProcedure.query(({ ctx }) => {
    const backgroundTask = getBackgroundLearningTask();
    const learningState = globalLearningManager.getState();
    const summary = globalLearningManager.getKnowledgeSummary();

    return {
      user: ctx.user,
      learningState: {
        symbolCount: learningState.symbols.size,
        relationshipCount: learningState.relationships.length,
        ruleCount: learningState.rules.length,
        totalLearningEvents: learningState.totalLearningEvents,
        lastLearningTime: learningState.lastLearningTime,
      },
      summary: {
        symbolCount: summary.symbolCount,
        relationshipCount: summary.relationshipCount,
        ruleCount: summary.ruleCount,
        topSymbols: summary.topSymbols.map(s => ({
          id: s.id,
          text: s.text,
          type: s.type,
          frequency: s.frequency,
        })),
        topRules: summary.topRules.map(r => ({
          id: r.id,
          confidence: r.confidence,
          frequency: r.frequency,
        })),
      },
      backgroundTask: backgroundTask.getStatus(),
    };
  }),

  /**
   * 手动执行一次学习循环
   */
  executeLearning: protectedProcedure
    .input(
      z.object({
        userMessage: z.string(),
        assistantResponse: z.string(),
        conversationId: z.number(),
        messageId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const context: LearningContext = {
          conversationId: input.conversationId,
          messageId: input.messageId,
          userMessage: input.userMessage,
          assistantResponse: input.assistantResponse,
          timestamp: new Date(),
        };

        await globalLearningManager.learn(context);

        const summary = globalLearningManager.getKnowledgeSummary();

        return {
          success: true,
          message: '学习完成',
          summary: {
            symbolCount: summary.symbolCount,
            relationshipCount: summary.relationshipCount,
            ruleCount: summary.ruleCount,
          },
        };
      } catch (error) {
        console.error('[Learning] 执行学习循环失败:', error);
        return {
          success: false,
          message: '学习失败',
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }),

  /**
   * 获取顶级符号
   */
  getTopSymbols: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(({ input }) => {
      const summary = globalLearningManager.getKnowledgeSummary();
      return summary.topSymbols.slice(0, input.limit).map(s => ({
        id: s.id,
        text: s.text,
        type: s.type,
        frequency: s.frequency,
        confidence: s.confidence,
      }));
    }),

  /**
   * 获取顶级规则
   */
  getTopRules: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(({ input }) => {
      const summary = globalLearningManager.getKnowledgeSummary();
      return summary.topRules.slice(0, input.limit).map(r => ({
        id: r.id,
        confidence: r.confidence,
        frequency: r.frequency,
      }));
    }),

  /**
   * 启动后台学习任务
   */
  startBackgroundLearning: protectedProcedure
    .input(
      z.object({
        intervalMinutes: z.number().default(60),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(({ input, ctx }) => {
      // 只允许 admin 用户启动后台任务
      if (ctx.user.role !== 'admin') {
        throw new Error('只有管理员可以启动后台学习任务');
      }

      try {
        startBackgroundLearning({
          enabled: input.enabled,
          intervalMinutes: input.intervalMinutes,
        });

        return {
          success: true,
          message: '后台学习任务已启动',
        };
      } catch (error) {
        console.error('[Learning] 启动后台学习任务失败:', error);
        return {
          success: false,
          message: '启动失败',
          error: error instanceof Error ? error.message : '未知错误',
        };
      }
    }),

  /**
   * 停止后台学习任务
   */
  stopBackgroundLearning: protectedProcedure.mutation(({ ctx }) => {
    // 只允许 admin 用户停止后台任务
    if (ctx.user.role !== 'admin') {
      throw new Error('只有管理员可以停止后台学习任务');
    }

    try {
      stopBackgroundLearning();

      return {
        success: true,
        message: '后台学习任务已停止',
      };
    } catch (error) {
      console.error('[Learning] 停止后台学习任务失败:', error);
      return {
        success: false,
        message: '停止失败',
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }),

  /**
   * 获取后台学习任务状态
   */
  getBackgroundLearningStatus: protectedProcedure.query(() => {
    const backgroundTask = getBackgroundLearningTask();
    return backgroundTask.getStatus();
  }),

  /**
   * 重置学习状态
   */
  resetLearning: protectedProcedure.mutation(({ ctx }) => {
    // 只允许 admin 用户重置
    if (ctx.user.role !== 'admin') {
      throw new Error('只有管理员可以重置学习状态');
    }

    try {
      globalLearningManager.reset();

      return {
        success: true,
        message: '学习状态已重置',
      };
    } catch (error) {
      console.error('[Learning] 重置学习状态失败:', error);
      return {
        success: false,
        message: '重置失败',
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }),

  /**
   * 获取学习历史
   */
  getLearningHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(() => {
      const state = globalLearningManager.getState();
      return state.learningHistory.slice(-20).map(h => ({
        conversationId: h.conversationId,
        messageId: h.messageId,
        userMessage: h.userMessage.substring(0, 100), // 截断长消息
        timestamp: h.timestamp,
      }));
    }),
});

export default learningRouter;
