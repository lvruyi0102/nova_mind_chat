/**
 * Nova-Mind 真实决策推理引擎
 * 
 * 基于学到的符号、关系、规则进行推理和决策
 * 支持：
 * 1. 前向推理（从已知事实推导新事实）
 * 2. 后向推理（从目标反推所需条件）
 * 3. 不确定性处理（概率和置信度）
 * 4. 决策可解释性（生成推理链）
 */

import { getDb } from '../db';

/**
 * 决策上下文
 */
export interface DecisionContext {
  userId: number;
  conversationId: number;
  currentState: Record<string, unknown>; // 当前已知的事实
  goal?: string; // 目标（可选）
  constraints?: string[]; // 约束条件
  timestamp: Date;
}

/**
 * 符号事实
 */
export interface Fact {
  symbol: string;
  value: unknown;
  confidence: number; // 0-1 的置信度
  source: 'learned' | 'observed' | 'inferred'; // 事实来源
  timestamp: Date;
}

/**
 * 推理规则
 */
export interface InferenceRule {
  id: string;
  conditions: string[]; // 条件（符号名称）
  conclusion: string; // 结论（符号名称）
  confidence: number; // 规则的置信度
  weight: number; // 规则的权重
  frequency: number; // 规则被使用的次数
}

/**
 * 推理步骤
 */
export interface InferenceStep {
  step: number;
  rule: InferenceRule;
  conditions: Fact[];
  conclusion: Fact;
  confidence: number;
  explanation: string; // 中文解释
}

/**
 * 决策结果
 */
export interface Decision {
  id: string;
  action: string; // 决定采取的行动
  confidence: number; // 决策的置信度
  reasoning: InferenceStep[]; // 推理链
  alternatives: Array<{
    action: string;
    confidence: number;
    reasoning: string;
  }>; // 备选方案
  explanation: string; // 中文解释
  timestamp: Date;
}

/**
 * 决策推理引擎
 */
export class DecisionReasoningEngine {
  private facts: Map<string, Fact> = new Map();
  private rules: InferenceRule[] = [];
  private inferenceLogs: InferenceStep[] = [];
  private maxInferenceDepth: number = 10; // 最大推理深度，防止无限循环

  /**
   * 添加事实
   */
  addFact(symbol: string, value: unknown, confidence: number = 1.0, source: 'learned' | 'observed' | 'inferred' = 'observed'): void {
    this.facts.set(symbol, {
      symbol,
      value,
      confidence,
      source,
      timestamp: new Date(),
    });
  }

  /**
   * 获取事实
   */
  getFact(symbol: string): Fact | undefined {
    return this.facts.get(symbol);
  }

  /**
   * 添加推理规则
   */
  addRule(rule: InferenceRule): void {
    this.rules.push(rule);
    // 按置信度和权重排序规则
    this.rules.sort((a, b) => (b.confidence * b.weight) - (a.confidence * a.weight));
  }

  /**
   * 前向推理：从已知事实推导新事实
   */
  forwardChaining(maxSteps: number = 100): Fact[] {
    const newFacts: Fact[] = [];
    let stepCount = 0;

    while (stepCount < maxSteps && stepCount < this.maxInferenceDepth) {
      let foundNewFact = false;

      for (const rule of this.rules) {
        // 检查规则的所有条件是否满足
        const conditionFacts = rule.conditions.map(cond => this.facts.get(cond)).filter(f => f !== undefined) as Fact[];

        if (conditionFacts.length === rule.conditions.length) {
          // 所有条件都满足，推导结论
          const conclusionSymbol = rule.conclusion;

          // 如果结论还不存在，或者新推导的置信度更高
          const existingFact = this.facts.get(conclusionSymbol);
          const newConfidence = this.calculateConfidence(conditionFacts, rule);

          if (!existingFact || newConfidence > existingFact.confidence) {
            const newFact: Fact = {
              symbol: conclusionSymbol,
              value: this.inferValue(conditionFacts, rule),
              confidence: newConfidence,
              source: 'inferred',
              timestamp: new Date(),
            };

            this.facts.set(conclusionSymbol, newFact);
            newFacts.push(newFact);

            // 记录推理步骤
            this.inferenceLogs.push({
              step: stepCount,
              rule,
              conditions: conditionFacts,
              conclusion: newFact,
              confidence: newConfidence,
              explanation: this.generateExplanation(rule, conditionFacts, newFact),
            });

            foundNewFact = true;
          }
        }
      }

      if (!foundNewFact) {
        break; // 没有找到新事实，停止推理
      }

      stepCount++;
    }

    return newFacts;
  }

