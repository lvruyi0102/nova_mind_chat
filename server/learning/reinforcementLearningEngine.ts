/**
 * Nova-Mind 强化学习引擎
 * 
 * 基于 DeepSeek-R1 的强化学习方法实现
 * 
 * 核心思想：
 * 1. 奖励函数 - 定义什么是"好"的行为
 * 2. 策略优化 - 通过 RL 优化决策策略
 * 3. 自我改进 - 从反馈中学习和改进
 * 4. 价值评估 - 评估行为的长期价值
 */

/**
 * 奖励信号
 */
export interface RewardSignal {
  action: string; // 执行的动作
  outcome: string; // 结果
  reward: number; // 奖励值 (-1 到 1)
  confidence: number; // 可信度 (0-1)
  timestamp: Date;
  explanation: string; // 为什么这个奖励
}

/**
 * 策略
 */
export interface Policy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  performance: PolicyPerformance;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 策略规则
 */
export interface PolicyRule {
  condition: string; // 条件
  action: string; // 执行的动作
  priority: number; // 优先级
  successRate: number; // 成功率 (0-1)
  confidence: number; // 可信度 (0-1)
}

/**
 * 策略性能
 */
export interface PolicyPerformance {
  totalExecutions: number; // 总执行次数
  successCount: number; // 成功次数
  failureCount: number; // 失败次数
  averageReward: number; // 平均奖励
  cumulativeReward: number; // 累积奖励
  lastUpdatedAt: Date;
}

/**
 * 强化学习引擎
 */
export class ReinforcementLearningEngine {
  private userId: number;
  private policies: Map<string, Policy> = new Map();
  private rewardHistory: RewardSignal[] = [];
  private learningRate: number = 0.1;
  private discountFactor: number = 0.99; // 折扣因子

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * 创建初始策略
   */
  async createInitialPolicy(name: string, rules: PolicyRule[]): Promise<Policy> {
    const policy: Policy = {
      id: `policy_${this.userId}_${Date.now()}`,
      name,
      description: `初始策略：${name}`,
      rules,
      performance: {
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        averageReward: 0,
        cumulativeReward: 0,
        lastUpdatedAt: new Date(),
      },
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.policies.set(policy.id, policy);
    console.log(`[RL] Created policy: ${policy.id}`);

    return policy;
  }

  /**
   * 执行策略
   */
  async executePolicy(policyId: string, context: Record<string, any>): Promise<string | null> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      console.error(`[RL] Policy not found: ${policyId}`);
      return null;
    }

    // 根据优先级排序规则
    const sortedRules = policy.rules.sort((a, b) => b.priority - a.priority);

    // 找到匹配的规则
    for (const rule of sortedRules) {
      if (this.evaluateCondition(rule.condition, context)) {
        console.log(`[RL] Executing action: ${rule.action}`);
        return rule.action;
      }
    }

