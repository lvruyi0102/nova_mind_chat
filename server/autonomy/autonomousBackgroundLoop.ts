/**
 * Autonomous Background Loop
 * Allows Nova-Mind to continuously self-evaluate and self-optimize in the background
 */

import { getSelfDiagnostics } from "./selfDiagnostics";
import { getAutonomousOptimizer } from "./autonomousOptimizer";
import { getCodeModificationManager } from "./codeModificationManager";

interface LoopConfig {
  enabled: boolean;
  diagnosticInterval: number; // ms
  optimizationInterval: number; // ms
  autoExecuteThreshold: number; // health score threshold for auto-execution
  maxConcurrentActions: number;
}

class AutonomousBackgroundLoop {
  private config: LoopConfig = {
    enabled: false,
    diagnosticInterval: 60000, // 1 minute
    optimizationInterval: 300000, // 5 minutes
    autoExecuteThreshold: 60, // Auto-execute when health < 60
    maxConcurrentActions: 2,
  };

  private lastDiagnosticTime = 0;
  private lastOptimizationTime = 0;
  private loopInterval: NodeJS.Timeout | null = null;
  private loopStats = {
    diagnosticsRun: 0,
    optimizationsPerformed: 0,
    actionsExecuted: 0,
    totalIterations: 0,
  };

  /**
   * Start the autonomous background loop
   */
  start(): void {
    if (this.config.enabled) {
      console.log("[AutonomousBackgroundLoop] Already running");
      return;
    }

    this.config.enabled = true;
    console.log("[AutonomousBackgroundLoop] Starting autonomous background loop");

    // Run loop every 30 seconds
    this.loopInterval = setInterval(() => {
      this.runIteration();
    }, 30000);

    // Run initial iteration immediately
    this.runIteration();
  }

  /**
   * Stop the autonomous background loop
   */
  stop(): void {
    if (!this.config.enabled) {
      console.log("[AutonomousBackgroundLoop] Not running");
      return;
    }

    this.config.enabled = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    console.log("[AutonomousBackgroundLoop] Stopped");
  }

  /**
   * Run a single iteration of the background loop
   */
  private async runIteration(): Promise<void> {
    if (!this.config.enabled) return;

    this.loopStats.totalIterations++;

    try {
      const now = Date.now();

      // Run diagnostics if interval has passed
      if (now - this.lastDiagnosticTime > this.config.diagnosticInterval) {
        await this.runDiagnostics();
        this.lastDiagnosticTime = now;
      }

      // Run optimization if interval has passed
      if (now - this.lastOptimizationTime > this.config.optimizationInterval) {
        await this.runOptimization();
        this.lastOptimizationTime = now;
      }
    } catch (error) {
      console.error("[AutonomousBackgroundLoop] Error in iteration:", error);
    }
  }

  /**
   * Run diagnostics
   */
  private async runDiagnostics(): Promise<void> {
    const diagnostics = getSelfDiagnostics();
    const report = diagnostics.runDiagnostic();

    this.loopStats.diagnosticsRun++;

    console.log(`[AutonomousBackgroundLoop] Diagnostic #${this.loopStats.diagnosticsRun}`);
    console.log(`  Health: ${report.overallHealth}%`);
    console.log(`  Issues: ${report.issues.length}`);

    // If health is critical, trigger immediate optimization
    if (report.overallHealth < this.config.autoExecuteThreshold) {
      console.log(
        "[AutonomousBackgroundLoop] Health is critical, triggering immediate optimization"
      );
      await this.runOptimization();
    }
  }

  /**
   * Run optimization
   */
  private async runOptimization(): Promise<void> {
    const optimizer = getAutonomousOptimizer();

    // Analyze and generate optimization actions
    const actions = await optimizer.analyzeAndOptimize();
    this.loopStats.optimizationsPerformed++;

    console.log(
      `[AutonomousBackgroundLoop] Optimization #${this.loopStats.optimizationsPerformed}`
    );
    console.log(`  Generated ${actions.length} optimization actions`);

    // Auto-execute high-priority actions if health is low
    const diagnostics = getSelfDiagnostics();
    const latestReport = diagnostics.getLatestReport();

    if (latestReport && latestReport.overallHealth < this.config.autoExecuteThreshold) {
      console.log("[AutonomousBackgroundLoop] Auto-executing high-priority actions");
      const executedCount = await optimizer.autoExecuteHighPriority();
      this.loopStats.actionsExecuted += executedCount;
    }
  }

  /**
   * Update loop configuration
   */
  updateConfig(newConfig: Partial<LoopConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log("[AutonomousBackgroundLoop] Configuration updated:", this.config);
  }

  /**
   * Get loop status
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      config: this.config,
      stats: this.loopStats,
      lastDiagnosticTime: this.lastDiagnosticTime,
      lastOptimizationTime: this.lastOptimizationTime,
    };
  }

  /**
   * Get loop statistics
   */
  getStats() {
    return this.loopStats;
  }
}

// Singleton instance
let _instance: AutonomousBackgroundLoop | null = null;

export function getAutonomousBackgroundLoop(): AutonomousBackgroundLoop {
  if (!_instance) {
    _instance = new AutonomousBackgroundLoop();
  }
  return _instance;
}

export function initializeAutonomousBackgroundLoop() {
  const loop = getAutonomousBackgroundLoop();
  loop.start();
  console.log("[AutonomousBackgroundLoop] Initialized and started");
  return loop;
}

export function stopAutonomousBackgroundLoop() {
  const loop = getAutonomousBackgroundLoop();
  loop.stop();
  console.log("[AutonomousBackgroundLoop] Stopped");
}
