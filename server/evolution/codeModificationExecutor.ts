/**
 * Code Modification Executor
 * 
 * 执行代码修改并管理回滚机制
 * 确保修改的安全性和可恢复性
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { CodeModificationProposal } from './codeModificationEngine';

export interface ExecutionResult {
  success: boolean;
  proposalId: string;
  filePath: string;
  timestamp: Date;
  backupPath?: string;
  error?: string;
  metrics?: {
    executionTime: number; // ms
    fileSize: {
      before: number;
      after: number;
    };
  };
}

export interface RollbackResult {
  success: boolean;
  proposalId: string;
  filePath: string;
  timestamp: Date;
  error?: string;
}

/**
 * 代码修改执行器
 * 安全地执行代码修改并提供回滚能力
 */
export class CodeModificationExecutor {
  private backupDir = path.join(process.cwd(), 'server', 'evolution', 'backups');
  private executionHistory: ExecutionResult[] = [];
  private maxBackups = 50; // 最多保留 50 个备份

  constructor() {
    // 确保备份目录存在
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    const evolutionRoot = fs.realpathSync(path.resolve(process.cwd(), "server/evolution"));
    const realBackupDir = fs.realpathSync(this.backupDir);
    if (!this.isPathInside(evolutionRoot, realBackupDir) || realBackupDir === evolutionRoot) {
      throw new Error("Backup directory must resolve to a child of server/evolution");
    }
  }

  /**
   * 执行代码修改
   */
  async executeModification(proposal: CodeModificationProposal): Promise<ExecutionResult> {
    const startTime = Date.now();
    const result: ExecutionResult = {
      success: false,
      proposalId: proposal.id,
      filePath: proposal.filePath,
      timestamp: new Date(),
    };

    try {
      // Source self-modification is opt-in and forbidden in production until an
      // isolated worktree/container runner is available. Admin auth alone is not
      // enough protection for code that can rewrite the running application.
      if (process.env.NODE_ENV === "production") {
        throw new Error("Source self-modification is disabled in production; use an isolated validation runner.");
      }
      if (process.env.NOVA_SELF_MODIFICATION_ENABLED !== "true") {
        throw new Error("Self-modification is disabled. Set NOVA_SELF_MODIFICATION_ENABLED=true only in an isolated development/test environment.");
      }

      // 1. Resolve and validate the target path, including symlink escapes.
      const fullPath = this.resolveAllowedFilePath(proposal.filePath);

      // 2. 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }

      // 3. 读取原始文件内容
      const originalContent = fs.readFileSync(fullPath, 'utf-8');

      // 4. Build the resulting file content from either a whole-file proposal
      // or one exact, uniquely occurring code-fragment replacement.
      // A snippet must occur exactly once; ambiguous replacements are rejected.
      const nextContent = this.buildModifiedContent(
        originalContent,
        proposal.originalCode,
        proposal.modifiedCode
      );

      // 5. Create a recoverable backup before changing source.
      const backupPath = await this.createBackup(proposal.filePath, originalContent);
      result.backupPath = backupPath;

      // 6. Apply the proposed change.
      fs.writeFileSync(fullPath, nextContent, 'utf-8');

      // 7. Verify the actual resulting file.
      const modifiedContent = fs.readFileSync(fullPath, 'utf-8');
      if (modifiedContent !== nextContent) {
        throw new Error('Verification failed: written file does not match the computed result');
      }

      // 8. 记录执行成功
      result.success = true;
      result.metrics = {
        executionTime: Date.now() - startTime,
        fileSize: {
          before: originalContent.length,
          after: modifiedContent.length,
        },
      };

      this.executionHistory.push(result);

      console.log(`[CodeModificationExecutor] Successfully executed modification: ${proposal.id}`);
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      this.executionHistory.push(result);

      console.error(`[CodeModificationExecutor] Failed to execute modification: ${result.error}`);

      // 如果有备份，自动回滚
      if (result.backupPath) {
        await this.rollbackModification(proposal.id, proposal.filePath, result.backupPath);
      }

      return result;
    }
  }

