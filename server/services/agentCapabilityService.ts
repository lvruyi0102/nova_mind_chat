/**
 * Agent Capability Service
 * 为 Nova-Mind 提供可扩展的 Agent 能力编排层。
 */

import { getTaskComplexityAnalyzer } from "./taskComplexityAnalyzer";

export type AgentIntentType =
  | "analysis"
  | "planning"
  | "implementation"
  | "optimization"
  | "research"
  | "general";

export interface AgentRequestAnalysis {
  intent: AgentIntentType;
  complexityScore: number;
  complexityLevel: "simple" | "medium" | "complex";
  confidence: number;
  capabilities: string[];
  constraints: string[];
  deliverables: string[];
}

export interface AgentExecutionStep {
  id: string;
  title: string;
  objective: string;
  suggestedCapability: string;
  riskLevel: "low" | "medium" | "high";
}

export interface AgentExecutionPlan {
  summary: string;
  priority: "low" | "medium" | "high";
  steps: AgentExecutionStep[];
  compatibilityNotes: string[];
}

const CAPABILITY_MAP: Record<AgentIntentType, string[]> = {
  analysis: ["system-mapper", "dependency-inspector", "risk-scanner"],
  planning: ["goal-decomposer", "milestone-planner", "impact-estimator"],
  implementation: ["code-generator", "contract-validator", "regression-guard"],
  optimization: ["hotspot-detector", "cost-optimizer", "cache-advisor"],
  research: ["knowledge-synthesizer", "source-verifier", "tradeoff-analyzer"],
  general: ["context-summarizer", "task-tracker"],
};

const CONSTRAINT_KEYWORDS = ["兼容", "不影响", "maintain", "compatible", "安全", "stable"];
const DELIVERABLE_KEYWORDS = ["实现", "模块", "文档", "测试", "架构", "api", "router"];

function normalizeInput(text: string): string {
  return text.trim().toLowerCase();
}

function detectIntent(text: string): AgentIntentType {
  const normalized = normalizeInput(text);

  if (/分析|analy|architecture|架构/.test(normalized)) return "analysis";
  if (/计划|规划|design|roadmap|plan/.test(normalized)) return "planning";
  if (/实现|编码|code|implement|开发/.test(normalized)) return "implementation";
  if (/优化|optimi|性能|cost/.test(normalized)) return "optimization";
  if (/调研|research|compare|对比/.test(normalized)) return "research";

  return "general";
}

function extractConstraints(rawRequest: string): string[] {
  const lines = rawRequest
    .split(/\n|\.|。|;|；/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.filter((line) => CONSTRAINT_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword)));
}

function extractDeliverables(rawRequest: string): string[] {
  const lines = rawRequest
    .split(/\n|\.|。|;|；/)
    .map((line) => line.trim())
    .filter(Boolean);

  const detected = lines.filter((line) =>
    DELIVERABLE_KEYWORDS.some((keyword) => line.toLowerCase().includes(keyword))
  );

  return detected.length > 0 ? detected : ["输出结构化结果", "保留现有接口兼容性"];
}

function choosePriority(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function mapRiskLevel(stepIndex: number, totalSteps: number): "low" | "medium" | "high" {
  const progress = (stepIndex + 1) / totalSteps;
  if (progress > 0.8) return "low";
  if (progress > 0.4) return "medium";
  return "high";
}

export function analyzeAgentRequest(rawRequest: string, context: string[] = []): AgentRequestAnalysis {
  const intent = detectIntent(rawRequest);
  const complexity = getTaskComplexityAnalyzer().analyze(rawRequest, context);

  return {
    intent,
    complexityScore: complexity.score,
    complexityLevel: complexity.level,
    confidence: complexity.confidence,
    capabilities: CAPABILITY_MAP[intent],
    constraints: extractConstraints(rawRequest),
    deliverables: extractDeliverables(rawRequest),
  };
}

export function buildExecutionPlan(analysis: AgentRequestAnalysis): AgentExecutionPlan {
  const capabilities = analysis.capabilities.length > 0 ? analysis.capabilities : CAPABILITY_MAP.general;

  const steps: AgentExecutionStep[] = capabilities.map((capability, index) => ({
    id: `step-${index + 1}`,
    title: `${index + 1}. ${capability}`,
    objective: `使用 ${capability} 完成与 ${analysis.intent} 相关的子任务。`,
    suggestedCapability: capability,
    riskLevel: mapRiskLevel(index, capabilities.length),
  }));

  return {
    summary: `针对 ${analysis.intent} 场景生成 ${steps.length} 步执行计划，复杂度 ${analysis.complexityLevel}。`,
    priority: choosePriority(analysis.complexityScore),
    steps,
    compatibilityNotes: [
      "优先复用现有 Router 与 Service，避免破坏调用路径。",
      "新增能力通过独立模块注入，默认不影响旧流程。",
      "关键输出需补充自动化检查，防止回归。",
    ],
  };
}

export function suggestAgentCapabilities(rawRequest: string, context: string[] = []): {
  analysis: AgentRequestAnalysis;
  plan: AgentExecutionPlan;
} {
  const analysis = analyzeAgentRequest(rawRequest, context);
  const plan = buildExecutionPlan(analysis);

  return { analysis, plan };
}
