/**
 * Nova-Mind V4 adaptive execution kernel.
 *
 * This module contains deterministic execution rules only. It deliberately does
 * not call models, tools, or the database; adapters and persistent orchestration
 * can build on these contracts without allowing model text to mutate task state.
 */

export const EXECUTION_STATUSES = [
  "CREATED",
  "PLANNING",
  "READY",
  "RUNNING",
  "RETRYING",
  "VERIFYING",
  "SUCCEEDED",
  "PARTIAL",
  "BLOCKED",
  "FAILED",
  "CANCELLED",
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

/**
 * Steps that can be safely cancelled without losing track of an in-flight
 * external side effect. RUNNING is deliberately excluded until reconciled.
 */
export const CANCELLABLE_STEP_STATUSES = ["PENDING", "READY", "RETRYING"] as const;

/** A task may dispatch external work only while active and not cancellation-requested. */
export function canDispatchTask(
  status: ExecutionStatus,
  cancelRequested: boolean,
): boolean {
  return !cancelRequested && (status === "READY" || status === "RUNNING");
}

/** Fencing check: only the holder of the currently persisted lease may dispatch. */
export function ownsExecutionLease(
  currentToken: string | null | undefined,
  expectedToken: string,
): boolean {
  return expectedToken.length > 0 && currentToken === expectedToken;
}



export type FailureCategory =
  | "INPUT_ERROR"
  | "TOOL_ERROR"
  | "CAPABILITY_GAP"
  | "PERMISSION_ERROR"
  | "RESOURCE_LIMIT"
  | "QUALITY_FAILURE"
  | "INTEGRATION_FAILURE"
  | "ACCEPTANCE_FAILURE"
  | "EXTERNAL_DEPENDENCY"
  | "UNKNOWN";

export interface AcceptanceCheck {
  id: string;
  description: string;
  required: boolean;
  status: "PASSED" | "FAILED" | "UNVERIFIED";
  evidenceUri?: string;
  details?: string;
}

export interface ArtifactReference {
  uri: string;
  mediaType: string;
  checksum?: string;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
}

export interface ExecutionBudget {
  maxToolCalls: number;
  maxRetriesPerStep: number;
  maxEstimatedCost?: number;
  maxDurationMs?: number;
}

export interface ExecutionUsage {
  toolCalls: number;
  estimatedCost?: number;
  elapsedMs?: number;
}

export interface ExecutionError {
  code?: string;
  message: string;
  retryable?: boolean;
}

export interface FailureClassification {
  category: FailureCategory;
  retryable: boolean;
  reason: string;
}

export interface ToolExecutionResult {
  status: "SUCCEEDED" | "FAILED" | "RUNNING" | "BLOCKED";
  artifacts: ArtifactReference[];
  externalJobId?: string;
  error?: ExecutionError;
  metadata?: Record<string, unknown>;
}

const TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  CREATED: ["PLANNING", "CANCELLED"],
  PLANNING: ["READY", "BLOCKED", "FAILED", "CANCELLED"],
  READY: ["RUNNING", "BLOCKED", "CANCELLED"],
  RUNNING: ["RETRYING", "VERIFYING", "BLOCKED", "FAILED", "CANCELLED"],
  RETRYING: ["RUNNING", "BLOCKED", "FAILED", "CANCELLED"],
  VERIFYING: ["SUCCEEDED", "PARTIAL", "RUNNING", "BLOCKED", "FAILED", "CANCELLED"],
  SUCCEEDED: [],
  PARTIAL: ["READY", "RUNNING", "CANCELLED"],
  BLOCKED: ["READY", "RUNNING", "CANCELLED", "FAILED"],
  FAILED: ["READY"],
  CANCELLED: [],
};

export class InvalidExecutionTransitionError extends Error {
  constructor(from: ExecutionStatus, to: ExecutionStatus) {
    super(`Invalid execution status transition: ${from} -> ${to}`);
    this.name = "InvalidExecutionTransitionError";
  }
}

/** Validate a status transition before persisting it. */
export function assertExecutionTransition(
  from: ExecutionStatus,
  to: ExecutionStatus,
): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new InvalidExecutionTransitionError(from, to);
  }
}

/**
 * A task cannot be marked successful unless every required check passed.
 * Optional unverified checks are allowed, but should remain visible in reports.
 */
export function assertAcceptanceAllowsSuccess(checks: AcceptanceCheck[]): void {
  const failed = checks.filter((check) => check.required && check.status !== "PASSED");
  if (failed.length > 0) {
    const names = failed.map((check) => check.id).join(", ");
    throw new Error(`Required acceptance checks did not pass: ${names}`);
  }
}

/** Resolve the final outcome from evidence, never from model-generated claims. */
export function resolveVerifiedOutcome(input: {
  checks: AcceptanceCheck[];
  artifactCount: number;
  blocked?: boolean;
}): "SUCCEEDED" | "PARTIAL" | "BLOCKED" | "FAILED" {
  if (input.blocked) return "BLOCKED";

  const requiredChecks = input.checks.filter((check) => check.required);
  const allRequiredPassed = requiredChecks.every((check) => check.status === "PASSED");
  if (allRequiredPassed && input.artifactCount > 0) return "SUCCEEDED";

  const hasAnyEvidenceOfWork =
    input.artifactCount > 0 ||
    input.checks.some((check) => check.status === "PASSED");
  return hasAnyEvidenceOfWork ? "PARTIAL" : "FAILED";
}

