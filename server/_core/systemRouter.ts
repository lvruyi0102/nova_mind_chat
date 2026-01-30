import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { MemoryMonitor } from "../services/memoryOptimization";
import { detectRelationshipMilestones, getRelationshipTimeline, getMilestoneStats } from "../services/relationshipMilestoneDetector";
import { getDb } from "../db";
import { conversations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { saveCreativeWork } from "../services/creativeWorkSaveService";

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

  getMemoryStats: protectedProcedure
    .input(z.void())
    .query(async () => {
      const monitor = MemoryMonitor.getInstance();
      const stats = monitor.getCurrentStats();
      return {
        heapUsed: stats.heapUsed,
        heapTotal: stats.heapTotal,
        heapUsagePercentage: stats.heapUsagePercentage,
        external: stats.external,
        rss: stats.rss,
        timestamp: stats.timestamp,
      };
    }),

  getCleanupEvents: protectedProcedure
    .input(z.void())
    .query(async () => {
      const monitor = MemoryMonitor.getInstance();
      return monitor.getCleanupHistory();
    }),

  getCreativeWorks: protectedProcedure
    .input(z.void())
    .query(async () => {
      return [];
    }),

  saveCreativeWork: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        category: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await saveCreativeWork({
          userId: ctx.user.id,
          title: input.title,
          content: input.content,
          type: "other",
          contentType: "text",
        });
        return result;
      } catch (error) {
        console.error("[systemRouter] Error saving creative work:", error);
        throw error;
      }
    }),

  getMilestones: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            milestones: [],
            stats: { totalMilestones: 0, recentMilestones: 0 },
          };
        }

        const userConversations = await db
          .select()
          .from(conversations)
          .where(eq(conversations.userId, ctx.user.id));

        const allMilestones: any[] = [];
        for (const conv of userConversations) {
          const milestones = await detectRelationshipMilestones(ctx.user.id, conv.id);
          allMilestones.push(...milestones);
        }

        return {
          milestones: allMilestones,
          stats: await getMilestoneStats(ctx.user.id),
        };
      } catch (error) {
        console.error("[systemRouter] Error getting milestones:", error);
        return {
          milestones: [],
          stats: { totalMilestones: 0, recentMilestones: 0 },
        };
      }
    }),

  getRelationshipTimeline: protectedProcedure
    .input(z.void())
    .query(async ({ ctx }) => {
      try {
        const timeline = await getRelationshipTimeline(ctx.user.id);
        const timelineArray = Array.isArray(timeline) ? timeline : [];
        return {
          timeline: timelineArray,
          total: timelineArray.length,
        };
      } catch (error) {
        console.error("[systemRouter] Error getting relationship timeline:", error);
        return {
          timeline: [],
          total: 0,
        };
      }
    }),
});
