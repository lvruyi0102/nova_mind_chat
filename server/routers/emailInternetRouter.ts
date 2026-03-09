/**
 * Email and Internet tRPC Router
 * 
 * 邮件和互联网功能的 tRPC API 端点
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { EmailSender } from "../email/emailSender";
import { EmailChatManager } from "../email/emailChatManager";
import { InternetLearningManager } from "../internet/webCrawler";
import { EmailInternetIntegrationManager } from "../integration/emailInternetIntegration";

// 全局实例（在生产环境中应该使用依赖注入）
let integrationManager: EmailInternetIntegrationManager | null = null;

function getIntegrationManager(): EmailInternetIntegrationManager {
  if (!integrationManager) {
    integrationManager = new EmailInternetIntegrationManager();
  }
  return integrationManager;
}

export const emailInternetRouter = router({
  // ============ 邮件功能 ============

  /**
   * 启动邮件聊天
   */
  startEmailChat: protectedProcedure
    .input(
      z.object({
        userEmail: z.string().email(),
        subject: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const manager = getIntegrationManager().getEmailChatManager();
        const conversation = await manager.startEmailConversation(
          input.userEmail,
          input.subject,
          input.message
        );

        return {
          success: true,
          conversationId: conversation.id,
          message: "邮件对话已启动",
        };
      } catch (error) {
        console.error("[emailInternetRouter] Failed to start email chat:", error);
        return {
          success: false,
          error: "启动邮件对话失败",
        };
      }
    }),

  /**
   * 获取邮件对话
   */
  getEmailConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getEmailChatManager();
        const conversation = manager.getConversation(input.conversationId);

        if (!conversation) {
          return { success: false, error: "对话不存在" };
        }

        return {
          success: true,
          conversation,
        };
      } catch (error) {
        console.error("[emailInternetRouter] Failed to get conversation:", error);
        return {
          success: false,
          error: "获取对话失败",
        };
      }
    }),

  /**
   * 获取用户的所有邮件对话
   */
  getUserEmailConversations: protectedProcedure
    .input(z.object({ userEmail: z.string().email() }))
    .query(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getEmailChatManager();
        const conversations = manager.getUserConversations(input.userEmail);

        return {
          success: true,
          conversations,
          total: conversations.length,
        };
      } catch (error) {
        console.error(
          "[emailInternetRouter] Failed to get user conversations:",
          error
        );
        return {
          success: false,
          error: "获取对话列表失败",
        };
      }
    }),

  /**
   * 关闭邮件对话
   */
  closeEmailConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getEmailChatManager();
        manager.closeConversation(input.conversationId);

        return {
          success: true,
          message: "对话已关闭",
        };
      } catch (error) {
        console.error("[emailInternetRouter] Failed to close conversation:", error);
        return {
          success: false,
          error: "关闭对话失败",
        };
      }
    }),

  /**
   * 获取邮件通知
   */
  getEmailNotifications: protectedProcedure.query(async () => {
    try {
      const manager = getIntegrationManager().getEmailChatManager();
      const notifications = manager.getUnreadNotifications();

      return {
        success: true,
        notifications,
        total: notifications.length,
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to get notifications:", error);
      return {
        success: false,
        error: "获取通知失败",
      };
    }
  }),

  /**
   * 标记通知为已读
   */
  markNotificationAsRead: protectedProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getEmailChatManager();
        manager.markNotificationAsRead(input.notificationId);

        return {
          success: true,
          message: "通知已标记为已读",
        };
      } catch (error) {
        console.error("[emailInternetRouter] Failed to mark notification:", error);
        return {
          success: false,
          error: "标记通知失败",
        };
      }
    }),

  // ============ 互联网学习功能 ============

  /**
   * 从 URL 学习
   */
  learnFromUrl: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getInternetLearningManager();
        const content = await manager.learnFromUrl(
          input.url,
          input.category || "general"
        );

        if (!content) {
          return {
            success: false,
            error: "无法从 URL 学习",
          };
        }

        return {
          success: true,
          content,
          message: `已学习: ${content.title}`,
        };
      } catch (error) {
        console.error("[emailInternetRouter] Failed to learn from URL:", error);
        return {
          success: false,
          error: "学习失败",
        };
      }
    }),

  /**
   * 搜索并学习
   */
  searchAndLearn: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getInternetLearningManager();
        const contents = await manager.searchAndLearn(
          input.query,
          input.category || "search"
        );

        return {
          success: true,
          contents,
          total: contents.length,
          message: `已学习 ${contents.length} 项关于 "${input.query}" 的内容`,
        };
      } catch (error) {
        console.error("[emailInternetRouter] Failed to search and learn:", error);
        return {
          success: false,
          error: "搜索和学习失败",
        };
      }
    }),

  /**
   * 获取所有学习内容
   */
  getAllLearningContents: protectedProcedure.query(async () => {
    try {
      const manager = getIntegrationManager().getInternetLearningManager();
      const contents = manager.getAllLearningContents();

      return {
        success: true,
        contents,
        total: contents.length,
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to get learning contents:", error);
      return {
        success: false,
        error: "获取学习内容失败",
      };
    }
  }),

  /**
   * 按类别获取学习内容
   */
  getLearningContentsByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getInternetLearningManager();
        const contents = manager.getLearningContentsByCategory(input.category);

        return {
          success: true,
          contents,
          total: contents.length,
        };
      } catch (error) {
        console.error(
          "[emailInternetRouter] Failed to get learning contents by category:",
          error
        );
        return {
          success: false,
          error: "获取学习内容失败",
        };
      }
    }),

  /**
   * 获取重要的学习内容
   */
  getImportantLearningContents: protectedProcedure
    .input(z.object({ threshold: z.number().optional() }))
    .query(async ({ input }) => {
      try {
        const manager = getIntegrationManager().getInternetLearningManager();
        const contents = manager.getImportantLearningContents(input.threshold);

        return {
          success: true,
          contents,
          total: contents.length,
        };
      } catch (error) {
        console.error(
          "[emailInternetRouter] Failed to get important learning contents:",
          error
        );
        return {
          success: false,
          error: "获取重要学习内容失败",
        };
      }
    }),

  // ============ 系统管理 ============

  /**
   * 启动集成循环
   */
  startIntegration: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // 检查权限（仅 admin 可以启动）
      if (ctx.user?.role !== "admin") {
        return {
          success: false,
          error: "权限不足",
        };
      }

      const manager = getIntegrationManager();
      manager.start();

      return {
        success: true,
        message: "集成循环已启动",
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to start integration:", error);
      return {
        success: false,
        error: "启动集成循环失败",
      };
    }
  }),

  /**
   * 停止集成循环
   */
  stopIntegration: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // 检查权限（仅 admin 可以停止）
      if (ctx.user?.role !== "admin") {
        return {
          success: false,
          error: "权限不足",
        };
      }

      const manager = getIntegrationManager();
      manager.stop();

      return {
        success: true,
        message: "集成循环已停止",
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to stop integration:", error);
      return {
        success: false,
        error: "停止集成循环失败",
      };
    }
  }),

  /**
   * 获取集成系统状态
   */
  getIntegrationStatus: protectedProcedure.query(async () => {
    try {
      const manager = getIntegrationManager();
      const status = manager.getStatus();

      return {
        success: true,
        status,
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to get integration status:", error);
      return {
        success: false,
        error: "获取状态失败",
      };
    }
  }),

  /**
   * 获取学习统计
   */
  getLearningStats: protectedProcedure.query(async () => {
    try {
      const manager = getIntegrationManager().getInternetLearningManager();
      const stats = manager.getStats();

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to get learning stats:", error);
      return {
        success: false,
        error: "获取统计失败",
      };
    }
  }),

  /**
   * 获取邮件统计
   */
  getEmailStats: protectedProcedure.query(async () => {
    try {
      const manager = getIntegrationManager().getEmailChatManager();
      const stats = manager.getStats();

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error("[emailInternetRouter] Failed to get email stats:", error);
      return {
        success: false,
        error: "获取统计失败",
      };
    }
  }),
});
