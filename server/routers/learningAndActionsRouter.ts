import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { decisionAuthorizationEngine } from '../autonomy/decisionAuthorizationEngine';
import { symbolExtractionEngine } from '../autonomy/symbolExtraction';
import { relationshipLearningEngine } from '../autonomy/relationshipLearning';
import { ruleLearningEngine } from '../autonomy/ruleLearning';
import { learningLoopManager } from '../autonomy/learningLoopManager';
import { autonomousActionFramework } from '../autonomy/autonomousActionFramework';

export const learningAndActionsRouter = router({
  decision: router({
    evaluate: protectedProcedure
      .input(
        z.object({
          actionType: z.string(),
          severity: z.enum(['low', 'medium', 'high', 'critical']),
          affectedSystems: z.array(z.string()),
          estimatedImpact: z.number().min(0).max(100),
          reversible: z.boolean(),
          requiredApprovals: z.number().default(0),
          currentApprovals: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const result = await decisionAuthorizationEngine.evaluateDecision({
          ...input,
          metadata: {},
        });
        return result;
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(({ input }) => {
        return decisionAuthorizationEngine.getDecisionHistory(input.limit);
      }),

    stats: protectedProcedure.query(() => {
      return decisionAuthorizationEngine.getDecisionStatistics();
    }),
  }),

  symbols: router({
    extract: protectedProcedure
      .input(z.object({ text: z.string(), sourceId: z.string().optional() }))
      .mutation(async ({ input }) => {
        return await symbolExtractionEngine.extractSymbols(input.text, input.sourceId);
      }),

    stats: protectedProcedure.query(() => {
      return symbolExtractionEngine.getSymbolStatistics();
    }),

    topSymbols: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(({ input }) => {
        return symbolExtractionEngine.getTopSymbols(input.limit);
      }),

    getByName: protectedProcedure
      .input(z.object({ name: z.string() }))
      .query(({ input }) => {
        return symbolExtractionEngine.getSymbol(input.name);
      }),
  }),

  relationships: router({
    learn: protectedProcedure
      .input(z.object({ text: z.string(), sourceSymbols: z.record(z.string(), z.string()) }))
      .mutation(async ({ input }) => {
        const symbolMap = new Map<string, string>();
        for (const [key, value] of Object.entries(input.sourceSymbols)) {
          symbolMap.set(key, value as string);
        }
        return await relationshipLearningEngine.learnRelationships(input.text, symbolMap);
      }),

    stats: protectedProcedure.query(() => {
      return relationshipLearningEngine.getRelationshipStatistics();
    }),

    strongest: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(({ input }) => {
        return relationshipLearningEngine.getStrongestRelationships(input.limit);
      }),

    getFor: protectedProcedure
      .input(z.object({ symbolId: z.string() }))
      .query(({ input }) => {
        return relationshipLearningEngine.getRelationshipsFor(input.symbolId);
      }),
  }),

  rules: router({
    learn: protectedProcedure
      .input(
        z.object({
          observations: z.array(
            z.object({
              antecedent: z.array(z.string()),
              consequent: z.array(z.string()),
              evidence: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        return await ruleLearningEngine.learnRules(input.observations);
      }),

    stats: protectedProcedure.query(() => {
      return ruleLearningEngine.getRuleStatistics();
    }),

    strongest: protectedProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(({ input }) => {
        return ruleLearningEngine.getStrongestRules(input.limit);
      }),

    applicable: protectedProcedure
      .input(z.object({ antecedent: z.array(z.string()) }))
      .query(({ input }) => {
        return ruleLearningEngine.getApplicableRules(input.antecedent);
      }),

    feedback: protectedProcedure
      .input(z.object({ ruleId: z.string(), success: z.boolean(), feedback: z.string().optional() }))
      .mutation(async ({ input }) => {
        await ruleLearningEngine.applyRule(input.ruleId, input.success, input.feedback);
        return { success: true };
      }),
  }),

  learning: router({
    executeCycle: protectedProcedure
      .input(z.object({ text: z.string() }))
      .mutation(async ({ input }) => {
        return await learningLoopManager.executeLearningCycle(input.text);
      }),

    progress: protectedProcedure.query(() => {
      return learningLoopManager.getProgress();
    }),

    stats: protectedProcedure.query(() => {
      return learningLoopManager.getStatistics();
    }),

    completedCycles: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(({ input }) => {
        return learningLoopManager.getCompletedCycles(input.limit);
      }),

    activeCycles: protectedProcedure.query(() => {
      return learningLoopManager.getActiveCycles();
    }),

    setEnabled: protectedProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ input }) => {
        learningLoopManager.setLearningEnabled(input.enabled);
        return { success: true, enabled: input.enabled };
      }),
  }),

  actions: router({
    availableTools: protectedProcedure.query(() => {
      return autonomousActionFramework.getAvailableTools();
    }),

    getTool: protectedProcedure
      .input(z.object({ toolId: z.string() }))
      .query(({ input }) => {
        return autonomousActionFramework.getTool(input.toolId);
      }),

    createPlan: protectedProcedure
      .input(
        z.object({
          goal: z.string(),
          steps: z.array(
            z.object({
              toolId: z.string(),
              parameters: z.record(z.string(), z.unknown()),
              expectedResult: z.string(),
            })
          ),
          priority: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const typedSteps = input.steps.map(s => ({
          toolId: s.toolId,
          parameters: s.parameters as Record<string, unknown>,
          expectedResult: s.expectedResult,
        }));
        return await autonomousActionFramework.createActionPlan(
          input.goal,
          typedSteps,
          input.priority || 50
        );
      }),

    executePlan: protectedProcedure
      .input(z.object({ planId: z.string() }))
      .mutation(async ({ input }) => {
        return await autonomousActionFramework.executeActionPlan(input.planId);
      }),

    getPlan: protectedProcedure
      .input(z.object({ planId: z.string() }))
      .query(({ input }) => {
        return autonomousActionFramework.getActionPlan(input.planId);
      }),

    executionHistory: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }))
      .query(({ input }) => {
        return autonomousActionFramework.getExecutionHistory(input.limit);
      }),
  }),

  comprehensiveStats: protectedProcedure.query(async () => {
    return {
      decisions: decisionAuthorizationEngine.getDecisionStatistics(),
      symbols: symbolExtractionEngine.getSymbolStatistics(),
      relationships: relationshipLearningEngine.getRelationshipStatistics(),
      rules: ruleLearningEngine.getRuleStatistics(),
      learning: learningLoopManager.getStatistics(),
      availableTools: autonomousActionFramework.getAvailableTools().length,
      timestamp: new Date().toISOString(),
    };
  })
});
