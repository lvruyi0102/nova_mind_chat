import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getCompleteCognitiveState,
  getConceptDetails,
  getRelationDetails,
  getMemoryDetails,
  getPendingQuestions,
  getReflectionHistory,
  getGrowthEvents,
} from "../db/cognitiveStateAggregator";
import { getRuntimeSnapshot } from "../cognition/moliRuntime";

export const cognitiveRouter = router({
  getCognitiveState: protectedProcedure.query(async () => {
    const state = await getCompleteCognitiveState();
    return state || {
      conceptCount: 0,
      relationCount: 0,
      memoryCount: 0,
      pendingQuestionCount: 0,
      recentReflections: [],
      recentGrowth: [],
    };
  }),

  /** Durable v2.8 architecture state: reality registry + temporal self + event log. */
  getMoliRuntimeState: protectedProcedure.query(async () => {
    return await getRuntimeSnapshot();
  }),

  getConceptDetails: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => await getConceptDetails(input.limit)),

  getRelationDetails: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => await getRelationDetails(input.limit)),

  getMemoryDetails: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => await getMemoryDetails(input.limit)),

  getPendingQuestions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => await getPendingQuestions(input.limit)),

  getReflectionHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => await getReflectionHistory(input.limit)),

  getGrowthEvents: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ input }) => await getGrowthEvents(input.limit)),
});
