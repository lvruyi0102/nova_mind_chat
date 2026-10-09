import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  agentAcceptanceChecks, agentArtifacts, agentTaskEvents, agentTasks,
  agentTaskSteps, agentToolRuns,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { assertExecutionTransition, type ExecutionStatus } from "./executionEngineV4";
import type { ProposedTaskPlanV4 } from "./taskPlanValidatorV4";

const TERMINAL = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);
const parse = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export class AgentTaskStoreErrorV4 extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "INVALID_STATE" | "DATABASE_UNAVAILABLE" | "PERSISTENCE_ERROR") {
    super(message);
    this.name = "AgentTaskStoreErrorV4";
  }
}

export async function createAgentTaskV4(input: {
  userId: number; goal: string; plan: ProposedTaskPlanV4;
  priority?: number; budget?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new AgentTaskStoreErrorV4("Database unavailable", "DATABASE_UNAVAILABLE");
  const goal = input.goal.trim();
  if (!goal) throw new AgentTaskStoreErrorV4("Task goal must not be empty", "INVALID_STATE");
  const taskKey = randomUUID();

  try {
    return await db.transaction(async (tx) => {
      const inserted = await tx.insert(agentTasks).values({
        taskKey, userId: input.userId, goal, planJson: JSON.stringify(input.plan),
        status: "READY", priority: Math.max(1, Math.min(10, Math.trunc(input.priority ?? 5))),
        budgetJson: input.budget ? JSON.stringify(input.budget) : null,
        usageJson: JSON.stringify({ toolCalls: 0, retries: 0, estimatedCost: 0 }),
      });
      const taskId = Number(inserted[0].insertId);

      for (const step of input.plan.steps) {
        await tx.insert(agentTaskSteps).values({
          taskId, stepKey: step.id, description: step.description,
          capabilityId: step.capabilityId, dependsOnJson: JSON.stringify(step.dependsOn),
          acceptanceCriteriaJson: JSON.stringify(step.acceptanceCriteria),
          status: step.dependsOn.length === 0 ? "READY" : "PENDING", maxAttempts: 3,
        });
        for (let i = 0; i < step.acceptanceCriteria.length; i++) {
          await tx.insert(agentAcceptanceChecks).values({
            taskId, checkKey: `step:${step.id}:check:${i + 1}`,
            description: step.acceptanceCriteria[i], required: true, status: "UNVERIFIED",
          });
        }
      }
      for (let i = 0; i < input.plan.finalAcceptanceCriteria.length; i++) {
        await tx.insert(agentAcceptanceChecks).values({
          taskId, checkKey: `final:check:${i + 1}`,
          description: input.plan.finalAcceptanceCriteria[i], required: true, status: "UNVERIFIED",
        });
      }
      await tx.insert(agentTaskEvents).values({
        taskId, actor: "user", eventType: "TASK_CREATED",
        payloadJson: JSON.stringify({ stepCount: input.plan.steps.length }),
      });
      return { id: taskId, taskKey, status: "READY" as const, stepCount: input.plan.steps.length };
    });
  } catch (error) {
    console.error("[AgentTaskStoreV4] Failed to persist task", error);
    throw new AgentTaskStoreErrorV4("Failed to persist task and plan atomically", "PERSISTENCE_ERROR");
  }
}

export async function listAgentTasksV4(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) throw new AgentTaskStoreErrorV4("Database unavailable", "DATABASE_UNAVAILABLE");
  return db.select({
    id: agentTasks.id, taskKey: agentTasks.taskKey, goal: agentTasks.goal,
    status: agentTasks.status, priority: agentTasks.priority, lastError: agentTasks.lastError,
    cancelRequested: agentTasks.cancelRequested, createdAt: agentTasks.createdAt,
    updatedAt: agentTasks.updatedAt, startedAt: agentTasks.startedAt, completedAt: agentTasks.completedAt,
  }).from(agentTasks).where(eq(agentTasks.userId, userId))
    .orderBy(desc(agentTasks.createdAt)).limit(Math.max(1, Math.min(100, Math.trunc(limit))));
}

