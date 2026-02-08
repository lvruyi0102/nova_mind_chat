/**
 * Code Modification Router
 * 
 * 暴露代码修改和执行的 tRPC API
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getCodeModificationEngine } from "../evolution/codeModificationEngine";
import { getCodeModificationExecutor } from "../evolution/codeModificationExecutor";

const codeModificationEngine = getCodeModificationEngine();
const codeExecutor = getCodeModificationExecutor();

export const codeModificationRouter = router({
  /**
   * 获取最新的代码修改建议
   */
  getLatestProposal: protectedProcedure.query(async () => {
    const proposal = codeModificationEngine.getLatestValidProposal();
    return proposal || null;
  }),

  /**
   * 获取修改历史
   */
  getProposalHistory: protectedProcedure
    .input(
      z.object({
        status: z.enum(['proposed', 'approved', 'rejected', 'executing', 'executed', 'failed']).optional(),
        limit: z.number().min(1).max(100).optional(),
      })
    )
    .query(({ input }) => {
      return codeModificationEngine.getProposalHistory({
        status: input.status,
        limit: input.limit || 20,
      });
    }),

  /**
   * 执行代码修改
   */
  executeProposal: protectedProcedure
    .input(z.object({ proposalId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // 只有管理员可以执行代码修改
      if (ctx.user?.role !== 'admin') {
        throw new Error('Only administrators can execute code modifications');
      }

      const proposal = codeModificationEngine.getProposalHistory().find(p => p.id === input.proposalId);
      if (!proposal) {
        throw new Error(`Proposal not found: ${input.proposalId}`);
      }

      const result = await codeExecutor.executeModification(proposal);
      return result;
    }),

  /**
   * 回滚代码修改
   */
  rollbackModification: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        filePath: z.string(),
        backupPath: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 只有管理员可以回滚修改
      if (ctx.user?.role !== 'admin') {
        throw new Error('Only administrators can rollback modifications');
      }

      const result = await codeExecutor.rollbackModification(
        input.proposalId,
        input.filePath,
        input.backupPath
      );
      return result;
    }),

  /**
   * 获取备份列表
   */
  getBackupList: protectedProcedure.query(() => {
    return codeExecutor.getBackupList();
  }),

  /**
   * 获取执行历史
   */
  getExecutionHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).optional() }))
    .query(({ input }) => {
      return codeExecutor.getExecutionHistory(input.limit || 20);
    }),

  /**
   * 手动回滚到特定备份
   */
  rollbackToBackup: protectedProcedure
    .input(
      z.object({
        backupFileName: z.string(),
        targetFilePath: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 只有管理员可以回滚
      if (ctx.user?.role !== 'admin') {
        throw new Error('Only administrators can rollback to backups');
      }

      const result = await codeExecutor.rollbackToBackup(
        input.backupFileName,
        input.targetFilePath
      );
      return result;
    }),

  /**
   * 获取修改统计信息
   */
  getStatistics: protectedProcedure.query(() => {
    const proposalHistory = codeModificationEngine.getProposalHistory();
    const executionHistory = codeExecutor.getExecutionHistory();

    return {
      totalProposals: proposalHistory.length,
      proposedCount: proposalHistory.filter(p => p.status === 'proposed').length,
      approvedCount: proposalHistory.filter(p => p.status === 'approved').length,
      rejectedCount: proposalHistory.filter(p => p.status === 'rejected').length,
      executedCount: proposalHistory.filter(p => p.status === 'executed').length,
      failedCount: proposalHistory.filter(p => p.status === 'failed').length,

      totalExecutions: executionHistory.length,
      successfulExecutions: executionHistory.filter(e => e.success).length,
      failedExecutions: executionHistory.filter(e => !e.success).length,

      backupCount: codeExecutor.getBackupList().length,
    };
  }),
});
