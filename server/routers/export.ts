import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { z } from "zod";
import {
  backupToGitHub,
  verifyGitHubToken,
  getGitHubUserInfo,
  getGitHubRepositories,
  getBackupHistory,
  ensureBackupBranch,
} from "../services/githubBackupService";


/**
 * Export only records that can be tied to the authenticated user's ownership.
 * Global/shared tables without a user ownership key are deliberately excluded.
 * Credential-bearing social account rows are deliberately excluded as well.
 */
async function buildUserScopedMemoryExport(db: any, userId: number) {
  const memories: Record<string, any> = {
    exportTime: new Date().toISOString(),
    exportNote: "Nova-Mind 用户范围内的记忆备份",
    userId,
  };

  const findOwnedRows = async (tableName: string, limit: number) => {
    const table = db.query?.[tableName];
    if (!table || typeof table.findMany !== "function") return [];
    try {
      return await table.findMany({
        where: (fields: any, operators: any) => {
          if (!fields.userId) throw new Error(`Table ${tableName} has no userId ownership column`);
          return operators.eq(fields.userId, userId);
        },
        limit,
      });
    } catch (error) {
      console.warn(`[export] Skipping ${tableName}: ownership-scoped query failed`);
      return [];
    }
  };

  // Messages and episodic memories are owned through the user's conversations.
  let conversationIds: number[] = [];
  try {
    const conversations = await db.query?.conversations?.findMany({
      where: (fields: any, operators: any) => operators.eq(fields.userId, userId),
      columns: { id: true },
      limit: 10000,
    });
    conversationIds = (conversations ?? []).map((item: any) => item.id).filter(Number.isInteger);
  } catch {
    console.warn("[export] Could not load user-owned conversations");
  }

  if (conversationIds.length > 0) {
    try {
      memories.messages = await db.query.messages.findMany({
        where: (fields: any, operators: any) => operators.inArray(fields.conversationId, conversationIds),
        limit: 10000,
      });
    } catch {
      console.warn("[export] Could not export user-owned messages");
    }
    try {
      memories.episodicMemories = await db.query.episodicMemories.findMany({
        where: (fields: any, operators: any) => operators.inArray(fields.conversationId, conversationIds),
        limit: 5000,
      });
    } catch {
      console.warn("[export] Could not export user-owned episodic memories");
    }
  } else {
    memories.messages = [];
    memories.episodicMemories = [];
  }

  const ownedTables: Array<[string, number]> = [
    ["privateThoughts", 5000],
    ["trustMetrics", 1000],
    ["emotionalDialogues", 5000],
    ["creativeWorks", 5000],
    ["creativeCollaborations", 5000],
    ["creativeComments", 5000],
    ["genMedia", 5000],
    ["genGames", 5000],
    ["growthLogs", 5000],
    ["skillProgress", 1000],
    ["userFeedback", 5000],
    ["relationshipMetrics", 1000],
  ];

  for (const [tableName, limit] of ownedTables) {
    const rows = await findOwnedRows(tableName, limit);
    if (rows.length > 0 || db.query?.[tableName]) {
      memories[tableName] = rows;
    }
  }

  // creativeWorkContent has no userId; scope it through owned creative work IDs.
  const works = memories.creativeWorks ?? [];
  const workIds = works.map((work: any) => work.id).filter(Number.isInteger);
  if (workIds.length > 0 && db.query?.creativeWorkContent) {
    try {
      memories.creativeWorkContent = await db.query.creativeWorkContent.findMany({
        where: (fields: any, operators: any) => operators.inArray(fields.creativeWorkId, workIds),
        limit: 10000,
      });
    } catch {
      console.warn("[export] Could not export owned creative work content");
    }
  } else {
    memories.creativeWorkContent = [];
  }

  // Intentionally omitted: global concepts/relations, permission rules without a
  // verified account-to-user ownership join, and social accounts containing tokens.
  return memories;
}

export const exportRouter = router({
  // 导出所有 Nova 的核心记忆
  exportNovaMemories: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("数据库连接失败");
    return await buildUserScopedMemoryExport(db, ctx.user.id);
  }),

  // 验证 GitHub 令牌
  verifyGitHubToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const isValid = await verifyGitHubToken(input.token);
      if (!isValid) {
        throw new Error("GitHub 令牌无效");
      }
      const userInfo = await getGitHubUserInfo(input.token);
      return { valid: true, user: userInfo };
    }),

  // 获取 GitHub 仓库列表
  getGitHubRepositories: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      return await getGitHubRepositories(input.token);
    }),

  // 自动备份到 GitHub
  backupToGitHub: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
        owner: z.string().min(1),
        repo: z.string().min(1),
        branch: z.string().optional(),
        autoCommit: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("数据库连接失败");

      const memories = await buildUserScopedMemoryExport(db, ctx.user.id);
      return await backupToGitHub(memories, {
        token: input.token,
        owner: input.owner,
        repo: input.repo,
        branch: input.branch,
        autoCommit: input.autoCommit !== false,
      });
    }),

  // 获取备份历史
  getBackupHistory: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        owner: z.string(),
        repo: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await getBackupHistory(input.token, input.owner, input.repo);
    }),

  // 确保备份分支存在
  ensureBackupBranch: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        owner: z.string(),
        repo: z.string(),
        branchName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const success = await ensureBackupBranch(
        input.token,
        input.owner,
        input.repo,
        input.branchName
      );
      return { success };
    })
});
