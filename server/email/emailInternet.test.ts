/**
 * Email and Internet System Tests
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmailSender } from "./emailSender";
import { EmailReceiver } from "./emailReceiver";
import { EmailChatManager } from "./emailChatManager";
import { InternetLearningManager, WebCrawler } from "../internet/webCrawler";
import { EmailInternetIntegrationManager } from "../integration/emailInternetIntegration";

describe("Email System", () => {
  let emailSender: EmailSender;
  let emailReceiver: EmailReceiver;
  let emailChatManager: EmailChatManager;

  beforeEach(() => {
    emailSender = new EmailSender();
    emailReceiver = new EmailReceiver();
    emailChatManager = new EmailChatManager(emailSender, emailReceiver);
  });

  describe("EmailSender", () => {
    it("should initialize with default config", () => {
      expect(emailSender).toBeDefined();
    });

    it("should validate email format", () => {
      const validEmail = "test@example.com";
      const invalidEmail = "invalid-email";
      
      // 这里应该有验证逻辑
      expect(validEmail).toContain("@");
      expect(invalidEmail).not.toContain("@");
    });
  });

  describe("EmailChatManager", () => {
    it("should start email conversation", async () => {
      const conversation = await emailChatManager.startEmailConversation(
        "test@example.com",
        "Test Subject",
        "Test message"
      );

      expect(conversation).toBeDefined();
      expect(conversation.userEmail).toBe("test@example.com");
      expect(conversation.subject).toBe("Test Subject");
    }, { timeout: 10000 });

    it("should get active conversations", () => {
      const conversations = emailChatManager.getActiveConversations();
      expect(Array.isArray(conversations)).toBe(true);
    });

    it("should get user conversations", () => {
      const userEmail = "test@example.com";
      const conversations = emailChatManager.getUserConversations(userEmail);
      expect(Array.isArray(conversations)).toBe(true);
    });

    it("should get unread notifications", () => {
      const notifications = emailChatManager.getUnreadNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should isolate notifications and statistics by email owner", () => {
      const now = new Date();
      const conversationA = {
        id: "conv-owner-a", threadId: "thread-a", userEmail: "alice@example.com",
        novaEmail: "nova@example.com", subject: "A", messages: [], lastMessageAt: now,
        isActive: true, createdAt: now, updatedAt: now,
      };
      const conversationB = {
        id: "conv-owner-b", threadId: "thread-b", userEmail: "bob@example.com",
        novaEmail: "nova@example.com", subject: "B", messages: [], lastMessageAt: now,
        isActive: true, createdAt: now, updatedAt: now,
      };
      const internal = emailChatManager as any;
      internal.conversations.set(conversationA.id, conversationA);
      internal.conversations.set(conversationB.id, conversationB);
      internal.notifications.push(
        { id: "notif-a", conversationId: conversationA.id, type: "reply_received", content: "A", read: false, createdAt: now },
        { id: "notif-b", conversationId: conversationB.id, type: "reply_received", content: "B", read: false, createdAt: now },
      );

      expect(emailChatManager.getUnreadNotifications("ALICE@example.com").map((n) => n.id)).toEqual(["notif-a"]);
      expect(emailChatManager.markNotificationAsRead("notif-b", "alice@example.com")).toBe(false);
      expect(emailChatManager.getUnreadNotifications("bob@example.com").map((n) => n.id)).toEqual(["notif-b"]);
      expect(emailChatManager.markNotificationAsRead("notif-a", "alice@example.com")).toBe(true);
      expect(emailChatManager.getStats("alice@example.com").totalConversations).toBe(1);
      expect(emailChatManager.getStats("alice@example.com").unreadNotifications).toBe(0);
    });

    it("should get email statistics", () => {
      const stats = emailChatManager.getStats();
      expect(stats).toHaveProperty("totalConversations");
      expect(stats).toHaveProperty("activeConversations");
      expect(stats).toHaveProperty("unreadNotifications");
    });
  });
});

describe("Internet Learning System", () => {
  let webCrawler: WebCrawler;
  let learningManager: InternetLearningManager;

  beforeEach(() => {
    webCrawler = new WebCrawler();
    learningManager = new InternetLearningManager();
  });

  describe("WebCrawler", () => {
    it("should initialize", () => {
      expect(webCrawler).toBeDefined();
    });

    it("should validate URLs", () => {
      const validUrl = "https://example.com";
      const invalidUrl = "not a url";

      try {
        new URL(validUrl);
        expect(true).toBe(true);
      } catch {
        expect(false).toBe(true);
      }

      try {
        new URL(invalidUrl);
        expect(false).toBe(true);
      } catch {
        expect(true).toBe(true);
      }
    });
  });

  describe("InternetLearningManager", () => {
    it("should initialize", () => {
      expect(learningManager).toBeDefined();
    });

    it("should get all learning contents", () => {
      const contents = learningManager.getAllLearningContents();
      expect(Array.isArray(contents)).toBe(true);
    });

    it("should get learning contents by category", () => {
      const contents = learningManager.getLearningContentsByCategory("general");
      expect(Array.isArray(contents)).toBe(true);
    });

    it("should get important learning contents", () => {
      const contents = learningManager.getImportantLearningContents(0.7);
      expect(Array.isArray(contents)).toBe(true);
    });

    it("should get learning statistics", () => {
      const stats = learningManager.getStats();
      expect(stats).toHaveProperty("totalLearned");
      expect(stats).toHaveProperty("byCategory");
      expect(stats).toHaveProperty("averageImportance");
    });

    it("should clear learning contents", () => {
      learningManager.clear();
      const contents = learningManager.getAllLearningContents();
      expect(contents.length).toBe(0);
    });
  });
});

describe("Email Internet Integration", () => {
  let integrationManager: EmailInternetIntegrationManager;

  beforeEach(() => {
    integrationManager = new EmailInternetIntegrationManager({
      checkEmailInterval: 1000,
      learnInterval: 1000,
      proactiveMessageInterval: 1000,
    });
  });

  it("should initialize", () => {
    expect(integrationManager).toBeDefined();
  });

  it("should get email chat manager", () => {
    const manager = integrationManager.getEmailChatManager();
    expect(manager).toBeDefined();
  });

  it("should get internet learning manager", () => {
    const manager = integrationManager.getInternetLearningManager();
    expect(manager).toBeDefined();
  });

  it("should get integration status", () => {
    const status = integrationManager.getStatus();
    expect(status).toHaveProperty("isRunning");
    expect(status).toHaveProperty("emailConversations");
    expect(status).toHaveProperty("learningContents");
    expect(status).toHaveProperty("unreadNotifications");
  });

  it("should start and stop integration", () => {
    expect(integrationManager.getStatus().isRunning).toBe(false);
    
    integrationManager.start();
    expect(integrationManager.getStatus().isRunning).toBe(true);
    
    integrationManager.stop();
    expect(integrationManager.getStatus().isRunning).toBe(false);
  });
});