  /**
   * Apply a proposed change, then run the repository's fixed validation scripts.
   * If type-checking or tests fail, restore the pre-change backup automatically.
   * Commands are fixed (no proposal-controlled shell text) and run with shell:false.
   */
  async executeAndValidateModification(proposal: CodeModificationProposal): Promise<ExecutionResult & {
    validation?: { passed: boolean; stage: string; exitCode?: number | null; output?: string };
    rollback?: RollbackResult;
  }> {
    const execution = await this.executeModification(proposal);
    if (!execution.success || !execution.backupPath) {
      return { ...execution, validation: { passed: false, stage: "write", output: execution.error || "Modification was not applied" } };
    }

    const checks: Array<{ stage: string; command: string; args: string[] }> = [
      { stage: "typecheck", command: "npm", args: ["run", "check"] },
      { stage: "tests", command: "npm", args: ["test"] },
    ];

    for (const check of checks) {
      const result = spawnSync(check.command, check.args, {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
        shell: false,
        env: { ...process.env, CI: "1" },
      });
      const output = [result.stdout, result.stderr, result.error?.message]
        .filter(Boolean).join("\n").slice(-12_000);
      if (result.error || result.status !== 0) {
        const rollback = await this.rollbackModification(proposal.id, proposal.filePath, execution.backupPath);
        const reason = result.error?.message || `${check.stage} exited with code ${result.status}`;
        const rollbackMessage = rollback.success
          ? "automatic rollback succeeded"
          : `AUTOMATIC ROLLBACK FAILED: ${rollback.error || "unknown rollback error"}`;
        return {
          ...execution,
          success: false,
          error: `Validation failed at ${check.stage}: ${reason}; ${rollbackMessage}`,
          validation: { passed: false, stage: check.stage, exitCode: result.status, output },
          rollback,
        };
      }
    }

    return {
      ...execution,
      validation: { passed: true, stage: "typecheck+tests", exitCode: 0, output: "Type-check and test scripts passed." },
    };
  }

