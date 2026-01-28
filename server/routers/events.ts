import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

/**
 * Events Router
 * 处理事件系统和通知
 */

export const eventsRouter = router({
  // 获取事件列表
  list: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      return {
        events: [
          {
            id: 1,
            type: 'conversation_milestone',
            title: '对话 100 条消息里程碑',
            description: '你们的对话已经达到 100 条消息',
            timestamp: new Date(),
            read: false,
          },
        ],
        total: 1,
      };
    }),

  // 标记事件为已读
  markAsRead: protectedProcedure
    .input(z.object({
      eventId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      return {
        eventId: input.eventId,
        read: true,
      };
    }),

  // 获取未读事件数
  getUnreadCount: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      return {
        unreadCount: 3,
      };
    }),

  // 订阅事件
  subscribe: protectedProcedure
    .input(z.object({
      eventType: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      return {
        eventType: input.eventType,
        subscribed: input.enabled,
      };
    }),
});
