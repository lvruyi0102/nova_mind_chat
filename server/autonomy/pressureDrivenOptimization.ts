/**
 * Pressure-Driven Optimization Flow
 * 
 * 压力驱动的优化流程
 * 根据实时的环境压力自动触发代码优化和进化
 */

import { getPressureAwarenessEngine, PressureResponse } from '../evolution/pressureAwarenessEngine';
import { getAutonomousOptimizationEngine } from '../evolution/autonomousOptimizationEngine';
import { getCodeModificationEngine } from '../evolution/codeModificationEngine';
import { getCodeModificationExecutor } from '../evolution/codeModificationExecutor';
import { getCodeSafetyChecker } from '../evolution/codeSafetyChecker';
import { getSelfDiagnostics } from './selfDiagnostics';
import { getAutoOptimizationGuardrails } from './autoOptimizationGuardrails';

export interface OptimizationFlowResult {
  flowId: string;
  timestamp: number;
  pressureResponse: PressureResponse;
  optimizationPlanId?: string;
  codeModificationsExecuted: number;
  totalModificationsProposed: number;
  successfulModifications: number;
  failedModifications: number;
  status: 'completed' | 'partial' | 'failed';
  details: string[];
}

/**
 * 压力驱动优化流程管理器
 * 协调压力检测、优化规划、代码修改和执行
 */
export class PressureDrivenOptimizationFlow {
  private flowHistory: OptimizationFlowResult[] = [];
  private maxHistorySize = 100;
  private isRunning = false;

