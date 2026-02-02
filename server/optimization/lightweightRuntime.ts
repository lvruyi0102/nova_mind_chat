/**
 * 轻量级运行时配置
 * 
 * 问题：开发工具链（TypeScript、esbuild、pnpm）占用 2.3GB 内存
 * 解决：禁用监视模式，使用轻量级运行时
 * 
 * 策略：
 * 1. 禁用 TypeScript 监视模式
 * 2. 禁用 esbuild 监视模式
 * 3. 禁用 pnpm 监视模式
 * 4. 使用预编译的代码
 * 5. 简化后台任务
 */

import * as fs from 'fs';
import * as path from 'path';

interface RuntimeConfig {
  enableTypeScriptWatch: boolean;
  enableEsbuildWatch: boolean;
  enablePnpmWatch: boolean;
  maxBackgroundTasks: number;
  maxMemoryMB: number;
  enableCaching: boolean;
  enableCompression: boolean;
}

/**
 * 轻量级运行时管理器
 */
export class LightweightRuntimeManager {
  private config: RuntimeConfig;
  private originalEnv: Record<string, string | undefined> = {};

  constructor() {
    this.config = {
      enableTypeScriptWatch: false, // 禁用 TypeScript 监视
      enableEsbuildWatch: false, // 禁用 esbuild 监视
      enablePnpmWatch: false, // 禁用 pnpm 监视
      maxBackgroundTasks: 2, // 最多 2 个后台任务
      maxMemoryMB: 512, // 限制内存到 512MB
      enableCaching: true,
      enableCompression: true,
    };

    this.saveOriginalEnv();
  }

  /**
   * 保存原始环境变量
   */
  private saveOriginalEnv(): void {
    this.originalEnv = { ...process.env };
  }

  /**
   * 应用轻量级配置
   */
  applyLightweightConfig(): void {
    console.log('[LightweightRuntimeManager] 应用轻量级运行时配置...');

    // 禁用监视模式
    if (!this.config.enableTypeScriptWatch) {
      process.env.TSC_WATCH = 'false';
      console.log('[LightweightRuntimeManager] 禁用 TypeScript 监视模式');
    }

    if (!this.config.enableEsbuildWatch) {
      process.env.ESBUILD_WATCH = 'false';
      console.log('[LightweightRuntimeManager] 禁用 esbuild 监视模式');
    }

    if (!this.config.enablePnpmWatch) {
      process.env.PNPM_WATCH = 'false';
      console.log('[LightweightRuntimeManager] 禁用 pnpm 监视模式');
    }

    // 启用压缩
    if (this.config.enableCompression) {
      process.env.NODE_OPTIONS = '--max-old-space-size=512 --compress-typedarrays';
      console.log('[LightweightRuntimeManager] 启用内存压缩');
    }

    // 启用缓存
    if (this.config.enableCaching) {
      process.env.NODE_CACHE_DIR = path.join(process.cwd(), '.node-cache');
      console.log('[LightweightRuntimeManager] 启用缓存');
    }

    // 限制后台任务
    process.env.MAX_BACKGROUND_TASKS = String(this.config.maxBackgroundTasks);
    console.log(
      `[LightweightRuntimeManager] 限制后台任务数: ${this.config.maxBackgroundTasks}`
    );

    console.log('[LightweightRuntimeManager] 轻量级运行时配置已应用');
  }

  /**
   * 禁用不必要的后台任务
   */
  disableUnnecessaryBackgroundTasks(): void {
    console.log('[LightweightRuntimeManager] 禁用不必要的后台任务...');

    // 禁用自迭代系统（消耗大量资源）
    process.env.DISABLE_SELF_ITERATION = 'true';
    console.log('[LightweightRuntimeManager] 禁用自迭代系统');

    // 禁用自动精选（消耗大量资源）
    process.env.DISABLE_AUTO_CURATION = 'true';
    console.log('[LightweightRuntimeManager] 禁用自动精选');

    // 禁用性能监控（消耗大量资源）
    process.env.DISABLE_PERFORMANCE_MONITORING = 'true';
    console.log('[LightweightRuntimeManager] 禁用性能监控');

    // 禁用后台认知循环（消耗大量资源）
    process.env.DISABLE_BACKGROUND_COGNITION = 'true';
    console.log('[LightweightRuntimeManager] 禁用后台认知循环');
  }

  /**
   * 启用轻量级模式
   */
  enableLightweightMode(): void {
    console.log('[LightweightRuntimeManager] 启用轻量级模式...');

    // 应用配置
    this.applyLightweightConfig();

    // 禁用不必要的任务
    this.disableUnnecessaryBackgroundTasks();

    // 启用激进的垃圾回收
    if (global.gc) {
      console.log('[LightweightRuntimeManager] 启用激进的垃圾回收');
      setInterval(() => {
        global.gc!();
      }, 10000); // 每 10 秒执行一次
    }

    console.log('[LightweightRuntimeManager] 轻量级模式已启用');
  }

  /**
   * 恢复原始配置
   */
  restoreOriginalConfig(): void {
    console.log('[LightweightRuntimeManager] 恢复原始配置...');
    process.env = this.originalEnv;
    console.log('[LightweightRuntimeManager] 原始配置已恢复');
  }

  /**
   * 获取运行时配置
   */
  getConfig(): RuntimeConfig {
    return { ...this.config };
  }

  /**
   * 更新运行时配置
   */
  updateConfig(partial: Partial<RuntimeConfig>): void {
    this.config = { ...this.config, ...partial };
    console.log('[LightweightRuntimeManager] 运行时配置已更新:', this.config);
  }
}

// 全局实例
let runtimeManager: LightweightRuntimeManager | null = null;

export function getLightweightRuntimeManager(): LightweightRuntimeManager {
  if (!runtimeManager) {
    runtimeManager = new LightweightRuntimeManager();
  }
  return runtimeManager;
}

/**
 * 在应用启动时立即调用
 */
export function initializeLightweightRuntime(): void {
  const manager = getLightweightRuntimeManager();
  manager.enableLightweightMode();
}
