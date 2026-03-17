import { getBackgroundCognitionStatus, startBackgroundCognition } from "../backgroundCognitionOptimized";
import { getSelfDiagnostics } from "../autonomy/selfDiagnostics";

export type AgentStrategy = "stability_first" | "recovery_first" | "throughput_first";

interface AgentCycleResult {
  timestamp: string;
  decision: string;
  toolCalled: string;
  strategyBefore: AgentStrategy;
  strategyAfter: AgentStrategy;
  notes: string;
}

class AutonomousAgentOrchestrator {
  private strategy: AgentStrategy = "stability_first";
  private isRunning = false;
  private intervalHandle: NodeJS.Timeout | null = null;
  private readonly cycleHistory: AgentCycleResult[] = [];

  private decideAction() {
    const bgStatus = getBackgroundCognitionStatus();

    if (!bgStatus.isRunning) {
      return {
        decision: "background_cognition_stopped",
        tool: "start_background_cognition",
        notes: "后台认知进程已停止，优先恢复运行能力。",
      };
    }

    return {
      decision: "system_running",
      tool: "run_self_diagnostic",
      notes: "系统运行中，执行诊断并评估是否需要调整策略。",
    };
  }

  private async callTool(tool: string): Promise<{ notes: string }> {
    if (tool === "start_background_cognition") {
      await startBackgroundCognition();
      return { notes: "已调用 startBackgroundCognition()，后台认知进程应已启动。" };
    }

    if (tool === "run_self_diagnostic") {
      const report = getSelfDiagnostics().runDiagnostic();
      return {
        notes: `诊断完成：health=${report.overallHealth}，issues=${report.issues.length}`,
      };
    }

    return { notes: "未识别工具，跳过执行。" };
  }

  private optimizeStrategy(toolOutput: string): AgentStrategy {
    const lower = toolOutput.toLowerCase();
    if (lower.includes("health=") && /health=(\d+)/.test(lower)) {
      const health = Number((lower.match(/health=(\d+)/) || [])[1] || 0);
      if (health < 60) return "recovery_first";
      if (health > 85) return "throughput_first";
    }

    if (lower.includes("停止") || lower.includes("启动")) {
      return "recovery_first";
    }

    return "stability_first";
  }

  async runCycle(): Promise<AgentCycleResult> {
    const strategyBefore = this.strategy;
    const planned = this.decideAction();
    const toolOutput = await this.callTool(planned.tool);
    this.strategy = this.optimizeStrategy(toolOutput.notes);

    const result: AgentCycleResult = {
      timestamp: new Date().toISOString(),
      decision: planned.decision,
      toolCalled: planned.tool,
      strategyBefore,
      strategyAfter: this.strategy,
      notes: `${planned.notes} ${toolOutput.notes}`,
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
      recentCycles: this.cycleHistory.slice(0, 10),
      capabilities: [
        "自己决定做什么",
        "自己调用工具",
        "自己优化策略",
      ],
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