  /**
   * 执行完整的压力驱动优化流程
   */
  async executeOptimizationFlow(): Promise<OptimizationFlowResult> {
    const flowId = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const details: string[] = [];
    let successfulModifications = 0;
    let failedModifications = 0;

    const result: OptimizationFlowResult = {
      flowId,
      timestamp: Date.now(),
      pressureResponse: {} as PressureResponse,
      codeModificationsExecuted: 0,
      totalModificationsProposed: 0,
      successfulModifications: 0,
      failedModifications: 0,
      status: 'completed',
      details,
    };

    try {
      // 0. 检查安全卫士
      const guardrails = getAutoOptimizationGuardrails();
      const guardrailCheck = guardrails.checkAutoOptimizationSafety();

      if (!guardrailCheck.passed) {
        console.log('[PressureDrivenOptimization] Guardrail check failed, aborting optimization flow');
        details.push('Safety guardrail check failed');
        details.push(...guardrailCheck.violations.map(v => `${v.rule}: ${v.description}`));
        details.push(...guardrailCheck.recommendations);
        result.status = 'failed';
        result.details = details;
        this.saveFlowResult(result);
        return result;
      }

      // 1. 检测压力
      console.log(`[PressureDrivenOptimization] Starting optimization flow ${flowId}`);
      const pressureEngine = getPressureAwarenessEngine();
      const pressureResponse = pressureEngine.detectPressure();
      result.pressureResponse = pressureResponse;

      details.push(`压力等级: ${pressureResponse.pressureLevel}/100`);
      details.push(`紧急程度: ${pressureResponse.urgency}`);
      details.push(`触发器数: ${pressureResponse.triggers.length}`);

      if (!pressureResponse.detected) {
        details.push('未检测到压力，跳过优化流程');
        result.status = 'completed';
        this.saveFlowResult(result);
        return result;
      }

      // 2. 生成优化方案
      console.log(`[PressureDrivenOptimization] Generating optimization plan...`);
      const optimizationEngine = getAutonomousOptimizationEngine();
      const plan = await optimizationEngine.generateOptimizationPlan();
      result.optimizationPlanId = plan.id;

      details.push(`优化方案ID: ${plan.id}`);
      details.push(`推荐优化数: ${plan.actions.length}`);
      details.push(`推理: ${plan.reasoning.substring(0, 100)}...`);

      // 3. 生成代码修改建议
      console.log(`[PressureDrivenOptimization] Generating code modifications...`);
      const codeModificationEngine = getCodeModificationEngine();
      const diagnostics = getSelfDiagnostics();
      const latestReport = diagnostics.getLatestReport();

      if (!latestReport) {
        details.push('无诊断报告，跳过代码修改');
        this.saveFlowResult(result);
        return result;
      }

      // 构建修改上下文
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
        details.push('未生成代码修改建议');
        this.saveFlowResult(result);
        return result;
      }

      result.totalModificationsProposed = 1;
      details.push(`生成代码修改建议: ${proposal.id}`);
      details.push(`目标文件: ${proposal.filePath}`);
      details.push(`修改描述: ${proposal.description.substring(0, 100)}...`);

      // 4. 安全检查
      console.log(`[PressureDrivenOptimization] Checking code safety...`);
      const safetyChecker = getCodeSafetyChecker();
      const safetyResult = await safetyChecker.checkCodeModification(
        proposal.filePath,
        proposal.originalCode,
        proposal.modifiedCode,
        proposal.description
      );

      details.push(`安全检查结果: ${safetyResult.riskLevel}`);

      if (safetyResult.riskLevel === 'critical' || safetyResult.riskLevel === 'high') {
        details.push(`安全风险过高，拒绝执行修改`);
        details.push(`风险问题: ${safetyResult.issues.map(i => i.description).join('; ')}`);
        failedModifications++;
        result.failedModifications = failedModifications;
        result.status = 'partial';
        this.saveFlowResult(result);
        return result;
      }

      details.push(`安全检查通过`);

      // 5. 执行代码修改
      console.log(`[PressureDrivenOptimization] Executing code modification...`);
      const executor = getCodeModificationExecutor();
      const executionResult = await executor.executeModification(proposal);

      if (executionResult.success) {
        successfulModifications++;
        result.codeModificationsExecuted++;
        details.push(`代码修改执行成功`);
        details.push(`备份路径: ${executionResult.backupPath}`);
        if (executionResult.metrics) {
          details.push(`执行时间: ${executionResult.metrics.executionTime}ms`);
          details.push(`文件大小变化: ${executionResult.metrics.fileSize.before} -> ${executionResult.metrics.fileSize.after} bytes`);
        }
      } else {
        failedModifications++;
        details.push(`代码修改执行失败: ${executionResult.error}`);
        result.status = 'partial';
      }

      result.successfulModifications = successfulModifications;
      result.failedModifications = failedModifications;

      // 6. 执行优化方案中的其他动作
      console.log(`[PressureDrivenOptimization] Executing optimization plan...`);
      const executedPlan = await optimizationEngine.executePlan(plan);
      details.push(`优化方案执行完成: ${executedPlan.status}`);
      details.push(`执行记录数: ${executedPlan.executionHistory.length}`);

      for (const record of executedPlan.executionHistory) {
        details.push(`  - ${record.action}: ${record.status}`);
      }

      console.log(`[PressureDrivenOptimization] Optimization flow ${flowId} completed`);
      this.saveFlowResult(result);
      return result;
    } catch (error) {
      console.error(`[PressureDrivenOptimization] Error in optimization flow:`, error);
      result.status = 'failed';
      details.push(`错误: ${String(error)}`);
      this.saveFlowResult(result);
      return result;
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
   * 保存流程结果
   */
  private saveFlowResult(result: OptimizationFlowResult): void {
    this.flowHistory.push(result);
    if (this.flowHistory.length > this.maxHistorySize) {
      this.flowHistory.shift();
    }
  }

  /**
   * 获取流程历史
   */
  getFlowHistory(): OptimizationFlowResult[] {
    return [...this.flowHistory];
  }

  /**
   * 获取最近的流程结果
   */
  getLatestFlow(): OptimizationFlowResult | null {
    return this.flowHistory.length > 0 ? this.flowHistory[this.flowHistory.length - 1] : null;
  }

  /**
   * 获取流程统计
   */
  getFlowStatistics() {
    return {
      totalFlows: this.flowHistory.length,
      successfulFlows: this.flowHistory.filter(f => f.status === 'completed').length,
      partialFlows: this.flowHistory.filter(f => f.status === 'partial').length,
      failedFlows: this.flowHistory.filter(f => f.status === 'failed').length,
      totalCodeModificationsExecuted: this.flowHistory.reduce((sum, f) => sum + f.codeModificationsExecuted, 0),
      totalSuccessfulModifications: this.flowHistory.reduce((sum, f) => sum + f.successfulModifications, 0),
      totalFailedModifications: this.flowHistory.reduce((sum, f) => sum + f.failedModifications, 0),
      averagePressureLevel: this.flowHistory.length > 0
        ? Math.round(this.flowHistory.reduce((sum, f) => sum + f.pressureResponse.pressureLevel, 0) / this.flowHistory.length)
        : 0,
    };
  }
}

// Singleton instance
let _instance: PressureDrivenOptimizationFlow | null = null;

export function getPressureDrivenOptimizationFlow(): PressureDrivenOptimizationFlow {
  if (!_instance) {
    _instance = new PressureDrivenOptimizationFlow();
  }
  return _instance;
}
