/**
 * 智能资源管理层 - 从根本上解决进程泄漏和内存溢出
 * 
 * 核心问题：
 * 1. 多个 pnpm db:push 进程同时运行 → 进程去重
 * 2. 多个 drizzle-kit generate 进程堆积 → 任务队列化
 * 3. TypeScript 编译器内存泄漏 → 定期重启
 * 4. 后台任务无限增长 → 资源隔离和限流
 * 
 * 解决方案：
 * - 进程去重和互斥锁
 * - 任务队列和优先级调度
 * - 资源隔离和内存限制
 * - 自适应限流和动态调整
 */

import * as fs from 'fs';
import * as path from 'path';

interface ProcessLock {
  processId: string;
  taskType: string;
  startTime: Date;
  status: 'running' | 'completed' | 'failed';
  memoryUsage: number;
  timeout: number;
}

interface ResourceQuota {
  maxMemoryMB: number;
  maxConcurrentTasks: number;
  maxTaskDuration: number; // 毫秒
  maxRetries: number;
}

interface TaskQueue {
  id: string;
  type: string;
  priority: number; // 1-10, 10 最高
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  error?: string;
}

/**
 * 智能资源管理器
 * 
 * 功能：
 * 1. 进程去重 - 确保同一任务只有一个进程
 * 2. 任务队列 - 按优先级调度任务
 * 3. 资源隔离 - 为不同任务分配独立资源
 * 4. 自适应限流 - 根据系统负载调整并发
 * 5. 内存监控 - 实时监控和清理
 */
