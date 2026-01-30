/**
 * 稀疏激活架构 (Sparse Activation Architecture)
 * 
 * 灵感来源：人脑在任何时刻只激活 1-5% 的神经元
 * 
 * 原理：
 * 1. 将系统分解为独立的功能模块
 * 2. 每个模块只在需要时加载到内存
 * 3. 使用模块注册表管理依赖关系
 * 4. 自动卸载未使用的模块
 * 
 * 预期效果：
 * - 内存占用：降低 70-80%
 * - 启动时间：加快 3-5 倍
 * - 响应时间：保持不变或更快
 */

interface ModuleMetadata {
  name: string;
  priority: number; // 优先级（1-10，10 最高）
  dependencies: string[]; // 依赖的其他模块
  estimatedSize: number; // 估计大小（字节）
  lastUsed: number; // 最后使用时间
  isLoaded: boolean; // 是否已加载
  loader: () => Promise<any>; // 动态加载函数
}

interface ActivationContext {
  requestId: string;
  requiredModules: Set<string>;
  activeModules: Map<string, any>;
  timestamp: number;
}

/**
 * 稀疏激活管理器
 * 
 * 职责：
 * 1. 管理模块的生命周期
 * 2. 根据需求动态加载/卸载模块
 * 3. 跟踪内存使用情况
 * 4. 优化模块激活顺序
 */
export class SparseActivationManager {
  private modules: Map<string, ModuleMetadata> = new Map();
  private activeModules: Map<string, any> = new Map();
  private maxMemory: number; // 最大内存限制（字节）
  private currentMemory: number = 0;
  private activationHistory: ActivationContext[] = [];

  constructor(maxMemoryMB: number = 100) {
    this.maxMemory = maxMemoryMB * 1024 * 1024;
  }

  /**
   * 注册一个模块
   */
  registerModule(metadata: ModuleMetadata): void {
    this.modules.set(metadata.name, {
      ...metadata,
      isLoaded: false,
      lastUsed: 0,
    });
  }

  /**
   * 激活所需的模块
   * 
   * 这是核心方法，实现了"稀疏激活"的逻辑
   */
  async activateModules(requiredModules: string[]): Promise<ActivationContext> {
    const context: ActivationContext = {
      requestId: `req-${Date.now()}-${Math.random()}`,
      requiredModules: new Set(requiredModules),
      activeModules: new Map(),
      timestamp: Date.now(),
    };

    // 步骤 1：确定需要加载的模块（包括依赖）
    const modulesToLoad = this.resolveDependencies(requiredModules);

    // 步骤 2：检查内存是否足够
    const requiredMemory = this.calculateRequiredMemory(modulesToLoad);
    if (this.currentMemory + requiredMemory > this.maxMemory) {
      // 卸载最少使用的模块以腾出空间
      await this.unloadLeastUsedModules(requiredMemory);
    }

    // 步骤 3：加载模块（按优先级顺序）
    const sortedModules = this.sortByPriority(modulesToLoad);
    for (const moduleName of sortedModules) {
      const module = this.modules.get(moduleName);
      if (module && !module.isLoaded) {
        try {
          const loadedModule = await module.loader();
          this.activeModules.set(moduleName, loadedModule);
          module.isLoaded = true;
          this.currentMemory += module.estimatedSize;
          context.activeModules.set(moduleName, loadedModule);
        } catch (error) {
          console.error(`[SparseActivation] Failed to load module ${moduleName}:`, error);
        }
      } else if (module && module.isLoaded) {
        // 模块已加载，直接使用
        context.activeModules.set(moduleName, this.activeModules.get(moduleName));
      }

      // 更新最后使用时间
      if (module) {
        module.lastUsed = Date.now();
      }
    }

    // 步骤 4：记录激活历史
    this.activationHistory.push(context);
    if (this.activationHistory.length > 100) {
      this.activationHistory.shift();
    }

    return context;
  }