/** Enforce call and time budgets before dispatching a tool. */
export function assertWithinExecutionBudget(
  budget: ExecutionBudget,
  usage: ExecutionUsage,
  nextCallCost = 1,
): void {
  if (usage.toolCalls + nextCallCost > budget.maxToolCalls) {
    throw new Error("Execution budget exceeded: maxToolCalls");
  }
  if (
    budget.maxEstimatedCost !== undefined &&
    usage.estimatedCost !== undefined &&
    usage.estimatedCost > budget.maxEstimatedCost
  ) {
    throw new Error("Execution budget exceeded: maxEstimatedCost");
  }
  if (
    budget.maxDurationMs !== undefined &&
    usage.elapsedMs !== undefined &&
    usage.elapsedMs >= budget.maxDurationMs
  ) {
    throw new Error("Execution budget exceeded: maxDurationMs");
  }
}

export function classifyExecutionError(
  error: ExecutionError,
): FailureClassification {
  const code = (error.code ?? "").toUpperCase();
  const message = error.message.toLowerCase();

  if (/INVALID_INPUT|VALIDATION|BAD_REQUEST/.test(code) || /invalid input|schema validation/.test(message)) {
    return { category: "INPUT_ERROR", retryable: false, reason: error.message };
  }
  if (/UNAUTHORIZED|FORBIDDEN|PERMISSION/.test(code) || /permission denied|unauthorized|forbidden/.test(message)) {
    return { category: "PERMISSION_ERROR", retryable: false, reason: error.message };
  }
  if (/CAPABILITY|UNSUPPORTED/.test(code) || /not supported|capability unavailable/.test(message)) {
    return { category: "CAPABILITY_GAP", retryable: false, reason: error.message };
  }
  if (/RATE_LIMIT|TIMEOUT|ECONNRESET|ECONNREFUSED|5\d\d/.test(code) || /rate limit|timed out|temporarily unavailable/.test(message)) {
    return { category: "EXTERNAL_DEPENDENCY", retryable: true, reason: error.message };
  }
  if (/BUDGET|QUOTA|RESOURCE_LIMIT/.test(code) || /budget exceeded|quota exceeded|out of memory/.test(message)) {
    return { category: "RESOURCE_LIMIT", retryable: false, reason: error.message };
  }
  if (/INTEGRATION|DEPENDENCY_MISMATCH/.test(code) || /integration failed|incompatible output/.test(message)) {
    return { category: "INTEGRATION_FAILURE", retryable: false, reason: error.message };
  }

  return {
    category: "TOOL_ERROR",
    retryable: error.retryable ?? false,
    reason: error.message,
  };
}

/** Return a provider timeout that cannot exceed the task's remaining duration budget. */
export function boundedExecutionTimeoutMs(
  budget: ExecutionBudget,
  usage: ExecutionUsage,
  requestedTimeoutMs = 120_000,
): number {
  if (!Number.isFinite(requestedTimeoutMs) || requestedTimeoutMs <= 0) {
    throw new Error("Provider timeout must be a positive finite number");
  }
  const remainingMs = budget.maxDurationMs === undefined
    ? requestedTimeoutMs
    : budget.maxDurationMs - (usage.elapsedMs ?? 0);
  if (remainingMs <= 0) {
    throw new Error("Execution budget exceeded: maxDurationMs");
  }
  return Math.max(1, Math.floor(Math.min(requestedTimeoutMs, remainingMs)));
}

/** Retry only explicitly retryable failures and never exceed the configured cap. */
export function shouldRetryExecution(input: {
  retryable: boolean;
  attemptsAlreadyMade: number;
  maxRetries: number;
}): boolean {
  return (
    input.retryable &&
    Number.isInteger(input.attemptsAlreadyMade) &&
    input.attemptsAlreadyMade >= 0 &&
    Number.isInteger(input.maxRetries) &&
    input.maxRetries >= 0 &&
    input.attemptsAlreadyMade < input.maxRetries
  );
}

/**
 * A successful tool result must contain at least one real artifact reference.
 * Async tools may return RUNNING with an external job ID and no artifacts yet.
 */
export function assertToolResultIsConsistent(result: ToolExecutionResult): void {
  if (result.status === "SUCCEEDED" && result.artifacts.length === 0) {
    throw new Error("Tool reported SUCCEEDED without any artifact references");
  }
  if (result.status === "RUNNING" && !result.externalJobId) {
    throw new Error("Async tool reported RUNNING without an externalJobId");
  }
  if (result.status === "FAILED" && !result.error) {
    throw new Error("Tool reported FAILED without structured error details");
  }
  for (const artifact of result.artifacts) {
    if (!artifact.uri.trim() || !artifact.mediaType.trim()) {
      throw new Error("Artifact references require a non-empty URI and mediaType");
    }
  }
}
