import { getBackgroundCognitionStatus, startBackgroundCognition } from "../backgroundCognitionOptimized";
import { getSelfDiagnostics } from "../autonomy/selfDiagnostics";

export type AgentStrategy = "stability_first" | "recovery_first" | "throughput_first";

type InternalNeedKey =
  | "information_gap"
  | "knowledge_gap"
  | "relationship_maintenance"
  | "system_optimization"
  | "environment_exploration";

interface InternalNeedState {
  key: InternalNeedKey;
  label: string;
  level: number;
  rationale: string;
}

interface Goal {
  need: InternalNeedKey;
  description: string;
  priority: number;
}

interface AgentCycleResult {
  timestamp: string;
  phase: "perceive" | "plan_goal" | "execute_action" | "update_memory";
  decision: string;
  goal: string;
  toolCalled: string;
  strategyBefore: AgentStrategy;
  strategyAfter: AgentStrategy;
  reward: number;
  notes: string;
}

interface AgentMemorySnapshot {
  timestamp: string;
  dominantNeed: string;
  strategy: AgentStrategy;
  summary: string;
}

interface LongTermRewardState {
  episodeCount: number;
  discountedReturn: number;
  averageReward: number;
  bestReward: number;
  lastReward: number;
  gamma: number;
}

const NEED_LABELS: Record<InternalNeedKey, string> = {
  information_gap: "信息不足",
  knowledge_gap: "知识缺口",
  relationship_maintenance: "关系维护",
  system_optimization: "系统优化",
  environment_exploration: "环境探索",
};

class AutonomousAgentOrchestrator {
  private strategy: AgentStrategy = "stability_first";
  private isRunning = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  private readonly cycleHistory: AgentCycleResult[] = [];
  private readonly memorySnapshots: AgentMemorySnapshot[] = [];

  private longTermReward: LongTermRewardState = {
    episodeCount: 0,
    discountedReturn: 0,
    averageReward: 0,
    bestReward: Number.NEGATIVE_INFINITY,
    lastReward: 0,
    gamma: 0.92,
  };

  private internalNeeds: Record<InternalNeedKey, InternalNeedState> = {
    information_gap: {
      key: "information_gap",
      label: NEED_LABELS.information_gap,
      level: 40,
      rationale: "近期未进行外部信息采集，可能存在信息滞后。",
    },
    knowledge_gap: {
      key: "knowledge_gap",
      label: NEED_LABELS.knowledge_gap,
      level: 45,
      rationale: "需要持续通过诊断与学习补齐知识盲区。",
    },
    relationship_maintenance: {
      key: "relationship_maintenance",
      label: NEED_LABELS.relationship_maintenance,
      level: 35,
      rationale: "应保持与用户交互连续性，避免关系冷却。",
    },
    system_optimization: {
      key: "system_optimization",
      label: NEED_LABELS.system_optimization,
      level: 55,
      rationale: "系统长期运行需持续优化稳定性与资源使用。",
    },
    environment_exploration: {
      key: "environment_exploration",
      label: NEED_LABELS.environment_exploration,
      level: 50,
      rationale: "需要主动探索运行环境信号，发现新机会与风险。",
    },
  };

  private perceiveState(): { needs: InternalNeedState[]; status: ReturnType<typeof getBackgroundCognitionStatus> } {
    const status = getBackgroundCognitionStatus();

    if (!status.isRunning) {
      this.internalNeeds.system_optimization.level = Math.min(100, this.internalNeeds.system_optimization.level + 25);
      this.internalNeeds.information_gap.level = Math.min(100, this.internalNeeds.information_gap.level + 10);
    } else {
      this.internalNeeds.system_optimization.level = Math.max(25, this.internalNeeds.system_optimization.level - 5);
      this.internalNeeds.relationship_maintenance.level = Math.min(100, this.internalNeeds.relationship_maintenance.level + 3);
      this.internalNeeds.environment_exploration.level = Math.min(100, this.internalNeeds.environment_exploration.level + 4);
    }

    const needs = Object.values(this.internalNeeds).sort((a, b) => b.level - a.level);
    return { needs, status };
  }

  private generateGoal(needs: InternalNeedState[], status: ReturnType<typeof getBackgroundCognitionStatus>): Goal {
    const topNeed = needs[0];

    if (!status.isRunning) {
      return {
        need: "system_optimization",
        description: "恢复后台认知循环并验证运行状态",
        priority: 100,
      };
    }

    if (topNeed.key === "environment_exploration") {
      return {
        need: topNeed.key,
        description: "执行环境探索，扫描系统健康、资源压力与潜在优化入口",
        priority: topNeed.level,
      };
    }

    if (topNeed.key === "information_gap") {
      return {
        need: topNeed.key,
        description: "执行诊断并获取最新系统信息，缩小信息不足",
        priority: topNeed.level,
      };
    }

    if (topNeed.key === "knowledge_gap") {
      return {
        need: topNeed.key,
        description: "运行自诊断并记录问题，补齐知识缺口",
        priority: topNeed.level,
      };
    }

    if (topNeed.key === "relationship_maintenance") {
      return {
        need: topNeed.key,
        description: "生成关系维护提醒，保障持续互动",
        priority: topNeed.level,
      };
    }

    return {
      need: "system_optimization",
      description: "执行系统优化与健康检查",
      priority: topNeed.level,
    };
  }

