/**
 * Autonomous Background Loop
 * Allows Nova-Mind to continuously self-evaluate and self-optimize in the background
 */

import { getSelfDiagnostics } from "./selfDiagnostics";
import { getAutonomousOptimizer } from "./autonomousOptimizer";
import { getCodeModificationManager } from "./codeModificationManager";
import { getPressureAwarenessEngine } from "../evolution/pressureAwarenessEngine";
import { getAutonomousOptimizationEngine } from "../evolution/autonomousOptimizationEngine";
import { getCodeModificationEngine } from "../evolution/codeModificationEngine";
import { getCodeModificationExecutor } from "../evolution/codeModificationExecutor";
import { getCodeSafetyChecker } from "../evolution/codeSafetyChecker";
import { GenomeManager } from "../evolution/genomeManager";
import { EvolutionEvaluator } from "../evolution/evolutionEvaluator";
import { MutationProposer } from "../evolution/mutationProposer";
import { EvolutionEngine } from "../evolution/evolutionEngine";
import { getPressureDrivenOptimizationFlow } from "./pressureDrivenOptimization";

interface LoopConfig {
  enabled: boolean;
  diagnosticInterval: number; // ms
  optimizationInterval: number; // ms
  autoExecuteThreshold: number; // health score threshold for auto-execution
  maxConcurrentActions: number;
  codeOptimizationEnabled: boolean; // 是否启用自动代码优化
  codeOptimizationInterval: number; // 代码优化检查间隔 (ms)
  pressureThresholdForCodeOptimization: number; // 触发代码优化的压力阈值 (0-100)
  autoExecuteCodeModifications: boolean; // 是否自动执行代码修改
}

class AutonomousBackgroundLoop {
  private config: LoopConfig = {
    enabled: true, // Default to enabled
    diagnosticInterval: 60000, // 1 minute
    optimizationInterval: 300000, // 5 minutes
    autoExecuteThreshold: 60, // Auto-execute when health < 60
    maxConcurrentActions: 2,
    codeOptimizationEnabled: true, // 启用自动代码优化
    codeOptimizationInterval: 600000, // 10 分钟检查一次
    pressureThresholdForCodeOptimization: 70, // 压力 >= 70 时触发代码优化
    autoExecuteCodeModifications: true, // 自动执行代码修改
  };

