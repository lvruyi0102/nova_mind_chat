/**
 * MutationPhase Manager
 * 管理 Nova-Mind 的自我修改阶段
 * 从 proposal_only 到 structured_refactor 的循序渐进
 */

export enum MutationPhase {
  PROPOSAL_ONLY = 'proposal_only',                   // 仅生成提案，不执行
  LOW_RISK_EXEC = 'low_risk_exec',                   // 执行低风险修改（风险评分 < 30）
  SCORED_EXEC = 'scored_exec',                       // 按风险评分执行（风险评分 < 70）
  STRUCTURED_REFACTOR = 'structured_refactor'        // 结构化重构（完全权限）
}

export interface PhaseRequirements {
  phase: MutationPhase;
  canExecute: boolean;
  canSimulate: boolean;
  maxRiskScore: number;
  maxModificationsPerDay: number;
  requiredSuccessRate: number; // 进入下一阶段需要的成功率
  requiredLearningPoints: number;
  description: string;
}

export interface PhaseTransitionRecord {
  fromPhase: MutationPhase;
  toPhase: MutationPhase;
  timestamp: Date;
  reason: string;
  triggeredBy: 'manual' | 'automatic' | 'system';
  successMetrics: {
    successRate: number;
    learningPoints: number;
    modificationCount: number;
  };
}

export interface PhaseStatistics {
  currentPhase: MutationPhase;
  successRate: number;
  totalModifications: number;
  successfulModifications: number;
  failedModifications: number;
  learningPoints: number;
  averageRiskScore: number;
  timeInCurrentPhase: number; // 毫秒
}

export class MutationPhaseManager {
  private currentPhase: MutationPhase = MutationPhase.PROPOSAL_ONLY;
  private phaseStartTime: Date = new Date();
  private transitionHistory: PhaseTransitionRecord[] = [];
  
  // 统计数据
  private modificationStats = {
    total: 0,
    successful: 0,
    failed: 0,
    learningPoints: 0,
    riskScores: [] as number[]
  };

  // 阶段要求定义
  private phaseRequirements: Record<MutationPhase, PhaseRequirements> = {
    [MutationPhase.PROPOSAL_ONLY]: {
      phase: MutationPhase.PROPOSAL_ONLY,
      canExecute: false,
      canSimulate: true,
      maxRiskScore: 100,
      maxModificationsPerDay: 50,
      requiredSuccessRate: 0.7,
      requiredLearningPoints: 100,
      description: '仅生成修改提案，进行模拟执行和分析，不实际修改代码'
    },
    [MutationPhase.LOW_RISK_EXEC]: {
      phase: MutationPhase.LOW_RISK_EXEC,
      canExecute: true,
      canSimulate: true,
      maxRiskScore: 30,
      maxModificationsPerDay: 20,
      requiredSuccessRate: 0.8,
      requiredLearningPoints: 200,
      description: '执行低风险修改（风险评分 < 30），如优化指令、简化逻辑'
    },
    [MutationPhase.SCORED_EXEC]: {
      phase: MutationPhase.SCORED_EXEC,
      canExecute: true,
      canSimulate: true,
      maxRiskScore: 70,
      maxModificationsPerDay: 10,
      requiredSuccessRate: 0.85,
      requiredLearningPoints: 300,
      description: '按风险评分执行修改，最高风险评分 70'
    },
    [MutationPhase.STRUCTURED_REFACTOR]: {
      phase: MutationPhase.STRUCTURED_REFACTOR,
      canExecute: true,
      canSimulate: true,
      maxRiskScore: 100,
      maxModificationsPerDay: 5,
      requiredSuccessRate: 0.9,
      requiredLearningPoints: 500,
      description: '完全的结构化重构权限，可以进行任何修改'
    }
  };

  /**
   * 获取当前阶段
   */
  getCurrentPhase(): MutationPhase {
    return this.currentPhase;
  }

