/**
 * 高级缓存管理系统 - 为 Nova-Mind 提供多层缓存策略
 * 
 * 架构：
 * 1. L1 缓存（热数据）：最常用的对话、记忆、概念
 * 2. L2 缓存（温数据）：最近使用过的数据
 * 3. L3 缓存（冷数据）：不常使用的数据，定期清理
 * 
 * 清理策略：
 * - LRU（最近最少使用）
 * - TTL（生存时间）
 * - 大小限制
 * - 预测性清理（基于访问模式）
 */

interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  size: number; // 字节
  layer: 'L1' | 'L2' | 'L3';
  ttl?: number; // 毫秒
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  l1Size: number;
  l2Size: number;
  l3Size: number;
}

interface CacheConfig {
  l1MaxSize: number; // 字节
  l2MaxSize: number;
  l3MaxSize: number;
  l1EntryLimit: number;
  l2EntryLimit: number;
  l3EntryLimit: number;
  defaultTTL: number; // 毫秒
  cleanupInterval: number; // 毫秒
  predictiveCleanupThreshold: number; // 0-1，触发预测清理的内存使用率
}

export class AdvancedCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;
  private accessPattern: Map<string, number[]> = new Map(); // 访问时间序列

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      l1MaxSize: 50 * 1024 * 1024, // 50MB
      l2MaxSize: 100 * 1024 * 1024, // 100MB
      l3MaxSize: 200 * 1024 * 1024, // 200MB
      l1EntryLimit: 1000,
      l2EntryLimit: 5000,
      l3EntryLimit: 10000,
      defaultTTL: 24 * 60 * 60 * 1000, // 24小时
      cleanupInterval: 5 * 60 * 1000, // 5分钟
      predictiveCleanupThreshold: 0.75, // 75%
      ...config,
    };

    this.startCleanupTimer();
  }

  /**
   * 获取缓存值，自动处理层级晋升
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // 检查 TTL
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 更新访问信息
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;
    this.recordAccessPattern(key);

    // 促进到更高层级
    this.promoteLayer(key, entry);

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * 设置缓存值，自动分配到合适的层级
   */
  set<T>(key: string, value: T, ttl?: number, layer?: 'L1' | 'L2' | 'L3'): void {
    const size = this.estimateSize(value);

    // 确定目标层级
    const targetLayer = layer || this.determineLayer(size);

    // 检查是否需要清理空间
    this.ensureSpace(targetLayer, size);

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      size,
      layer: targetLayer,
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, entry);
    this.recordAccessPattern(key);
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.accessPattern.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, cleanups: 0 };
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const l1Entries = entries.filter((e) => e.layer === 'L1');
    const l2Entries = entries.filter((e) => e.layer === 'L2');
    const l3Entries = entries.filter((e) => e.layer === 'L3');

    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
    const l1Size = l1Entries.reduce((sum, e) => sum + e.size, 0);
    const l2Size = l2Entries.reduce((sum, e) => sum + e.size, 0);
    const l3Size = l3Entries.reduce((sum, e) => sum + e.size, 0);

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      totalSize,
      entryCount: this.cache.size,
      hitRate,
      missRate: 1 - hitRate,
      evictionCount: this.stats.evictions,
      l1Size,
      l2Size,
      l3Size,
    };
  }

  /**
   * 执行激进清理（当内存压力高时）
   */
  aggressiveCleanup(targetReductionPercent: number = 30): void {
    const stats = this.getStats();
    const targetSize = stats.totalSize * ((100 - targetReductionPercent) / 100);

    const entries = Array.from(this.cache.values())
      .sort((a, b) => {
        // 优先清理 L3 层
        if (a.layer !== b.layer) {
          return (b.layer === 'L3' ? 1 : 0) - (a.layer === 'L3' ? 1 : 0);
        }
        // 同层级内，清理最少使用的
        return a.accessCount - b.accessCount;
      });

    let currentSize = stats.totalSize;
    for (const entry of entries) {
      if (currentSize <= targetSize) break;
      this.cache.delete(entry.key);
      currentSize -= entry.size;
      this.stats.evictions++;
    }

    this.stats.cleanups++;
  }

  /**
   * 预测性清理 - 基于访问模式预测即将被访问的数据
   */
  predictiveCleanup(): void {
    const stats = this.getStats();
    if (stats.totalSize / (this.config.l1MaxSize + this.config.l2MaxSize + this.config.l3MaxSize) < this.config.predictiveCleanupThreshold) {
      return; // 内存充足，无需清理
    }

    // 计算每个条目的"热度分数"
    const entries = Array.from(this.cache.values());
    const heatScores = entries.map((entry) => {
      const recentAccesses = this.getRecentAccessCount(entry.key, 60000); // 最近1分钟
      const avgAccessRate = entry.accessCount / ((Date.now() - entry.createdAt) / 1000); // 每秒访问数
      const recency = 1 / (1 + (Date.now() - entry.lastAccessedAt) / 1000); // 最近性权重
      return {
        entry,
        score: recentAccesses * 0.5 + avgAccessRate * 0.3 + recency * 0.2,
      };
    });

    // 清理热度分数最低的条目
    heatScores
      .sort((a, b) => a.score - b.score)
      .slice(0, Math.max(1, Math.floor(entries.length * 0.1))) // 清理最低10%
      .forEach(({ entry }) => {
        this.cache.delete(entry.key);
        this.stats.evictions++;
      });

    this.stats.cleanups++;
  }

  /**
   * 获取内存使用率（百分比）
   */
  getMemoryUsagePercent(): number {
    const stats = this.getStats();
    const maxSize = this.config.l1MaxSize + this.config.l2MaxSize + this.config.l3MaxSize;
    return (stats.totalSize / maxSize) * 100;
  }

  /**
   * 启动定期清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      // 定期清理过期条目
      const now = Date.now();
      const expiredKeys: string[] = [];

      this.cache.forEach((entry, key) => {
        if (entry.ttl && now - entry.createdAt > entry.ttl) {
          expiredKeys.push(key);
        }
      });

      expiredKeys.forEach((key) => this.cache.delete(key));

      // 检查是否需要预测性清理
      if (this.getMemoryUsagePercent() > this.config.predictiveCleanupThreshold * 100) {
        this.predictiveCleanup();
      }
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  /**
   * 私有方法：确定数据应该存储的层级
   */
  private determineLayer(size: number): 'L1' | 'L2' | 'L3' {
    // 小于 1MB 的数据存储在 L1
    if (size < 1024 * 1024) return 'L1';
    // 小于 10MB 的数据存储在 L2
    if (size < 10 * 1024 * 1024) return 'L2';
    // 其他存储在 L3
    return 'L3';
  }

  /**
   * 私有方法：提升缓存层级
   */
  private promoteLayer(key: string, entry: CacheEntry<any>): void {
    // 如果访问频率高，晋升到更高层级
    if (entry.layer === 'L3' && entry.accessCount > 10) {
      entry.layer = 'L2';
    } else if (entry.layer === 'L2' && entry.accessCount > 50) {
      entry.layer = 'L1';
    }
  }

  /**
   * 私有方法：确保有足够的空间
   */
  private ensureSpace(layer: 'L1' | 'L2' | 'L3', requiredSize: number): void {
    const layerMaxSize = this.config[`${layer}MaxSize` as keyof CacheConfig] as number;
    const layerEntries = Array.from(this.cache.values()).filter((e) => e.layer === layer);
    const layerSize = layerEntries.reduce((sum: number, e) => sum + e.size, 0);

    if (layerSize + requiredSize > layerMaxSize) {
      // 清理该层级中最少使用的条目
      layerEntries
        .sort((a, b) => a.accessCount - b.accessCount)
        .slice(0, Math.max(1, Math.floor(layerEntries.length * 0.2))) // 清理最低20%
        .forEach((entry) => {
          this.cache.delete(entry.key);
          this.stats.evictions++;
        });
    }
  }

  /**
   * 私有方法：估计值的大小（字节）
   */
  private estimateSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2; // UTF-16
    }
    if (typeof value === 'number') {
      return 8;
    }
    if (typeof value === 'boolean') {
      return 4;
    }
    if (Array.isArray(value)) {
      return value.reduce((sum: number, v) => sum + this.estimateSize(v), 0) + 100;
    }
    if (typeof value === 'object' && value !== null) {
      return (Object.values(value) as any[]).reduce((sum: number, v: any) => sum + this.estimateSize(v), 0) + 100;
    }
    return 100; // 默认估计
  }

  /**
   * 私有方法：记录访问模式
   */
  private recordAccessPattern(key: string): void {
    if (!this.accessPattern.has(key)) {
      this.accessPattern.set(key, []);
    }
    this.accessPattern.get(key)!.push(Date.now());

    // 只保留最近1小时的访问记录
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const pattern = this.accessPattern.get(key)!;
    const recentAccesses = pattern.filter((t) => t > oneHourAgo);
    this.accessPattern.set(key, recentAccesses);
  }

  /**
   * 私有方法：获取最近的访问次数
   */
  private getRecentAccessCount(key: string, timeWindow: number): number {
    const pattern = this.accessPattern.get(key) || [];
    const cutoff = Date.now() - timeWindow;
    return pattern.filter((t) => t > cutoff).length;
  }
}

// 全局缓存管理器实例
let globalCacheManager: AdvancedCacheManager | null = null;

export function getAdvancedCacheManager(): AdvancedCacheManager {
  if (!globalCacheManager) {
    globalCacheManager = new AdvancedCacheManager();
  }
  return globalCacheManager;
}

export function resetAdvancedCacheManager(): void {
  if (globalCacheManager) {
    globalCacheManager.destroy();
    globalCacheManager = null;
  }
}