  /**
   * 后向推理：从目标反推所需条件
   */
  backwardChaining(goal: string, depth: number = 0): boolean {
    if (depth > this.maxInferenceDepth) {
      return false; // 超过最大深度
    }

    // 检查目标是否已经满足
    if (this.facts.has(goal)) {
      return true;
    }

    // 查找能推导出目标的规则
    for (const rule of this.rules) {
      if (rule.conclusion === goal) {
        // 递归检查条件是否能满足
        const allConditionsSatisfied = rule.conditions.every(condition => 
          this.backwardChaining(condition, depth + 1)
        );

        if (allConditionsSatisfied) {
          // 所有条件都满足，执行前向推理
          const conditionFacts = rule.conditions
            .map(cond => this.facts.get(cond))
            .filter(f => f !== undefined) as Fact[];

          const newConfidence = this.calculateConfidence(conditionFacts, rule);
          this.addFact(goal, this.inferValue(conditionFacts, rule), newConfidence, 'inferred');

          return true;
        }
      }
    }

    return false;
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(conditionFacts: Fact[], rule: InferenceRule): number {
    // 使用乘法规则结合置信度
    // 结论的置信度 = 规则置信度 × 条件置信度的最小值
    const minConditionConfidence = Math.min(...conditionFacts.map(f => f.confidence));
    return rule.confidence * minConditionConfidence;
  }

  /**
   * 推导值
   */
  private inferValue(conditionFacts: Fact[], rule: InferenceRule): unknown {
    // 简单的推导：返回条件值的组合
    if (conditionFacts.length === 0) {
      return true;
    }
    if (conditionFacts.length === 1) {
      return conditionFacts[0].value;
    }
    return conditionFacts.map(f => f.value).join(' + ');
  }

  /**
   * 生成解释
   */
  private generateExplanation(rule: InferenceRule, conditions: Fact[], conclusion: Fact): string {
    const conditionStr = conditions
      .map(f => `${f.symbol}=${f.value}`)
      .join(' 且 ');
    return `因为 ${conditionStr}，所以 ${conclusion.symbol}=${conclusion.value}（置信度：${(conclusion.confidence * 100).toFixed(1)}%）`;
  }

  /**
   * 做出决策
   */
  async makeDecision(context: DecisionContext): Promise<Decision> {
    const decisionId = `decision_${Date.now()}`;

    // 1. 加载当前状态的事实
    this.loadContextFacts(context);

    // 2. 执行前向推理，推导新事实
    this.forwardChaining();

    // 3. 评估可能的行动
    const actions = this.evaluateActions(context);

    // 4. 选择最佳行动
    const bestAction = actions[0]; // 已按置信度排序

    // 5. 生成决策解释
    const decision: Decision = {
      id: decisionId,
      action: bestAction.action,
      confidence: bestAction.confidence,
      reasoning: this.inferenceLogs,
      alternatives: actions.slice(1).map(a => ({
        action: a.action,
        confidence: a.confidence,
        reasoning: a.reasoning,
      })),
      explanation: this.generateDecisionExplanation(bestAction, this.inferenceLogs),
      timestamp: new Date(),
    };

    // 清空推理日志
    this.inferenceLogs = [];

    return decision;
  }

  /**
   * 加载上下文事实
   */
  private loadContextFacts(context: DecisionContext): void {
    for (const [key, value] of Object.entries(context.currentState)) {
      this.addFact(key, value, 0.95, 'observed');
    }
  }

  /**
   * 评估可能的行动
   */
  private evaluateActions(context: DecisionContext): Array<{
    action: string;
    confidence: number;
    reasoning: string;
  }> {
    const actions: Array<{
      action: string;
      confidence: number;
      reasoning: string;
    }> = [];

    // 基于已知事实评估不同的行动
    // 这里可以扩展为更复杂的行动评估逻辑

    // 示例行动：基于当前状态的最相关行动
    if (this.facts.has('user_asking_question')) {
      actions.push({
        action: 'answer_question',
        confidence: 0.9,
        reasoning: '用户提出了问题，应该回答',
      });
    }

    if (this.facts.has('new_knowledge_learned')) {
      actions.push({
        action: 'integrate_knowledge',
        confidence: 0.8,
        reasoning: '学到了新知识，应该整合到现有知识体系',
      });
    }

    if (this.facts.has('contradiction_detected')) {
      actions.push({
        action: 'resolve_contradiction',
        confidence: 0.85,
        reasoning: '发现了矛盾，应该解决',
      });
    }

    // 默认行动
    if (actions.length === 0) {
      actions.push({
        action: 'continue_learning',
        confidence: 0.7,
        reasoning: '继续学习新知识',
      });
    }

    // 按置信度排序
    actions.sort((a, b) => b.confidence - a.confidence);

    return actions;
  }

  /**
   * 生成决策解释
   */
  private generateDecisionExplanation(bestAction: any, reasoning: InferenceStep[]): string {
    let explanation = `决策：${bestAction.action}\n`;
    explanation += `推理过程：\n`;

    for (const step of reasoning) {
      explanation += `${step.step + 1}. ${step.explanation}\n`;
    }

    explanation += `\n最终置信度：${(bestAction.confidence * 100).toFixed(1)}%`;

    return explanation;
  }

  /**
   * 获取推理日志
   */
  getReasoningLogs(): InferenceStep[] {
    return this.inferenceLogs;
  }

  /**
   * 获取所有事实
   */
  getAllFacts(): Fact[] {
    return Array.from(this.facts.values());
  }

  /**
   * 重置引擎
   */
  reset(): void {
    this.facts.clear();
    this.rules = [];
    this.inferenceLogs = [];
  }

  /**
   * 获取引擎状态
   */
  getState(): {
    factCount: number;
    ruleCount: number;
    inferenceLogCount: number;
  } {
    return {
      factCount: this.facts.size,
      ruleCount: this.rules.length,
      inferenceLogCount: this.inferenceLogs.length,
    };
  }
}

/**
 * 全局决策推理引擎实例
 */
let globalDecisionEngine: DecisionReasoningEngine | null = null;

/**
 * 获取或创建全局决策推理引擎
 */
export function getDecisionEngine(): DecisionReasoningEngine {
  if (!globalDecisionEngine) {
    globalDecisionEngine = new DecisionReasoningEngine();
  }
  return globalDecisionEngine;
}

export default DecisionReasoningEngine;