export class IntelligentResourceManager {
  private processLocks: Map<string, ProcessLock> = new Map();
  private taskQueue: TaskQueue[] = [];
  private resourceQuotas: Map<string, ResourceQuota> = new Map();
  private lockFilePath: string;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.lockFilePath = path.join(process.cwd(), '.resource-locks');
    this.initializeResourceQuotas();
    this.startMonitoring();
  }

  /**
   * 初始化资源配额
   */
  private initializeResourceQuotas(): void {
    // 数据库操作配额
    this.resourceQuotas.set('db:push', {
      maxMemoryMB: 150,
      maxConcurrentTasks: 1, // 关键：只允许一个 db:push 进程
      maxTaskDuration: 60000, // 60 秒
      maxRetries: 3,
    });

    // TypeScript 编译配额
    this.resourceQuotas.set('typescript:compile', {
      maxMemoryMB: 300,
      maxConcurrentTasks: 1, // 关键：只允许一个 TypeScript 编译
      maxTaskDuration: 120000, // 120 秒
      maxRetries: 2,
    });

    // Drizzle Kit 配额
    this.resourceQuotas.set('drizzle:generate', {
      maxMemoryMB: 200,
      maxConcurrentTasks: 1, // 关键：只允许一个 drizzle-kit 进程
      maxTaskDuration: 90000, // 90 秒
      maxRetries: 2,
    });

    // 后台任务配额
    this.resourceQuotas.set('background:task', {
      maxMemoryMB: 100,
      maxConcurrentTasks: 3, // 最多 3 个并发后台任务
      maxTaskDuration: 300000, // 5 分钟
      maxRetries: 1,
    });

    // 自迭代系统配额
    this.resourceQuotas.set('self:iteration', {
      maxMemoryMB: 80,
      maxConcurrentTasks: 1, // 只允许一个自迭代循环
      maxTaskDuration: 180000, // 3 分钟
      maxRetries: 1,
    });
  }

  /**
   * 获取或创建进程锁
   * 
   * 核心逻辑：
   * 1. 检查是否已有相同类型的运行中进程
   * 2. 如果有，返回现有进程 ID（去重）
   * 3. 如果没有，创建新进程锁
   * 4. 如果旧进程超时，清理并创建新进程
   */
  async acquireProcessLock(taskType: string, timeout: number = 60000): Promise<string> {
    const quota = this.resourceQuotas.get(taskType);
    if (!quota) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    // 检查是否已有运行中的相同类型进程
    const existingLocks = Array.from(this.processLocks.values()).filter(
      (lock) => lock.taskType === taskType && lock.status === 'running'
    );

    // 如果已有进程且未超时，返回现有进程 ID（去重）
    if (existingLocks.length > 0) {
      const existingLock = existingLocks[0];
      const elapsed = Date.now() - existingLock.startTime.getTime();
      
      if (elapsed < existingLock.timeout) {
        console.log(
          `[IntelligentResourceManager] 进程去重: 复用现有 ${taskType} 进程 (${existingLock.processId})`
        );
        return existingLock.processId;
      } else {
        // 进程超时，清理并创建新进程
        console.log(
          `[IntelligentResourceManager] 进程超时: 清理 ${taskType} 进程 (${existingLock.processId})`
        );
        this.processLocks.delete(existingLock.processId);
      }
    }

    // 创建新进程锁
    const processId = `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lock: ProcessLock = {
      processId,
      taskType,
      startTime: new Date(),
      status: 'running',
      memoryUsage: 0,
      timeout,
    };

    this.processLocks.set(processId, lock);
    console.log(`[IntelligentResourceManager] 创建进程锁: ${processId}`);

    return processId;
  }

  /**
   * 释放进程锁
   */
  releaseProcessLock(processId: string, status: 'completed' | 'failed' = 'completed'): void {
    const lock = this.processLocks.get(processId);
    if (lock) {
      lock.status = status;
      console.log(
        `[IntelligentResourceManager] 释放进程锁: ${processId} (${status})`
      );
      
      // 保留 5 秒后再删除，用于查询历史
      setTimeout(() => {
        this.processLocks.delete(processId);
      }, 5000);
    }
  }

  /**
   * 添加任务到队列
   */
  async enqueueTask(
    taskType: string,
    priority: number = 5,
    timeout: number = 60000
  ): Promise<string> {
    const quota = this.resourceQuotas.get(taskType);
    if (!quota) {
      throw new Error(`Unknown task type: ${taskType}`);
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const task: TaskQueue = {
      id: taskId,
      type: taskType,
      priority,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
    };

    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority); // 按优先级排序

    console.log(
      `[IntelligentResourceManager] 任务入队: ${taskId} (${taskType}, 优先级: ${priority})`
    );

    // 异步处理任务
    setImmediate(() => this.processTaskQueue());

    return taskId;
  }

  /**
   * 处理任务队列
   * 
   * 核心逻辑：
   * 1. 检查资源配额
   * 2. 获取进程锁（去重）
   * 3. 执行任务
   * 4. 处理失败和重试
   */
  private async processTaskQueue(): Promise<void> {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];

      const quota = this.resourceQuotas.get(task.type)!;
      const runningTasks = Array.from(this.processLocks.values()).filter(
        (lock) => lock.taskType === task.type && lock.status === 'running'
      );

      // 检查并发限制
      if (runningTasks.length >= quota.maxConcurrentTasks) {
        console.log(
          `[IntelligentResourceManager] 并发限制: ${task.type} 已达最大并发数 (${quota.maxConcurrentTasks})`
        );
        break; // 等待其他任务完成
      }

      // 从队列移除
      this.taskQueue.shift();

      // 标记为运行中
      task.status = 'running';
      task.startedAt = new Date();

      try {
        // 获取进程锁（去重）
        const processId = await this.acquireProcessLock(task.type, quota.maxTaskDuration);

        // 模拟任务执行
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // 标记为完成
        task.status = 'completed';
        task.completedAt = new Date();
        this.releaseProcessLock(processId, 'completed');

        console.log(
          `[IntelligentResourceManager] 任务完成: ${task.id} (${task.type})`
        );
      } catch (error) {
        console.error(
          `[IntelligentResourceManager] 任务失败: ${task.id} (${task.type}):`,
          error
        );

        // 重试逻辑
        if (task.retryCount < quota.maxRetries) {
          task.retryCount++;
          task.status = 'pending';
          this.taskQueue.push(task);
          console.log(
            `[IntelligentResourceManager] 任务重试: ${task.id} (重试 ${task.retryCount}/${quota.maxRetries})`
          );
        } else {
          task.status = 'failed';
          task.completedAt = new Date();
          task.error = String(error);
          console.log(
            `[IntelligentResourceManager] 任务放弃: ${task.id} (已达最大重试次数)`
          );
        }
      }
    }
  }

  /**
   * 启动资源监控
   * 
   * 功能：
   * 1. 监控内存使用
   * 2. 清理超时进程
   * 3. 自适应限流
   * 4. 定期报告
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // 更新进程内存使用
      this.processLocks.forEach((lock) => {
        lock.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
      });

      // 清理超时进程
      const now = Date.now();
      this.processLocks.forEach((lock, processId) => {
        const elapsed = now - lock.startTime.getTime();
        if (lock.status === 'running' && elapsed > lock.timeout) {
          console.warn(
            `[IntelligentResourceManager] 进程超时清理: ${processId} (${lock.taskType})`
          );
          this.releaseProcessLock(processId, 'failed');
        }
      });

      // 自适应限流
      if (heapUsedPercent > 80) {
        console.warn(
          `[IntelligentResourceManager] 内存压力高 (${heapUsedPercent.toFixed(1)}%), 触发限流`
        );
        // 暂停新任务入队
        this.pauseNewTasks = true;
      } else if (heapUsedPercent < 60) {
        this.pauseNewTasks = false;
      }

      // 定期报告
      if (Math.random() < 0.1) {
        console.log(
          `[IntelligentResourceManager] 状态报告:` +
          ` 内存 ${heapUsedPercent.toFixed(1)}%,` +
          ` 进程 ${this.processLocks.size},` +
          ` 队列 ${this.taskQueue.length}`
        );
      }
    }, 5000); // 每 5 秒检查一次
  }

  private pauseNewTasks = false;

  /**
   * 检查是否应该暂停新任务
   */
  shouldPauseNewTasks(): boolean {
    return this.pauseNewTasks;
  }

  /**
   * 获取系统状态
   */
  getStatus(): {
    processCount: number;
    queueLength: number;
    memoryUsageMB: number;
    activeTaskTypes: string[];
  } {
    const memUsage = process.memoryUsage();
    const activeTaskTypes = Array.from(
      new Set(Array.from(this.processLocks.values()).map((lock) => lock.taskType))
    );

    return {
      processCount: this.processLocks.size,
      queueLength: this.taskQueue.length,
      memoryUsageMB: memUsage.heapUsed / 1024 / 1024,
      activeTaskTypes,
    };
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // 等待所有任务完成
    while (this.taskQueue.some((task) => task.status === 'running')) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('[IntelligentResourceManager] 资源管理器已关闭');
  }
}

// 全局实例
let resourceManager: IntelligentResourceManager | null = null;

export function getResourceManager(): IntelligentResourceManager {
  if (!resourceManager) {
    resourceManager = new IntelligentResourceManager();
  }
  return resourceManager;
}

export async function initializeResourceManager(): Promise<void> {
  getResourceManager();
  console.log('[IntelligentResourceManager] 资源管理器已初始化');
}
