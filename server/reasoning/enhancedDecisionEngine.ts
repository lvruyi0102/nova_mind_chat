/**
 * 增强的决策引擎 - 集成多步推理、因果推理、问题分解
 * 提供高级决策能力，支持复杂问题求解
 */

import { getMultiStepReasoningEngine, Rule, ReasoningResult } from "./multiStepReasoningEngine";
import { getCausalReasoningSystem, CausalAnalysisResult } from "./causalReasoningSystem";
import { getProblemDecompositionEngine, Problem, ExecutionPlan } from "./problemDecompositionEngine";
import { invokeLLM } from "../_core/llm";

export interface DecisionContext {
  userId: string;
  problem: string;
  constraints: string[];
  objectives: string[];
  historicalContext: string[];
  timeLimit?: number; // 秒
  confidenceThreshold?: number; // 0-1
}

export interface DecisionOption {
  id: string;
  description: string;
  reasoning: string;
  expectedOutcome: string;
  risks: string[];
  benefits: string[];
  confidence: number;
  estimatedCost: number; // 相对成本
  estimatedBenefit: number; // 相对收益
}

export interface EnhancedDecision {
  userId: string;
  problem: string;
  options: DecisionOption[];
  recommendedOption: DecisionOption;
  reasoning: string;
  multiStepAnalysis: ReasoningResult;
  causalAnalysis: CausalAnalysisResult;
  executionPlan?: ExecutionPlan;
  confidence: number;
  timestamp: Date;
}

export class EnhancedDecisionEngine {
  private multiStepReasoning: any;
  private causalReasoning: any;
  private problemDecomposition: any;
  private decisionHistory: Map<string, EnhancedDecision[]> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * 初始化引擎
   */
  private async initialize(): Promise<void> {
    this.multiStepReasoning = await getMultiStepReasoningEngine();
    this.causalReasoning = await getCausalReasoningSystem();
    this.problemDecomposition = await getProblemDecompositionEngine();
  }

  /**
   * 做出增强的决策
   */
  async makeEnhancedDecision(context: DecisionContext): Promise<EnhancedDecision> {
    const startTime = Date.now();

    // 1. 进行多步推理
    const multiStepAnalysis = await this.multiStepReasoning.llmAssistedReasoning(
      context.problem,
      context.historicalContext,
      5
    );

    // 2. 进行因果分析
    const causalAnalysis = await this.causalReasoning.analyzeCausalRelationships(
      context.problem,
      context.historicalContext
    );

    // 3. 生成决策选项
    const options = await this.generateDecisionOptions(
      context,
      multiStepAnalysis,
      causalAnalysis
    );

    // 4. 评估和排序选项
    const rankedOptions = this.rankOptions(options, context);

    // 5. 选择最佳选项
    const recommendedOption = rankedOptions[0];

    // 6. 如果问题复杂，生成执行计划
    let executionPlan: ExecutionPlan | undefined;
    if (this.isComplexProblem(context.problem)) {
      const problem: Problem = {
        id: `problem_${Date.now()}`,
        description: context.problem,
        constraints: context.constraints,
        objectives: context.objectives,
        context: context.historicalContext,
        complexity: this.calculateComplexity(context),
      };

      const subProblems = await this.problemDecomposition.decomposeProblem(problem);
      const solutions = new Map<string, string>();

      for (const subProblem of subProblems) {
        const solution = await this.problemDecomposition.solveSubProblem(
          subProblem,
          context.historicalContext
        );
        solutions.set(subProblem.id, solution);
      }

      executionPlan = await this.problemDecomposition.generateExecutionPlan(
        problem,
        subProblems,
        solutions
      );
    }

    // 7. 生成决策说明
    const reasoning = this.generateDecisionReasoning(
      context,
      multiStepAnalysis,
      causalAnalysis,
      recommendedOption
    );

    // 8. 计算整体置信度
    const confidence = this.calculateDecisionConfidence(
      multiStepAnalysis,
      causalAnalysis,
      recommendedOption
    );

    const decision: EnhancedDecision = {
      userId: context.userId,
      problem: context.problem,
      options: rankedOptions,
      recommendedOption,
      reasoning,
      multiStepAnalysis,
      causalAnalysis,
      executionPlan,
      confidence,
      timestamp: new Date(),
    };

    // 保存决策历史
    if (!this.decisionHistory.has(context.userId)) {
      this.decisionHistory.set(context.userId, []);
    }
    this.decisionHistory.get(context.userId)!.push(decision);

    return decision;
  }

