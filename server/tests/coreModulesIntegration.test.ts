import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailSender } from "../email/emailSender";
import { EmailReceiver } from "../email/emailReceiver";
import { EmailChatManager } from "../email/emailChatManager";
import { InternetLearningManager } from "../internet/webCrawler";
import { MultiStepReasoningEngine } from "../reasoning/multiStepReasoningEngine";
import { ReasoningLearningManager } from "../learning/reasoningLearningManager";

vi.mock("axios", () => {
  return {
    default: {
      get: vi.fn(async (url: string) => {
        if (url.includes("duckduckgo.com")) {
          return {
            status: 200,
            data: `
              <div class="result">
                <div class="result__title"><a href="https://example.com/ai">AI Research</a></div>
                <div class="result__snippet">Latest AI developments</div>
              </div>
              <div class="result">
                <div class="result__title"><a href="https://example.com/ml">ML Trends</a></div>
                <div class="result__snippet">Machine learning trends</div>
              </div>
            `,
          };
        }

        return {
          status: 200,
          data: `
            <html>
              <head><title>Nova Mind Article</title></head>
              <body>
                <main>
                  "AI" systems in 2026 continue to grow. This article contains 123 data points
                  and long form explanations for practical engineering decisions.
                </main>
              </body>
            </html>
          `,
        };
      }),
    },
  };
});

vi.mock("../_core/llm", () => {
  return {
    invokeLLM: vi.fn(async ({ messages }: { messages: Array<{ content: string }> }) => {
      const userPrompt = messages[messages.length - 1]?.content ?? "";

      if (userPrompt.includes("reasoning steps") || userPrompt.includes("推理过程")) {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  symbols: [
                    {
                      name: "energy_cost",
                      type: "concept",
                      definition: "Cost of energy usage",
                      importance: 0.9,
                    },
                    {
                      name: "optimization",
                      type: "action",
                      definition: "Improvement action",
                      importance: 0.8,
                    },
                  ],
                  relationships: [
                    {
                      source: "optimization",
                      target: "energy_cost",
                      type: "reduces",
                      strength: 0.85,
                    },
                  ],
                  confidence: 0.88,
                }),
              },
            },
          ],
        };
      }

      return {
        choices: [
          {
            message: {
              content: "这是一个稳定且可执行的回复/摘要。",
            },
          },
        ],
      };
    }),
  };
});

describe("核心模块集成测试", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("邮件系统：应完成从发起对话到回复处理的多步流程", async () => {
    const emailSender = new EmailSender();
    const emailReceiver = new EmailReceiver();
    const manager = new EmailChatManager(emailSender, emailReceiver);

    const conversation = await manager.startEmailConversation(
      "user@example.com",
      "关于自主学习",
      "你好 Nova，我想了解你的学习机制。"
    );

    expect(conversation.messages.length).toBe(2);
    expect(conversation.messages[1].role).toBe("nova");

    await manager.handleEmailReply({
      id: "mail-1",
      from: "user@example.com",
      to: "nova@example.com",
      subject: "Re: 关于自主学习",
      text: "谢谢你的回答，请继续分享。",
      threadId: conversation.threadId,
      receivedAt: new Date(),
      attachments: [],
    });

    const updated = manager.getConversation(conversation.id);
    expect(updated?.messages.length).toBe(4);
    expect(updated?.messages.at(-1)?.role).toBe("nova");

    const notifications = manager.getUnreadNotifications();
    expect(notifications.some((n) => n.type === "conversation_started")).toBe(true);
    expect(notifications.some((n) => n.type === "reply_received")).toBe(true);
  });

  it("互联网学习：应完成搜索、抓取、摘要和统计流程", async () => {
    const manager = new InternetLearningManager();

    const learned = await manager.searchAndLearn("AI engineering", "autonomous");

    expect(learned.length).toBeGreaterThan(0);
    expect(learned[0].summary.length).toBeGreaterThan(0);
    expect(learned[0].keywords.length).toBeGreaterThan(0);

    const important = manager.getImportantLearningContents(0.6);
    expect(important.length).toBeGreaterThan(0);

    const stats = manager.getStats();
    expect(stats.totalLearned).toBe(learned.length);
    expect(stats.byCategory.autonomous).toBe(learned.length);
    expect(stats.averageImportance).toBeGreaterThan(0);
  });

  it("推理引擎 + 学习引擎：应完成推理并沉淀学习结果", async () => {
    const reasoningEngine = new MultiStepReasoningEngine(6);
    const learningManager = new ReasoningLearningManager();

    reasoningEngine.addRule({
      id: "rule-1",
      premises: ["high_load"],
      conclusion: "high_energy_cost",
      confidence: 0.92,
      weight: 1,
    });

    reasoningEngine.addRule({
      id: "rule-2",
      premises: ["high_energy_cost"],
      conclusion: "need_optimization",
      confidence: 0.9,
      weight: 1,
    });

    const reasoning = await reasoningEngine.forwardChaining(["high_load"], "need_optimization");

    expect(reasoning.achieved).toBe(true);
    expect(reasoning.steps.length).toBeGreaterThan(1);

    const learning = await learningManager.learnFromReasoning(
      reasoning.steps.map((step) => ({
        stepNumber: step.stepNumber,
        action: step.action,
        reasoning: step.reasoning,
        confidence: step.confidence,
      }))
    );

    expect(learning.symbols.length).toBeGreaterThan(0);
    expect(learning.overallQuality).toBeGreaterThan(0);

    const latest = learningManager.getLatestLearning();
    expect(latest).not.toBeNull();

    const statistics = learningManager.getStatistics();
    expect(statistics.learningCount).toBe(1);
    expect(statistics.totalSymbols).toBeGreaterThan(0);
  });
});
