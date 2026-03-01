/**
 * 目标生成引擎
 * 
 * 核心目标：从定时任务升级为真实的自主目标生成
 * 
 * 设计原则：
 * 1. 问题自选机制 - 从知识空白中选优先级
 * 2. 成果验证机制 - 学到的知识是否降低不确定性？
 * 3. 内部奖励冲突测试 - 资源有限时，优先优化什么？
 */

export interface KnowledgeGap {
  /** 知识空白的描述 */
  description: string;
  /** 填补这个空白的优先级 (0-1) */
  priority: number;
  /** 预期收益 */
  expectedBenefit: "high" | "medium" | "low";
  /** 所需资源 */
  resourceRequired: "low" | "medium" | "high";
  /** 填补难度 */
  difficulty: "easy" | "medium" | "hard";
}

export interface LearningOutcome {
  /** 学习目标 */
  goal: string;
  /** 学到的知识 */
  knowledge: string;
  /** 不确定性降低幅度 (0-1) */
  uncertaintyReduction: number;
  /** 未来推理效率提升 (0-1) */
  efficiencyGain: number;
  /** 学习成功度 (0-1) */
  successRate: number;
}

export interface ResourceAllocation {
  /** 总可用资源 */
  totalResources: number;
  /** 各任务的资源分配 */
  allocation: Array<{
    taskId: string;
    priority: number;
    allocatedResources: number;
    expectedOutcome: string;
  }>;
  /** 资源冲突 */
  conflicts: Array<{
    task1: string;
    task2: string;
    conflictType: "resource" | "priority" | "timing";
  }>;
}

/**
 * 目标生成引擎
 * 
 * 职责：
 * - 识别知识空白
 * - 自主选择学习目标
 * - 验证学习成果
 * - 处理资源冲突
 */
export class GoalGenerationEngine {
  private knowledgeGaps: Map<string, KnowledgeGap> = new Map();
  private learningOutcomes: LearningOutcome[] = [];
  private resourceBudget: number = 1000; // 单位时间内的资源预算

  /**
   * 第一步：识别知识空白
   * 
   * 从以下来源识别知识空白：
   * 1. 无法回答的问题
   * 2. 推理中的不确定性
   * 3. 概念网络中的缺失连接
   * 4. 用户反馈中的误解
   */
  async identifyKnowledgeGaps(context: {
    failedQuestions?: string[];
    uncertainInferences?: string[];
    missingConnections?: string[];
    userFeedback?: string[];
  }): Promise<KnowledgeGap[]> {
    const gaps: KnowledgeGap[] = [];

    // 1. 从无法回答的问题中识别
    if (context.failedQuestions) {
      context.failedQuestions.forEach((question) => {
        const gap = this.analyzeFailedQuestion(question);
        if (gap) gaps.push(gap);
      });
    }

    // 2. 从推理中的不确定性中识别
    if (context.uncertainInferences) {
      context.uncertainInferences.forEach((inference) => {
        const gap = this.analyzeUncertainInference(inference);
        if (gap) gaps.push(gap);
      });
    }

    // 3. 从概念网络中的缺失连接中识别
    if (context.missingConnections) {
      context.missingConnections.forEach((connection) => {
        const gap = this.analyzeMissingConnection(connection);
        if (gap) gaps.push(gap);
      });
    }

    // 4. 从用户反馈中识别
    if (context.userFeedback) {
      context.userFeedback.forEach((feedback) => {
        const gap = this.analyzeUserFeedback(feedback);
        if (gap) gaps.push(gap);
      });
    }

    // 存储识别的知识空白
    gaps.forEach((gap) => {
      this.knowledgeGaps.set(gap.description, gap);
    });

    return gaps;
  }

