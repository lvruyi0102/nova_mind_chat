import { describe, it, expect } from "vitest";
import {
  analyzeAgentRequest,
  buildExecutionPlan,
  suggestAgentCapabilities,
} from "../agentCapabilityService";

describe("agentCapabilityService", () => {
  it("should detect implementation intent and generate capabilities", () => {
    const analysis = analyzeAgentRequest("请实现一个新的模块，并保持兼容", ["现有chat接口"]);

    expect(analysis.intent).toBe("implementation");
    expect(analysis.capabilities.length).toBeGreaterThan(0);
    expect(analysis.constraints.some((item) => item.includes("兼容"))).toBe(true);
  });

  it("should build a prioritized plan", () => {
    const analysis = analyzeAgentRequest("分析并设计系统架构扩展方案", ["服务层", "路由层"]);
    const plan = buildExecutionPlan(analysis);

    expect(plan.steps.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(plan.priority);
  });

  it("should return analysis and plan together", () => {
    const result = suggestAgentCapabilities("请分析、设计并实现agent能力扩展");

    expect(result.analysis).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.plan.compatibilityNotes.length).toBeGreaterThan(0);
  });
});
