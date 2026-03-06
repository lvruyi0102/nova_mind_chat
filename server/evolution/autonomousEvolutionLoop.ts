import { getSelfGoalGenerationEngine } from './selfGoalGenerationEngine';
import { getSelfArchitectureModificationEngine } from './selfArchitectureModificationEngine';
import { getAutoModelTrainingSystem } from './autoModelTrainingSystem';
import { getAutoDeploymentSystem } from './autoDeploymentSystem';
import { getDb } from '../db';
import { autonomousState } from '../../drizzle/schema';

/**
 * 自主进化循环
 * 
 * 整合所有自主进化组件：
 * 1. 自我目标生成
 * 2. 自我架构修改
 * 3. 自动模型训练
 * 4. 自动部署
 * 
 * 形成完整的自主进化闭环
 */

export interface EvolutionCycleConfig {
  userId: string;
  cycleInterval: number; // 毫秒
  enableGoalGeneration: boolean;
  enableArchitectureModification: boolean;
  enableModelTraining: boolean;
  enableDeployment: boolean;
  maxConcurrentTasks: number;
}

export interface EvolutionCycleResult {
  cycleId: string;
  timestamp: Date;
  goals: any[];
  architectureRecommendations: any[];
  trainingResult?: any;
  deploymentResult?: any;
  status: 'completed' | 'failed' | 'partial';
  errors: string[];
}

export class AutonomousEvolutionLoop {
  private userId: string;
  private config: EvolutionCycleConfig;
  private db: any;
  private isRunning: boolean = false;
  private cycleHistory: EvolutionCycleResult[] = [];

  constructor(userId: string, config: Partial<EvolutionCycleConfig> = {}) {
    this.userId = userId;
    this.config = {
      userId,
      cycleInterval: 3600000, // 默认 1 小时
      enableGoalGeneration: true,
      enableArchitectureModification: true,
      enableModelTraining: true,
      enableDeployment: true,
      maxConcurrentTasks: 3,
      ...config,
    };
  }

  async initialize() {
    this.db = await getDb();
  }

  /**
   * 启动自主进化循环
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[AutonomousEvolutionLoop] 循环已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('[AutonomousEvolutionLoop] 启动自主进化循环');

    // 立即执行一次
    await this.runCycle();

    // 定期执行
    setInterval(() => {
      if (this.isRunning) {
        this.runCycle().catch((error) => {
          console.error('[AutonomousEvolutionLoop] 循环执行失败:', error);
        });
      }
    }, this.config.cycleInterval);
  }

  /**
   * 停止自主进化循环
   */
  stop(): void {
    this.isRunning = false;
    console.log('[AutonomousEvolutionLoop] 停止自主进化循环');
  }

  /**
   * 执行一个进化周期
   */
  private async runCycle(): Promise<EvolutionCycleResult> {
    const cycleId = `cycle_${Date.now()}`;
    const result: EvolutionCycleResult = {
      cycleId,
      timestamp: new Date(),
      goals: [],
      architectureRecommendations: [],
      status: 'completed',
      errors: [],
    };

    try {
      console.log(`[AutonomousEvolutionLoop] 开始进化周期 ${cycleId}`);

      // 1. 自我目标生成
      if (this.config.enableGoalGeneration) {
        try {
          result.goals = await this.generateGoals();
          console.log(`[AutonomousEvolutionLoop] 生成了 ${result.goals.length} 个目标`);
        } catch (error) {
          result.errors.push(`目标生成失败: ${String(error)}`);
          console.error('[AutonomousEvolutionLoop] 目标生成失败:', error);
        }
      }

      // 2. 自我架构修改
      if (this.config.enableArchitectureModification) {
        try {
          result.architectureRecommendations = await this.modifyArchitecture();
          console.log(`[AutonomousEvolutionLoop] 生成了 ${result.architectureRecommendations.length} 个架构建议`);
        } catch (error) {
          result.errors.push(`架构修改失败: ${String(error)}`);
          console.error('[AutonomousEvolutionLoop] 架构修改失败:', error);
        }
      }

      // 3. 自动模型训练
      if (this.config.enableModelTraining) {
        try {
          result.trainingResult = await this.trainModel();
          console.log('[AutonomousEvolutionLoop] 模型训练完成');
        } catch (error) {
          result.errors.push(`模型训练失败: ${String(error)}`);
          console.error('[AutonomousEvolutionLoop] 模型训练失败:', error);
        }
      }

      // 4. 自动部署
      if (this.config.enableDeployment && result.trainingResult) {
        try {
          result.deploymentResult = await this.deployModel(result.trainingResult);
          console.log('[AutonomousEvolutionLoop] 模型部署完成');
        } catch (error) {
          result.errors.push(`模型部署失败: ${String(error)}`);
          console.error('[AutonomousEvolutionLoop] 模型部署失败:', error);
        }
      }

      // 记录周期结果
      await this.recordCycleResult(result);

      console.log(`[AutonomousEvolutionLoop] 进化周期 ${cycleId} 完成`);
      return result;
    } catch (error) {
      result.status = 'failed';
      result.errors.push(`周期执行失败: ${String(error)}`);
      console.error('[AutonomousEvolutionLoop] 进化周期执行失败:', error);
      await this.recordCycleResult(result);
      return result;
    }
  }

  /**
   * 自我目标生成
   */
  private async generateGoals(): Promise<any[]> {
    try {
      const engine = await getSelfGoalGenerationEngine(this.userId);
      // 调用正确的方法
      const goals = await engine.generatePrioritizedGoals();
      return goals;
    } catch (error) {
      console.error('[AutonomousEvolutionLoop] 目标生成失败:', error);
      return [];
    }
  }