  private lastDiagnosticTime = 0;
  private lastOptimizationTime = 0;
  private lastCodeOptimizationTime = 0;
  private loopInterval: NodeJS.Timeout | null = null;
  private loopStats = {
    diagnosticsRun: 0,
    optimizationsPerformed: 0,
    actionsExecuted: 0,
    totalIterations: 0,
    codeOptimizationCycles: 0,
    codeModificationsExecuted: 0,
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

      // Run code optimization if enabled and interval has passed
      if (this.config.codeOptimizationEnabled && now - this.lastCodeOptimizationTime > this.config.codeOptimizationInterval) {
        await this.executePressureDrivenOptimization();
        this.lastCodeOptimizationTime = now;
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

    // Check real environmental pressure
    const pressureEngine = getPressureAwarenessEngine();
    const pressureResponse = pressureEngine.detectPressure();
    
    console.log(`[AutonomousBackgroundLoop] Pressure Level: ${pressureResponse.pressureLevel}/100`);
    console.log(`[AutonomousBackgroundLoop] Urgency: ${pressureResponse.urgency}`);
    
    // If health is critical or pressure is high, trigger immediate optimization
    if (report.overallHealth < this.config.autoExecuteThreshold || pressureResponse.urgency === 'critical' || pressureResponse.urgency === 'high') {
      console.log(
        "[AutonomousBackgroundLoop] Health is critical or pressure is high, triggering immediate optimization"
      );
      await this.runOptimization();
    }
  }

  /**
   * 执行压力驱动的优化流程
   * 完整的压力检测、优化规划、代码修改和执行流程
   */
  private async executePressureDrivenOptimization(): Promise<void> {
    try {
      const pressureEngine = getPressureAwarenessEngine();
      const pressureResponse = pressureEngine.detectPressure();

      console.log(`[AutonomousBackgroundLoop] Pressure-Driven Optimization Check - Pressure: ${pressureResponse.pressureLevel}/100`);

      // 只有当压力达到阈值时才触发优化流程
      if (pressureResponse.pressureLevel >= this.config.pressureThresholdForCodeOptimization) {
        console.log(
          `[AutonomousBackgroundLoop] Pressure ${pressureResponse.pressureLevel} >= ${this.config.pressureThresholdForCodeOptimization}, executing pressure-driven optimization flow`
        );
        
        // 使用压力驱动优化流程
        const optimizationFlow = getPressureDrivenOptimizationFlow();
        const flowResult = await optimizationFlow.executeOptimizationFlow();
        
        // 更新统计数据
        this.loopStats.codeOptimizationCycles++;
        this.loopStats.codeModificationsExecuted += flowResult.codeModificationsExecuted;
        
        console.log(`[AutonomousBackgroundLoop] Pressure-Driven Optimization Flow completed`);
        console.log(`  Flow ID: ${flowResult.flowId}`);
        console.log(`  Status: ${flowResult.status}`);
        console.log(`  Code Modifications Executed: ${flowResult.codeModificationsExecuted}/${flowResult.totalModificationsProposed}`);
        console.log(`  Successful: ${flowResult.successfulModifications}, Failed: ${flowResult.failedModifications}`);
        
        // 记录详细信息
        for (const detail of flowResult.details) {
          console.log(`    - ${detail}`);
        }
      }
    } catch (error) {
      console.error("[AutonomousBackgroundLoop] Error in pressure-driven optimization:", error);
    }
  }

  /**
   * 运行代码优化循环 (已弃用，使用 executePressureDrivenOptimization 替代)
   * 基于压力生成和执行代码修改
   */
  private async runCodeOptimization(): Promise<void> {
    try {
      this.loopStats.codeOptimizationCycles++;

      console.log(
        `[AutonomousBackgroundLoop] Code Optimization Cycle #${this.loopStats.codeOptimizationCycles}`
      );

      // 1. 获取压力信息
      const pressureEngine = getPressureAwarenessEngine();
      const pressureResponse = pressureEngine.detectPressure();

      // 2. 使用代码修改引擎生成优化建议
      const codeModificationEngine = getCodeModificationEngine();
      const diagnostics = getSelfDiagnostics();
      const latestReport = diagnostics.getLatestReport();

      if (!latestReport) {
        console.log("[AutonomousBackgroundLoop] No diagnostic report available");
        return;
      }

      console.log(`[AutonomousBackgroundLoop] Generating code modification proposals...`);
      
      const systemMetrics: Record<string, number> = {};
      if (latestReport.metrics) {
        for (const metric of latestReport.metrics) {
          systemMetrics[metric.name] = metric.value;
        }
      }

      const modificationContext = {
        pressureLevel: pressureResponse.pressureLevel,
        pressureType: this.getPressureType(pressureResponse.triggers),
        systemMetrics,
        diagnosticResults: JSON.stringify(latestReport),
      };

      const proposal = await codeModificationEngine.generateModificationProposal(
        modificationContext
      );

      if (!proposal) {
        console.log("[AutonomousBackgroundLoop] No code modification proposal generated");
        return;
      }

      console.log(`[AutonomousBackgroundLoop] Generated code modification proposal: ${proposal.id}`);

      // 3. 对提议进行安全检查
      const safetyChecker = getCodeSafetyChecker();
      const executor = getCodeModificationExecutor();

      try {
        console.log(`[AutonomousBackgroundLoop] Checking safety for proposal: ${proposal.id}`);
        const safetyResult = await safetyChecker.checkCodeModification(
          proposal.filePath,
          proposal.originalCode,
          proposal.modifiedCode,
          proposal.description
        );

          if (safetyResult.riskLevel === 'critical' || safetyResult.riskLevel === 'high') {
            console.log(
              `[AutonomousBackgroundLoop] Proposal ${proposal.id} failed safety check (${safetyResult.riskLevel} risk): ${safetyResult.issues.map(i => i.description).join(", ")}`
            );
            return;
          }

          console.log(`[AutonomousBackgroundLoop] Proposal ${proposal.id} passed safety check`);

          // 4. 如果启用了自动执行，执行代码修改
          if (this.config.autoExecuteCodeModifications) {
            console.log(`[AutonomousBackgroundLoop] Executing code modification: ${proposal.id}`);
            const executionResult = await executor.executeModification(proposal);

            if (executionResult.success) {
              this.loopStats.codeModificationsExecuted++;
              console.log(
                `[AutonomousBackgroundLoop] Successfully executed code modification: ${proposal.id}`
              );
              console.log(`  File: ${executionResult.filePath}`);
              if (executionResult.metrics) {
                console.log(`  Execution time: ${executionResult.metrics.executionTime}ms`);
                console.log(
                  `  File size change: ${executionResult.metrics.fileSize.before} -> ${executionResult.metrics.fileSize.after} bytes`
                );
              }
            } else {
              console.error(
                `[AutonomousBackgroundLoop] Failed to execute code modification: ${proposal.id}`
              );
              console.error(`  Error: ${executionResult.error}`);
            }
          } else {
            console.log(
              `[AutonomousBackgroundLoop] Auto-execution disabled, proposal ${proposal.id} not executed`
            );
          }
      } catch (error) {
        console.error(
          `[AutonomousBackgroundLoop] Error processing proposal ${proposal.id}:`,
          error
        );
      }

      console.log(
        `[AutonomousBackgroundLoop] Code optimization cycle completed. Total modifications executed: ${this.loopStats.codeModificationsExecuted}`
      );
    } catch (error) {
      console.error("[AutonomousBackgroundLoop] Error in code optimization:", error);
    }
  }

  /**
   * 从压力触发器确定压力类型
   */
  private getPressureType(triggers: any[]): 'memory' | 'cpu' | 'api-cost' | 'latency' | 'error-rate' {
    if (triggers.some(t => t.type?.includes('memory'))) return 'memory';
    if (triggers.some(t => t.type?.includes('cpu'))) return 'cpu';
    if (triggers.some(t => t.type?.includes('api'))) return 'api-cost';
    if (triggers.some(t => t.type?.includes('latency'))) return 'latency';
    return 'error-rate';
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

    // Generate optimization plan based on real pressure
    const optimizationEngine = getAutonomousOptimizationEngine();
    const plan = await optimizationEngine.generateOptimizationPlan();
    
    console.log(`[AutonomousBackgroundLoop] Generated Optimization Plan: ${plan.id}`);
    console.log(`  Pressure Level: ${plan.pressureLevel}/100`);
    console.log(`  Urgency: ${plan.urgency}`);
    console.log(`  Actions: ${plan.actions.length}`);
    
    // Execute optimization plan
    console.log(`[AutonomousBackgroundLoop] Executing optimization plan...`);
    const executedPlan = await optimizationEngine.executePlan(plan);
    console.log(`[AutonomousBackgroundLoop] Plan execution completed`);
    console.log(`  Status: ${executedPlan.status}`);
    console.log(`  Execution Records: ${executedPlan.executionHistory.length}`);

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
      lastCodeOptimizationTime: this.lastCodeOptimizationTime,
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
