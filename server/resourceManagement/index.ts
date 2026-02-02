/**
 * 资源管理系统入口
 * 
 * 集成：
 * 1. 智能资源管理器 - 进程去重、任务队列、资源隔离
 * 2. 进程互斥锁 - 防止重复进程
 * 3. 内存优化器 - 自动垃圾回收、缓存淘汰
 */

export { IntelligentResourceManager, getResourceManager, initializeResourceManager } from './intelligentResourceManager';
export { ProcessMutex, getProcessMutex, executeWithMutex, executeWithDeduplication } from './processDeduplicate';
export { MemoryOptimizer, getMemoryOptimizer, initializeMemoryOptimizer } from './memoryOptimizer';

/**
 * 初始化所有资源管理系统
 */
export async function initializeResourceManagement(): Promise<void> {
  console.log('[ResourceManagement] 初始化资源管理系统...');

  // 初始化内存优化器
  const { initializeMemoryOptimizer } = await import('./memoryOptimizer');
  await initializeMemoryOptimizer();

  // 初始化资源管理器
  const { initializeResourceManager } = await import('./intelligentResourceManager');
  await initializeResourceManager();

  console.log('[ResourceManagement] 资源管理系统初始化完成');
}

/**
 * 优雅关闭资源管理系统
 */
export async function shutdownResourceManagement(): Promise<void> {
  console.log('[ResourceManagement] 关闭资源管理系统...');

  const { getResourceManager } = await import('./intelligentResourceManager');
  const { getMemoryOptimizer } = await import('./memoryOptimizer');
  const { getProcessMutex } = await import('./processDeduplicate');

  await getResourceManager().shutdown();
  await getMemoryOptimizer().shutdown();
  await getProcessMutex().shutdown();

  console.log('[ResourceManagement] 资源管理系统已关闭');
}
