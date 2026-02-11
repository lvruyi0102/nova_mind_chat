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

/**
 * DecisionExecutionPipeline
 * Convert autonomous decisions into tasks/actions and persist learnable outcomes.
 */
export class DecisionExecutionPipeline {
  async execute(
    decision: AutonomousDecisionInput
  ): Promise<{
    createdTaskId?: number;
    executedTaskId?: number;
    summary: string;
  }> {
    const db = await getDb();
    if (!db) {
      return { summary: "数据库不可用，跳过执行" };
    }

    const summaryParts: string[] = [];

    // 1) Create action artifact (task or state update)
    let createdTaskId: number | undefined;

    if (decision.decision === "change_state") {
      const nextState = this.inferState(decision.action);
      if (nextState) {
        await updateState({
          state: nextState,
          lastThoughtContent: decision.reasoning.slice(0, 180),
        });
        summaryParts.push(`状态切换到 ${nextState}`);
      }
    } else if (decision.decision === "rest") {
      await updateState({
        state: "sleeping",
        lastThoughtContent: "进入整合休息模式",
      });
      summaryParts.push("进入休息状态");
    } else {
      createdTaskId = await this.createTaskFromDecision(decision);
      if (createdTaskId) {
        summaryParts.push(`创建任务 #${createdTaskId}`);
      }
    }

    // 2) Execute one pending task to close loop
    let executedTaskId: number | undefined;
    const pending = await db
      .select()
      .from(autonomousTasks)
      .where(eq(autonomousTasks.status, "pending"))
      .orderBy(desc(autonomousTasks.priority), desc(autonomousTasks.createdAt))
      .limit(1);

    if (pending[0]) {
      executedTaskId = pending[0].id;
      await executeAutonomousTask(executedTaskId);
      summaryParts.push(`执行任务 #${executedTaskId}`);
    }

    // 3) Log the pipeline outcome for learning
    await db.insert(cognitiveLog).values({
      stage: "Autonomous_Execution",
      eventType: "decision_pipeline",
      description: `decision=${decision.decision}; action=${decision.action}; outcome=${summaryParts.join(" | ") || "no_op"}`,
    });

    // Keep an explicit decision outcome for future policy learning
    await db.insert(autonomousDecisions).values({
      decisionType: decision.decision,
      context: "background_cognition_pipeline",
      reasoning: decision.reasoning,
      action: decision.action,
      outcome: summaryParts.join(" | ") || "no_op",
    });

    return {
      createdTaskId,
      executedTaskId,
      summary: summaryParts.join(" | ") || "no_op",
    };
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
