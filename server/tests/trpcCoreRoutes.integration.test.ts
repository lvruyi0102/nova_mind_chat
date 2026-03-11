import { beforeEach, describe, expect, it, vi } from "vitest";
import { emailInternetRouter } from "../routers/emailInternetRouter";
import { reasoningRouter } from "../routers/reasoningRouter";
import axios from "axios";

vi.mock("axios", () => ({
  default: {
    get: vi.fn(async (url: string) => {
      if (url.includes("duckduckgo.com")) {
        return {
          status: 200,
          data: `
            <div class="result">
              <div class="result__title"><a href="https://example.com/a">A</a></div>
              <div class="result__snippet">snippet-a</div>
            </div>
          `,
        };
      }
      return {
        status: 200,
        data: "<html><head><title>A</title></head><body><main>Long content 12345 \"quoted\" data for learning keywords pipeline.</main></body></html>",
      };
    }),
  },
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [
      {
        message: {
          content: "稳定回复内容",
        },
      },
    ],
  })),
}));

vi.mock("../reasoning/enhancedDecisionEngine", () => ({
  getEnhancedDecisionEngine: vi.fn(async () => ({
    makeEnhancedDecision: vi.fn(async ({ problem }: { problem: string }) => ({
      problem,
      recommendedOption: "option_a",
      options: [{ description: "option_a", score: 0.9, reasoning: "best" }],
      confidence: 0.91,
      reasoning: "constraints satisfied",
      timestamp: new Date(),
    })),
    getDecisionHistory: vi.fn(() => []),
    getStatistics: vi.fn(() => ({ totalDecisions: 1 })),
  })),
}));

describe("tRPC 核心路由集成测试", () => {
  const userCtx = {
    user: { id: 1, role: "admin" },
    req: {},
    res: {},
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("emailInternet: 邮件会话 + 通知 + 互联网学习 should work in multi-step flow", async () => {
    const caller = emailInternetRouter.createCaller(userCtx);

    const started = await caller.startEmailChat({
      userEmail: "flow@example.com",
      subject: "integration",
      message: "hello",
    });

    expect(started.success).toBe(true);
    expect(started.conversationId).toBeDefined();

    const conversation = await caller.getEmailConversation({
      conversationId: started.conversationId!,
    });
    expect(conversation.success).toBe(true);
    expect(conversation.conversation?.messages.length).toBeGreaterThanOrEqual(2);

    const notifications = await caller.getEmailNotifications();
    expect(notifications.success).toBe(true);
    expect((notifications.notifications?.length ?? 0) > 0).toBe(true);

    const learned = await caller.searchAndLearn({ query: "ai", category: "autonomous" });
    expect(learned.success).toBe(true);
    expect(learned.total).toBeGreaterThan(0);

    const stats = await caller.getLearningStats();
    expect(stats.success).toBe(true);
    expect((stats.stats?.totalLearned ?? 0) > 0).toBe(true);
  });

  it("reasoning: 决策 + 多步推理 should return structured result", async () => {
    const caller = reasoningRouter.createCaller(userCtx);

    const decision = await caller.makeDecision({
      problem: "降低成本",
      constraints: ["稳定性不下降"],
    });

    expect(decision.success).toBe(true);
    expect(decision.decision.recommendedOption).toBe("option_a");

    const reasoning = await caller.performMultiStepReasoning({
      problem: "need_optimization",
      context: ["high_load"],
      method: "forward",
    });

    expect(reasoning.success).toBe(true);
    expect(reasoning.result.goal).toBeDefined();
    expect(Array.isArray(reasoning.result.steps)).toBe(true);
  });

  it("emailInternet: 非 admin 启动集成应被拒绝", async () => {
    const nonAdminCaller = emailInternetRouter.createCaller({
      user: { id: 2, role: "user" },
      req: {},
      res: {},
    } as any);

    const result = await nonAdminCaller.startIntegration();
    expect(result.success).toBe(false);
    expect(result.error).toBe("权限不足");
  });

  it("emailInternet: 外部依赖失败时应返回失败而非抛错", async () => {
    const caller = emailInternetRouter.createCaller(userCtx);
    const mockedAxios = axios as any;
    mockedAxios.get.mockRejectedValueOnce(new Error("network down"));

    const result = await caller.searchAndLearn({ query: "ai failure case", category: "autonomous" });
    expect(result.success).toBe(true);
    expect(result.total).toBe(0);
  });

  it("reasoning: 未登录上下文应抛出 UNAUTHORIZED", async () => {
    const noUserCaller = reasoningRouter.createCaller({ user: null, req: {}, res: {} } as any);

    await expect(
      noUserCaller.makeDecision({
        problem: "未授权调用",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });


  it("emailInternet: 非 admin 停止集成应被拒绝", async () => {
    const nonAdminCaller = emailInternetRouter.createCaller({
      user: { id: 3, role: "user" },
      req: {},
      res: {},
    } as any);

    const result = await nonAdminCaller.stopIntegration();
    expect(result.success).toBe(false);
    expect(result.error).toBe("权限不足");
  });

  it("emailInternet: learnFromUrl 在抓取失败时应返回业务失败", async () => {
    const caller = emailInternetRouter.createCaller(userCtx);
    const mockedAxios = axios as any;
    mockedAxios.get.mockRejectedValueOnce(new Error("fetch failed"));

    const result = await caller.learnFromUrl({
      url: "https://example.com/failure",
      category: "autonomous",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("无法从 URL 学习");
  });

});
