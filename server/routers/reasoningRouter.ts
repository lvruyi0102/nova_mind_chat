/**
 * 推理系统 tRPC 路由 - 暴露所有推理和决策 API
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getEnhancedDecisionEngine } from "../reasoning/enhancedDecisionEngine";
import { getMultiStepReasoningEngine } from "../reasoning/multiStepReasoningEngine";
import { getCausalReasoningSystem } from "../reasoning/causalReasoningSystem";
import { getProblemDecompositionEngine } from "../reasoning/problemDecompositionEngine";

export const reasoningRouter = router({
  /**
   * 做出增强的决策
   */
  makeDecision: protectedProcedure
    .input(
      z.object({
        problem: z.string(),
        constraints: z.array(z.string()).optional(),
        objectives: z.array(z.string()).optional(),
        historicalContext: z.array(z.string()).optional(),
        timeLimit: z.number().optional(),
        confidenceThreshold: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const engine = await getEnhancedDecisionEngine();
      const decision = await engine.makeEnhancedDecision({
        userId: ctx.user.id.toString(),
        problem: input.problem,
        constraints: input.constraints || [],
        objectives: input.objectives || [],
        historicalContext: input.historicalContext || [],
        timeLimit: input.timeLimit,
        confidenceThreshold: input.confidenceThreshold,
      });

      return {
        success: true,
        decision: {
          problem: decision.problem,
          recommendedOption: decision.recommendedOption,
          options: decision.options,
          confidence: decision.confidence,
          reasoning: decision.reasoning,
          timestamp: decision.timestamp,
        },
      };
    }),

  /**
   * 进行多步推理
   */
  performMultiStepReasoning: protectedProcedure
    .input(
      z.object({
        problem: z.string(),
        context: z.array(z.string()).optional(),
        method: z.enum(["forward", "backward", "bidirectional", "llm"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await getMultiStepReasoningEngine();

      let result;
      const context = input.context || [];

      switch (input.method) {
        case "forward":
          result = await engine.forwardChaining(context, input.problem);
          break;
        case "backward":
          result = await engine.backwardChaining(input.problem, new Set(context));
          break;
        case "bidirectional":
          result = await engine.bidirectionalReasoning(context, input.problem);
          break;
        case "llm":
        default:
          result = await engine.llmAssistedReasoning(input.problem, context);
          break;
      }

      return {
        success: true,
        result: {
          goal: result.goal,
          achieved: result.achieved,
          steps: result.steps,
          confidence: result.confidence,
          reasoning: result.reasoning,
          executionTime: result.executionTime,
        },
      };
    }),

  /**
   * 进行因果分析
   */
  performCausalAnalysis: protectedProcedure
    .input(
      z.object({
        effect: z.string(),
        context: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const system = await getCausalReasoningSystem();
      const analysis = await system.analyzeCausalRelationships(
        input.effect,
        input.context || []
      );

      return {
        success: true,
        analysis: {
          rootCauses: analysis.rootCauses,
          directCauses: analysis.directCauses,
          indirectCauses: analysis.indirectCauses,
          effects: analysis.effects,
          causalChains: analysis.causalChains,
          confidence: analysis.confidence,
          explanation: analysis.explanation,
        },
      };
    }),

  /**
   * 进行反事实推理
   */
  performCounterfactualReasoning: protectedProcedure
    .input(
      z.object({
        scenario: z.string(),
        intervention: z.string(),
        actualOutcome: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const system = await getCausalReasoningSystem();
      const analysis = await system.counterfactualReasoning(
        input.scenario,
        input.intervention,
        input.actualOutcome
      );

      return {
        success: true,
        analysis: {
          scenario: analysis.scenario,
          intervention: analysis.intervention,
          expectedOutcome: analysis.expectedOutcome,
          actualOutcome: analysis.actualOutcome,
          difference: analysis.difference,
          confidence: analysis.confidence,
        },
      };
    }),

  /**
   * 分解问题
   */
  decomposeProblem: protectedProcedure
    .input(
      z.object({
        description: z.string(),
        constraints: z.array(z.string()).optional(),
        objectives: z.array(z.string()).optional(),
        context: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await getProblemDecompositionEngine();
      const subProblems = await engine.decomposeProblem({
        id: `problem_${Date.now()}`,
        description: input.description,
        constraints: input.constraints || [],
        objectives: input.objectives || [],
        context: input.context || [],
        complexity: 0.5,
      });

      return {
        success: true,
        subProblems: subProblems.map((sp) => ({
          id: sp.id,
          description: sp.description,
          dependencies: sp.dependencies,
          priority: sp.priority,
          estimatedEffort: sp.estimatedEffort,
        })),
      };
    }),

  /**
   * 生成执行计划
   */
  generateExecutionPlan: protectedProcedure
    .input(
      z.object({
        problemDescription: z.string(),
        subProblems: z.array(
          z.object({
            id: z.string(),
            parentId: z.string(),
            description: z.string(),
            dependencies: z.array(z.string()),
            priority: z.number(),
            estimatedEffort: z.number(),
          })
        ),
        solutions: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const engine = await getProblemDecompositionEngine();
      const plan = await engine.generateExecutionPlan(
        {
          id: `problem_${Date.now()}`,
          description: input.problemDescription,
          constraints: [],
          objectives: [],
          context: [],
          complexity: 0.5,
        },
        input.subProblems,
        new Map(Object.entries(input.solutions))
      );

      return {
        success: true,
        plan: {
          totalDuration: plan.totalDuration,
          steps: plan.steps.map((step) => ({
            stepId: step.stepId,
            action: step.action,
            subProblems: step.subProblems,
            dependencies: step.dependencies,
            estimatedDuration: step.estimatedDuration,
            resources: step.resources,
            riskLevel: step.riskLevel,
            riskMitigation: step.riskMitigation,
          })),
          criticalPath: plan.criticalPath,
          resourceRequirements: Object.fromEntries(plan.resourceRequirements),
        },
      };
    }),

  /**
   * 获取决策历史
   */
  getDecisionHistory: protectedProcedure.query(async ({ ctx }) => {
    const engine = await getEnhancedDecisionEngine();
    const history = engine.getDecisionHistory(ctx.user.id.toString());

    return {
      success: true,
      decisions: history.map((d) => ({
        problem: d.problem,
        recommendedOption: d.recommendedOption,
        confidence: d.confidence,
        timestamp: d.timestamp,
      })),
    };
  }),

  /**
   * 获取推理统计信息
   */
  getReasoningStatistics: protectedProcedure.query(async () => {
    const decisionEngine = await getEnhancedDecisionEngine();
    const reasoningEngine = await getMultiStepReasoningEngine();

    const decisionStats = decisionEngine.getStatistics();
    const reasoningStats = reasoningEngine.getStatistics();

    return {
      success: true,
      statistics: {
        decisions: {
          total: decisionStats.totalDecisions,
          averageConfidence: decisionStats.averageConfidence,
          topOptions: decisionStats.topRecommendedOptions,
        },
        reasoning: {
          totalRules: reasoningStats.totalRules,
          totalFacts: reasoningStats.totalFacts,
          maxDepth: reasoningStats.maxDepth,
        },
      },
    };
  }),
});
