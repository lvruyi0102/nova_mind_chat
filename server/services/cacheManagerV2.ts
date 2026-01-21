/**
 * 缓存管理器 V2 - 优化版本
 * 实现 LRU 缓存、更激进的清理策略、内存估计
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  created: number;
  size: number; // 估计的内存占用（字节）
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  totalMemoryMB: number;
  averageEntrySize: number;
}

class CacheManagerV2 {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  // 更激进的配置
  private readonly MAX_MEMORY_ENTRIES = 200; // 从 500 降低为 200
  private readonly MAX_TOTAL_MEMORY_MB = 50; // 最多占用 50MB
  private readonly CLEANUP_INTERVAL = 15000; // 15 秒（从 30 秒优化）
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 分钟 TTL（从 10 分钟缩短）
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * 启动定期清理过期缓存
   */
  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * 清理过期缓存和超大缓存
   */
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    let totalMemory = 0;

    // 第一步：删除所有过期条目
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        cleaned++;
      } else {
        totalMemory += entry.size;
      }
    }

    // 第二步：如果缓存条目过多，删除最少使用的
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const entriesToRemove = this.memoryCache.size - this.MAX_MEMORY_ENTRIES;
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, entriesToRemove);

      for (const [key] of sortedEntries) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // 第三步：如果总内存超过限制，删除最少使用的条目
    totalMemory = 0;
    for (const entry of this.memoryCache.values()) {
      totalMemory += entry.size;
    }

    if (totalMemory > this.MAX_TOTAL_MEMORY_MB * 1024 * 1024) {
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].hits - b[1].hits);

      let removedMemory = 0;
      const targetMemory = this.MAX_TOTAL_MEMORY_MB * 1024 * 1024 * 0.7; // 目标为限制的 70%

      for (const [key, entry] of sortedEntries) {
        if (removedMemory >= (totalMemory - targetMemory)) {
          break;
        }
        this.memoryCache.delete(key);
        removedMemory += entry.size;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(
        `[CacheManagerV2] Cleaned ${cleaned} entries. Remaining: ${this.memoryCache.size}, Memory: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`
      );
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(namespace: string, identifier: string): string {
    return `${namespace}:${identifier}`;
  }

  /**
   * 估计对象大小（字节）
   */
  private estimateSize(value: any): number {
    try {
      const json = JSON.stringify(value);
      return json.length * 2; // UTF-16 编码
    } catch {
      return 1024; // 默认 1KB
    }
  }

  /**
   * 获取缓存值
   */
  get<T>(namespace: string, identifier: string): T | null {
    const key = this.generateKey(namespace, identifier);
    const entry = this.memoryCache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // 检查是否过期
    if (entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 更新命中次数
    entry.hits++;
    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * 设置缓存值
   */
  set<T>(
    namespace: string,
    identifier: string,
    value: T,
    ttlMs: number = this.DEFAULT_TTL
  ): void {
    const key = this.generateKey(namespace, identifier);
    const size = this.estimateSize(value);

    // 如果单个条目过大（> 5MB），不缓存
    if (size > 5 * 1024 * 1024) {
      console.warn(
        `[CacheManagerV2] Entry too large (${(size / 1024 / 1024).toFixed(2)}MB), skipping cache`
      );
      return;
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
      hits: 0,
      created: Date.now(),
      size,
    };

    this.memoryCache.set(key, entry);
  }

  /**
   * 删除缓存
   */
  delete(namespace: string, identifier: string): boolean {
    const key = this.generateKey(namespace, identifier);
    return this.memoryCache.delete(key);
  }

  /**
   * 执行激进清理（内存紧急时调用）
   */
  forceAggressiveCleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    // 删除所有过期条目
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // 删除 70% 最少使用的条目
    if (this.memoryCache.size > 0) {
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, Math.floor(this.memoryCache.size * 0.7));

      for (const [key] of sortedEntries) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    console.log(
      `[CacheManagerV2] Aggressive cleanup: removed ${cleaned} entries, remaining: ${this.memoryCache.size}`
    );
    return cleaned;
  }

  /**
   * 清空指定命名空间的所有缓存
   */
  clearNamespace(namespace: string): number {
    let cleared = 0;
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(`${namespace}:`)) {
        this.memoryCache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const total = totalHits + totalMisses;

    let totalMemory = 0;
    for (const entry of this.memoryCache.values()) {
      totalMemory += entry.size;
    }

    const totalMemoryMB = totalMemory / 1024 / 1024;
    const averageEntrySize =
      this.memoryCache.size > 0 ? totalMemory / this.memoryCache.size : 0;

    return {
      totalEntries: this.memoryCache.size,
      totalHits,
      totalMisses,
      hitRate: total > 0 ? (totalHits / total) * 100 : 0,
      totalMemoryMB: parseFloat(totalMemoryMB.toFixed(2)),
      averageEntrySize: Math.round(averageEntrySize),
    };
  }

  /**
   * 销毁缓存管理器
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.memoryCache.clear();
  }
}

let instance: CacheManagerV2 | null = null;

export function getCacheManagerV2(): CacheManagerV2 {
  if (!instance) {
    instance = new CacheManagerV2();
  }
  return instance;
}
