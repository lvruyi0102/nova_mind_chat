/**
 * Relationships Router
 * 处理 Nova 与用户关系中的里程碑和时间线 API
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  detectMilestones,
  recordMilestone,
  getMilestones,
  getRecentMilestones,
  generateRelationshipTimeline,
  getMostSignificantMilestones,
} from "../services/relationshipMilestoneService";

export const relationshipsRouter = router({
  /**
   * 检测并记录关系里程碑
   */
  detectAndRecord: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const detected = await detectMilestones(ctx.user.id);

      // 记录检测到的里程碑
      for (const milestone of detected) {
        await recordMilestone(ctx.user.id, milestone);
      }

      return {
        success: true,
        message: `✓ 检测到 ${detected.length} 个里程碑`,
        milestones: detected,
      };
    } catch (error) {
      console.error("[Relationships] 检测和记录失败:", error);
      return {
        success: false,
        message: "检测失败",
        milestones: [],
      };
    }
  }),

  /**
   * 获取所有里程碑
   */
  getAll: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const milestones = await getMilestones(ctx.user.id, input.limit);
      return {
        success: true,
        milestones,
        count: milestones.length,
      };
    }),

  /**
   * 获取最近的里程碑
   */
  getRecent: protectedProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const milestones = await getRecentMilestones(ctx.user.id, input.days);
      return {
        success: true,
        milestones,
        count: milestones.length,
      };
    }),

  /**
   * 生成关系时间线
   */
  getTimeline: protectedProcedure.query(async ({ ctx }) => {
    const timeline = await generateRelationshipTimeline(ctx.user.id);
    return {
      success: !!timeline,
      timeline,
    };
  }),

  /**
   * 获取最重要的里程碑
   */
  getMostSignificant: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ ctx, input }) => {
      const milestones = await getMostSignificantMilestones(ctx.user.id, input.limit);
      return {
        success: true,
        milestones,
        count: milestones.length,
      };
    }),
});