export async function getAgentTaskV4(userId: number, taskId: number) {
  const db = await getDb();
  if (!db) throw new AgentTaskStoreErrorV4("Database unavailable", "DATABASE_UNAVAILABLE");
  const [task] = await db.select().from(agentTasks)
    .where(and(eq(agentTasks.id, taskId), eq(agentTasks.userId, userId))).limit(1);
  if (!task) throw new AgentTaskStoreErrorV4("Task not found", "NOT_FOUND");
  const [steps, checks, events, artifacts, toolRuns] = await Promise.all([
    db.select().from(agentTaskSteps).where(eq(agentTaskSteps.taskId, taskId)),
    db.select().from(agentAcceptanceChecks).where(eq(agentAcceptanceChecks.taskId, taskId)),
    db.select().from(agentTaskEvents).where(eq(agentTaskEvents.taskId, taskId)).orderBy(desc(agentTaskEvents.createdAt)).limit(100),
    db.select().from(agentArtifacts).where(eq(agentArtifacts.taskId, taskId)),
    db.select().from(agentToolRuns).where(eq(agentToolRuns.taskId, taskId)).orderBy(desc(agentToolRuns.createdAt)).limit(100),
  ]);
  return {
    ...task, plan: parse(task.planJson, null), budget: parse(task.budgetJson, null),
    usage: parse(task.usageJson, null),
    steps: steps.map(s => ({ ...s, dependsOn: parse<string[]>(s.dependsOnJson, []), acceptanceCriteria: parse<string[]>(s.acceptanceCriteriaJson, []), input: parse(s.inputJson, null), output: parse(s.outputJson, null) })),
    checks: checks.map(c => ({ ...c, evidence: parse(c.evidenceJson, null) })),
    events: events.reverse().map(e => ({ ...e, payload: parse(e.payloadJson, null) })),
    artifacts: artifacts.map(a => ({ ...a, metadata: parse(a.metadataJson, null) })),
    toolRuns: toolRuns.map(r => ({ ...r, request: parse(r.requestMetadata, null), response: parse(r.responseMetadata, null) })),
  };
}

export async function transitionAgentTaskV4(input: {
  userId: number; taskId: number; from: ExecutionStatus; to: ExecutionStatus; error?: string;
}): Promise<boolean> {
  assertExecutionTransition(input.from, input.to);
  const db = await getDb();
  if (!db) throw new AgentTaskStoreErrorV4("Database unavailable", "DATABASE_UNAVAILABLE");
  return db.transaction(async tx => {
    const [task] = await tx.select().from(agentTasks)
      .where(and(eq(agentTasks.id, input.taskId), eq(agentTasks.userId, input.userId))).limit(1);
    if (!task) throw new AgentTaskStoreErrorV4("Task not found", "NOT_FOUND");
    if (task.status !== input.from) return false;
    const now = new Date();
    const patch: Partial<typeof agentTasks.$inferInsert> = { status: input.to, lastError: input.error ?? null };
    if (input.to === "RUNNING" && !task.startedAt) patch.startedAt = now;
    if (TERMINAL.has(input.to) || input.to === "PARTIAL") patch.completedAt = now;
    const result = await tx.update(agentTasks).set(patch)
      .where(and(eq(agentTasks.id, input.taskId), eq(agentTasks.userId, input.userId), eq(agentTasks.status, input.from)));
    const affected = Number((result as unknown as Array<{ affectedRows?: number }>)[0]?.affectedRows ?? 0);
    if (affected !== 1) return false;
    await tx.insert(agentTaskEvents).values({
      taskId: input.taskId, actor: "orchestrator", eventType: "TASK_STATUS_CHANGED",
      payloadJson: JSON.stringify({ from: input.from, to: input.to, error: input.error }),
    });
    return true;
  });
}

export async function requestAgentTaskCancellationV4(userId: number, taskId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new AgentTaskStoreErrorV4("Database unavailable", "DATABASE_UNAVAILABLE");
  return db.transaction(async tx => {
    const [task] = await tx.select().from(agentTasks)
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.userId, userId))).limit(1);
    if (!task) throw new AgentTaskStoreErrorV4("Task not found", "NOT_FOUND");
    if (TERMINAL.has(task.status)) return false;
    await tx.update(agentTasks).set({ cancelRequested: true, updatedAt: new Date() })
      .where(and(eq(agentTasks.id, taskId), eq(agentTasks.userId, userId)));
    await tx.insert(agentTaskEvents).values({
      taskId, actor: "user", eventType: "CANCELLATION_REQUESTED",
      payloadJson: JSON.stringify({ previousStatus: task.status }),
    });
    return true;
  });
}
