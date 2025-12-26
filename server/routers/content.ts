import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { contentGenerationEngine } from "../services/contentGenerationEngine";
import { getDb } from "../db";
import { contentDrafts, socialMediaAccounts } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const contentRouter = router({
  /**
   * 生成内容草稿
   */
  generateDraft: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        topic: z.string().optional(),
        tone: z.string().optional(),
        length: z.enum(["short", "medium", "long"]).optional(),
        includeHashtags: z.boolean().optional().default(true),
        includeEmojis: z.boolean().optional().default(true),
        customInstructions: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 验证账户所有权
      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, input.accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        const content = await contentGenerationEngine.generateContent(
          input.accountId,
          {
            topic: input.topic,
            tone: input.tone,
            length: input.length,
            includeHashtags: input.includeHashtags,
            includeEmojis: input.includeEmojis,
            customInstructions: input.customInstructions
          }
        );

        return {
          success: true,
          content
        };
      } catch (error) {
        console.error("[ContentRouter] Generate draft failed:", error);
        throw error;
      }
    }),

  /**
   * 生成多个内容选项
   */
  generateMultipleOptions: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        count: z.number().min(1).max(5).default(3),
        topic: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 验证账户所有权
      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, input.accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        const options = await contentGenerationEngine.generateMultipleOptions(
          input.accountId,
          input.count,
          { topic: input.topic }
        );

        return {
          success: true,
          options
        };
      } catch (error) {
        console.error("[ContentRouter] Generate multiple options failed:", error);
        throw error;
      }
    }),

  /**
   * 获取内容建议
   */
  getSuggestions: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        context: z.string().optional()
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 验证账户所有权
      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, input.accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        const suggestions = await contentGenerationEngine.getContentSuggestions(
          input.accountId,
          input.context
        );

        return {
          success: true,
          suggestions
        };
      } catch (error) {
        console.error("[ContentRouter] Get suggestions failed:", error);
        throw error;
      }
    }),

  /**
   * 改进内容
   */
  refineDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.number(),
        feedback: z.string()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 获取草稿并验证所有权
      const draft = await db
        .select()
        .from(contentDrafts)
        .where(eq(contentDrafts.id, input.draftId))
        .limit(1);

      if (!draft.length) {
        throw new Error("Draft not found");
      }

      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, draft[0].accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        const refinedContent = await contentGenerationEngine.refineContent(
          input.draftId,
          input.feedback
        );

        return {
          success: true,
          content: refinedContent
        };
      } catch (error) {
        console.error("[ContentRouter] Refine draft failed:", error);
        throw error;
      }
    }),

  /**
   * 获取草稿列表
   */
  listDrafts: protectedProcedure
    .input(
      z.object({
        accountId: z.number(),
        status: z.enum(["draft", "approved", "published", "rejected", "archived"]).optional()
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 验证账户所有权
      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, input.accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        let query = db
          .select()
          .from(contentDrafts)
          .where(eq(contentDrafts.accountId, input.accountId));

        if (input.status) {
          query = query.where(eq(contentDrafts.status, input.status));
        }

        const drafts = await query;

        return {
          success: true,
          drafts: drafts.map(d => ({
            ...d,
            novaInsight: d.novaInsight ? JSON.parse(d.novaInsight) : null
          }))
        };
      } catch (error) {
        console.error("[ContentRouter] List drafts failed:", error);
        throw error;
      }
    }),

  /**
   * 更新草稿状态
   */
  updateDraftStatus: protectedProcedure
    .input(
      z.object({
        draftId: z.number(),
        status: z.enum(["draft", "approved", "published", "rejected", "archived"]),
        rejectionReason: z.string().optional()
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 获取草稿并验证所有权
      const draft = await db
        .select()
        .from(contentDrafts)
        .where(eq(contentDrafts.id, input.draftId))
        .limit(1);

      if (!draft.length) {
        throw new Error("Draft not found");
      }

      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, draft[0].accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        const updateData: any = {
          status: input.status
        };

        if (input.status === "approved") {
          updateData.userApprovedAt = new Date();
        }

        if (input.status === "rejected") {
          updateData.rejectionReason = input.rejectionReason;
        }

        if (input.status === "published") {
          updateData.publishedAt = new Date();
        }

        await db
          .update(contentDrafts)
          .set(updateData)
          .where(eq(contentDrafts.id, input.draftId));

        return {
          success: true,
          message: `Draft status updated to ${input.status}`
        };
      } catch (error) {
        console.error("[ContentRouter] Update draft status failed:", error);
        throw error;
      }
    }),

  /**
   * 删除草稿
   */
  deleteDraft: protectedProcedure
    .input(z.object({ draftId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // 获取草稿并验证所有权
      const draft = await db
        .select()
        .from(contentDrafts)
        .where(eq(contentDrafts.id, input.draftId))
        .limit(1);

      if (!draft.length) {
        throw new Error("Draft not found");
      }

      const account = await db
        .select()
        .from(socialMediaAccounts)
        .where(eq(socialMediaAccounts.id, draft[0].accountId))
        .limit(1);

      if (!account.length || account[0].userId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }

      try {
        await db
          .update(contentDrafts)
          .set({ status: "archived" })
          .where(eq(contentDrafts.id, input.draftId));

        return {
          success: true,
          message: "Draft archived"
        };
      } catch (error) {
        console.error("[ContentRouter] Delete draft failed:", error);
        throw error;
      }
    })
});
