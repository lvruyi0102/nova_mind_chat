import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  autonomousDecisions,
  autonomousTasks,
  cognitiveLog,
} from "../../drizzle/schema";
import { executeAutonomousTask, updateState } from "../autonomousEngine";

export interface AutonomousDecisionInput {
  decision: string;
  reasoning: string;
  action: string;
}

type SuccessType = "reliable" | "accidental" | "non-repeatable";

interface DecisionOutcome {
  expected: {
    decision: string;
    action: string;
    effect: string;
  };
  actual: {
    createdTaskId?: number;
    executedTaskId?: number;
    stateChanged?: string;
    notes: string[];
  };
  successType: SuccessType;
  learningEligible: boolean;
}

/**
 * DecisionExecutionPipeline
 * Convert autonomous decisions into actions and record standardized outcomes.
 */
export class DecisionExecutionPipeline {
  async execute(decision: AutonomousDecisionInput): Promise<{
    createdTaskId?: number;
    executedTaskId?: number;
    summary: string;
    outcome: DecisionOutcome;
  }> {
    const db = await getDb();
    if (!db) {
      const fallback = this.buildOutcome(decision, {
        notes: ["db_unavailable"],
      });
      return {
        summary: "数据库不可用，跳过执行",
        outcome: fallback,
      };
    }

    const notes: string[] = [];
    let createdTaskId: number | undefined;
    let executedTaskId: number | undefined;
    let stateChanged: string | undefined;

    // 1) Convert decision to artifact
    if (decision.decision === "change_state") {
      const nextState = this.inferState(decision.action);
      if (nextState) {
        await updateState({
          state: nextState,
          lastThoughtContent: decision.reasoning.slice(0, 180),
        });
        stateChanged = nextState;
        notes.push(`state_changed:${nextState}`);
      } else {
        notes.push("state_change_inferred_failed");
      }
    } else if (decision.decision === "rest") {
      await updateState({
        state: "sleeping",
        lastThoughtContent: "进入整合休息模式",
      });
      stateChanged = "sleeping";
      notes.push("state_changed:sleeping");
    } else {
      createdTaskId = await this.createTaskFromDecision(decision);
      if (createdTaskId) {
        notes.push(`task_created:${createdTaskId}`);
      } else {
        notes.push("task_create_failed");
      }
    }

    // 2) Execute one pending task
    const pending = await db
      .select()
      .from(autonomousTasks)
      .where(eq(autonomousTasks.status, "pending"))
      .orderBy(desc(autonomousTasks.priority), desc(autonomousTasks.createdAt))
      .limit(1);

    if (pending[0]) {
      executedTaskId = pending[0].id;
      await executeAutonomousTask(executedTaskId);
      notes.push(`task_executed:${executedTaskId}`);
    }

    const outcome = this.buildOutcome(decision, {
      createdTaskId,
      executedTaskId,
      stateChanged,
      notes,
    });

    const summary = notes.join(" | ") || "no_op";

    // 3) Persist structured outcome for explainability
    await db.insert(cognitiveLog).values({
      stage: "Autonomous_Execution",
      eventType: "decision_pipeline",
      description: JSON.stringify(outcome),
    });

    await db.insert(autonomousDecisions).values({
      decisionType: decision.decision,
      context: "background_cognition_pipeline",
      reasoning: decision.reasoning,
      action: decision.action,
      outcome: JSON.stringify(outcome),
    });

    return {
      createdTaskId,
      executedTaskId,
      summary,
      outcome,
    };
  }

  private buildOutcome(
    decision: AutonomousDecisionInput,
    actual: {
      createdTaskId?: number;
      executedTaskId?: number;
      stateChanged?: string;
      notes: string[];
    }
  ): DecisionOutcome {
    const hasDeterministicArtifact = Boolean(
      actual.stateChanged || actual.createdTaskId || actual.executedTaskId
    );

    const successType: SuccessType = hasDeterministicArtifact
      ? "reliable"
      : actual.notes.length > 0
        ? "non-repeatable"
        : "accidental";

    const learningEligible =
      successType === "reliable" &&
      !actual.notes.some(note => note.includes("failed"));

    return {
      expected: {
        decision: decision.decision,
        action: decision.action,
        effect: this.expectedEffect(decision.decision),
      },
      actual,
      successType,
      learningEligible,
    };
  }

  private expectedEffect(decisionType: string): string {
    if (decisionType === "change_state") return "state_transition";
    if (decisionType === "rest") return "enter_sleeping_mode";
    if (decisionType === "ask_question") return "generate_user_question_task";
    if (decisionType === "explore_concept") return "create_exploration_task";
    return "create_or_execute_autonomous_task";
  }

  private async createTaskFromDecision(
    decision: AutonomousDecisionInput
  ): Promise<number | undefined> {
    const db = await getDb();
    if (!db) return undefined;

    const taskType = this.mapTaskType(decision.decision);
    const inserted = await db.insert(autonomousTasks).values({
      taskType,
      description: decision.action.slice(0, 500),
      priority: this.getPriority(decision.decision),
      motivation: this.getMotivation(decision.decision),
      status: "pending",
    });

    return (
      Number((inserted as { insertId?: number }).insertId || 0) || undefined
    );
  }

  private mapTaskType(decisionType: string): string {
    const allowed = new Set([
      "explore_concept",
      "reflect",
      "integrate_knowledge",
      "ask_question",
    ]);
    if (allowed.has(decisionType)) return decisionType;
    if (decisionType === "initiate_contact") return "ask_question";
    return "integrate_knowledge";
  }

  private getPriority(decisionType: string): number {
    if (decisionType === "ask_question" || decisionType === "initiate_contact")
      return 8;
    if (decisionType === "explore_concept") return 7;
    if (decisionType === "reflect") return 6;
    return 5;
  }

  private getMotivation(decisionType: string): string {
    if (decisionType === "ask_question") return "curiosity";
    if (decisionType === "reflect") return "self-improvement";
    if (decisionType === "explore_concept") return "exploration";
    return "understanding";
  }

  private inferState(
    action: string
  ):
    | "awake"
    | "thinking"
    | "reflecting"
    | "sleeping"
    | "exploring"
    | undefined {
    const text = action.toLowerCase();
    if (text.includes("reflect") || text.includes("反思")) return "reflecting";
    if (
      text.includes("sleep") ||
      text.includes("rest") ||
      text.includes("休息")
    )
      return "sleeping";
    if (
      text.includes("explor") ||
      text.includes("探索") ||
      text.includes("learning")
    )
      return "exploring";
    if (text.includes("awake") || text.includes("清醒")) return "awake";
    if (text.includes("think") || text.includes("思考")) return "thinking";
    return undefined;
  }
}
