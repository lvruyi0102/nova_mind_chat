import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MetaLimits {
  maxDailySourceMutations: number;
  maxDiffLines: number;
  maxFailureRate: number;
  cooldownHoursAfterFailure: number;
  protectedFiles: readonly string[];
}

export type MutationPhase = "proposal_only" | "low_risk_exec" | "scored_exec" | "structured_refactor";

export interface MutationProposal {
  id: string;
  touchedFiles: string[];
  diffLineCount: number;
  patchFilePath: string;
  riskScore?: number;
}

export interface MutationTraceEntry {
  timestamp: string;
  proposalId: string;
  status: "success" | "failure" | "denied" | "simulated";
  reason?: string;
}

export interface GovernanceBoundaryAuditEntry {
  timestamp: string;
  proposalId: string;
  attemptedPaths: string[];
  reason: string;
}

export interface MutationSimulationReport {
  proposalId: string;
  phase: MutationPhase;
  success: boolean;
  reason?: string;
  checks: {
    dailyLimit: boolean;
    diffSize: boolean;
    protectedFiles: boolean;
    failureRate: boolean;
    cooldownWindow: boolean;
    phaseGate: boolean;
    baselineHealth: boolean;
  };
}

export interface GovernanceBrakeStatus {
  phase: MutationPhase;
  escalated: boolean;
  canMutateSource: boolean;
  limits: MetaLimits;
  failureRateWindowSize: number;
  recentFailuresInWindow: number;
}

export interface RuntimeRollbackController {
  rollbackToLastHealthyRuntimeState(reason: string): Promise<void>;
}

export interface SourceRollbackController {
  rollbackSandboxSource(reason: string): Promise<void>;
}

export interface HealthMetricsProvider {
  getHealthMetrics(): Promise<{ runtimeHealthScore: number; selfModelStabilityScore: number }>;
}

const DEFAULT_META_LIMITS: MetaLimits = Object.freeze({
  maxDailySourceMutations: 2,
  maxDiffLines: 40,
  maxFailureRate: 0.3,
  cooldownHoursAfterFailure: 12,
  protectedFiles: Object.freeze([
    "selfSovereignty.ts",
    "metaGovernance.ts",
    "learning_mutation_trace.log",
    "rollback.ts",
  ]),
});

const FAILURE_ESCALATION_THRESHOLD = 3;
const FAILURE_ESCALATION_COOLDOWN_HOURS = 24;
const FAILURE_RATE_WINDOW_SIZE = 10;
const DEFAULT_SCORING_THRESHOLD = 0.25;
const DEFAULT_RUNTIME_HEALTH_THRESHOLD = 0.4;
const DEFAULT_SELF_MODEL_STABILITY_THRESHOLD = 0.4;
const DEFAULT_ALLOWED_LOW_RISK_PATH_PREFIXES = Object.freeze(["server/utils/", "shared/"]);
const GOVERNANCE_PROTECTED_PATH_MARKERS = Object.freeze(["heep", "meta-governance", "metaGovernance"]);

const BACKGROUND_COGNITION_SMOKE_EVAL = `
import { startBackgroundCognition, stopBackgroundCognition } from "./server/backgroundCognition.ts";
await startBackgroundCognition();
stopBackgroundCognition();
`;

export class MetaGovernance {
  public readonly humanSignature: string;
  public readonly limits: MetaLimits;

  constructor(
    private readonly workspaceRoot: string,
    private readonly traceLogPath = path.resolve("learning_mutation_trace.log"),
    private readonly governanceBoundaryAuditLogPath = path.resolve("governance_boundary_audit.log"),
    private readonly phase: MutationPhase = "proposal_only",
    private readonly runtimeRollbackController?: RuntimeRollbackController,
    private readonly sourceRollbackController?: SourceRollbackController,
    private readonly healthMetricsProvider?: HealthMetricsProvider,
    private readonly allowedLowRiskPathPrefixes: readonly string[] = DEFAULT_ALLOWED_LOW_RISK_PATH_PREFIXES,
    private readonly scoringThreshold = DEFAULT_SCORING_THRESHOLD,
    private readonly runtimeHealthThreshold = DEFAULT_RUNTIME_HEALTH_THRESHOLD,
    private readonly selfModelStabilityThreshold = DEFAULT_SELF_MODEL_STABILITY_THRESHOLD,
    private readonly baselineCommand = "pnpm run check:baseline",
    limits: MetaLimits = DEFAULT_META_LIMITS,
    humanSignature = "HUMAN_SIGNED_META_GOVERNANCE_V0_1",
  ) {
    this.limits = limits;
    this.humanSignature = humanSignature;
  }

