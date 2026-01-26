import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { MemoryMonitor } from "../services/memoryOptimization";

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
    // Get cleanup events from MemoryMonitor singleton
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
});