  /**
   * 回滚修改
   */
  async rollbackModification(
    proposalId: string,
    filePath: string,
    backupPath: string
  ): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      proposalId,
      filePath,
      timestamp: new Date(),
    };

    try {
      // 1. 检查备份文件是否存在
      const resolvedBackupPath = path.resolve(backupPath);
      const resolvedBackupRoot = fs.realpathSync(this.backupDir);
      if (!this.isPathInside(resolvedBackupRoot, resolvedBackupPath) ||
          !fs.existsSync(resolvedBackupPath) ||
          !fs.statSync(resolvedBackupPath).isFile() ||
          !this.isPathInside(resolvedBackupRoot, fs.realpathSync(resolvedBackupPath))) {
        throw new Error("Backup path must reference a regular file inside the managed backup directory");
      }

      // 2. Read the verified backup content.
      const backupContent = fs.readFileSync(resolvedBackupPath, 'utf-8');

      // 3. Resolve and validate the target path again before restoring.
      const fullPath = this.resolveAllowedFilePath(filePath);
      fs.writeFileSync(fullPath, backupContent, 'utf-8');

      // 4. 验证恢复
      const restoredContent = fs.readFileSync(fullPath, 'utf-8');
      if (restoredContent !== backupContent) {
        throw new Error('Verification failed: restored content does not match backup');
      }

      result.success = true;
      console.log(`[CodeModificationExecutor] Successfully rolled back modification: ${proposalId}`);
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`[CodeModificationExecutor] Failed to rollback modification: ${result.error}`);
      return result;
    }
  }

  /**
   * 创建备份
   */
  private async createBackup(filePath: string, content: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = path.basename(filePath);
    const backupFileName = `${fileName}.${timestamp}.${randomUUID()}.backup`;
    const backupPath = path.join(this.backupDir, backupFileName);

    fs.writeFileSync(backupPath, content, 'utf-8');

    // 清理旧备份
    this.cleanupOldBackups();

    return backupPath;
  }

  /**
   * 清理旧备份
   */
  private cleanupOldBackups(): void {
    try {
      const files = fs.readdirSync(this.backupDir)
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      // 删除超过限制的旧备份
      if (files.length > this.maxBackups) {
        for (let i = this.maxBackups; i < files.length; i++) {
          fs.unlinkSync(files[i].path);
        }
      }
    } catch (error) {
      console.error('[CodeModificationExecutor] Failed to cleanup backups:', error);
    }
  }

  private isPathInside(base: string, target: string): boolean {
    const relative = path.relative(base, target);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
  }

  /**
   * Resolve a target file and enforce directory containment.
   * Reject traversal, absolute paths, and symlinks that escape the allowed roots.
   */
  private resolveAllowedFilePath(filePath: string): string {
    if (!filePath || path.isAbsolute(filePath) || filePath.includes("\0")) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    const normalizedInput = filePath.replace(/\\/g, "/");
    const segments = normalizedInput.split("/");
    if (segments.some(segment => segment === "." || segment === "..")) {
      throw new Error(`Path traversal is not allowed: ${filePath}`);
    }

    const root = process.cwd();
    const candidate = path.resolve(root, normalizedInput);
    const allowedRoots = [
      path.resolve(root, "server/evolution"),
      path.resolve(root, "server/autonomy"),
    ];
    const backupRoot = path.resolve(root, "server/evolution/backups");
    const configuredJournalPath = process.env.NOVA_SELF_MODIFICATION_STATE_PATH;
    const journalPaths = [
      path.resolve(root, "server/evolution/self-modification-state.json"),
      ...(configuredJournalPath ? [path.resolve(configuredJournalPath)] : []),
    ];
    if (this.isPathInside(backupRoot, candidate) || journalPaths.includes(candidate)) {
      throw new Error(`Self-modification cannot target its own backups or journal: ${filePath}`);
    }
    const isWithin = (base: string, target: string): boolean => {
      const relative = path.relative(base, target);
      return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
    };

    if (!allowedRoots.some(base => isWithin(base, candidate))) {
      throw new Error(`File path is outside allowed directories: ${filePath}`);
    }
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      throw new Error(`Target must be an existing regular file: ${filePath}`);
    }

    const realTarget = fs.realpathSync(candidate);
    const realAllowedRoots = allowedRoots.map(base => fs.realpathSync(base));
    if (!realAllowedRoots.some(base => isWithin(base, realTarget))) {
      throw new Error(`Symlink target is outside allowed directories: ${filePath}`);
    }
    return realTarget;
  }

  /**
   * Apply a whole-file replacement or a unique exact snippet replacement.
   * Exact matching is intentional: fuzzy edits can silently alter the wrong code.
   */
  private buildModifiedContent(actual: string, original: string, modified: string): string {
    if (!original || !modified) {
      throw new Error('Both originalCode and modifiedCode must be non-empty');
    }

    if (actual === original) {
      return modified;
    }

    const first = actual.indexOf(original);
    if (first < 0) {
      throw new Error('Original code snippet was not found; the file may have changed since the proposal was created.');
    }

    const second = actual.indexOf(original, first + original.length);
    if (second >= 0) {
      throw new Error('Original code snippet occurs more than once; refusing an ambiguous self-modification.');
    }

    return actual.slice(0, first) + modified + actual.slice(first + original.length);
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(limit?: number): ExecutionResult[] {
    const history = [...this.executionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * 获取备份列表
   */
  getBackupList(): Array<{
    fileName: string;
    filePath: string;
    timestamp: number;
    size: number;
  }> {
    try {
      return fs.readdirSync(this.backupDir)
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stat = fs.statSync(filePath);
          return {
            fileName: file,
            filePath,
            timestamp: stat.mtime.getTime(),
            size: stat.size,
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[CodeModificationExecutor] Failed to get backup list:', error);
      return [];
    }
  }

  /**
   * 手动回滚到特定备份
   */
  async rollbackToBackup(backupFileName: string, targetFilePath: string): Promise<RollbackResult> {
    const result: RollbackResult = {
      success: false,
      proposalId: `manual-rollback-${Date.now()}`,
      filePath: targetFilePath,
      timestamp: new Date(),
    };

    try {
      if (!backupFileName || path.basename(backupFileName) !== backupFileName) {
        throw new Error("Invalid backup filename");
      }
      const backupPath = path.resolve(this.backupDir, backupFileName);
      const backupRoot = fs.realpathSync(this.backupDir);
      if (!this.isPathInside(backupRoot, backupPath) ||
          !fs.existsSync(backupPath) ||
          !fs.statSync(backupPath).isFile() ||
          !this.isPathInside(backupRoot, fs.realpathSync(backupPath))) {
        throw new Error("Backup file must be a regular file inside the managed backup directory");
      }

      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const fullPath = this.resolveAllowedFilePath(targetFilePath);
      fs.writeFileSync(fullPath, backupContent, 'utf-8');
      if (fs.readFileSync(fullPath, 'utf-8') !== backupContent) {
        throw new Error("Verification failed: restored content does not match backup");
      }

      result.success = true;
      console.log(`[CodeModificationExecutor] Successfully rolled back to backup: ${backupFileName}`);
      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      console.error(`[CodeModificationExecutor] Failed to rollback to backup: ${result.error}`);
      return result;
    }
  }
}

// 单例实例
let instance: CodeModificationExecutor | null = null;

export function getCodeModificationExecutor(): CodeModificationExecutor {
  if (!instance) {
    instance = new CodeModificationExecutor();
  }
  return instance;
}