  /**
   * 生成决策选项
   */
  private async generateDecisionOptions(
    context: DecisionContext,
    multiStepAnalysis: ReasoningResult,
    causalAnalysis: CausalAnalysisResult
  ): Promise<DecisionOption[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a decision analysis expert. Generate multiple decision options for the given problem.
For each option, provide:
1. A clear description
2. Reasoning behind it
3. Expected outcome
4. Potential risks
5. Potential benefits
6. Confidence level (0-1)
7. Estimated cost (0-1)
8. Estimated benefit (0-1)

Format your response as a JSON array of decision options.`,
          },
          {
            role: "user",
            content: `Problem: ${context.problem}\n\nConstraints: ${context.constraints.join(", ")}\n\nObjectives: ${context.objectives.join(", ")}\n\nMulti-step analysis: ${multiStepAnalysis.reasoning}\n\nCausal analysis: ${causalAnalysis.explanation}\n\nGenerate 3-5 decision options.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "decision_options",
            strict: true,
            schema: {
              type: "object",
              properties: {
                options: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      reasoning: { type: "string" },
                      expectedOutcome: { type: "string" },
                      risks: {
                        type: "array",
                        items: { type: "string" },
                      },
                      benefits: {
                        type: "array",
                        items: { type: "string" },
                      },
                      confidence: { type: "number" },
                      estimatedCost: { type: "number" },
                      estimatedBenefit: { type: "number" },
                    },
                    required: [
                      "description",
                      "reasoning",
                      "expectedOutcome",
                      "risks",
                      "benefits",
                      "confidence",
                      "estimatedCost",
                      "estimatedBenefit",
                    ],
                  },
                },
              },
              required: ["options"],
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      return parsed.options.map((opt: any, index: number) => ({
        id: `option_${index}`,
        description: opt.description,
        reasoning: opt.reasoning,
        expectedOutcome: opt.expectedOutcome,
        risks: opt.risks || [],
        benefits: opt.benefits || [],
        confidence: opt.confidence || 0.5,
        estimatedCost: opt.estimatedCost || 0.5,
        estimatedBenefit: opt.estimatedBenefit || 0.5,
      }));
    } catch (error) {
      console.error("Failed to generate decision options:", error);
      return [];
    }
  }

  /**
   * 排序决策选项
   */
  private rankOptions(options: DecisionOption[], context: DecisionContext): DecisionOption[] {
    // 计算每个选项的评分
    const scored = options.map((option) => {
      // 综合评分 = 置信度 × (收益 - 成本) × 目标匹配度
      const targetMatch = this.calculateTargetMatch(option, context.objectives);
      const constraintSatisfaction = this.calculateConstraintSatisfaction(
        option,
        context.constraints
      );

      const score =
        option.confidence *
        (option.estimatedBenefit - option.estimatedCost) *
        targetMatch *
        constraintSatisfaction;

      return { option, score };
    });

    // 按评分排序
    return scored.sort((a, b) => b.score - a.score).map((item) => item.option);
  }

  /**
   * 计算目标匹配度
   */
  private calculateTargetMatch(option: DecisionOption, objectives: string[]): number {
    if (objectives.length === 0) return 0.5;

    // 简单的文本相似度计算
    let matches = 0;
    const optionText = (option.description + option.expectedOutcome).toLowerCase();

    for (const objective of objectives) {
      if (optionText.includes(objective.toLowerCase())) {
        matches++;
      }
    }

    return Math.min(1, matches / objectives.length);
  }

  /**
   * 计算约束满足度
   */
  private calculateConstraintSatisfaction(
    option: DecisionOption,
    constraints: string[]
  ): number {
    if (constraints.length === 0) return 1;

    // 简单的约束检查
    let satisfied = 0;
    const optionText = (option.description + option.reasoning).toLowerCase();

    for (const constraint of constraints) {
      // 检查是否提到了约束
      if (optionText.includes(constraint.toLowerCase())) {
        satisfied++;
      }
    }

    return Math.min(1, satisfied / constraints.length);
  }

  /**
   * 检查是否是复杂问题
   */
  private isComplexProblem(problem: string): boolean {
    // 问题长度 > 100 字符或包含多个关键词
    const keywords = ["如何", "为什么", "什么时候", "哪个", "多个", "综合"];
    const hasKeywords = keywords.some((kw) => problem.includes(kw));

    return problem.length > 100 || hasKeywords;
  }

  /**
   * 计算问题复杂度
   */
  private calculateComplexity(context: DecisionContext): number {
    let complexity = 0;

    // 基于问题长度
    complexity += Math.min(0.3, context.problem.length / 500);

    // 基于约束数量
    complexity += Math.min(0.3, context.constraints.length / 10);

    // 基于目标数量
    complexity += Math.min(0.2, context.objectives.length / 5);

    // 基于历史上下文
    complexity += Math.min(0.2, context.historicalContext.length / 20);

    return Math.min(1, complexity);
  }

  /**
   * 生成决策说明
   */
  private generateDecisionReasoning(
    context: DecisionContext,
    multiStepAnalysis: ReasoningResult,
    causalAnalysis: CausalAnalysisResult,
    recommendedOption: DecisionOption
  ): string {
    return `
决策分析:
1. 多步推理分析: ${multiStepAnalysis.reasoning}
2. 因果关系分析: ${causalAnalysis.explanation}
3. 推荐选项: ${recommendedOption.description}
4. 选项推理: ${recommendedOption.reasoning}
5. 预期结果: ${recommendedOption.expectedOutcome}
6. 潜在风险: ${recommendedOption.risks.join(", ")}
7. 潜在收益: ${recommendedOption.benefits.join(", ")}
    `.trim();
  }

  /**
   * 计算决策置信度
   */
  private calculateDecisionConfidence(
    multiStepAnalysis: ReasoningResult,
    causalAnalysis: CausalAnalysisResult,
    recommendedOption: DecisionOption
  ): number {
    // 综合三个来源的置信度
    const avgConfidence =
      (multiStepAnalysis.confidence +
        causalAnalysis.confidence +
        recommendedOption.confidence) /
      3;

    return Math.min(1, avgConfidence);
  }

  /**
   * 获取用户的决策历史
   */
  getDecisionHistory(userId: string): EnhancedDecision[] {
    return this.decisionHistory.get(userId) || [];
  }

  /**
   * 获取决策统计信息
   */
  getStatistics(): {
    totalDecisions: number;
    averageConfidence: number;
    topRecommendedOptions: string[];
  } {
    let totalDecisions = 0;
    let totalConfidence = 0;
    const optionCounts = new Map<string, number>();

    for (const decisions of this.decisionHistory.values()) {
      for (const decision of decisions) {
        totalDecisions++;
        totalConfidence += decision.confidence;

        const optionDesc = decision.recommendedOption.description;
        optionCounts.set(optionDesc, (optionCounts.get(optionDesc) || 0) + 1);
      }
    }

    // 获取最常推荐的选项
    const topOptions = Array.from(optionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((item) => item[0]);

    return {
      totalDecisions,
      averageConfidence: totalDecisions > 0 ? totalConfidence / totalDecisions : 0,
      topRecommendedOptions: topOptions,
    };
  }
}

/**
 * 创建全局增强决策引擎实例
 */
let _enhancedDecisionEngine: EnhancedDecisionEngine | null = null;

export async function getEnhancedDecisionEngine(): Promise<EnhancedDecisionEngine> {
  if (!_enhancedDecisionEngine) {
    _enhancedDecisionEngine = new EnhancedDecisionEngine();
  }
  return _enhancedDecisionEngine;
}