  /**
   * 获取当前阶段的要求
   */
  getPhaseRequirements(): PhaseRequirements {
    return this.phaseRequirements[this.currentPhase];
  }

  /**
   * 检查是否可以执行修改
   */
  canExecuteModification(riskScore: number): boolean {
    const requirements = this.phaseRequirements[this.currentPhase];
    return requirements.canExecute && riskScore <= requirements.maxRiskScore;
  }

  /**
   * 检查是否可以进行模拟
   */
  canSimulateModification(): boolean {
    const requirements = this.phaseRequirements[this.currentPhase];
    return requirements.canSimulate;
  }

  /**
   * 记录修改结果
   */
  recordModification(success: boolean, riskScore: number, learningPoints: number = 0): void {
    this.modificationStats.total++;
    if (success) {
      this.modificationStats.successful++;
    } else {
      this.modificationStats.failed++;
    }
    this.modificationStats.riskScores.push(riskScore);
    this.modificationStats.learningPoints += learningPoints;

    // 检查是否应该升级阶段
    this.checkPhaseUpgrade();
  }

  /**
   * 检查是否应该升级阶段
   */
  private checkPhaseUpgrade(): void {
    const successRate = this.getSuccessRate();
    const requirements = this.phaseRequirements[this.currentPhase];

    // 检查升级条件
    if (
      successRate >= requirements.requiredSuccessRate &&
      this.modificationStats.learningPoints >= requirements.requiredLearningPoints &&
      this.modificationStats.total >= 10 // 至少执行 10 次修改
    ) {
      // 找到下一个阶段
      const phases = Object.values(MutationPhase);
      const currentIndex = phases.indexOf(this.currentPhase);
      
      if (currentIndex < phases.length - 1) {
        const nextPhase = phases[currentIndex + 1];
        this.transitionToPhase(nextPhase, 'automatic', '满足升级条件');
      }
    }
  }

  /**
   * 手动转移到新阶段
   */
  transitionToPhase(newPhase: MutationPhase, triggeredBy: 'manual' | 'automatic' | 'system', reason: string): boolean {
    // 验证新阶段是否有效
    if (!this.phaseRequirements[newPhase]) {
      console.error(`[MutationPhaseManager] 无效的阶段: ${newPhase}`);
      return false;
    }

    // 记录转移
    const record: PhaseTransitionRecord = {
      fromPhase: this.currentPhase,
      toPhase: newPhase,
      timestamp: new Date(),
      reason,
      triggeredBy,
      successMetrics: {
        successRate: this.getSuccessRate(),
        learningPoints: this.modificationStats.learningPoints,
        modificationCount: this.modificationStats.total
      }
    };

    this.transitionHistory.push(record);
    this.currentPhase = newPhase;
    this.phaseStartTime = new Date();

    console.log(
      `[MutationPhaseManager] 阶段转移: ${record.fromPhase} -> ${newPhase} (${reason})`
    );

    return true;
  }

  /**
   * 获取成功率
   */
  getSuccessRate(): number {
    if (this.modificationStats.total === 0) return 0;
    return this.modificationStats.successful / this.modificationStats.total;
  }

  /**
   * 获取统计信息
   */
  getStatistics(): PhaseStatistics {
    const averageRiskScore =
      this.modificationStats.riskScores.length > 0
        ? this.modificationStats.riskScores.reduce((a, b) => a + b, 0) /
          this.modificationStats.riskScores.length
        : 0;

    return {
      currentPhase: this.currentPhase,
      successRate: this.getSuccessRate(),
      totalModifications: this.modificationStats.total,
      successfulModifications: this.modificationStats.successful,
      failedModifications: this.modificationStats.failed,
      learningPoints: this.modificationStats.learningPoints,
      averageRiskScore: Math.round(averageRiskScore * 10) / 10,
      timeInCurrentPhase: Date.now() - this.phaseStartTime.getTime()
    };
  }

