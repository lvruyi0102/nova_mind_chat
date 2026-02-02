/**
 * 进程去重和互斥锁系统
 * 
 * 解决问题：
 * - 多个 pnpm db:push 进程同时运行
 * - 多个 drizzle-kit generate 进程堆积
 * - 多个 TypeScript 编译器实例
 * 
 * 方案：
 * - 基于文件系统的分布式锁
 * - 进程互斥和去重
 * - 自动超时清理
 */

import * as fs from 'fs';
import * as path from 'path';

interface MutexLock {
  lockId: string;
  processId: number;
  taskType: string;
  acquiredAt: number;
  timeout: number;
  data?: Record<string, any>;
}

/**
 * 基于文件系统的互斥锁
 */
export class ProcessMutex {
  private lockDir: string;
  private locks: Map<string, MutexLock> = new Map();

  constructor(lockDir: string = '.process-locks') {
    this.lockDir = lockDir;
    this.ensureLockDir();
    this.cleanupStaleLocksOnStartup();
  }

  private ensureLockDir(): void {
    if (!fs.existsSync(this.lockDir)) {
      fs.mkdirSync(this.lockDir, { recursive: true });
    }
  }

  /**
   * 启动时清理过期的锁文件
   */
  private cleanupStaleLocksOnStartup(): void {
    try {
      const files = fs.readdirSync(this.lockDir);
      const now = Date.now();

      files.forEach((file) => {
        const lockPath = path.join(this.lockDir, file);
        const stat = fs.statSync(lockPath);
        const age = now - stat.mtimeMs;

        // 清理 5 分钟以上的锁文件
        if (age > 5 * 60 * 1000) {
          try {
            fs.unlinkSync(lockPath);
            console.log(`[ProcessMutex] 清理过期锁文件: ${file}`);
          } catch (error) {
            console.error(`[ProcessMutex] 清理锁文件失败: ${file}`, error);
          }
        }
      });
    } catch (error) {
      console.error('[ProcessMutex] 启动清理失败:', error);
    }
  }