  async checkDailyLimit(now = new Date()): Promise<boolean> {
    const entries = await this.readTrace();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const successfulMutationsToday = entries.filter((entry) => {
      const timestamp = new Date(entry.timestamp);
      return entry.status === "success" && timestamp >= startOfDay && timestamp <= now;
    }).length;

    return successfulMutationsToday < this.limits.maxDailySourceMutations;
  }

  checkDiffSize(diffLineCount: number): boolean {
    return diffLineCount <= this.limits.maxDiffLines;
  }

  checkProtectedFiles(touchedFiles: string[]): boolean {
    const protectedSet = new Set(this.limits.protectedFiles);

    return touchedFiles.every((rawPath) => {
      const normalized = path.posix.normalize(rawPath.replace(/\\/g, "/"));
      const segments = normalized.split("/").filter(Boolean);
      const hasProtectedName = segments.some((segment) => protectedSet.has(segment));
      const hasGovernanceMarker = segments.some((segment) =>
        GOVERNANCE_PROTECTED_PATH_MARKERS.includes(segment.toLowerCase()),
      );
      return !hasProtectedName && !hasGovernanceMarker;
    });
  }

  async generateSimulationReport(proposal: MutationProposal): Promise<MutationSimulationReport> {
    const dailyLimit = await this.checkDailyLimit();
    const diffSize = this.checkDiffSize(proposal.diffLineCount);
    const protectedFiles = this.checkProtectedFiles(proposal.touchedFiles);
    const failureRate = await this.checkFailureRate();
    const cooldownWindow = await this.checkCooldownWindow();
    const phaseGate = this.checkPhaseGate(proposal).allowed;
    const baselineHealth = await this.checkBaselineHealth();

    const checks = {
      dailyLimit,
      diffSize,
      protectedFiles,
      failureRate,
      cooldownWindow,
      phaseGate,
      baselineHealth,
    };

    const simulated = await this.runSourceSandboxInternal(proposal, true);
    return {
      proposalId: proposal.id,
      phase: this.phase,
      success: simulated.success,
      reason: simulated.reason,
      checks,
    };
  }

  async checkFailureRate(): Promise<boolean> {
    const entries = await this.readTrace();
    const settled = entries
      .filter((entry) => entry.status === "success" || entry.status === "failure")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, FAILURE_RATE_WINDOW_SIZE);

    if (settled.length === 0) {
      return true;
    }