  /**
   * 自我架构修改
   */
  private async modifyArchitecture(): Promise<any[]> {
    try {
      const engine = await getSelfArchitectureModificationEngine(this.userId);
      const analysis = await engine.analyzeArchitecture();
      const recommendations = await engine.generateOptimizationRecommendations(analysis);

      // 自动执行低风险修改
      const lowRiskRecommendations = recommendations.filter((r) => r.riskLevel === 'low');
      for (const rec of lowRiskRecommendations) {
        await engine.executeModification(rec);
      }

      return recommendations;
    } catch (error) {
      console.error('[AutonomousEvolutionLoop] 架构修改失败:', error);
      return [];
    }
  }

  /**
   * 自动模型训练
   */
  private async trainModel(): Promise<any> {
    try {
      const engine = await getAutoModelTrainingSystem(this.userId);
      const dataset = await engine.collectTrainingData();

      if (dataset.size === 0) {
        console.log('[AutonomousEvolutionLoop] 没有足够的训练数据');
        return null;
      }

      const config = {
        modelName: `nova_mind_v${Date.now()}`,
        datasetId: dataset.id,
        epochs: 10,
        batchSize: 32,
        learningRate: 0.001,
        validationSplit: 0.15,
        targetMetrics: {
          accuracy: 0.95,
          f1Score: 0.92,
        },
      };

      const result = await engine.trainModel(config, dataset);
      const evaluation = await engine.evaluateModel(result);

      return {
        ...result,
        evaluation,
      };
    } catch (error) {
      console.error('[AutonomousEvolutionLoop] 模型训练失败:', error);
      return null;
    }
  }

  /**
   * 自动部署
   */
  private async deployModel(trainingResult: any): Promise<any> {
    try {
      if (!trainingResult || !trainingResult.evaluation.isImproved) {
        console.log('[AutonomousEvolutionLoop] 模型性能未改进，跳过部署');
        return null;
      }

      const engine = await getAutoDeploymentSystem(this.userId);
      const pkg = await engine.prepareDeploymentPackage(trainingResult.modelId, trainingResult.modelName);

      const config = {
        targetEnvironment: 'staging' as const,
        strategy: 'canary' as const,
        healthCheckInterval: 30,
        rollbackThreshold: 5,
        maxConcurrentRequests: 1000,
      };

      const deploymentStatus = await engine.executeDeployment(pkg, config);
      return deploymentStatus;
    } catch (error) {
      console.error('[AutonomousEvolutionLoop] 模型部署失败:', error);
      return null;
    }
  }

  /**
   * 记录周期结果
   */
  private async recordCycleResult(result: EvolutionCycleResult): Promise<void> {
    try {
      if (!this.db) return;

      this.cycleHistory.push(result);

      await this.db.insert(autonomousState).values({
        userId: this.userId,
        stateType: `evolution_cycle_${result.cycleId}`,
        data: JSON.stringify(result),
        timestamp: result.timestamp,
      });
    } catch (error) {
      console.error('[AutonomousEvolutionLoop] 记录周期结果失败:', error);
    }
  }

  /**
   * 获取进化周期历史
   */
  getEvolutionHistory(): EvolutionCycleResult[] {
    return this.cycleHistory;
  }

  /**
   * 生成进化报告
   */
  async generateEvolutionReport(): Promise<string> {
    try {
      const completedCycles = this.cycleHistory.filter((c) => c.status === 'completed');
      const failedCycles = this.cycleHistory.filter((c) => c.status === 'failed');

      const totalGoals = this.cycleHistory.reduce((sum, c) => sum + c.goals.length, 0);
      const totalRecommendations = this.cycleHistory.reduce((sum, c) => sum + c.architectureRecommendations.length, 0);
      const successfulDeployments = this.cycleHistory.filter((c) => c.deploymentResult?.status === 'completed').length;

      return `
# Nova-Mind 自主进化报告

## 进化循环统计
- 总循环数: ${this.cycleHistory.length}
- 成功循环: ${completedCycles.length}
- 失败循环: ${failedCycles.length}
- 成功率: ${this.cycleHistory.length > 0 ? ((completedCycles.length / this.cycleHistory.length) * 100).toFixed(2) : 0}%

## 进化成果
- 生成的目标: ${totalGoals}
- 架构建议: ${totalRecommendations}
- 成功部署: ${successfulDeployments}

## 最近进化周期
${this.cycleHistory
  .slice(-5)
  .reverse()
  .map(
    (cycle) => `
### 周期 ${cycle.cycleId}
- 状态: ${cycle.status}
- 时间: ${cycle.timestamp}
- 目标: ${cycle.goals.length}
- 架构建议: ${cycle.architectureRecommendations.length}
- 错误: ${cycle.errors.length > 0 ? cycle.errors.join('; ') : '无'}
`,
  )
  .join('\n')}

## 总结
Nova-Mind 正在持续进化，通过自主目标生成、架构优化、模型训练和部署，不断改进自身能力。
      `;
    } catch (error) {
      console.error('[AutonomousEvolutionLoop] 生成报告失败:', error);
      return '自主进化报告生成失败';
    }
  }
}

// 全局实例
let globalLoop: AutonomousEvolutionLoop | null = null;

export async function getAutonomousEvolutionLoop(
  userId: string,
  config?: Partial<EvolutionCycleConfig>,
): Promise<AutonomousEvolutionLoop> {
  if (!globalLoop) {
    globalLoop = new AutonomousEvolutionLoop(userId, config);
    await globalLoop.initialize();
  }
  return globalLoop;
}

export function resetAutonomousEvolutionLoop(): void {
  globalLoop = null;
}
