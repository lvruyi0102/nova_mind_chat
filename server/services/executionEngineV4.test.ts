import { describe, expect, it } from "vitest";
import {
  assertAcceptanceAllowsSuccess,
  boundedExecutionTimeoutMs,
  canDispatchTask,
  CANCELLABLE_STEP_STATUSES,
  assertExecutionTransition,
  assertToolResultIsConsistent,
  assertWithinExecutionBudget,
  classifyExecutionError,
  resolveVerifiedOutcome,
  shouldRetryExecution,
} from "./executionEngineV4";

describe("executionEngineV4", () => {
  it("blocks provider dispatch for cancelled or non-active tasks", () => {
    expect(canDispatchTask("READY", false)).toBe(true);
    expect(canDispatchTask("RUNNING", false)).toBe(true);
    expect(canDispatchTask("READY", true)).toBe(false);
    expect(canDispatchTask("CANCELLED", false)).toBe(false);
    expect(canDispatchTask("BLOCKED", false)).toBe(false);
    expect(canDispatchTask("SUCCEEDED", false)).toBe(false);
  });

  it("does not mark in-flight steps cancelled before their provider result is reconciled", () => {
    expect(CANCELLABLE_STEP_STATUSES).toEqual(["PENDING", "READY", "RETRYING"]);
    expect(CANCELLABLE_STEP_STATUSES).not.toContain("RUNNING");
  });

  it("allows only declared status transitions", () => {
    expect(() => assertExecutionTransition("RUNNING", "VERIFYING")).not.toThrow();
    expect(() => assertExecutionTransition("SUCCEEDED", "RUNNING")).toThrow(
      /Invalid execution status transition/,
    );
  });

  it("does not allow success when a required acceptance check failed or is unverified", () => {
    expect(() =>
      assertAcceptanceAllowsSuccess([
        { id: "file-exists", description: "File exists", required: true, status: "PASSED" },
        { id: "playable", description: "Media is playable", required: true, status: "UNVERIFIED" },
      ]),
    ).toThrow(/playable/);
  });

  it("resolves outcome from evidence and artifacts", () => {
    expect(resolveVerifiedOutcome({
      checks: [{ id: "format", description: "Valid format", required: true, status: "PASSED" }],
      artifactCount: 1,
    })).toBe("SUCCEEDED");

    expect(resolveVerifiedOutcome({
      checks: [{ id: "format", description: "Valid format", required: true, status: "FAILED" }],
      artifactCount: 1,
    })).toBe("PARTIAL");

    expect(resolveVerifiedOutcome({ checks: [], artifactCount: 0, blocked: true })).toBe("BLOCKED");
    expect(resolveVerifiedOutcome({ checks: [], artifactCount: 0 })).toBe("FAILED");
  });

  it("enforces the tool-call budget", () => {
    expect(() => assertWithinExecutionBudget(
      { maxToolCalls: 3, maxRetriesPerStep: 2 },
      { toolCalls: 2 },
      1,
    )).not.toThrow();

    expect(() => assertWithinExecutionBudget(
      { maxToolCalls: 3, maxRetriesPerStep: 2 },
      { toolCalls: 3 },
      1,
    )).toThrow(/maxToolCalls/);
  });

  it("caps provider timeout to the remaining task duration budget", () => {
    expect(boundedExecutionTimeoutMs(
      { maxToolCalls: 5, maxRetriesPerStep: 2, maxDurationMs: 90_000 },
      { toolCalls: 1, elapsedMs: 25_000 },
      120_000,
    )).toBe(65_000);

    expect(boundedExecutionTimeoutMs(
      { maxToolCalls: 5, maxRetriesPerStep: 2, maxDurationMs: 900_000 },
      { toolCalls: 1, elapsedMs: 25_000 },
      120_000,
    )).toBe(120_000);

    expect(() => boundedExecutionTimeoutMs(
      { maxToolCalls: 5, maxRetriesPerStep: 2, maxDurationMs: 25_000 },
      { toolCalls: 1, elapsedMs: 25_000 },
      120_000,
    )).toThrow(/maxDurationMs/);
  });

  it("classifies permission failures as non-retryable", () => {
    expect(classifyExecutionError({
      code: "FORBIDDEN",
      message: "Permission denied",
    })).toMatchObject({ category: "PERMISSION_ERROR", retryable: false });
  });

  it("retries only retryable failures within the retry cap", () => {
    expect(shouldRetryExecution({ retryable: true, attemptsAlreadyMade: 1, maxRetries: 2 })).toBe(true);
    expect(shouldRetryExecution({ retryable: true, attemptsAlreadyMade: 2, maxRetries: 2 })).toBe(false);
    expect(shouldRetryExecution({ retryable: false, attemptsAlreadyMade: 0, maxRetries: 2 })).toBe(false);
  });

  it("rejects a false-success tool result without artifact references", () => {
    expect(() => assertToolResultIsConsistent({
      status: "SUCCEEDED",
      artifacts: [],
    })).toThrow(/without any artifact references/);
  });

  it("requires external job IDs for async tool results", () => {
    expect(() => assertToolResultIsConsistent({
      status: "RUNNING",
      artifacts: [],
    })).toThrow(/externalJobId/);
  });
});