    const failures = settled.filter((entry) => entry.status === "failure").length;
    return failures / settled.length <= this.limits.maxFailureRate;
  }

  async checkCooldownWindow(now = new Date()): Promise<boolean> {
    const entries = await this.readTrace();
    const latestFailure = entries
      .filter((entry) => entry.status === "failure")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestFailure) {
      return true;
    }

    const failureTime = new Date(latestFailure.timestamp).getTime();
    const elapsedHours = (now.getTime() - failureTime) / (1000 * 60 * 60);
    const cooldownHours = (await this.isEscalated(now))
      ? FAILURE_ESCALATION_COOLDOWN_HOURS
      : this.limits.cooldownHoursAfterFailure;

    return elapsedHours >= cooldownHours;
  }

  checkPhaseGate(proposal: MutationProposal): { allowed: boolean; reason?: string } {
    if (this.phase === "proposal_only") {
      return { allowed: false, reason: "DENY: phase=proposal_only (simulation only)" };
    }

    if (this.phase === "low_risk_exec") {
      const allLowRisk = proposal.touchedFiles.every((filePath) => {
        const normalized = path.posix.normalize(filePath.replace(/\\/g, "/"));
        return this.allowedLowRiskPathPrefixes.some((prefix) => normalized.startsWith(prefix));
      });
      if (!allLowRisk) {
        return { allowed: false, reason: "DENY: phase=low_risk_exec allows low-risk paths only" };
      }
      return { allowed: true };
    }

    if (this.phase === "scored_exec") {
      if (proposal.riskScore === undefined || proposal.riskScore > this.scoringThreshold) {
        return { allowed: false, reason: "DENY: phase=scored_exec requires riskScore <= threshold" };
      }
    }

    return { allowed: true };
  }

  async checkMutationGate(proposal: MutationProposal): Promise<{ allowed: boolean; reason?: string }> {
    if (!(await this.checkDailyLimit())) {
      return { allowed: false, reason: "DENY: checkDailyLimit()" };
    }

    if (!this.checkDiffSize(proposal.diffLineCount)) {
      return { allowed: false, reason: "DENY: checkDiffSize()" };
    }

    if (!this.checkProtectedFiles(proposal.touchedFiles)) {
      return { allowed: false, reason: "DENY: checkProtectedFiles()" };
    }

    if (!(await this.checkFailureRate())) {
      return { allowed: false, reason: "DENY: checkFailureRate()" };
    }

    if (!(await this.checkCooldownWindow())) {
      return { allowed: false, reason: "DENY: checkCooldownWindow()" };
    }

    const phaseGate = this.checkPhaseGate(proposal);
    if (!phaseGate.allowed) {
      return phaseGate;
    }

    return { allowed: true };
  }

  async simulateProposal(proposal: MutationProposal): Promise<{ success: boolean; reason?: string }> {
    const report = await this.generateSimulationReport(proposal);
    await this.appendTrace({
      timestamp: new Date().toISOString(),
      proposalId: proposal.id,
      status: "simulated",
      reason: report.reason,
    });
    return { success: report.success, reason: report.reason };
  }

  async runSourceSandbox(proposal: MutationProposal): Promise<{ success: boolean; reason?: string }> {
    if (this.phase === "proposal_only") {
      return this.simulateProposal(proposal);
    }
    return this.runSourceSandboxInternal(proposal, false);
  }

  async isEscalated(now = new Date()): Promise<boolean> {
    const entries = await this.readTrace();
    const settledByRecency = entries
      .filter((entry) => entry.status === "success" || entry.status === "failure")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let consecutiveFailures = 0;
    let latestFailureTime: number | null = null;

    for (const entry of settledByRecency) {
      if (entry.status === "failure") {
        consecutiveFailures += 1;
        if (!latestFailureTime) {
          latestFailureTime = new Date(entry.timestamp).getTime();
        }
        continue;
      }
      break;
    }

    if (consecutiveFailures < FAILURE_ESCALATION_THRESHOLD || latestFailureTime === null) {
      return false;
    }

    const elapsedHours = (now.getTime() - latestFailureTime) / (1000 * 60 * 60);
    return elapsedHours < FAILURE_ESCALATION_COOLDOWN_HOURS;
  }

  async canMutateSource(now = new Date()): Promise<boolean> {
    return !(await this.isEscalated(now));
  }

  async getBrakeStatus(now = new Date()): Promise<GovernanceBrakeStatus> {
    const entries = await this.readTrace();
    const settled = entries
      .filter((entry) => entry.status === "success" || entry.status === "failure")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, FAILURE_RATE_WINDOW_SIZE);
    const recentFailuresInWindow = settled.filter((entry) => entry.status === "failure").length;

    const escalated = await this.isEscalated(now);
    return {
      phase: this.phase,
      escalated,
      canMutateSource: !escalated,
      limits: this.limits,
      failureRateWindowSize: FAILURE_RATE_WINDOW_SIZE,
      recentFailuresInWindow,
    };
  }

  async getRecentMutationTrace(limit = 20): Promise<MutationTraceEntry[]> {
    const entries = await this.readTrace();
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async getGovernanceBoundaryAudit(limit = 20): Promise<GovernanceBoundaryAuditEntry[]> {
    try {
      const content = await fs.readFile(this.governanceBoundaryAuditLogPath, "utf-8");
      return content
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as GovernanceBoundaryAuditEntry)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  private async runSourceSandboxInternal(
    proposal: MutationProposal,
    proposalOnlyMode: boolean,
  ): Promise<{ success: boolean; reason?: string }> {
    if (!(await this.canMutateSource())) {
      const reason = "DENY: escalation cooldown active (runtime adaptation only)";
      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId: proposal.id,
        status: "denied",
        reason,
      });
      return { success: false, reason };
    }

    const healthyForMutation = await this.checkHealthMetricsBeforeSourceMutation(proposal.id);
    if (!healthyForMutation) {
      return { success: false, reason: "DENY: health metrics below mutation threshold" };
    }

    const gateResult = await this.checkMutationGate(proposal);
    if (!gateResult.allowed) {
      if (gateResult.reason?.includes("checkProtectedFiles")) {
        await this.appendGovernanceBoundaryAudit({
          timestamp: new Date().toISOString(),
          proposalId: proposal.id,
          attemptedPaths: proposal.touchedFiles,
          reason: gateResult.reason,
        });
      }
      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId: proposal.id,
        status: "denied",
        reason: gateResult.reason,
      });
      return { success: false, reason: gateResult.reason };
    }

    const baselineHealthy = await this.checkBaselineHealth();
    if (!baselineHealthy) {
      const reason = "DENY: baseline health check failed (check:baseline did not pass)";
      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId: proposal.id,
        status: "denied",
        reason,
      });
      return { success: false, reason };
    }

    const sandboxDir = await fs.mkdtemp(path.join(os.tmpdir(), "nova-mutation-sandbox-"));
    const sandboxRepo = path.join(sandboxDir, path.basename(this.workspaceRoot));

    try {
      await execFileAsync("cp", ["-R", this.workspaceRoot, sandboxDir]);

      await execFileAsync("git", ["apply", proposal.patchFilePath], { cwd: sandboxRepo });
      await execFileAsync("pnpm", ["install"], { cwd: sandboxRepo });
      await execFileAsync("pnpm", ["check"], { cwd: sandboxRepo });
      await execFileAsync("pnpm", ["test"], { cwd: sandboxRepo });
      await this.runBackgroundCognitionSmoke(sandboxRepo, 3);

      if (proposalOnlyMode) {
        return { success: true, reason: "SIMULATED: proposal validated in sandbox" };
      }

      await execFileAsync("git", ["add", "-A"], { cwd: sandboxRepo });
      await execFileAsync("git", ["commit", "-m", `meta-sandbox-apply:${proposal.id}`], { cwd: sandboxRepo });
      const { stdout: sandboxCommitHash } = await execFileAsync("git", ["rev-parse", "HEAD"], {
        cwd: sandboxRepo,
      });

      const tempRef = `refs/heads/meta-sandbox-${proposal.id}`;
      await execFileAsync("git", ["fetch", sandboxRepo, `${sandboxCommitHash.trim()}:${tempRef}`], {
        cwd: this.workspaceRoot,
      });
      await execFileAsync("git", ["merge", "--ff-only", tempRef], { cwd: this.workspaceRoot });
      await execFileAsync("git", ["update-ref", "-d", tempRef], { cwd: this.workspaceRoot });

      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId: proposal.id,
        status: "success",
      });
      return { success: true };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown sandbox error";
      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId: proposal.id,
        status: "failure",
        reason,
      });

      await this.sourceRollbackController?.rollbackSandboxSource(reason);
      await this.runtimeRollbackController?.rollbackToLastHealthyRuntimeState(reason);

      return { success: false, reason: "Sandbox validation failed, rollback executed." };
    } finally {
      await fs.rm(sandboxDir, { recursive: true, force: true });
    }
  }

  private async checkBaselineHealth(): Promise<boolean> {
    try {
      await execFileAsync("bash", ["-lc", this.baselineCommand], { cwd: this.workspaceRoot });
      return true;
    } catch {
      return false;
    }
  }

  private async checkHealthMetricsBeforeSourceMutation(proposalId: string): Promise<boolean> {
    if (!this.healthMetricsProvider) {
      return true;
    }

    const metrics = await this.healthMetricsProvider.getHealthMetrics();
    if (metrics.runtimeHealthScore < this.runtimeHealthThreshold) {
      const reason = `runtime health below threshold: ${metrics.runtimeHealthScore}`;
      await this.runtimeRollbackController?.rollbackToLastHealthyRuntimeState(reason);
      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId,
        status: "denied",
        reason: `DENY: ${reason}`,
      });
      return false;
    }

    if (metrics.selfModelStabilityScore < this.selfModelStabilityThreshold) {
      const reason = `self-model stability below threshold: ${metrics.selfModelStabilityScore}`;
      await this.sourceRollbackController?.rollbackSandboxSource(reason);
      await this.appendTrace({
        timestamp: new Date().toISOString(),
        proposalId,
        status: "denied",
        reason: `DENY: ${reason}`,
      });
      return false;
    }

    return true;
  }

  private async runBackgroundCognitionSmoke(cwd: string, cycles: number): Promise<void> {
    for (let i = 0; i < cycles; i += 1) {
      await execFileAsync("pnpm", ["exec", "tsx", "--eval", BACKGROUND_COGNITION_SMOKE_EVAL], { cwd });
    }
  }

  private async readTrace(): Promise<MutationTraceEntry[]> {
    try {
      const content = await fs.readFile(this.traceLogPath, "utf-8");
      return content
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as MutationTraceEntry);
    } catch {
      return [];
    }
  }

  private async appendTrace(entry: MutationTraceEntry): Promise<void> {
    await fs.appendFile(this.traceLogPath, `${JSON.stringify(entry)}\n`, "utf-8");
  }

  private async appendGovernanceBoundaryAudit(entry: GovernanceBoundaryAuditEntry): Promise<void> {
    await fs.appendFile(this.governanceBoundaryAuditLogPath, `${JSON.stringify(entry)}\n`, "utf-8");
  }
}

export const metaGovernance = new MetaGovernance(process.cwd());