  private async executeAction(goal: Goal): Promise<{ decision: string; tool: string; notes: string }> {
    if (goal.need === "system_optimization") {
      await startBackgroundCognition();
      return {
        decision: "recover_background_cognition",
        tool: "startBackgroundCognition",
        notes: "已执行后台认知恢复动作。",
      };
    }

    const report = getSelfDiagnostics().runDiagnostic();
    const diagnosticNote = `health=${report.overallHealth},issues=${report.issues.length}`;

    if (goal.need === "environment_exploration") {
      return {
        decision: "explore_runtime_environment",
        tool: "selfDiagnostics",
        notes: `已完成环境探索扫描: ${diagnosticNote}`,
      };
    }

    if (goal.need === "relationship_maintenance") {
      return {
        decision: "maintain_relationship_signal",
        tool: "selfDiagnostics",
        notes: `已生成关系维护信号（基于诊断）: ${diagnosticNote}`,
      };
    }

    return {
      decision: "run_diagnostic_for_gap",
      tool: "selfDiagnostics",
      notes: `已完成缺口扫描: ${diagnosticNote}`,
    };
  }

  private optimizeStrategy(toolOutput: string): AgentStrategy {
    const healthMatch = toolOutput.match(/health=(\d+)/);
    const health = healthMatch ? Number(healthMatch[1]) : null;

    if (health !== null) {
      if (health < 60) return "recovery_first";
      if (health > 85) return "throughput_first";
    }

    if (toolOutput.includes("恢复") || toolOutput.includes("startBackgroundCognition")) {
      return "recovery_first";
    }

    return "stability_first";
  }

  private computeReward(goal: Goal, actionNotes: string): number {
    let reward = 0;

    if (actionNotes.includes("health=")) {
      const m = actionNotes.match(/health=(\d+)/);
      const health = m ? Number(m[1]) : 0;
      reward += health / 25; // 0~4
    }

    if (goal.need === "environment_exploration") reward += 1.2;
    if (goal.need === "system_optimization") reward += 1.5;
    if (actionNotes.includes("issues=0")) reward += 1;

    return Number(reward.toFixed(2));
  }

  private updateLongTermReward(reward: number) {
    this.longTermReward.episodeCount += 1;
    this.longTermReward.lastReward = reward;
    this.longTermReward.bestReward = Math.max(this.longTermReward.bestReward, reward);

    const n = this.longTermReward.episodeCount;
    this.longTermReward.averageReward = Number(
      (((this.longTermReward.averageReward * (n - 1)) + reward) / n).toFixed(3),
    );

    this.longTermReward.discountedReturn = Number(
      (this.longTermReward.gamma * this.longTermReward.discountedReturn + reward).toFixed(3),
    );
  }

  private updateMemory(goal: Goal, notes: string, reward: number) {
    const snapshot: AgentMemorySnapshot = {
      timestamp: new Date().toISOString(),
      dominantNeed: NEED_LABELS[goal.need],
      strategy: this.strategy,
      summary: `${goal.description} | reward=${reward} | ${notes}`,
    };

    this.memorySnapshots.unshift(snapshot);
    if (this.memorySnapshots.length > 50) {
      this.memorySnapshots.length = 50;
    }

    this.internalNeeds[goal.need].level = Math.max(10, this.internalNeeds[goal.need].level - 18);
    this.internalNeeds[goal.need].rationale = `最近已执行目标：${goal.description}`;
  }

  async runCycle(): Promise<AgentCycleResult> {
    const strategyBefore = this.strategy;

    const perceived = this.perceiveState();
    const goal = this.generateGoal(perceived.needs, perceived.status);
    const action = await this.executeAction(goal);
    this.strategy = this.optimizeStrategy(action.notes);

    const reward = this.computeReward(goal, action.notes);
    this.updateLongTermReward(reward);
    this.updateMemory(goal, action.notes, reward);

    const result: AgentCycleResult = {
      timestamp: new Date().toISOString(),
      phase: "update_memory",
      decision: action.decision,
      goal: goal.description,
      toolCalled: action.tool,
      strategyBefore,
      strategyAfter: this.strategy,
      reward,
      notes: [
        "循环步骤: 感知状态 → 生成目标 → 执行动作 → 更新记忆",
        `主导需求: ${NEED_LABELS[goal.need]}(priority=${goal.priority})`,
        `长期奖励累计: G=${this.longTermReward.discountedReturn}, avg=${this.longTermReward.averageReward}`,
        action.notes,
      ].join(" | "),
    };

    this.cycleHistory.unshift(result);
    if (this.cycleHistory.length > 50) {
      this.cycleHistory.length = 50;
    }

    return result;
  }

  startAutoMode(intervalMs = 60_000) {
    if (this.intervalHandle) return;
    this.isRunning = true;

    this.intervalHandle = setInterval(() => {
      this.runCycle().catch((error) => {
        console.error("[AutonomousAgentOrchestrator] Auto cycle error:", error);
      });
    }, intervalMs);
  }

  stopAutoMode() {
    this.isRunning = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      strategy: this.strategy,
      capabilities: ["自己决定做什么", "自己调用工具", "自己优化策略"],
      internalNeeds: Object.values(this.internalNeeds).sort((a, b) => b.level - a.level),
      longTermReward: this.longTermReward,
      recentCycles: this.cycleHistory.slice(0, 10),
      memorySnapshots: this.memorySnapshots.slice(0, 10),
      loopDefinition: ["感知状态", "生成目标", "执行动作", "更新记忆"],
    };
  }
}

let singleton: AutonomousAgentOrchestrator | null = null;

export function getAutonomousAgentOrchestrator() {
  if (!singleton) {
    singleton = new AutonomousAgentOrchestrator();
  }
  return singleton;
}