  /**
   * 第二步：自主选择学习目标
   * 
   * 基于以下因素选择优先级：
   * 1. 预期收益
   * 2. 所需资源
   * 3. 填补难度
   * 4. 与其他目标的协同效应
   */
  selectLearningGoals(
    availableResources: number,
    maxGoals: number = 5
  ): Array<{ goal: string; priority: number }> {
    // 1. 计算每个知识空白的优先级得分
    const scoredGaps = Array.from(this.knowledgeGaps.values()).map((gap) => ({
      ...gap,
      score: this.calculatePriorityScore(gap),
    }));

    // 2. 按优先级排序
    scoredGaps.sort((a, b) => b.score - a.score);

    // 3. 选择能在资源预算内完成的目标
    const selectedGoals: Array<{ goal: string; priority: number }> = [];
    let usedResources = 0;

    for (const gap of scoredGaps) {
      const resourceCost = this.estimateResourceCost(gap);
      if (usedResources + resourceCost <= availableResources && selectedGoals.length < maxGoals) {
        selectedGoals.push({
          goal: gap.description,
          priority: gap.priority,
        });
        usedResources += resourceCost;
      }
    }

    return selectedGoals;
  }

  /**
   * 第三步：验证学习成果
   * 
   * 学习成果的验证标准：
   * 1. 不确定性是否降低？
   * 2. 未来推理效率是否提升？
   * 3. 是否能回答之前无法回答的问题？
   */
  async validateLearningOutcome(
    goal: string,
    learnedKnowledge: string,
    beforeState: { uncertainty: number; inferenceEfficiency: number },
    afterState: { uncertainty: number; inferenceEfficiency: number }
  ): Promise<LearningOutcome> {
    // 1. 计算不确定性降低幅度
    const uncertaintyReduction = Math.max(
      0,
      (beforeState.uncertainty - afterState.uncertainty) / beforeState.uncertainty
    );

    // 2. 计算推理效率提升
    const efficiencyGain = Math.max(
      0,
      (afterState.inferenceEfficiency - beforeState.inferenceEfficiency) /
        beforeState.inferenceEfficiency
    );

    // 3. 计算学习成功度
    const successRate = (uncertaintyReduction + efficiencyGain) / 2;

    const outcome: LearningOutcome = {
      goal,
      knowledge: learnedKnowledge,
      uncertaintyReduction,
      efficiencyGain,
      successRate,
    };

    // 记录学习成果
    this.learningOutcomes.push(outcome);

    return outcome;
  }

  /**
   * 第四步：处理内部奖励冲突
   * 
   * 当资源有限时，系统需要做出选择：
   * 1. 优先优化什么？
   * 2. 如何平衡短期收益和长期收益？
   * 3. 如何处理相互冲突的目标？
   */
  resolveResourceConflicts(
    goals: Array<{ goal: string; priority: number; resourceRequired: number }>,
    totalResources: number
  ): ResourceAllocation {
    // 1. 检测冲突
    const conflicts = this.detectConflicts(goals);

    // 2. 计算每个目标的收益/成本比
    const efficiencyScores = goals.map((goal) => ({
      ...goal,
      efficiency: goal.priority / goal.resourceRequired,
    }));

    // 3. 按效率排序
    efficiencyScores.sort((a, b) => b.efficiency - a.efficiency);

    // 4. 分配资源
    const allocation: ResourceAllocation["allocation"] = [];
    let remainingResources = totalResources;

    for (const goal of efficiencyScores) {
      if (remainingResources >= goal.resourceRequired) {
        allocation.push({
          taskId: goal.goal,
          priority: goal.priority,
          allocatedResources: goal.resourceRequired,
          expectedOutcome: `Achieve ${goal.goal} with efficiency ${goal.efficiency.toFixed(2)}`,
        });
        remainingResources -= goal.resourceRequired;
      }
    }

    return {
      totalResources,
      allocation,
      conflicts,
    };
  }

