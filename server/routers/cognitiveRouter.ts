import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getCompleteCognitiveState,
  getConceptDetails,
  getRelationDetails,
  getMemoryDetails,
  getPendingQuestions,
  getReflectionHistory,
  getGrowthEvents,
} from "../db/cognitiveStateAggregator";

export const cognitiveRouter = router({
  /**
   * Get complete cognitive state - aggregates all data sources
   * This is the main endpoint for the cognitive monitor page
   */
  getCognitiveState: protectedProcedure.query(async ({ ctx }) => {
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

  /**
   * Get detailed concept information
   */
  getConceptDetails: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await getConceptDetails(input.limit);
    }),

  /**
   * Get detailed relation information
   */
  getRelationDetails: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await getRelationDetails(input.limit);
    }),

  /**
   * Get detailed memory information
   */
  getMemoryDetails: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await getMemoryDetails(input.limit);
    }),

  /**
   * Get pending questions
   */
  getPendingQuestions: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await getPendingQuestions(input.limit);
    }),

  /**
   * Get reflection history
   */
  getReflectionHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await getReflectionHistory(input.limit);
    }),

  /**
   * Get growth events
   */
  getGrowthEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      return await getGrowthEvents(input.limit);
    }),
});