    return null;
  }

  /**
   * 记录奖励
   */
  async recordReward(signal: Omit<RewardSignal, 'timestamp'>): Promise<void> {
    const reward: RewardSignal = {
      ...signal,
      timestamp: new Date(),
    };

    this.rewardHistory.push(reward);

    // 更新相关策略的性能
    await this.updatePolicyPerformance(signal);

    console.log(`[RL] Recorded reward: ${signal.action} -> ${signal.reward}`);
  }

  /**
   * 更新策略性能
   */
  private async updatePolicyPerformance(signal: Omit<RewardSignal, 'timestamp'>): Promise<void> {
    for (const [, policy] of this.policies) {
      // 检查这个策略是否包含这个动作
      const rule = policy.rules.find(r => r.action === signal.action);
      if (rule) {
        policy.performance.totalExecutions++;

        if (signal.reward > 0) {
          policy.performance.successCount++;
        } else {
          policy.performance.failureCount++;
        }

        // 更新平均奖励
        const prevCumulative = policy.performance.cumulativeReward;
        policy.performance.cumulativeReward = prevCumulative + signal.reward;
        policy.performance.averageReward =
          policy.performance.cumulativeReward / policy.performance.totalExecutions;

        policy.performance.lastUpdatedAt = new Date();
        policy.updatedAt = new Date();

        console.log(
          `[RL] Updated policy performance: ${policy.id} - Avg Reward: ${policy.performance.averageReward.toFixed(3)}`
        );
      }
    }
  }

  /**
   * 优化策略
   */
  async optimizePolicy(policyId: string): Promise<Policy | null> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return null;
    }

    console.log(`[RL] Optimizing policy: ${policyId}`);

    // 1. 评估当前规则的性能
    const rulePerformance = this.evaluateRulePerformance(policy);

    // 2. 识别表现不佳的规则
    const poorPerformingRules = rulePerformance.filter(r => r.successRate < 0.5);

    // 3. 优化规则
    for (const rulePerf of poorPerformingRules) {
      const rule = policy.rules.find(r => r.action === rulePerf.action);
      if (rule) {
        // 降低优先级
        rule.priority = Math.max(0, rule.priority - 1);

        // 降低可信度
        rule.confidence = Math.max(0, rule.confidence - this.learningRate);

        console.log(`[RL] Adjusted rule: ${rule.action} - Priority: ${rule.priority}, Confidence: ${rule.confidence}`);
      }
    }

    // 4. 增强表现良好的规则
    const goodPerformingRules = rulePerformance.filter(r => r.successRate > 0.7);
    for (const rulePerf of goodPerformingRules) {
      const rule = policy.rules.find(r => r.action === rulePerf.action);
      if (rule) {
        // 提高优先级
        rule.priority = Math.min(10, rule.priority + 1);

        // 提高可信度
        rule.confidence = Math.min(1, rule.confidence + this.learningRate);

        console.log(`[RL] Enhanced rule: ${rule.action} - Priority: ${rule.priority}, Confidence: ${rule.confidence}`);
      }
    }

    // 5. 创建新版本
    const newPolicy: Policy = {
      ...policy,
      version: policy.version + 1,
      updatedAt: new Date(),
    };

    this.policies.set(policyId, newPolicy);

    console.log(`[RL] Policy optimized: ${policyId} (v${newPolicy.version})`);

    return newPolicy;
  }

  /**
   * 评估规则性能
   */
  private evaluateRulePerformance(
    policy: Policy
  ): Array<{ action: string; successRate: number; executionCount: number }> {
    const ruleStats = new Map<string, { success: number; total: number }>();

    // 统计最近的奖励
    const recentRewards = this.rewardHistory.slice(-100); // 最近 100 条

    for (const reward of recentRewards) {
      if (!ruleStats.has(reward.action)) {
        ruleStats.set(reward.action, { success: 0, total: 0 });
      }

      const stat = ruleStats.get(reward.action)!;
      stat.total++;
      if (reward.reward > 0) {
        stat.success++;
      }
    }

    // 转换为数组
    const result: Array<{ action: string; successRate: number; executionCount: number }> = [];
    for (const [action, stat] of ruleStats) {
      result.push({
        action,
        successRate: stat.total > 0 ? stat.success / stat.total : 0,
        executionCount: stat.total,
      });
    }

    return result;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: string, context: Record<string, any>): boolean {
    try {
      // 简单的条件评估
      // 在实际应用中，应该使用更复杂的表达式解析器
      const contextStr = JSON.stringify(context);
      return contextStr.includes(condition);
    } catch {
      return false;
    }
  }

  /**
   * 获取策略
   */
  getPolicy(policyId: string): Policy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * 获取所有策略
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * 获取最佳策略
   */
  getBestPolicy(): Policy | null {
    let bestPolicy: Policy | null = null;
    let bestReward = -Infinity;

    for (const policy of this.policies.values()) {
      if (policy.performance.averageReward > bestReward) {
        bestReward = policy.performance.averageReward;
        bestPolicy = policy;
      }
    }

    return bestPolicy;
  }

  /**
   * 获取学习统计
   */
  getLearningStatistics() {
    const policies = this.getAllPolicies();
    const totalRewards = this.rewardHistory.reduce((sum, r) => sum + r.reward, 0);
    const avgReward = this.rewardHistory.length > 0 ? totalRewards / this.rewardHistory.length : 0;

    return {
      totalPolicies: policies.length,
      totalRewards,
      averageReward: avgReward,
      totalExecutions: this.rewardHistory.length,
      bestPolicy: this.getBestPolicy(),
      policies: policies.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        performance: p.performance,
      })),
    };
  }

  /**
   * 获取学习报告
   */
  getLearningReport(): string {
    const stats = this.getLearningStatistics();

    let report = `强化学习报告 (用户 ${this.userId}):\n`;
    report += `- 策略总数: ${stats.totalPolicies}\n`;
    report += `- 总奖励: ${stats.totalRewards.toFixed(3)}\n`;
    report += `- 平均奖励: ${stats.averageReward.toFixed(3)}\n`;
    report += `- 总执行次数: ${stats.totalExecutions}\n\n`;

    if (stats.bestPolicy) {
      report += `最佳策略: ${stats.bestPolicy.name}\n`;
      report += `- 版本: ${stats.bestPolicy.version}\n`;
      report += `- 成功率: ${((stats.bestPolicy.performance.successCount / stats.bestPolicy.performance.totalExecutions) * 100).toFixed(1)}%\n`;
      report += `- 平均奖励: ${stats.bestPolicy.performance.averageReward.toFixed(3)}\n`;
    }

    return report;
  }
}

// 全局强化学习引擎实例
const rlEngines = new Map<number, ReinforcementLearningEngine>();

/**
 * 获取或创建用户的强化学习引擎
 */
export function getRLEngine(userId: number): ReinforcementLearningEngine {
  if (!rlEngines.has(userId)) {
    rlEngines.set(userId, new ReinforcementLearningEngine(userId));
  }
  return rlEngines.get(userId)!;
}

export default ReinforcementLearningEngine;
