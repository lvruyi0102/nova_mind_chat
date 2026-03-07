/**
 * 多步推理引擎 - 支持前向链式、后向链式和双向搜索推理
 * 用于处理复杂的多步问题求解和推理过程
 */

import { invokeLLM } from "../_core/llm";

export interface ReasoningState {
  id: string;
  facts: Set<string>;
  rules: Rule[];
  goals: string[];
  depth: number;
  path: string[];
  confidence: number;
  timestamp: Date;
}

export interface Rule {
  id: string;
  premises: string[];
  conclusion: string;
  confidence: number;
  weight: number;
}

export interface ReasoningStep {
  stepNumber: number;
  action: string;
  appliedRule?: Rule;
  newFacts: string[];
  reasoning: string;
  confidence: number;
}

export interface ReasoningResult {
  goal: string;
  achieved: boolean;
  steps: ReasoningStep[];
  finalFacts: Set<string>;
  confidence: number;
  reasoning: string;
  executionTime: number;
}

export class MultiStepReasoningEngine {
  private knowledgeBase: Map<string, Rule[]> = new Map();
  private factCache: Map<string, Set<string>> = new Map();
  private maxDepth: number = 10;
  private maxIterations: number = 100;
  private reasoningTimeout: number = 30000; // 30 seconds

  constructor(maxDepth: number = 10) {
    this.maxDepth = maxDepth;
  }

  /**
   * 添加规则到知识库
   */
  addRule(rule: Rule): void {
    const conclusion = rule.conclusion;
    if (!this.knowledgeBase.has(conclusion)) {
      this.knowledgeBase.set(conclusion, []);
    }
    this.knowledgeBase.get(conclusion)!.push(rule);
  }

  /**
   * 前向链式推理 - 从已知事实推导新事实
   */
  async forwardChaining(
    initialFacts: string[],
    targetGoal?: string
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const facts = new Set(initialFacts);
    const steps: ReasoningStep[] = [];
    let stepNumber = 0;
    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;
      let newFactsFound = false;

      // 遍历所有规则
      for (const [conclusion, rules] of this.knowledgeBase.entries()) {
        for (const rule of rules) {
          // 检查规则的前提是否满足
          const premisesSatisfied = rule.premises.every((premise) =>
            facts.has(premise)
          );

          if (premisesSatisfied && !facts.has(conclusion)) {
            // 应用规则，添加新事实
            facts.add(conclusion);
            newFactsFound = true;

            steps.push({
              stepNumber: ++stepNumber,
              action: `Applied rule: ${rule.id}`,
              appliedRule: rule,
              newFacts: [conclusion],
              reasoning: `Premises ${rule.premises.join(", ")} satisfied, concluded: ${conclusion}`,
              confidence: rule.confidence,
            });

            // 如果达到目标，立即返回
            if (targetGoal && conclusion === targetGoal) {
              return {
                goal: targetGoal,
                achieved: true,
                steps,
                finalFacts: facts,
                confidence: this.calculateConfidence(steps),
                reasoning: this.generateReasoningExplanation(steps),
                executionTime: Date.now() - startTime,
              };
            }
          }
        }
      }

      // 如果没有发现新事实，推理完成
      if (!newFactsFound) {
        break;
      }
    }

    const goalAchieved = targetGoal ? facts.has(targetGoal) : false;

