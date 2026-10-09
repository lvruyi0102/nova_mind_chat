/**
 * Durable V4 worker.
 *
 * This worker claims READY steps with compare-and-set updates. It persists tool
 * runs and artifact references before moving task state. It never marks a task
 * SUCCEEDED: acceptance checks remain UNVERIFIED until a real validator is
 * registered and run. Enable explicitly with NOVA_AGENT_V4_WORKER_ENABLED=true.
 */
import { and, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { agentArtifacts, agentTaskEvents, agentTasks, agentTaskSteps, agentToolRuns } from "../../drizzle/schema";
import { getDb } from "../db";
import type { ExecutionBudget, ExecutionStatus, ExecutionUsage } from "./executionEngineV4";
import { assertExecutionTransition, assertWithinExecutionBudget, boundedExecutionTimeoutMs, canDispatchTask, CANCELLABLE_STEP_STATUSES, classifyExecutionError, isUncertainProviderOutcome, ownsExecutionLease } from "./executionEngineV4";
import { toolAdapterRegistryV4 } from "./toolAdapterRegistryV4";
import { evaluateActionGateV4, type ActionRiskClassV4 } from "./agentGovernanceV4";

const POLL_MS = 5_000;
const MAX_TASKS_PER_TICK = 10;
let timer: NodeJS.Timeout | undefined;
let tickInFlight = false;

function parse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}
function affectedRows(result: unknown): number {
  const raw = Array.isArray(result) ? result[0] : result;
  return Number((raw as { affectedRows?: number } | undefined)?.affectedRows ?? 0);
}
function defaultBudget(): ExecutionBudget {
  return { maxToolCalls: 20, maxRetriesPerStep: 3, maxDurationMs: 15 * 60 * 1000 };
}
function defaultUsage(): ExecutionUsage {
  return { toolCalls: 0, retries: 0, estimatedCost: 0, elapsedMs: 0 } as ExecutionUsage;
}

async function event(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, taskId: number, eventType: string, payload: Record<string, unknown>) {
  await db.insert(agentTaskEvents).values({
    taskId, actor: "worker", eventType, payloadJson: JSON.stringify(payload),
  });
}

async function blockTask(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  task: typeof agentTasks.$inferSelect,
  message: string,
  leaseToken?: string,
  requireExpiredLease = false,
) {
  const from = task.status as ExecutionStatus;
  if (from === "BLOCKED" || from === "FAILED" || from === "CANCELLED" || from === "SUCCEEDED") return;
  try { assertExecutionTransition(from, "BLOCKED"); } catch { /* keep the failure visible in the audit log */ }
  const whereClause = leaseToken
    ? and(eq(agentTasks.id, task.id), eq(agentTasks.status, task.status), eq(agentTasks.workerLeaseToken, leaseToken))
    : requireExpiredLease
      ? and(
          eq(agentTasks.id, task.id),
          eq(agentTasks.status, task.status),
          or(isNull(agentTasks.workerLeaseUntil), lt(agentTasks.workerLeaseUntil, new Date())),
        )
      : and(eq(agentTasks.id, task.id), eq(agentTasks.status, task.status));
  const changed = await db.update(agentTasks).set({
    status: "BLOCKED", lastError: message, updatedAt: new Date(),
  }).where(whereClause);
  if (affectedRows(changed) === 1) {
    await event(db, task.id, "TASK_BLOCKED", { message });
  } else if (leaseToken) {
    await event(db, task.id, "STALE_WORKER_TASK_BLOCK_FENCED", { message });
  }
}

async function promoteDueRetries(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, taskId: number) {
  const steps = await db.select().from(agentTaskSteps).where(eq(agentTaskSteps.taskId, taskId));
  const now = Date.now();
  for (const step of steps) {
    if (step.status !== "RETRYING" || !step.updatedAt) continue;
    const delayMs = Math.min(30_000, Math.max(5_000, step.attemptCount * 5_000));
    if (now - step.updatedAt.getTime() < delayMs) continue;
    await db.update(agentTaskSteps).set({ status: "READY", updatedAt: new Date() })
      .where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RETRYING")));
    await event(db, taskId, "STEP_RETRY_READY", { stepId: step.id, attemptCount: step.attemptCount });
  }
}