  /**
   * 尝试获取互斥锁
   * 
   * 返回：
   * - lockId: 获取成功
   * - null: 已有其他进程持有锁
   */
  async tryAcquire(
    taskType: string,
    timeout: number = 60000,
    data?: Record<string, any>
  ): Promise<string | null> {
    const lockId = `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lockPath = path.join(this.lockDir, `${taskType}.lock`);

    // 检查是否已有其他进程持有锁
    if (fs.existsSync(lockPath)) {
      try {
        const content = fs.readFileSync(lockPath, 'utf-8');
        const existingLock = JSON.parse(content) as MutexLock;
        const elapsed = Date.now() - existingLock.acquiredAt;

        // 如果锁未超时，返回现有锁 ID（去重）
        if (elapsed < existingLock.timeout) {
          console.log(
            `[ProcessMutex] 进程去重: 复用现有 ${taskType} 锁 (${existingLock.lockId})`
          );
          return existingLock.lockId;
        } else {
          // 锁已超时，删除并创建新锁
          console.log(
            `[ProcessMutex] 锁超时: 清理过期 ${taskType} 锁 (${existingLock.lockId})`
          );
          fs.unlinkSync(lockPath);
        }
      } catch (error) {
        console.error(`[ProcessMutex] 读取锁文件失败: ${lockPath}`, error);
        // 继续尝试创建新锁
      }
    }

    // 创建新锁
    const lock: MutexLock = {
      lockId,
      processId: process.pid,
      taskType,
      acquiredAt: Date.now(),
      timeout,
      data,
    };

    try {
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2));
      this.locks.set(lockId, lock);
      console.log(`[ProcessMutex] 获取锁: ${lockId} (${taskType})`);
      return lockId;
    } catch (error) {
      console.error(`[ProcessMutex] 创建锁失败: ${lockPath}`, error);
      return null;
    }
  }

  /**
   * 释放互斥锁
   */
  async release(lockId: string): Promise<void> {
    const lock = this.locks.get(lockId);
    if (!lock) {
      console.warn(`[ProcessMutex] 尝试释放不存在的锁: ${lockId}`);
      return;
    }

    const lockPath = path.join(this.lockDir, `${lock.taskType}.lock`);

    try {
      // 只有持有锁的进程才能释放
      if (fs.existsSync(lockPath)) {
        const content = fs.readFileSync(lockPath, 'utf-8');
        const currentLock = JSON.parse(content) as MutexLock;

        if (currentLock.lockId === lockId) {
          fs.unlinkSync(lockPath);
          this.locks.delete(lockId);
          console.log(`[ProcessMutex] 释放锁: ${lockId}`);
        } else {
          console.warn(
            `[ProcessMutex] 锁不匹配: 尝试释放 ${lockId}, 但当前锁是 ${currentLock.lockId}`
          );
        }
      }
    } catch (error) {
      console.error(`[ProcessMutex] 释放锁失败: ${lockPath}`, error);
    }
  }

  /**
   * 获取锁信息
   */
  getLockInfo(taskType: string): MutexLock | null {
    const lockPath = path.join(this.lockDir, `${taskType}.lock`);

    try {
      if (fs.existsSync(lockPath)) {
        const content = fs.readFileSync(lockPath, 'utf-8');
        return JSON.parse(content) as MutexLock;
      }
    } catch (error) {
      console.error(`[ProcessMutex] 读取锁信息失败: ${lockPath}`, error);
    }

    return null;
  }

  /**
   * 获取所有活跃的锁
   */
  getActiveLocks(): MutexLock[] {
    const activeLocks: MutexLock[] = [];

    try {
      const files = fs.readdirSync(this.lockDir);

      files.forEach((file) => {
        try {
          const lockPath = path.join(this.lockDir, file);
          const content = fs.readFileSync(lockPath, 'utf-8');
          const lock = JSON.parse(content) as MutexLock;

          // 检查锁是否仍然有效
          const elapsed = Date.now() - lock.acquiredAt;
          if (elapsed < lock.timeout) {
            activeLocks.push(lock);
          } else {
            // 清理过期锁
            fs.unlinkSync(lockPath);
          }
        } catch (error) {
          // 忽略错误，继续处理其他锁
        }
      });
    } catch (error) {
      console.error('[ProcessMutex] 读取活跃锁失败:', error);
    }

    return activeLocks;
  }

  /**
   * 优雅关闭 - 释放所有锁
   */
  async shutdown(): Promise<void> {
    const lockIds = Array.from(this.locks.keys());
    for (const lockId of lockIds) {
      await this.release(lockId);
    }
    console.log('[ProcessMutex] 已释放所有锁');
  }
}

// 全局实例
let processMutex: ProcessMutex | null = null;

export function getProcessMutex(): ProcessMutex {
  if (!processMutex) {
    processMutex = new ProcessMutex('.process-locks');
  }
  return processMutex;
}

/**
 * 便捷函数：执行互斥任务
 * 
 * 使用示例：
 * ```
 * const result = await executeWithMutex('db:push', async () => {
 *   // 执行数据库操作
 *   return await db.push();
 * }, 60000);
 * ```
 */
export async function executeWithMutex<T>(
  taskType: string,
  executor: () => Promise<T>,
  timeout: number = 60000
): Promise<T> {
  const mutex = getProcessMutex();
  const lockId = await mutex.tryAcquire(taskType, timeout);

  if (!lockId) {
    throw new Error(`无法获取 ${taskType} 的互斥锁`);
  }

  try {
    return await executor();
  } finally {
    await mutex.release(lockId);
  }
}

/**
 * 便捷函数：执行去重任务
 * 
 * 如果已有相同类型的任务运行，返回现有任务的结果
 * 否则执行新任务
 */
export async function executeWithDeduplication<T>(
  taskType: string,
  executor: () => Promise<T>,
  timeout: number = 60000
): Promise<T> {
  const mutex = getProcessMutex();
  const lockId = await mutex.tryAcquire(taskType, timeout);

  if (!lockId) {
    throw new Error(`无法获取 ${taskType} 的互斥锁`);
  }

  try {
    return await executor();
  } finally {
    await mutex.release(lockId);
  }
}
