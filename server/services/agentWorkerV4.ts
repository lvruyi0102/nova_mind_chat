/**
 * Durable V4 worker.
 *
 * This worker claims READY steps with compare-and-set updates. It persists tool
 * runs and artifact references before moving task state. It never marks a task
 * SUCCEEDED: acceptance checks remain UNVERIFIED until a real validator is
 * registered and run. Enable explicitly with NOVA_AGENT_V4_WORKER_ENABLED=true.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { agentArtifacts, agentTaskEvents, agentTasks, agentTaskSteps, agentToolRuns } from "../../drizzle/schema";
import { getDb } from "../db";
import type { ExecutionBudget, ExecutionStatus, ExecutionUsage } from "./executionEngineV4";
import { assertExecutionTransition } from "./executionEngineV4";
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

async function blockTask(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, task: typeof agentTasks.$inferSelect, message: string) {
  const from = task.status as ExecutionStatus;
  if (from !== "BLOCKED" && from !== "FAILED" && from !== "CANCELLED" && from !== "SUCCEEDED") {
    try { assertExecutionTransition(from, "BLOCKED"); } catch { /* keep the failure visible in the audit log */ }
    await db.update(agentTasks).set({ status: "BLOCKED", lastError: message, updatedAt: new Date() })
      .where(and(eq(agentTasks.id, task.id), eq(agentTasks.status, task.status)));
  }
  await event(db, task.id, "TASK_BLOCKED", { message });
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

async function processTask(taskId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, taskId)).limit(1);
  if (!task || !["READY", "RUNNING"].includes(task.status)) return false;
  if (task.cancelRequested) {
    await db.update(agentTaskSteps).set({ status: "CANCELLED", updatedAt: new Date() })
      .where(and(eq(agentTaskSteps.taskId, task.id), inArray(agentTaskSteps.status, ["PENDING", "READY", "RUNNING", "RETRYING"])));
    await db.update(agentTasks).set({ status: "CANCELLED", completedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(agentTasks.id, task.id), inArray(agentTasks.status, ["READY", "RUNNING"])));
    await event(db, task.id, "TASK_CANCELLED", { reason: "User requested cancellation." });
    return true;
  }

  await refreshReadySteps(db, task.id);
  const [step] = await db.select().from(agentTaskSteps)
    .where(and(eq(agentTaskSteps.taskId, task.id), eq(agentTaskSteps.status, "READY")))
    .orderBy(desc(agentTaskSteps.id)).limit(1);

  if (!step) {
    const steps = await db.select().from(agentTaskSteps).where(eq(agentTaskSteps.taskId, task.id));
    if (steps.length > 0 && steps.every(s => ["SUCCEEDED", "VERIFYING"].includes(s.status))) {
      if (task.status === "READY" || task.status === "RUNNING") {
        await db.update(agentTasks).set({ status: "VERIFYING", updatedAt: new Date() })
          .where(and(eq(agentTasks.id, task.id), inArray(agentTasks.status, ["READY", "RUNNING"])));
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
      .where(and(eq(agentTasks.id, task.id), eq(agentTasks.status, "READY")));
  }

  const adapter = toolAdapterRegistryV4.findAdapterForCapability(step.capabilityId);
  if (!adapter) {
    const message = `No configured provider for capability: ${step.capabilityId}`;
    await db.update(agentTaskSteps).set({ status: "BLOCKED", lastError: message, updatedAt: new Date() })
      .where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message);
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
    if (freshTask) await blockTask(db, freshTask, message);
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
  const idempotencyKey = `nova-v4:${task.id}:${step.id}:${step.attemptCount + 1}`;
  const startedAt = new Date();
  const insertedRun = await db.insert(agentToolRuns).values({
    taskId: task.id, stepId: step.id, adapterName: adapter.name, capabilityId: step.capabilityId,
    idempotencyKey, status: "RUNNING", requestMetadata: JSON.stringify({ description: step.description }),
    startedAt,
  });
  const toolRunId = Number(insertedRun[0].insertId);

  try {
    const result = await toolAdapterRegistryV4.execute({
      adapterName: adapter.name,
      request: {
        taskId: String(task.id), stepId: String(step.id), capabilityId: step.capabilityId,
        input: { goal: task.goal, description: step.description, ...parse<Record<string, unknown>>(step.inputJson, {}) },
        idempotencyKey, timeoutMs: 120_000,
      },
      budget, usage,
    });
    const finishedAt = new Date();
    usage.toolCalls += 1;
    usage.elapsedMs = (usage.elapsedMs ?? 0) + (finishedAt.getTime() - startedAt.getTime());
    await db.update(agentTasks).set({ usageJson: JSON.stringify(usage), updatedAt: finishedAt }).where(eq(agentTasks.id, task.id));

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
      if (freshTask) await blockTask(db, freshTask, "External job reconciliation is not configured.");
      return true;
    }

    const message = result.error?.message ?? `Provider returned ${result.status}`;
    await db.update(agentTaskSteps).set({ status: result.status === "BLOCKED" ? "BLOCKED" : "FAILED", lastError: message, updatedAt: finishedAt })
      .where(eq(agentTaskSteps.id, step.id));
    await db.update(agentToolRuns).set({
      status: result.status === "BLOCKED" ? "BLOCKED" : "FAILED", errorMessage: message,
      responseMetadata: JSON.stringify(result), finishedAt,
    }).where(eq(agentToolRuns.id, toolRunId));
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    await db.update(agentTaskSteps).set({ status: "FAILED", lastError: message, updatedAt: finishedAt })
      .where(eq(agentTaskSteps.id, step.id));
    await db.update(agentToolRuns).set({ status: "FAILED", errorMessage: message, finishedAt })
      .where(eq(agentToolRuns.id, toolRunId));
    const [freshTask] = await db.select().from(agentTasks).where(eq(agentTasks.id, task.id)).limit(1);
    if (freshTask) await blockTask(db, freshTask, message);
    await event(db, task.id, "STEP_FAILED", { stepId: step.id, message });
    return true;
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
    .where(and(eq(agentTaskSteps.status, "RUNNING")));
  let recovered = 0;

  for (const step of stale) {
    if (!step.updatedAt || step.updatedAt > cutoff) continue;
    const message = "Worker claim became stale. Automatic replay is suppressed because provider side-effect completion is unknown.";
    const changed = await db.update(agentTaskSteps).set({
      status: "BLOCKED", lastError: message, updatedAt: new Date(),
    }).where(and(eq(agentTaskSteps.id, step.id), eq(agentTaskSteps.status, "RUNNING")));
    if (affectedRows(changed) !== 1) continue;

    const [task] = await db.select().from(agentTasks).where(eq(agentTasks.id, step.taskId)).limit(1);
    if (task) {
      await blockTask(db, task, message);
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
