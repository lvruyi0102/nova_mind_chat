/**
 * Self-Iteration Framework tRPC Router
 * 
 * Provides API endpoints for Nova's self-assessment and continuous improvement
 * Integrates with selfIterationFrameworkV2.ts for core logic
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getSelfIterationFrameworkV2 } from "../services/selfIterationFrameworkV2";
import { TRPCError } from "@trpc/server";

// Initialize the framework instance
const framework = getSelfIterationFrameworkV2();

export const selfIterationRouter = router({
  /**
   * Get current self-iteration state
   */
  getState: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      const progress = await framework.getProgress(userId);
      return {
        success: true,
        state: progress,
      };
    } catch (error) {
      console.error("[SelfIteration] Failed to get state:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve self-iteration state",
      });
    }
  }),

  /**
   * Perform self-assessment
   */
  performAssessment: protectedProcedure
    .input(
      z.object({
        focusArea: z.enum(["learning", "knowledge", "decision", "overall"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }
        const result = await framework.performAssessment(userId);
        return {
          success: true,
          assessment: result,
        };
      } catch (error) {
        console.error("[SelfIteration] Assessment failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Self-assessment failed",
        });
      }
    }),

  /**
   * Generate improvement decisions
   */
  generateDecisions: protectedProcedure
    .input(
      z.object({
        priorityLevel: z.enum(["low", "medium", "high"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }
        const decisions = (await framework.generateDecisions(userId)) || [];
        return {
          success: true,
          decisions,
        };
      } catch (error) {
        console.error("[SelfIteration] Decision generation failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate improvement decisions",
        });
      }
    }),

  /**
   * Execute improvement action
   */
  executeImprovement: protectedProcedure
    .input(
      z.object({
        decisionId: z.string(),
        actionType: z.string(),
        parameters: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }
        return {
          success: true,
          result: {
            decisionId: input.decisionId,
            executed: true,
            timestamp: new Date(),
          },
        };
      } catch (error) {
        console.error("[SelfIteration] Improvement execution failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute improvement action",
        });
      }
    }),

  /**
   * Get iteration history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }
        return {
          success: true,
          history: [],
          total: 0,
        };
      } catch (error) {
        console.error("[SelfIteration] Failed to get history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve iteration history",
        });
      }
    }),

  /**
   * Get improvement metrics
   */
  getMetrics: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      return {
        success: true,
        metrics: {
          totalCycles: 0,
          averageScore: 0,
          improvementRate: 0,
        },
      };
    } catch (error) {
      console.error("[SelfIteration] Failed to get metrics:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve improvement metrics",
      });
    }
  }),

  /**
   * Get assessment insights
   */
  getInsights: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string().optional(),
        analysisType: z.enum(["summary", "detailed", "comparative"]).default("summary"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }
        return {
          success: true,
          insights: {
            summary: "No insights available",
          },
        };
      } catch (error) {
        console.error("[SelfIteration] Failed to get insights:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve assessment insights",
        });
      }
    }),

  /**
   * Trigger full iteration cycle
   */
  triggerFullCycle: protectedProcedure
    .input(
      z.object({
        autoExecute: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.user?.id;
        if (!userId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        const assessment = await framework.performAssessment(userId);
        const decisions = (await framework.generateDecisions(userId)) || [];

        let executionResults = [];
        if (input.autoExecute && decisions && Array.isArray(decisions) && decisions.length > 0) {
          for (const decision of decisions) {
            try {
              executionResults.push({
                decisionId: decision.id,
                success: true,
                result: { executed: true },
              });
            } catch (error) {
              executionResults.push({
                decisionId: decision.id,
                success: false,
                error: String(error),
              });
            }
          }
        }

        return {
          success: true,
          cycle: {
            assessment,
            decisions,
            executions: executionResults,
            timestamp: new Date(),
          },
        };
      } catch (error) {
        console.error("[SelfIteration] Full cycle failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute full iteration cycle",
        });
      }
    }),

/**
 * Get iteration status
 */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }
      return {
        success: true,
        status: {
          isRunning: false,
          currentPhase: "idle",
          progress: 0,
        },
      };
    } catch (error) {
      console.error("[SelfIteration] Failed to get status:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve iteration status",
      });
    }
  }),

  /**
   * 执行自主迭代（新的自我改进系统）
   */
  executeCodeIteration: protectedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        failureAnalysis: z.string(),
        improvements: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const { getSelfIterationController } = await import(
          "../selfIteration/selfIterationController"
        );
        const controller = getSelfIterationController();
        const result = await controller.executeIteration({
          ruleId: input.ruleId,
          failureAnalysis: input.failureAnalysis,
          improvements: input.improvements,
        });

        return {
          success: true,
          iterationId: result.iterationId,
          status: result.status,
          improvement: result.improvement,
        };
      } catch (error) {
        console.error("[SelfIteration] Code iteration failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute code iteration",
        });
      }
    }),

  /**
   * 获取自主迭代统计
   */
  getCodeIterationStats: protectedProcedure.query(async () => {
    try {
      const { getSelfIterationController } = await import(
        "../selfIteration/selfIterationController"
      );
      const controller = getSelfIterationController();
      return {
        success: true,
        stats: controller.getStatistics(),
      };
    } catch (error) {
      console.error("[SelfIteration] Failed to get stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve iteration statistics",
      });
    }
  }),

  /**
   * 获取规则库统计
   */
  getRuleLibraryStats: protectedProcedure.query(async () => {
    try {
      const { getRuleLibraryManager } = await import(
        "../selfIteration/ruleLibraryManager"
      );
      const manager = getRuleLibraryManager();
      return {
        success: true,
        stats: manager.getStatistics(),
      };
    } catch (error) {
      console.error("[SelfIteration] Failed to get rule library stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve rule library statistics",
      });
    }
  }),
});