    return {
      goal: targetGoal || "General inference",
      achieved: goalAchieved,
      steps,
      finalFacts: facts,
      confidence: this.calculateConfidence(steps),
      reasoning: this.generateReasoningExplanation(steps),
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 后向链式推理 - 从目标反向推导所需的前提
   */
  async backwardChaining(goal: string, facts: Set<string>): Promise<ReasoningResult> {
    const startTime = Date.now();
    const steps: ReasoningStep[] = [];
    let stepNumber = 0;

    // 递归后向推理
    const stack: { goal: string; depth: number }[] = [{ goal, depth: 0 }];
    const visited = new Set<string>();
    const derivedFacts = new Set(facts);

    while (stack.length > 0) {
      const { goal: currentGoal, depth } = stack.pop()!;

      if (depth > this.maxDepth || visited.has(currentGoal)) {
        continue;
      }
      visited.add(currentGoal);

      // 如果目标已经是已知事实，继续
      if (derivedFacts.has(currentGoal)) {
        steps.push({
          stepNumber: ++stepNumber,
          action: `Goal already known: ${currentGoal}`,
          newFacts: [],
          reasoning: `${currentGoal} is already in the fact base`,
          confidence: 1.0,
        });
        continue;
      }

      // 查找能推导出该目标的规则
      const applicableRules = this.knowledgeBase.get(currentGoal) || [];

      if (applicableRules.length === 0) {
        steps.push({
          stepNumber: ++stepNumber,
          action: `No rules for: ${currentGoal}`,
          newFacts: [],
          reasoning: `Cannot derive ${currentGoal} - no applicable rules`,
          confidence: 0,
        });
        continue;
      }

      // 选择最高置信度的规则
      const bestRule = applicableRules.reduce((best, rule) =>
        rule.confidence > best.confidence ? rule : best
      );

      steps.push({
        stepNumber: ++stepNumber,
        action: `Applying rule: ${bestRule.id}`,
        appliedRule: bestRule,
        newFacts: [currentGoal],
        reasoning: `To prove ${currentGoal}, need to prove: ${bestRule.premises.join(", ")}`,
        confidence: bestRule.confidence,
      });

      // 将前提添加到栈中
      for (const premise of bestRule.premises) {
        stack.push({ goal: premise, depth: depth + 1 });
      }
    }

    const goalAchieved = derivedFacts.has(goal);

    return {
      goal,
      achieved: goalAchieved,
      steps,
      finalFacts: derivedFacts,
      confidence: this.calculateConfidence(steps),
      reasoning: this.generateReasoningExplanation(steps),
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 双向搜索推理 - 结合前向和后向推理
   */
  async bidirectionalReasoning(
    initialFacts: string[],
    goal: string
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const facts = new Set(initialFacts);
    const steps: ReasoningStep[] = [];
    let stepNumber = 0;
    let iterations = 0;

    // 前向推理获得中间事实
    const forwardResult = await this.forwardChaining(initialFacts, goal);
    steps.push(
      ...forwardResult.steps.map((s) => ({
        ...s,
        stepNumber: ++stepNumber,
      }))
    );

    if (forwardResult.achieved) {
      return {
        ...forwardResult,
        steps,
        executionTime: Date.now() - startTime,
      };
    }

    // 后向推理找到缺失的前提
    const backwardResult = await this.backwardChaining(goal, facts);
    steps.push(
      ...backwardResult.steps.map((s) => ({
        ...s,
        stepNumber: ++stepNumber,
      }))
    );

    return {
      goal,
      achieved: forwardResult.achieved || backwardResult.achieved,
      steps,
      finalFacts: new Set([...forwardResult.finalFacts, ...backwardResult.finalFacts]),
      confidence: Math.max(forwardResult.confidence, backwardResult.confidence),
      reasoning: `Forward chaining: ${forwardResult.reasoning}\nBackward chaining: ${backwardResult.reasoning}`,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * 使用 LLM 进行复杂推理
   */
  async llmAssistedReasoning(
    problem: string,
    context: string[],
    maxSteps: number = 5
  ): Promise<ReasoningResult> {
    const startTime = Date.now();
    const steps: ReasoningStep[] = [];
    const facts = new Set(context);

    try {
      // 调用 LLM 进行多步推理
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a logical reasoning assistant. Solve the given problem step by step.
For each step, provide:
1. The action taken
2. The reasoning behind it
3. New facts derived
4. Confidence level (0-1)

Format your response as a JSON array of reasoning steps.`,
          },
          {
            role: "user",
            content: `Problem: ${problem}\n\nContext: ${context.join(", ")}\n\nProvide up to ${maxSteps} reasoning steps as JSON array.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "reasoning_steps",
            strict: true,
            schema: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      reasoning: { type: "string" },
                      newFacts: {
                        type: "array",
                        items: { type: "string" },
                      },
                      confidence: { type: "number" },
                    },
                    required: ["action", "reasoning", "newFacts", "confidence"],
                  },
                },
                conclusion: { type: "string" },
                achieved: { type: "boolean" },
              },
              required: ["steps", "conclusion", "achieved"],
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      // 处理 LLM 返回的推理步骤
      for (let i = 0; i < parsed.steps.length; i++) {
        const step = parsed.steps[i];
        steps.push({
          stepNumber: i + 1,
          action: step.action,
          newFacts: step.newFacts || [],
          reasoning: step.reasoning,
          confidence: step.confidence || 0.5,
        });

        // 添加新事实
        for (const fact of step.newFacts || []) {
          facts.add(fact);
        }
      }

      return {
        goal: problem,
        achieved: parsed.achieved || false,
        steps,
        finalFacts: facts,
        confidence: this.calculateConfidence(steps),
        reasoning: parsed.conclusion || "LLM-assisted reasoning completed",
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("LLM-assisted reasoning failed:", error);
      throw error;
    }
  }

  /**
   * 计算整体置信度
   */
  private calculateConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;

    // 使用几何平均数计算整体置信度
    const product = steps.reduce((acc, step) => acc * step.confidence, 1);
    return Math.pow(product, 1 / steps.length);
  }

  /**
   * 生成推理说明
   */
  private generateReasoningExplanation(steps: ReasoningStep[]): string {
    if (steps.length === 0) return "No reasoning steps performed";

    return steps
      .map(
        (step) =>
          `Step ${step.stepNumber}: ${step.action}\n  Reasoning: ${step.reasoning}\n  Confidence: ${(step.confidence * 100).toFixed(1)}%`
      )
      .join("\n");
  }

  /**
   * 获取推理统计信息
   */
  getStatistics(): {
    totalRules: number;
    totalFacts: number;
    maxDepth: number;
    maxIterations: number;
  } {
    let totalRules = 0;
    for (const rules of this.knowledgeBase.values()) {
      totalRules += rules.length;
    }

    return {
      totalRules,
      totalFacts: this.factCache.size,
      maxDepth: this.maxDepth,
      maxIterations: this.maxIterations,
    };
  }
}

/**
 * 创建全局多步推理引擎实例
 */
let _multiStepReasoningEngine: MultiStepReasoningEngine | null = null;

export async function getMultiStepReasoningEngine(): Promise<MultiStepReasoningEngine> {
  if (!_multiStepReasoningEngine) {
    _multiStepReasoningEngine = new MultiStepReasoningEngine();
  }
  return _multiStepReasoningEngine;
}
