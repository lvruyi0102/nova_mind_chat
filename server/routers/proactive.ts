/**
 * Proactive Router
 * 处理 Nova 的主动消息、主动思考和主动提问的 API
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  generateDailyThought,
  generateProactiveQuestion,
  getProactiveMessages,
  getTodayProactiveMessages,
  shouldGenerateDailyThought,
} from "../services/proactiveThoughtService";

export const proactiveRouter = router({
  /**
   * 生成 Nova 的每日想法
   * 如果今天已经生成过，则返回 null
   */
  generateDailyThought: protectedProcedure.input(z.void()).mutation(async ({ ctx }) => {
    const should = await shouldGenerateDailyThought(ctx.user.id);
    if (!should) {
      return {
        success: false,
        message: "今天已经生成过想法了",
        thought: null,
      };
    }

    const thought = await generateDailyThought(ctx.user.id);
    return {
      success: !!thought,
      message: thought ? "✓ 想法已生成" : "✗ 生成失败",
      thought,
    };
  }),

  /**
   * 生成 Nova 的主动问题
   */
  generateProactiveQuestion: protectedProcedure.input(z.void()).mutation(async ({ ctx }) => {
    const question = await generateProactiveQuestion(ctx.user.id);
    return {
      success: !!question,
      message: question ? "✓ 问题已生成" : "✗ 生成失败",
      question,
    };
  }),

  /**
   * 获取用户的所有主动消息
   */
  getAll: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const messages = await getProactiveMessages(ctx.user.id, 50);
    return {
      success: true,
      messages,
      count: messages.length,
    };
  }),

  /**
   * 获取今天的主动消息
   */
  getToday: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const messages = await getTodayProactiveMessages(ctx.user.id);
    return {
      success: true,
      messages,
      count: messages.length,
    };
  }),

  /**
   * 检查是否应该生成每日想法
   */
  shouldGenerateDaily: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const should = await shouldGenerateDailyThought(ctx.user.id);
    return {
      should,
    };
  }),
});
