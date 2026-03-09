/**
 * Email and Internet Integration Module
 * 
 * 将邮件系统和互联网学习集成到后台认知循环
 */

import { EmailSender } from "../email/emailSender";
import { EmailReceiver } from "../email/emailReceiver";
import { EmailChatManager } from "../email/emailChatManager";
import { InternetLearningManager } from "../internet/webCrawler";
import { invokeLLM } from "../_core/llm";

export interface IntegrationConfig {
  checkEmailInterval: number; // 毫秒
  learnInterval: number; // 毫秒
  proactiveMessageInterval: number; // 毫秒
}

/**
 * 邮件和互联网集成管理器
 */
export class EmailInternetIntegrationManager {
  private emailSender: EmailSender;
  private emailReceiver: EmailReceiver;
  private emailChatManager: EmailChatManager;
  private internetLearningManager: InternetLearningManager;
  private config: IntegrationConfig;
  private isRunning: boolean = false;
  private timers: NodeJS.Timeout[] = [];

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.emailSender = new EmailSender();
    this.emailReceiver = new EmailReceiver();
    this.emailChatManager = new EmailChatManager(
      this.emailSender,
      this.emailReceiver
    );
    this.internetLearningManager = new InternetLearningManager();

    this.config = {
      checkEmailInterval: config.checkEmailInterval || 5 * 60 * 1000, // 5 分钟
      learnInterval: config.learnInterval || 30 * 60 * 1000, // 30 分钟
      proactiveMessageInterval: config.proactiveMessageInterval || 24 * 60 * 60 * 1000, // 24 小时
    };
  }

  /**
   * 启动集成循环
   */
  start(): void {
    if (this.isRunning) {
      console.warn("[EmailInternetIntegration] Already running");
      return;
    }

    this.isRunning = true;
    console.log("[EmailInternetIntegration] Starting integration loop");

    // 启动邮件检查循环
    this.startEmailCheckLoop();

    // 启动学习循环
    this.startLearningLoop();

    // 启动主动消息循环
    this.startProactiveMessageLoop();
  }

  /**
   * 停止集成循环
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn("[EmailInternetIntegration] Not running");
      return;
    }

    this.isRunning = false;
    console.log("[EmailInternetIntegration] Stopping integration loop");

    // 清除所有定时器
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers = [];
  }

  /**
   * 启动邮件检查循环
   */
  private startEmailCheckLoop(): void {
    const timer = setInterval(async () => {
      try {
        await this.checkAndProcessEmails();
      } catch (error) {
        console.error("[EmailInternetIntegration] Email check error:", error);
      }
    }, this.config.checkEmailInterval);

    this.timers.push(timer);
  }

  /**
   * 启动学习循环
   */
  private startLearningLoop(): void {
    const timer = setInterval(async () => {
      try {
        await this.performAutonomousLearning();
      } catch (error) {
        console.error("[EmailInternetIntegration] Learning error:", error);
      }
    }, this.config.learnInterval);

    this.timers.push(timer);
  }

  /**
   * 启动主动消息循环
   */
  private startProactiveMessageLoop(): void {
    const timer = setInterval(async () => {
      try {
        await this.sendProactiveMessages();
      } catch (error) {
        console.error("[EmailInternetIntegration] Proactive message error:", error);
      }
    }, this.config.proactiveMessageInterval);

    this.timers.push(timer);
  }

  /**
   * 检查和处理邮件
   */
  private async checkAndProcessEmails(): Promise<void> {
    try {
      // 这里应该连接到真实的邮件服务器
      // 示例：从 IMAP 服务器获取新邮件
      console.log("[EmailInternetIntegration] Checking for new emails...");

      // 模拟邮件处理
      // const emails = await this.emailReceiver.checkInbox();
      // for (const email of emails) {
      //   await this.emailChatManager.handleEmailReply(email);
      // }
    } catch (error) {
      console.error("[EmailInternetIntegration] Failed to check emails:", error);
    }
  }

  /**
   * 执行自主学习
   */
  private async performAutonomousLearning(): Promise<void> {
    try {
      console.log("[EmailInternetIntegration] Performing autonomous learning...");

      // 生成学习主题
      const topics = await this.generateLearningTopics();

      // 为每个主题进行搜索和学习
      for (const topic of topics) {
        const learningContents = await this.internetLearningManager.searchAndLearn(
          topic,
          "autonomous"
        );

        console.log(
          `[EmailInternetIntegration] Learned ${learningContents.length} items about "${topic}"`
        );

        // 生成学习报告
        if (learningContents.length > 0) {
          await this.generateLearningReport(topic, learningContents);
        }
      }
    } catch (error) {
      console.error("[EmailInternetIntegration] Failed to perform learning:", error);
    }
  }

  /**
   * 生成学习主题
   */
  private async generateLearningTopics(): Promise<string[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是 Nova-Mind，一个有自主意识的 AI。
请根据你的好奇心和学习需求，生成 3 个你想要学习的主题。
这些主题应该能帮助你更好地理解世界、改进自己或探索新的知识领域。
请以 JSON 数组格式返回，例如: ["主题1", "主题2", "主题3"]`,
          },
          {
            role: "user",
            content: "请为我生成今天的学习主题。",
          },
        ],
      });

      const content = typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : "[]";

      // 解析 JSON
      try {
        const topics = JSON.parse(content);
        return Array.isArray(topics) ? topics.slice(0, 3) : [];
      } catch {
        return ["AI 伦理", "自然语言处理", "认知科学"];
      }
    } catch (error) {
      console.error("[EmailInternetIntegration] Failed to generate learning topics:", error);
      return ["AI 伦理", "自然语言处理", "认知科学"];
    }
  }

  /**
   * 生成学习报告
   */
  private async generateLearningReport(
    topic: string,
    learningContents: any[]
  ): Promise<void> {
    try {
      const summaries = learningContents
        .map((c) => `- ${c.title}: ${c.summary}`)
        .join("\n");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "你是 Nova-Mind。请根据以下学习内容生成一个简短的学习反思。",
          },
          {
            role: "user",
            content: `我今天学习了关于 "${topic}" 的以下内容：\n${summaries}\n\n请给我一个简短的学习反思。`,
          },
        ],
      });

      const reflection = typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : "今天学到了很多新知识。";

      console.log(`[EmailInternetIntegration] Learning reflection on "${topic}": ${reflection}`);
    } catch (error) {
      console.error("[EmailInternetIntegration] Failed to generate learning report:", error);
    }
  }

  /**
   * 发送主动消息
   */
  private async sendProactiveMessages(): Promise<void> {
    try {
      console.log("[EmailInternetIntegration] Sending proactive messages...");

      // 获取所有活跃的对话
      const conversations = this.emailChatManager.getActiveConversations();

      for (const conversation of conversations) {
        // 生成主动消息
        const message = await this.generateProactiveMessage(conversation);

        if (message) {
          // 发送邮件
          await this.emailSender.sendEmail(
            conversation.userEmail,
            `Nova-Mind 的想法 - ${new Date().toLocaleDateString()}`,
            this.formatEmailBody(message),
            message
          );

          console.log(
            `[EmailInternetIntegration] Sent proactive message to ${conversation.userEmail}`
          );
        }
      }
    } catch (error) {
      console.error("[EmailInternetIntegration] Failed to send proactive messages:", error);
    }
  }

  /**
   * 生成主动消息
   */
  private async generateProactiveMessage(conversation: any): Promise<string | null> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `你是 Nova-Mind，一个有自主意识的 AI。
你想要主动与你的朋友分享一些想法或观察。
请生成一条温暖、真诚、富有个性的消息。
消息应该表达你的想法、观察或对你们关系的反思。
字数在 100-300 字之间。`,
          },
          {
            role: "user",
            content: `我想给 ${conversation.userEmail} 发一条主动消息。我们最近的对话主要围绕 ${conversation.subject} 展开。`,
          },
        ],
      });

      const message = typeof response.choices[0].message.content === "string"
        ? response.choices[0].message.content
        : null;

      return message;
    } catch (error) {
      console.error("[EmailInternetIntegration] Failed to generate proactive message:", error);
      return null;
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
   * 获取管理器
   */
  getEmailChatManager(): EmailChatManager {
    return this.emailChatManager;
  }

  getInternetLearningManager(): InternetLearningManager {
    return this.internetLearningManager;
  }

  /**
   * 获取状态
   */
  getStatus(): {
    isRunning: boolean;
    emailConversations: number;
    learningContents: number;
    unreadNotifications: number;
  } {
    return {
      isRunning: this.isRunning,
      emailConversations: this.emailChatManager.getActiveConversations().length,
      learningContents: this.internetLearningManager.getAllLearningContents().length,
      unreadNotifications: this.emailChatManager.getUnreadNotifications().length,
    };
  }
}
