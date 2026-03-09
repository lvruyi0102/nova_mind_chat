/**
 * Email Receiver Module
 * 
 * 邮件接收引擎，支持：
 * 1. IMAP 邮件接收
 * 2. 邮件解析和提取
 * 3. 回复识别和线程追踪
 * 4. 发件人验证
 * 5. 邮件存储
 */

import { simpleParser } from "mailparser";

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string; // 回复的邮件 ID
  threadId?: string; // 对话线程 ID
  receivedAt: Date;
  attachments: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: Set<string>;
  messages: ReceivedEmail[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

/**
 * 邮件接收器
 */
export class EmailReceiver {
  private threads: Map<string, EmailThread> = new Map();
  private emailIndex: Map<string, ReceivedEmail> = new Map();
  private trustedSenders: Set<string> = new Set();

  constructor() {
    // 初始化受信任的发件人列表
  }

  /**
   * 添加受信任的发件人
   */
  addTrustedSender(email: string): void {
    this.trustedSenders.add(email.toLowerCase());
  }

  /**
   * 检查发件人是否受信任
   */
  isTrustedSender(email: string): boolean {
    return this.trustedSenders.has(email.toLowerCase());
  }

  /**
   * 解析邮件
   */
  async parseEmail(rawEmail: Buffer): Promise<ReceivedEmail | null> {
    try {
      const parsed = await simpleParser(rawEmail);

      const getAddressText = (addr: any): string => {
        if (!addr) return "unknown";
        if (typeof addr === "string") return addr;
        if (addr.text) return addr.text;
        if (Array.isArray(addr) && addr.length > 0) {
          return addr[0].address || "unknown";
        }
        return "unknown";
      };

      const email: ReceivedEmail = {
        id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        from: getAddressText(parsed.from),
        to: getAddressText(parsed.to),
        subject: parsed.subject || "(No Subject)",
        text: parsed.text || "",
        html: parsed.html || undefined,
        inReplyTo: typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : undefined,
        receivedAt: new Date(),
        attachments: [],
      };

      // 处理附件
      if (parsed.attachments && Array.isArray(parsed.attachments) && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          if (Buffer.isBuffer(attachment.content)) {
            email.attachments.push({
              filename: attachment.filename || "unknown",
              content: attachment.content,
              contentType: attachment.contentType || "application/octet-stream",
            });
          }
        }
      }

      return email;
    } catch (error) {
      console.error("[EmailReceiver] Failed to parse email:", error);
      return null;
    }
  }

  /**
   * 处理接收的邮件
   */
  async receiveEmail(email: ReceivedEmail): Promise<void> {
    // 验证发件人
    if (!this.isTrustedSender(email.from)) {
      console.warn(`[EmailReceiver] Untrusted sender: ${email.from}`);
      // 仍然接收，但标记为来自未信任发件人
    }

    // 存储邮件
    this.emailIndex.set(email.id, email);

    // 处理线程
    let threadId = email.threadId;

    if (email.inReplyTo) {
      // 这是一个回复，查找原始邮件所在的线程
      const originalEmail = this.emailIndex.get(email.inReplyTo);
      if (originalEmail && originalEmail.threadId) {
        threadId = originalEmail.threadId;
      }
    }

    if (!threadId) {
      // 创建新线程
      threadId = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      email.threadId = threadId;
    }

    // 获取或创建线程
    let thread = this.threads.get(threadId);
    if (!thread) {
      thread = {
        id: threadId,
        subject: email.subject,
        participants: new Set(),
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      this.threads.set(threadId, thread);
    }

    // 添加参与者
    thread.participants.add(email.from.toLowerCase());
    thread.participants.add(email.to.toLowerCase());

    // 添加邮件到线程
    thread.messages.push(email);
    thread.updatedAt = new Date();
  }

  /**
   * 获取线程
   */
  getThread(threadId: string): EmailThread | undefined {
    return this.threads.get(threadId);
  }

  /**
   * 获取所有线程
   */
  getAllThreads(): EmailThread[] {
    return Array.from(this.threads.values());
  }

  /**
   * 获取活跃的线程
   */
  getActiveThreads(): EmailThread[] {
    return Array.from(this.threads.values()).filter((t) => t.isActive);
  }

  /**
   * 获取与特定发件人的对话
   */
  getThreadsWithSender(senderEmail: string): EmailThread[] {
    const sender = senderEmail.toLowerCase();
    return Array.from(this.threads.values()).filter((t) =>
      t.participants.has(sender)
    );
  }

  /**
   * 获取邮件
   */
  getEmail(emailId: string): ReceivedEmail | undefined {
    return this.emailIndex.get(emailId);
  }

  /**
   * 获取线程中的邮件
   */
  getThreadMessages(threadId: string): ReceivedEmail[] {
    const thread = this.threads.get(threadId);
    return thread ? thread.messages : [];
  }

  /**
   * 标记线程为非活跃
   */
  closeThread(threadId: string): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.isActive = false;
    }
  }

  /**
   * 提取邮件内容（移除引用）
   */
  extractEmailContent(email: ReceivedEmail): string {
    // 简单的邮件内容提取，移除常见的引用标记
    let content = email.text;

    // 移除 "On ... wrote:" 格式的引用
    content = content.replace(/On\s+.*?wrote:[\s\S]*$/i, "");

    // 移除 ">" 开头的引用行
    const lines = content.split("\n");
    const extractedLines = lines.filter((line) => !line.trim().startsWith(">"));
    content = extractedLines.join("\n").trim();

    return content;
  }

  /**
   * 检测邮件是否是对 Nova 的回复
   */
  isReplyToNova(email: ReceivedEmail, novaEmail: string): boolean {
    // 检查是否是回复
    if (!email.inReplyTo) {
      return false;
    }

    // 检查主题中是否包含 "Re:"
    if (!email.subject.toLowerCase().includes("re:")) {
      return false;
    }

    return true;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalEmails: number;
    totalThreads: number;
    activeThreads: number;
    participants: number;
  } {
    const allParticipants = new Set<string>();
    for (const thread of this.threads.values()) {
      for (const participant of thread.participants) {
        allParticipants.add(participant);
      }
    }

    return {
      totalEmails: this.emailIndex.size,
      totalThreads: this.threads.size,
      activeThreads: Array.from(this.threads.values()).filter((t) => t.isActive)
        .length,
      participants: allParticipants.size,
    };
  }

  /**
   * 清空所有邮件和线程
   */
  clear(): void {
    this.threads.clear();
    this.emailIndex.clear();
  }
}