async function refreshReadySteps(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, taskId: number) {
  const steps = await db.select().from(agentTaskSteps).where(eq(agentTaskSteps.taskId, taskId));
  const byKey = new Map(steps.map(s => [s.stepKey, s]));
  for (const step of steps) {
    if (step.status !== "PENDING") continue;
    const deps = parse<string[]>(step.dependsOnJson, []);
    if (deps.every(key => byKey.get(key)?.status === "SUCCEEDED")) {
      await db.update(agentTaskSteps).set({ status: "READY", updatedAt: new Date() })
        .where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "PENDING")));
    }
  }
}

async function processTaskUnderLease(taskId: number, leaseToken: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, taskId)).limit(1);
  if (!task || !["READY", "RUNNING"].includes(task.status)) return false;
  if (task.cancelRequested) {
    // Do not relabel an in-flight RUNNING step as CANCELLED: its external
    // provider may still complete or charge after this request. Keep the claim
    // visible so the result can be reconciled, or marked UNKNOWN if the worker dies.
    await db.update(agentTaskSteps).set({ status: "CANCELLED", updatedAt: new Date() })
      .where(and(eq(agentTaskSteps.taskId, task.id), inArray(agentTaskSteps.status, [...CANCELLABLE_STEP_STATUSES])));
    await db.update(agentTasks).set({ status: "CANCELLED", completedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(agentTasks.id, task.id),
        eq(agentTasks.workerLeaseToken, leaseToken),
        inArray(agentTasks.status, ["READY", "RUNNING"]),
      ));
    await event(db, task.id, "TASK_CANCELLED", { reason: "User requested cancellation." });
    return true;
  }

  await promoteDueRetries(db, task.id);
  await refreshReadySteps(db, task.id);
  const [step] = await db.select().from(agentTaskSteps)
    .where(and(eq(agentTaskSteps.taskId, task.id), eq(agentTaskSteps.status, "READY")))
    .orderBy(desc(agentTaskSteps.id)).limit(1);

  if (!step) {
    const steps = await db.select().from(agentTaskSteps).where(eq(agentTaskSteps.taskId, task.id));
    if (steps.length > 0 && steps.every(s => ["SUCCEEDED", "VERIFYING"].includes(s.status))) {
      if (task.status === "READY" || task.status === "RUNNING") {
        await db.update(agentTasks).set({ status: "VERIFYING", updatedAt: new Date() })
          .where(and(
            eq(agentTasks.id, task.id),
            eq(agentTasks.workerLeaseToken, leaseToken),
            inArray(agentTasks.status, ["READY", "RUNNING"]),
          ));
        await event(db, task.id, "ACCEPTANCE_VALIDATION_REQUIRED", {
          reason: "All executable steps finished; required acceptance checks remain unverified.",
        });
      }
    }
    return false;
  }

  const claim = await db.update(agentTaskSteps).set({
    status: "RUNNING", attemptCount: step.attemptCount + 1, startedAt: step.startedAt ?? new Date(), updatedAt: new Date(),
  }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "READY")));
  if (affectedRows(claim) !== 1) return false;

  if (task.status === "READY") {
    await db.update(agentTasks).set({ status: "RUNNING", startedAt: task.startedAt ?? new Date(), updatedAt: new Date() })
      .where(and(
        eq(agentTasks.id, task.id),
        eq(agentTasks.workerLeaseToken, leaseToken),
        eq(agentTasks.status, "READY"),
      ));
  }

  const adapter = toolAdapterRegistryV4.findAdapterForCapability(step.capabilityId);
  if (!adapter) {
    const message = `No configured provider for capability: ${step.capabilityId}`;
    await db.update(agentTaskSteps).set({ status: "BLOCKED", lastError: message, updatedAt: new Date() })
      .where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message, leaseToken);
    return true;
  }

  const budgetRecord = parse<Record<string, unknown>>(task.budgetJson, {});
  const approval = budgetRecord.executionApproval as {
    approved?: boolean; actionClasses?: string[]; expiresAt?: string; maxCost?: number;
  } | undefined;
  // Only the user-submitted image-generation action currently has a scoped
  // reversible-write grant. New capability classes default to denied.
  const actionClass: ActionRiskClassV4 = step.capabilityId === "image.generate"
    ? "reversible_write"
    : "security_sensitive";
  const gate = evaluateActionGateV4({
    actionClass,
    description: step.description,
    resource: `agentTask:${task.id}/step:${step.id}`,
  }, {
    mode: "execute_approved",
    authorization: approval ? {
      approved: approval.approved === true,
      actionClasses: new Set((approval.actionClasses ?? []) as ActionRiskClassV4[]),
      expiresAt: approval.expiresAt ? new Date(approval.expiresAt) : undefined,
      maxCost: approval.maxCost,
    } : undefined,
  });
  if (!gate.allowed) {
    const message = `Action gate denied execution: ${gate.reason}`;
    await db.update(agentTaskSteps).set({ status: "BLOCKED", lastError: message, updatedAt: new Date() })
      .where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message, leaseToken);
    await event(db, task.id, "ACTION_GATE_DENIED", { stepId: step.id, actionClass, reason: gate.reason });
    return true;
  }

  const storedBudget = parse<Record<string, unknown>>(task.budgetJson, {});
  const requestedDuration = typeof storedBudget.maxDurationMs === "number"
    ? storedBudget.maxDurationMs
    : typeof storedBudget.maxEstimatedDurationMs === "number"
      ? storedBudget.maxEstimatedDurationMs
      : undefined;
  const budget: ExecutionBudget = {
    ...defaultBudget(),
    ...parse<Partial<ExecutionBudget>>(task.budgetJson, {}),
    ...(requestedDuration !== undefined ? { maxDurationMs: requestedDuration } : {}),
  };
  const usage = { ...defaultUsage(), ...parse<Partial<ExecutionUsage>>(task.usageJson, {}) };
  // Keep provider idempotency stable across retries to avoid repeating an
  // external side effect after an ambiguous timeout. The internal ledger still
  // gets a unique key per attempt so every dispatch is auditable.
  const providerIdempotencyKey = `nova-v4:${task.id}:${step.id}`;
  const idempotencyKey = `${providerIdempotencyKey}:attempt:${step.attemptCount + 1}`;
  const startedAt = new Date();
  const insertedRun = await db.insert(agentToolRuns).values({
    taskId: task.id, stepId: step.id, adapterName: adapter.name, capabilityId: step.capabilityId,
    idempotencyKey, status: "RUNNING", requestMetadata: JSON.stringify({ description: step.description }),
    startedAt,
  });
  const toolRunId = Number(insertedRun[0].insertId);

  // Check the budget against prior usage, then reserve this call before
  // dispatch so a failed provider attempt still consumes budget exactly once.
  const usageBeforeDispatch = { ...usage };
  try {
    assertWithinExecutionBudget(budget, usageBeforeDispatch);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(agentToolRuns).set({
      status: "BLOCKED", errorMessage: message, finishedAt: startedAt,
    }).where(eq(agentToolRuns.id, toolRunId));
    await db.update(agentTaskSteps).set({
      status: "BLOCKED", lastError: message, updatedAt: startedAt,
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message, leaseToken);
    await event(db, task.id, "EXECUTION_BUDGET_EXCEEDED", { stepId: step.id, message });
    return true;
  }
  const providerTimeoutMs = boundedExecutionTimeoutMs(budget, usageBeforeDispatch, 120_000);

  // Re-check immediately before the external side effect. Cancellation may
  // have been requested while the step was being claimed or budget-checked.
  const [latestTaskBeforeDispatch] = await db.select({
    status: agentTasks.status,
    cancelRequested: agentTasks.cancelRequested,
    workerLeaseToken: agentTasks.workerLeaseToken,
  }).from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
  if (!latestTaskBeforeDispatch ||
      !canDispatchTask(latestTaskBeforeDispatch.status as ExecutionStatus, latestTaskBeforeDispatch.cancelRequested)) {
    const message = "Task no longer permits dispatch; external call was not started.";
    await db.update(agentToolRuns).set({
      status: "BLOCKED", errorMessage: message, finishedAt: new Date(),
    }).where(eq(agentToolRuns.id, toolRunId));
    await db.update(agentTaskSteps).set({
      status: "CANCELLED", lastError: message, updatedAt: new Date(),
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    await db.update(agentTasks).set({
      status: "CANCELLED", completedAt: new Date(), updatedAt: new Date(),
    }).where(and(
      eq(agentTasks.id, task.id),
      eq(agentTasks.workerLeaseToken, leaseToken),
      inArray(agentTasks.status, ["READY", "RUNNING"]),
    ));
    await event(db, task.id, "CANCELLATION_BEFORE_DISPATCH", { stepId: step.id, message });
    return true;
  }

  if (!ownsExecutionLease(latestTaskBeforeDispatch.workerLeaseToken, leaseToken)) {
    const message = "Worker lease was lost; external call was not started.";
    const finishedAt = new Date();
    await db.update(agentToolRuns).set({
      status: "BLOCKED", errorMessage: message, finishedAt,
    }).where(eq(agentToolRuns.id, toolRunId));
    // No external side effect occurred, so make the step eligible for the
    // current lease holder. Never change task state from a stale worker.
    await db.update(agentTaskSteps).set({
      status: "READY", lastError: message, updatedAt: finishedAt,
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    await event(db, task.id, "WORKER_LEASE_LOST_BEFORE_DISPATCH", { stepId: step.id, message });
    return true;
  }

  usage.toolCalls += 1;
  // Reserve the call budget only while this worker still owns the lease. If
  // ownership changed after the earlier check, do not invoke the provider.
  const usageReservation = await db.update(agentTasks).set({
    usageJson: JSON.stringify(usage),
    updatedAt: startedAt,
  }).where(and(
    eq(agentTasks.id, task.id),
    eq(agentTasks.workerLeaseToken, leaseToken),
    inArray(agentTasks.status, ["READY", "RUNNING"]),
  ));
  if (affectedRows(usageReservation) !== 1) {
    const message = "Worker lease was lost while reserving usage; external call was not started.";
    const finishedAt = new Date();
    await db.update(agentToolRuns).set({
      status: "BLOCKED", errorMessage: message, finishedAt,
    }).where(and(eq(agentToolRuns.id, toolRunId), eq(agentToolRuns.status, "RUNNING")));
    await db.update(agentTaskSteps).set({
      status: "READY", lastError: message, updatedAt: finishedAt,
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    await event(db, task.id, "WORKER_LEASE_LOST_BEFORE_USAGE_RESERVATION", { stepId: step.id, message });
    return true;
  }

  try {
    const result = await toolAdapterRegistryV4.execute({
      adapterName: adapter.name,
      request: {
        taskId: String(task.id), stepId: String(step.id), capabilityId: step.capabilityId,
        input: { goal: task.goal, description: step.description, ...parse<Record<string, unknown>>(step.inputJson, {}) },
        idempotencyKey: providerIdempotencyKey, timeoutMs: providerTimeoutMs,
      },
      budget, usage: usageBeforeDispatch,
    });
    const finishedAt = new Date();
    usage.elapsedMs = (usage.elapsedMs ?? 0) + (finishedAt.getTime() - startedAt.getTime());
    await db.update(agentTasks).set({ usageJson: JSON.stringify(usage), updatedAt: finishedAt }).where(and(
      eq(agentTasks.id, task.id),
      eq(agentTasks.workerLeaseToken, leaseToken),
    ));

    if (result.status === "SUCCEEDED") {
      for (const artifact of result.artifacts) {
        await db.insert(agentArtifacts).values({
          taskId: task.id, stepId: step.id, uri: artifact.uri, mediaType: artifact.mediaType,
          checksum: artifact.checksum, sizeBytes: artifact.sizeBytes,
          metadataJson: artifact.metadata ? JSON.stringify(artifact.metadata) : null,
          validationStatus: "UNVERIFIED",
        });
      }
      await db.update(agentTaskSteps).set({
        status: "SUCCEEDED", outputJson: JSON.stringify({ artifacts: result.artifacts, metadata: result.metadata ?? null }),
        completedAt: finishedAt, updatedAt: finishedAt,
      }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
      await db.update(agentToolRuns).set({
        status: "SUCCEEDED", responseMetadata: JSON.stringify(result), finishedAt,
      }).where(eq(agentToolRuns.id, toolRunId));
      await event(db, task.id, "STEP_EXECUTED", { stepId: step.id, artifactCount: result.artifacts.length });
      return true;
    }

    if (result.status === "RUNNING") {
      await db.update(agentTaskSteps).set({
        status: "BLOCKED", externalJobId: result.externalJobId ?? null,
        lastError: "External job started; asynchronous reconciliation is not configured.", updatedAt: finishedAt,
      }).where(eq(agentTaskSteps.id, step.id));
      await db.update(agentToolRuns).set({
        status: "RUNNING", externalJobId: result.externalJobId ?? null,
        responseMetadata: JSON.stringify(result), finishedAt,
      }).where(eq(agentToolRuns.id, toolRunId));
      const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
      if (freshTask) await blockTask(db, freshTask, "External job reconciliation is not configured.", leaseToken);
      return true;
    }

    const message = result.error?.message ?? `Provider returned ${result.status}`;
    const classification = classifyExecutionError({
      code: result.error?.code,
      message,
      retryable: result.error?.retryable,
    });
    const canRetry = result.status === "FAILED" && classification.retryable && step.attemptCount + 1 < step.maxAttempts;
    await db.update(agentTaskSteps).set({
      status: result.status === "BLOCKED" ? "BLOCKED" : canRetry ? "RETRYING" : "FAILED",
      lastError: message, updatedAt: finishedAt,
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    await db.update(agentToolRuns).set({
      status: result.status === "BLOCKED" ? "BLOCKED" : "FAILED", errorMessage: message,
      responseMetadata: JSON.stringify(result), finishedAt,
    }).where(eq(agentToolRuns.id, toolRunId));
    if (canRetry) {
      await event(db, task.id, "STEP_RETRY_SCHEDULED", {
        stepId: step.id, attemptCount: step.attemptCount, maxAttempts: step.maxAttempts,
        category: classification.category, reason: message,
      });
      return true;
    }
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message, leaseToken);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    usage.elapsedMs = (usage.elapsedMs ?? 0) + (finishedAt.getTime() - startedAt.getTime());
    await db.update(agentTasks).set({ usageJson: JSON.stringify(usage), updatedAt: finishedAt })
      .where(and(
        eq(agentTasks.id, task.id),
        eq(agentTasks.workerLeaseToken, leaseToken),
      ));
    const errorCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    const classification = classifyExecutionError({ code: errorCode, message });
    const uncertainOutcome = isUncertainProviderOutcome({ code: errorCode, message });
    const canRetry = !uncertainOutcome && classification.retryable && step.attemptCount + 1 < step.maxAttempts;
    const reconciledMessage = uncertainOutcome
      ? `Provider outcome is uncertain; automatic replay is suppressed to avoid a duplicate external action. Original error: ${message}`
      : message;
    await db.update(agentTaskSteps).set({
      status: uncertainOutcome ? "BLOCKED" : canRetry ? "RETRYING" : "FAILED",
      lastError: reconciledMessage, updatedAt: finishedAt,
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    await db.update(agentToolRuns).set({
      status: uncertainOutcome ? "UNKNOWN" : "FAILED",
      errorMessage: reconciledMessage, finishedAt,
    }).where(eq(agentToolRuns.id, toolRunId));
    if (uncertainOutcome) {
      const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
      if (freshTask) await blockTask(db, freshTask, reconciledMessage, leaseToken);
      await event(db, task.id, "EXTERNAL_OUTCOME_UNKNOWN", {
        stepId: step.id, toolRunId, category: classification.category, message: reconciledMessage,
      });
      return true;
    }
    if (canRetry) {
      await event(db, task.id, "STEP_RETRY_SCHEDULED", {
        stepId: step.id, attemptCount: step.attemptCount, maxAttempts: step.maxAttempts,
        category: classification.category, reason: message,
      });
      return true;
    }
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message, leaseToken);
    await event(db, task.id, "STEP_FAILED", { stepId: step.id, message, category: classification.category });
    return true;
  }
}

/**
 * A database CAS lease serializes processing for one task across worker
 * processes. The local tickInFlight flag only protects a single process.
 */
async function processTask(taskId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const leaseToken = randomUUID();
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 10 * 60 * 1000);
  const lease = await db.update(agentTasks).set({
    workerLeaseToken: leaseToken,
    workerLeaseUntil: leaseUntil,
  }).where(and(
    eq(agentTasks.id, taskId),
    inArray(agentTasks.status, ["READY", "RUNNING"]),
    or(isNull(agentTasks.workerLeaseUntil), lt(agentTasks.workerLeaseUntil, now)),
  ));
  if (affectedRows(lease) !== 1) return false;

  // Renew well before expiry so slow providers cannot silently let another
  // worker acquire the same task while this worker is still reconciling results.
  const leaseTtlMs = 10 * 60 * 1000;
  const leaseRenewEveryMs = 60 * 1000;
  let heartbeatInFlight = false;
  let leaseLost = false;
  const heartbeat = setInterval(() => {
    if (heartbeatInFlight || leaseLost) return;
    heartbeatInFlight = true;
    void (async () => {
      try {
        const renewedAt = new Date();
        const renewal = await db.update(agentTasks).set({
          workerLeaseUntil: new Date(renewedAt.getTime() + leaseTtlMs),
          updatedAt: renewedAt,
        }).where(and(
          eq(agentTasks.id, taskId),
          eq(agentTasks.workerLeaseToken, leaseToken),
          inArray(agentTasks.status, ["READY", "RUNNING"]),
        ));
        if (affectedRows(renewal) !== 1) {
          leaseLost = true;
        } else {
          // Stale-step recovery uses step.updatedAt. Refresh active claims too,
          // so it cannot quarantine a provider call while its task lease is live.
          await db.update(agentTaskSteps).set({ updatedAt: renewedAt }).where(and(
            eq(agentTaskSteps.taskId, taskId),
            eq(agentTaskSteps.status, "RUNNING"),
          ));
        }
      } catch (error) {
        // Keep retrying on the next heartbeat after transient DB failures.
        // If renewal actually loses the compare-and-set, leaseLost is set above.
        console.error("[agentWorkerV4] lease heartbeat failed", {
          taskId,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        heartbeatInFlight = false;
      }
    })();
  }, leaseRenewEveryMs);
  heartbeat.unref?.();

  try {
    const processed = await processTaskUnderLease(taskId, leaseToken);
    if (leaseLost) {
      await event(db, taskId, "WORKER_LEASE_LOST", {
        reason: "Lease renewal did not update the current task lease; task state may require reconciliation.",
      });
    }
    return processed;
  } finally {
    clearInterval(heartbeat);
    // A late worker must never clear a lease acquired by a newer worker.
    await db.update(agentTasks).set({
      workerLeaseToken: null,
      workerLeaseUntil: null,
    }).where(and(
      eq(agentTasks.id, taskId),
      eq(agentTasks.workerLeaseToken, leaseToken),
    ));
  }
}

/**
 * Recover claims left RUNNING by a process that disappeared.
 *
 * Do not automatically re-dispatch these steps: a provider may have completed
 * an external side effect before the process crashed. Mark them BLOCKED for
 * explicit reconciliation instead of risking duplicate generation/charges.
 */
export async function reconcileStaleAgentStepsV4(
  staleAfterMs = 10 * 60 * 1000,
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const cutoff = new Date(Date.now() - Math.max(120_000, staleAfterMs));
  const stale = await db.select().from(agentTaskSteps)
    .where(and(eq(agentTaskSteps.status, "RUNNING"), lt(agentTaskSteps.updatedAt, cutoff)));
  let recovered = 0;

  for (const step of stale) {
    // A live task lease is stronger evidence than an old step timestamp. This
    // also protects recovery if a heartbeat renewed the task but its step
    // timestamp refresh temporarily failed.
    const [leaseOwner] = await db.select({
      workerLeaseToken: agentTasks.workerLeaseToken,
      workerLeaseUntil: agentTasks.workerLeaseUntil,
    }).from(agentTasks).where(eq(agentTasks.id, step.taskId)).limit(1);
    if (leaseOwner?.workerLeaseToken && leaseOwner.workerLeaseUntil && leaseOwner.workerLeaseUntil > new Date()) {
      continue;
    }

    const message = "Worker claim became stale. Automatic replay is suppressed because provider side-effect completion is unknown.";
    const changed = await db.update(agentTaskSteps).set({
      status: "BLOCKED", lastError: message, updatedAt: new Date(),
    }).where(and(
      eq(agentTaskSteps.id, step.id),
      eq(agentTaskSteps.status, "RUNNING"),
      lt(agentTaskSteps.updatedAt, cutoff),
    ));
    if (affectedRows(changed) !== 1) continue;

    // Keep the durable tool-run ledger consistent with the blocked step.
    // Otherwise an interrupted dispatch would remain RUNNING forever in task
    // details even though the worker has explicitly quarantined the step.
    await db.update(agentToolRuns).set({
      status: "UNKNOWN",
      errorMessage: message,
      finishedAt: new Date(),
    }).where(and(
      eq(agentToolRuns.stepId, step.id),
      eq(agentToolRuns.status, "RUNNING"),
    ));

    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, step.taskId)).limit(1);
    if (task) {
      await blockTask(db, task, message, undefined, true);
      await event(db, task.id, "STALE_STEP_RECONCILED", {
        stepId: step.id, attemptCount: step.attemptCount, cutoff: cutoff.toISOString(),
      });
    }
    recovered++;
  }
  return recovered;
}

export async function runAgentWorkerTickV4(): Promise<number> {
  if (tickInFlight) return 0;
  tickInFlight = true;
  try {
    const db = await getDb();
    if (!db) return 0;
    // Reconcile stale RUNNING claims before dispatching any new work.
    await reconcileStaleAgentStepsV4();
    const tasks = await db.select({ id: agentTasks.id }).from(agentTasks)
      .where(inArray(agentTasks.status, ["READY", "RUNNING"]))
      .orderBy(desc(agentTasks.priority), desc(agentTasks.createdAt))
      .limit(MAX_TASKS_PER_TICK);
    let processed = 0;
    for (const task of tasks) {
      if (await processTask(task.id)) processed++;
    }
    return processed;
  } finally {
    tickInFlight = false;
  }
}

export function startAgentWorkerV4(): void {
  if (timer) return;
  if (
    process.env.NOVA_AGENT_V4_TASK_STORE_ENABLED !== "true" ||
    process.env.NOVA_AGENT_V4_WORKER_ENABLED !== "true"
  ) {
    console.log("[AgentWorkerV4] Disabled; review/apply the V4 migration, then set NOVA_AGENT_V4_TASK_STORE_ENABLED=true and NOVA_AGENT_V4_WORKER_ENABLED=true.");
    return;
  }
  console.log(`[AgentWorkerV4] Starting durable task poller (every ${POLL_MS}ms)`);
  timer = setInterval(() => {
    void runAgentWorkerTickV4().catch(error => console.error("[AgentWorkerV4] Tick failed:", error));
  }, POLL_MS);
  timer.unref?.();
  void runAgentWorkerTickV4().catch(error => console.error("[AgentWorkerV4] Initial tick failed:", error));
}

export function stopAgentWorkerV4(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
}
