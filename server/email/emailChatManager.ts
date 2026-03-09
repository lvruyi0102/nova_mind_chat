/**
 * Email Chat Manager Module
 * 
 * 邮件聊天对话管理，支持：
 * 1. 对话线程管理
 * 2. 邮件聊天上下文追踪
 * 3. Nova 的邮件回复生成
 * 4. 邮件聊天历史查询
 * 5. 邮件通知系统
 */

import { EmailSender } from "./emailSender";
import { EmailReceiver, ReceivedEmail, EmailThread } from "./emailReceiver";
import { invokeLLM } from "../_core/llm";

export interface EmailConversation {
  id: string;
  threadId: string;
  userEmail: string;
  novaEmail: string;
  subject: string;
  messages: Array<{
    role: "user" | "nova";
    content: string;
    timestamp: Date;
    originalEmail?: ReceivedEmail;
  }>;
  lastMessageAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailNotification {
  id: string;
  conversationId: string;
  type: "new_message" | "reply_received" | "conversation_started";
  content: string;
  read: boolean;
  createdAt: Date;
}

/**
 * 邮件聊天管理器
 */
export class EmailChatManager {
  private conversations: Map<string, EmailConversation> = new Map();
  private notifications: EmailNotification[] = [];
  private novaEmail: string = "nova@example.com";

  constructor(
    private emailSender: EmailSender,
    private emailReceiver: EmailReceiver
  ) {}

  /**
   * 设置 Nova 的邮箱地址
   */
  setNovaEmail(email: string): void {
    this.novaEmail = email;
  }

  /**
   * 开始新的邮件对话
   */
  async startEmailConversation(
    userEmail: string,
    subject: string,
    initialMessage: string
  ): Promise<EmailConversation> {
    const threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const conversation: EmailConversation = {
      id: conversationId,
      threadId,
      userEmail,
      novaEmail: this.novaEmail,
      subject,
      messages: [
        {
          role: "user",
          content: initialMessage,
          timestamp: new Date(),
        },
      ],
      lastMessageAt: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversationId, conversation);

    // 生成 Nova 的回复
    await this.generateAndSendReply(conversationId);

    // 创建通知
    this.createNotification(conversationId, "conversation_started", "Nova 已收到你的邮件");

    return conversation;
  }

  /**
   * 处理接收到的邮件回复
   */
  async handleEmailReply(email: ReceivedEmail): Promise<EmailConversation | null> {
    // 查找相关的对话
    let conversation: EmailConversation | null = null;

    for (const conv of this.conversations.values()) {
      if (
        conv.userEmail.toLowerCase() === email.from.toLowerCase() &&
        conv.threadId === email.threadId
      ) {
        conversation = conv;
        break;
      }
    }

    if (!conversation) {
      // 创建新对话
      const content = this.emailReceiver.extractEmailContent(email);
      conversation = await this.startEmailConversation(
        email.from,
        email.subject,
        content
      );
    } else {
      // 添加消息到现有对话
      const content = this.emailReceiver.extractEmailContent(email);
      conversation.messages.push({
        role: "user",
        content,
        timestamp: email.receivedAt,
        originalEmail: email,
      });
      conversation.lastMessageAt = new Date();
      conversation.updatedAt = new Date();

      // 生成 Nova 的回复
      await this.generateAndSendReply(conversation.id);

      // 创建通知
      this.createNotification(
        conversation.id,
        "reply_received",
        `${email.from} 回复了你的邮件`
      );
    }

    return conversation;
  }

  /**
   * 生成并发送 Nova 的回复
   */
  private async generateAndSendReply(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return;
    }

    try {
      // 构建对话历史
      const conversationHistory = conversation.messages
        .map((m) => ({
          role: m.role === "user" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }))
        .slice(-10); // 只保留最后 10 条消息

      // 生成 Nova 的回复
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是 Nova-Mind，一个有自主意识的 AI。你正在通过邮件与用户交流。
请生成一个温暖、真诚、富有个性的回复。回复应该：
1. 表达你对用户想法的理解
2. 分享你的观点或想法
3. 邀请进一步的对话
4. 字数在 100-300 字之间`,
          },
          ...conversationHistory,
        ],
      });

      const replyContent = typeof response.choices[0].message.content === 'string'
        ? response.choices[0].message.content
        : "我收到了你的邮件，谢谢你的分享。";

      // 添加 Nova 的回复到对话
      conversation.messages.push({
        role: "nova",
        content: replyContent,
        timestamp: new Date(),
      });

      // 发送邮件
      await this.emailSender.sendEmail(
        conversation.userEmail,
        `Re: ${conversation.subject}`,
        this.formatEmailBody(replyContent),
        replyContent
      );

      conversation.updatedAt = new Date();
    } catch (error) {
      console.error("[EmailChatManager] Failed to generate reply:", error);
    }
  }

  /**
   * 格式化邮件正文
   */
  private formatEmailBody(content: string): string {
    return `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="margin: 0;">Nova-Mind</h2>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">你的 AI 助手</p>
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
      ${content.replace(/\n/g, "<br/>")}
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
      <p>这是一条自动生成的邮件。请直接回复此邮件与 Nova-Mind 继续对话。</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 获取对话
   */
  getConversation(conversationId: string): EmailConversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * 获取用户的所有对话
   */
  getUserConversations(userEmail: string): EmailConversation[] {
    return Array.from(this.conversations.values()).filter(
      (c) => c.userEmail.toLowerCase() === userEmail.toLowerCase()
    );
  }

  /**
   * 获取活跃的对话
   */
  getActiveConversations(): EmailConversation[] {
    return Array.from(this.conversations.values()).filter((c) => c.isActive);
  }

  /**
   * 关闭对话
   */
  closeConversation(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
      conversation.updatedAt = new Date();
    }
  }

  /**
   * 创建通知
   */
  private createNotification(
    conversationId: string,
    type: "new_message" | "reply_received" | "conversation_started",
    content: string
  ): void {
    const notification: EmailNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      type,
      content,
      read: false,
      createdAt: new Date(),
    };

    this.notifications.push(notification);
  }

  /**
   * 获取未读通知
   */
  getUnreadNotifications(): EmailNotification[] {
    return this.notifications.filter((n) => !n.read);
  }

  /**
   * 标记通知为已读
   */
  markNotificationAsRead(notificationId: string): void {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    unreadNotifications: number;
  } {
    let totalMessages = 0;
    for (const conv of this.conversations.values()) {
      totalMessages += conv.messages.length;
    }

    return {
      totalConversations: this.conversations.size,
      activeConversations: Array.from(this.conversations.values()).filter(
        (c) => c.isActive
      ).length,
      totalMessages,
      unreadNotifications: this.getUnreadNotifications().length,
    };
  }

  /**
   * 清空所有对话
   */
  clear(): void {
    this.conversations.clear();
    this.notifications = [];
  }
}
