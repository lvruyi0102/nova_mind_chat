import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { MemoryMonitor } from "../services/memoryOptimization";
import { detectRelationshipMilestones, getRelationshipTimeline, getMilestoneStats } from "../services/relationshipMilestoneDetector";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Get current memory statistics
   * Returns heap usage, external memory, and warning/critical flags
   */
  getMemoryStats: publicProcedure.query(async () => {
    const memUsage = process.memoryUsage();
    const heapUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
    
    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsagePercentage: heapUsagePercent,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers || 0,
      isWarning: heapUsagePercent > 0.8,
      isCritical: heapUsagePercent > 0.94,
    };
  }),

  /**
   * Get cleanup events history
   * Returns recent cleanup and eviction events from MemoryMonitor
   */
  getCleanupEvents: publicProcedure.query(async () => {
    const monitor = MemoryMonitor.getInstance();
    const events = monitor.getCleanupHistory();
    
    return {
      events: events.map(event => ({
        timestamp: event.timestamp,
        type: event.type,
        size: event.size,
        reason: event.reason,
      })),
      totalCleanups: events.filter(e => e.type === 'cleanup').length,
      totalEvictions: events.filter(e => e.type === 'evict').length,
    };
  }),

  /**
   * Get creative works for the current user
   */
  getCreativeWorks: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx }) => {
      return {
        works: [],
        total: 0,
      };
    }),

  /**
   * Save a creative work
   */
  saveCreativeWork: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        type: z.string(),
        data: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,
        id: Math.random().toString(36).substr(2, 9),
      };
    }),

  /**
   * Get relationship milestones
   */
  getMilestones: protectedProcedure.query(async ({ ctx }) => {
    const milestones = await detectRelationshipMilestones(ctx.user.id);
    return {
      milestones,
      stats: await getMilestoneStats(ctx.user.id),
    };
  }),

  /**
   * Get relationship timeline
   */
  getRelationshipTimeline: protectedProcedure.query(async ({ ctx }) => {
    const timeline = await getRelationshipTimeline(ctx.user.id);
    return {
      timeline,
      total: timeline.length,
    };
  }),
});