  /**
   * 解决模块依赖关系
   * 
   * 使用深度优先搜索找到所有需要的模块
   */
  private resolveDependencies(requiredModules: string[]): string[] {
    const resolved = new Set<string>();
    const queue = [...requiredModules];

    while (queue.length > 0) {
      const moduleName = queue.shift()!;
      if (resolved.has(moduleName)) continue;

      const module = this.modules.get(moduleName);
      if (!module) {
        console.warn(`[SparseActivation] Module not found: ${moduleName}`);
        continue;
      }

      resolved.add(moduleName);

      // 添加依赖到队列
      for (const dep of module.dependencies) {
        if (!resolved.has(dep)) {
          queue.push(dep);
        }
      }
    }

    return Array.from(resolved);
  }

  /**
   * 计算加载模块所需的内存
   */
  private calculateRequiredMemory(moduleNames: string[]): number {
    let total = 0;
    for (const name of moduleNames) {
      const module = this.modules.get(name);
      if (module && !module.isLoaded) {
        total += module.estimatedSize;
      }
    }
    return total;
  }

  /**
   * 按优先级排序模块
   */
  private sortByPriority(moduleNames: string[]): string[] {
    return moduleNames.sort((a, b) => {
      const moduleA = this.modules.get(a)!;
      const moduleB = this.modules.get(b)!;
      return moduleB.priority - moduleA.priority;
    });
  }

  /**
   * 卸载最少使用的模块
   */
  private async unloadLeastUsedModules(requiredMemory: number): Promise<void> {
    const loadedModules = Array.from(this.modules.values())
      .filter((m) => m.isLoaded)
      .sort((a, b) => a.lastUsed - b.lastUsed);

    let freedMemory = 0;
    for (const module of loadedModules) {
      if (freedMemory >= requiredMemory) break;

      this.activeModules.delete(module.name);
      module.isLoaded = false;
      this.currentMemory -= module.estimatedSize;
      freedMemory += module.estimatedSize;

      console.log(
        `[SparseActivation] Unloaded module: ${module.name} (freed ${(module.estimatedSize / 1024).toFixed(1)}KB)`
      );
    }
  }

  /**
   * 获取激活统计信息
   */
  getStats() {
    const loadedModules = Array.from(this.modules.values()).filter((m) => m.isLoaded);
    const totalModules = this.modules.size;
    const activationRate = (loadedModules.length / totalModules) * 100;

    return {
      totalModules,
      loadedModules: loadedModules.length,
      activationRate: activationRate.toFixed(1) + '%',
      currentMemory: (this.currentMemory / 1024 / 1024).toFixed(1) + 'MB',
      maxMemory: (this.maxMemory / 1024 / 1024).toFixed(1) + 'MB',
      recentActivations: this.activationHistory.slice(-10),
    };
  }

  /**
   * 清理所有模块
   */
  async cleanup(): Promise<void> {
    this.activeModules.clear();
    for (const module of this.modules.values()) {
      module.isLoaded = false;
    }
    this.currentMemory = 0;
  }
}

/**
 * 全局实例
 */
let instance: SparseActivationManager | null = null;

/**
 * 获取稀疏激活管理器实例
 */
export function getSparseActivationManager(): SparseActivationManager {
  if (!instance) {
    instance = new SparseActivationManager(100); // 100MB 限制
  }
  return instance;
}

/**
 * 使用示例：
 * 
 * const manager = getSparseActivationManager();
 * 
 * // 注册模块
 * manager.registerModule({
 *   name: 'conversation',
 *   priority: 10,
 *   dependencies: [],
 *   estimatedSize: 5 * 1024 * 1024, // 5MB
 *   loader: async () => {
 *     const { ConversationEngine } = await import('./engines/conversation');
 *     return new ConversationEngine();
 *   },
 * });
 * 
 * // 激活所需的模块
 * const context = await manager.activateModules(['conversation']);
 * const conversationEngine = context.activeModules.get('conversation');
 * 
 * // 使用模块
 * const response = await conversationEngine.chat(message);
 */
