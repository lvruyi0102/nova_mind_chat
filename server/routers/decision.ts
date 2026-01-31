/**
 * 决策引擎 tRPC 路由
 */

import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDecisionIntegration } from '../reasoning/decisionIntegration';
import { DecisionContext } from '../reasoning/decisionEngine';

export const decisionRouter = router({
  /**
   * 执行决策推理
   */
  makeDecision: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      currentState: z.record(z.string(), z.unknown()),
      goal: z.string().optional(),
      constraints: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const integration = getDecisionIntegration();

        const context: DecisionContext = {
          userId: ctx.user.id,
          conversationId: input.conversationId,
          currentState: input.currentState,
          goal: input.goal,
          constraints: input.constraints,
          timestamp: new Date(),
        };

        const decision = await integration.executeDecisionFlow(context);

        return {
          success: true,
          decision: {
            id: decision.id,
            action: decision.action,
            confidence: decision.confidence,
            explanation: decision.explanation,
            alternatives: decision.alternatives,
            reasoning: decision.reasoning.map(step => ({
              step: step.step,
              explanation: step.explanation,
              confidence: step.confidence,
            })),
          },
        };
      } catch (error) {
        console.error('[DecisionRouter] Error making decision:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * 获取决策引擎状态
   */
  getEngineState: protectedProcedure.query(async () => {
    try {
      const integration = getDecisionIntegration();
      const state = integration.getEngineState();

      return {
        success: true,
        state,
      };
    } catch (error) {
      console.error('[DecisionRouter] Error getting engine state:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * 获取所有事实
   */
  getAllFacts: protectedProcedure.query(async () => {
    try {
      const integration = getDecisionIntegration();
      const facts = integration.getAllFacts();

      return {
        success: true,
        facts: facts.map(f => ({
          symbol: f.symbol,
          value: f.value,
          confidence: f.confidence,
          source: f.source,
          timestamp: f.timestamp,
        })),
      };
    } catch (error) {
      console.error('[DecisionRouter] Error getting facts:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * 获取推理日志
   */
  getReasoningLogs: protectedProcedure.query(async () => {
    try {
      const integration = getDecisionIntegration();
      const logs = integration.getReasoningLogs();

      return {
        success: true,
        logs: logs.map(log => ({
          step: log.step,
          explanation: log.explanation,
          confidence: log.confidence,
        })),
      };
    } catch (error) {
      console.error('[DecisionRouter] Error getting reasoning logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
});

export default decisionRouter;