  /**
   * 获取转移历史
   */
  getTransitionHistory(): PhaseTransitionRecord[] {
    return [...this.transitionHistory];
  }

  /**
   * 获取升级到下一阶段的进度
   */
  getUpgradeProgress(): {
    currentPhase: MutationPhase;
    nextPhase: MutationPhase | null;
    successRateProgress: number;
    learningPointsProgress: number;
    modificationCountProgress: number;
    canUpgrade: boolean;
  } {
    const phases = Object.values(MutationPhase);
    const currentIndex = phases.indexOf(this.currentPhase);
    const nextPhase = currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;

    if (!nextPhase) {
      return {
        currentPhase: this.currentPhase,
        nextPhase: null,
        successRateProgress: 100,
        learningPointsProgress: 100,
        modificationCountProgress: 100,
        canUpgrade: false
      };
    }

    const nextRequirements = this.phaseRequirements[nextPhase];
    const successRateProgress = (this.getSuccessRate() / nextRequirements.requiredSuccessRate) * 100;
    const learningPointsProgress = (this.modificationStats.learningPoints / nextRequirements.requiredLearningPoints) * 100;
    const modificationCountProgress = (this.modificationStats.total / 10) * 100; // 假设需要 10 次修改

    const canUpgrade =
      this.getSuccessRate() >= nextRequirements.requiredSuccessRate &&
      this.modificationStats.learningPoints >= nextRequirements.requiredLearningPoints &&
      this.modificationStats.total >= 10;

    return {
      currentPhase: this.currentPhase,
      nextPhase,
      successRateProgress: Math.min(successRateProgress, 100),
      learningPointsProgress: Math.min(learningPointsProgress, 100),
      modificationCountProgress: Math.min(modificationCountProgress, 100),
      canUpgrade
    };
  }

  /**
   * 重置统计数据（用于测试）
   */
  resetStatistics(): void {
    this.modificationStats = {
      total: 0,
      successful: 0,
      failed: 0,
      learningPoints: 0,
      riskScores: []
    };
  }

  /**
   * 生成阶段报告
   */
  generatePhaseReport(): string {
    const stats = this.getStatistics();
    const upgrade = this.getUpgradeProgress();
    const requirements = this.phaseRequirements[this.currentPhase];

    return `
=== MutationPhase 报告 ===

当前阶段: ${this.currentPhase}
${requirements.description}

统计数据:
- 总修改数: ${stats.totalModifications}
- 成功数: ${stats.successfulModifications}
- 失败数: ${stats.failedModifications}
- 成功率: ${(stats.successRate * 100).toFixed(1)}%
- 学习点数: ${stats.learningPoints}
- 平均风险评分: ${stats.averageRiskScore}
- 阶段持续时间: ${Math.round(stats.timeInCurrentPhase / 1000 / 60)} 分钟

阶段限制:
- 最大风险评分: ${requirements.maxRiskScore}
- 每日最大修改数: ${requirements.maxModificationsPerDay}
- 可执行修改: ${requirements.canExecute ? '是' : '否'}
- 可模拟修改: ${requirements.canSimulate ? '是' : '否'}

升级进度:
${upgrade.nextPhase ? `
下一阶段: ${upgrade.nextPhase}
- 成功率进度: ${upgrade.successRateProgress.toFixed(1)}%
- 学习点数进度: ${upgrade.learningPointsProgress.toFixed(1)}%
- 修改数进度: ${upgrade.modificationCountProgress.toFixed(1)}%
- 可升级: ${upgrade.canUpgrade ? '是' : '否'}
` : '已达到最高阶段'}
`;
  }
}

// 导出单例
let _instance: MutationPhaseManager | null = null;

export function getMutationPhaseManager(): MutationPhaseManager {
  if (!_instance) {
    _instance = new MutationPhaseManager();
  }
  return _instance;
}