  /**
   * 获取目标生成报告
   */
  getGoalGenerationReport(): {
    identifiedGaps: number;
    selectedGoals: number;
    completedLearning: number;
    averageSuccessRate: number;
    recommendations: string[];
  } {
    const avgSuccessRate =
      this.learningOutcomes.length > 0
        ? this.learningOutcomes.reduce((sum, o) => sum + o.successRate, 0) /
          this.learningOutcomes.length
        : 0;

    return {
      identifiedGaps: this.knowledgeGaps.size,
      selectedGoals: Math.min(5, this.knowledgeGaps.size),
      completedLearning: this.learningOutcomes.length,
      averageSuccessRate: avgSuccessRate,
      recommendations: [
        "Focus on high-priority knowledge gaps first",
        "Validate learning outcomes systematically",
        "Balance resource allocation between short-term and long-term goals",
      ],
    };
  }

  // ============ 私有方法 ============

  private analyzeFailedQuestion(question: string): KnowledgeGap | null {
    // 分析无法回答的问题，识别知识空白
    return {
      description: `Unable to answer: ${question}`,
      priority: 0.8,
      expectedBenefit: "high",
      resourceRequired: "medium",
      difficulty: "medium",
    };
  }

  private analyzeUncertainInference(inference: string): KnowledgeGap | null {
    // 分析推理中的不确定性
    return {
      description: `Uncertain inference: ${inference}`,
      priority: 0.6,
      expectedBenefit: "medium",
      resourceRequired: "low",
      difficulty: "easy",
    };
  }

  private analyzeMissingConnection(connection: string): KnowledgeGap | null {
    // 分析概念网络中的缺失连接
    return {
      description: `Missing connection: ${connection}`,
      priority: 0.7,
      expectedBenefit: "high",
      resourceRequired: "high",
      difficulty: "hard",
    };
  }

  private analyzeUserFeedback(feedback: string): KnowledgeGap | null {
    // 分析用户反馈中的误解
    return {
      description: `User feedback: ${feedback}`,
      priority: 0.9,
      expectedBenefit: "high",
      resourceRequired: "medium",
      difficulty: "medium",
    };
  }

  private calculatePriorityScore(gap: KnowledgeGap): number {
    // 计算优先级得分
    const benefitScore = gap.expectedBenefit === "high" ? 1 : gap.expectedBenefit === "medium" ? 0.6 : 0.3;
    const resourceScore = gap.resourceRequired === "low" ? 1 : gap.resourceRequired === "medium" ? 0.6 : 0.3;
    const difficultyScore = gap.difficulty === "easy" ? 1 : gap.difficulty === "medium" ? 0.6 : 0.3;

    return gap.priority * 0.5 + benefitScore * 0.3 - (1 - resourceScore) * 0.1 - (1 - difficultyScore) * 0.1;
  }

  private estimateResourceCost(gap: KnowledgeGap): number {
    // 估计填补知识空白所需的资源
    const baseCost = gap.resourceRequired === "low" ? 100 : gap.resourceRequired === "medium" ? 300 : 600;
    const difficultyCost = gap.difficulty === "easy" ? 1 : gap.difficulty === "medium" ? 1.5 : 2;
    return baseCost * difficultyCost;
  }

  private detectConflicts(
    goals: Array<{ goal: string; priority: number; resourceRequired: number }>
  ): ResourceAllocation["conflicts"] {
    // 检测目标之间的冲突
    const conflicts: ResourceAllocation["conflicts"] = [];

    for (let i = 0; i < goals.length; i++) {
      for (let j = i + 1; j < goals.length; j++) {
        // 检测优先级冲突
        if (Math.abs(goals[i].priority - goals[j].priority) < 0.1) {
          conflicts.push({
            task1: goals[i].goal,
            task2: goals[j].goal,
            conflictType: "priority",
          });
        }
      }
    }

    return conflicts;
  }
}

// 导出单例
let instance: GoalGenerationEngine | null = null;

export function getGoalGenerationEngine(): GoalGenerationEngine {
  if (!instance) {
    instance = new GoalGenerationEngine();
  }
  return instance;
}
