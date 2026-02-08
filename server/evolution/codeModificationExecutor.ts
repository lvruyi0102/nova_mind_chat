/**
 * Code Modification Executor
 * 
 * 执行代码修改并管理回滚机制
 * 确保修改的安全性和可恢复性
 */

import * as fs from 'fs';
import * as path from 'path';
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
      // 1. 验证文件路径
      if (!this.isValidFilePath(proposal.filePath)) {
        throw new Error(`Invalid file path: ${proposal.filePath}`);
      }

      const fullPath = path.join(process.cwd(), proposal.filePath);

      // 2. 检查文件是否存在
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`);
      }

      // 3. 读取原始文件内容
      const originalContent = fs.readFileSync(fullPath, 'utf-8');

      // 4. 验证原始内容与提议中的代码匹配
      if (!this.contentMatches(originalContent, proposal.originalCode)) {
        throw new Error('Original code does not match file content. File may have been modified.');
      }

      // 5. 创建备份
      const backupPath = await this.createBackup(proposal.filePath, originalContent);
      result.backupPath = backupPath;

      // 6. 执行修改
      fs.writeFileSync(fullPath, proposal.modifiedCode, 'utf-8');

      // 7. 验证修改
      const modifiedContent = fs.readFileSync(fullPath, 'utf-8');
      if (modifiedContent !== proposal.modifiedCode) {
        throw new Error('Verification failed: modified content does not match expected code');
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
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // 2. 读取备份内容
      const backupContent = fs.readFileSync(backupPath, 'utf-8');

      // 3. 恢复文件
      const fullPath = path.join(process.cwd(), filePath);
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
    const backupFileName = `${fileName}.${timestamp}.backup`;
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

  /**
   * 验证文件路径是否有效
   */
  private isValidFilePath(filePath: string): boolean {
    // 只允许修改特定目录下的文件
    const allowedPaths = [
      'server/evolution/',
      'server/autonomy/',
    ];

    return allowedPaths.some(allowed => filePath.startsWith(allowed));
  }

  /**
   * 检查内容是否匹配（忽略空白差异）
   */
  private contentMatches(actual: string, expected: string): boolean {
    const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
    return normalize(actual) === normalize(expected);
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
      const backupPath = path.join(this.backupDir, backupFileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const fullPath = path.join(process.cwd(), targetFilePath);

      fs.writeFileSync(fullPath, backupContent, 'utf-8');

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
