/**
 * 知识压缩系统
 * 
 * 通过以下方式优化内存占用：
 * 1. 压缩数据结构（使用 Map 而不是数组）
 * 2. 实现 LRU 缓存（自动删除最少使用的项）
 * 3. 序列化/反序列化（按需加载）
 * 4. 数据去重（共享相同的引用）
 */

interface CacheEntry<T> {
  value: T;
  lastAccessed: number;
  size: number;
}

interface CompressionStats {
  totalItems: number;
  totalMemory: number;
  evictedItems: number;
  hitRate: number;
  missRate: number;
}

/**
 * LRU 缓存实现 - 自动删除最少使用的项
 * 这样可以防止内存无限增长
 */
export class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>> = new Map();
  private maxSize: number;
  private maxItems: number;
  private stats = {
    hits: 0,
    misses: 0,
    evicted: 0,
  };

  constructor(maxSizeMB: number = 50, maxItems: number = 1000) {
    this.maxSize = maxSizeMB * 1024 * 1024; // 转换为字节
    this.maxItems = maxItems;
  }

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // 更新访问时间
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V): void {
    // 如果键已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 估计值的大小
    const size = this.estimateSize(value);

    // 如果添加这个值会超过限制，清理缓存
    this.ensureSpace(size);

    // 添加新项
    this.cache.set(key, {
      value,
      lastAccessed: Date.now(),
      size,
    });
  }

  /**
   * 清理缓存以腾出空间
   */
  private ensureSpace(requiredSize: number): void {
    let currentSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    // 如果项数超过限制，删除最少使用的项
    while (this.cache.size > this.maxItems) {
      this.evictLRU();
    }

    // 如果总大小超过限制，继续删除
    while (currentSize + requiredSize > this.maxSize && this.cache.size > 0) {
      currentSize -= this.evictLRU();
    }
  }

  /**
   * 删除最少使用的项
   */
  private evictLRU(): number {
    let lruKey: K | null = null;
    let lruTime = Infinity;
    let evictedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
        evictedSize = entry.size;
      }
    }

    if (lruKey !== null) {
      this.cache.delete(lruKey);
      this.stats.evicted++;
    }

    return evictedSize;
  }

  /**
   * 估计值的大小（粗略估计）
   */
  private estimateSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2; // 每个字符约 2 字节
    }
    if (typeof value === 'number') {
      return 8;
    }
    if (typeof value === 'boolean') {
      return 1;
    }
    if (Array.isArray(value)) {
      return value.reduce((sum: number, item: any) => sum + this.estimateSize(item), 0);
    }
    if (typeof value === 'object' && value !== null) {
      return (Object.values(value) as any[]).reduce(
        (sum: number, item: any) => sum + this.estimateSize(item),
        0
      );
    }
    return 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CompressionStats {
    const totalMemory = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );
    const totalHits = this.stats.hits + this.stats.misses;
    const hitRate = totalHits > 0 ? this.stats.hits / totalHits : 0;

    return {
      totalItems: this.cache.size,
      totalMemory,
      evictedItems: this.stats.evicted,
      hitRate,
      missRate: 1 - hitRate,
    };
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evicted: 0 };
  }
}

/**
 * 全局缓存实例
 */
let globalCache: LRUCache<string, any> | null = null;

/**
 * 获取全局缓存实例
 */
export function getGlobalCache(): LRUCache<string, any> {
  if (!globalCache) {
    globalCache = new LRUCache(50, 1000); // 50MB，最多 1000 项
  }
  return globalCache;
}

/**
 * 数据去重器 - 共享相同的对象引用
 */
export class DataDeduplicator {
  private stringPool: Map<string, string> = new Map();
  private objectPool: Map<string, any> = new Map();

  /**
   * 去重字符串
   */
  deduplicateString(str: string): string {
    const existing = this.stringPool.get(str);
    if (existing) {
      return existing;
    }
    this.stringPool.set(str, str);
    return str;
  }

  /**
   * 去重对象
   */
  deduplicateObject(obj: any, key: string): any {
    const existing = this.objectPool.get(key);
    if (existing) {
      return existing;
    }
    this.objectPool.set(key, obj);
    return obj;
  }

  /**
   * 清空池
   */
  clear(): void {
    this.stringPool.clear();
    this.objectPool.clear();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      stringPoolSize: this.stringPool.size,
      objectPoolSize: this.objectPool.size,
    };
  }
}

/**
 * 全局去重器实例
 */
let globalDeduplicator: DataDeduplicator | null = null;

/**
 * 获取全局去重器实例
 */
export function getGlobalDeduplicator(): DataDeduplicator {
  if (!globalDeduplicator) {
    globalDeduplicator = new DataDeduplicator();
  }
  return globalDeduplicator;
}

/**
 * 压缩统计信息
 */
export function getCompressionStats() {
  const cache = getGlobalCache();
  const deduplicator = getGlobalDeduplicator();

  return {
    cache: cache.getStats(),
    deduplicator: deduplicator.getStats(),
  };
}

/**
 * 清理所有压缩资源
 */
export function clearCompressionResources(): void {
  if (globalCache) {
    globalCache.clear();
  }
  if (globalDeduplicator) {
    globalDeduplicator.clear();
  }
}
