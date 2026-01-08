import { getDb } from "../db";

/**
 * 多层缓存管理器
 * 支持内存缓存、LLM 响应缓存、数据库查询缓存
 * 自动过期和清理机制
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  created: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  private readonly MAX_MEMORY_ENTRIES = 1000;
  private readonly CLEANUP_INTERVAL = 60000; // 1 分钟
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
   * 清理过期缓存
   */
  private cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // 如果缓存过多，删除最少使用的条目
    if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, Math.floor(this.MAX_MEMORY_ENTRIES * 0.1));

      for (const [key] of sortedEntries) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CacheManager] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * 生成缓存键
   */
  private generateKey(namespace: string, identifier: string): string {
    return `${namespace}:${identifier}`;
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

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set<T>(
    namespace: string,
    identifier: string,
    value: T,
    ttlSeconds: number = 3600
  ): void {
    const key = this.generateKey(namespace, identifier);
    const now = Date.now();

    this.memoryCache.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      hits: 0,
      created: now,
    });
  }

  /**
   * 删除缓存
   */
  delete(namespace: string, identifier: string): boolean {
    const key = this.generateKey(namespace, identifier);
    return this.memoryCache.delete(key);
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
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const totalHits = this.stats.hits;
    const totalMisses = this.stats.misses;
    const total = totalHits + totalMisses;

    return {
      totalEntries: this.memoryCache.size,
      totalHits,
      totalMisses,
      hitRate: total > 0 ? (totalHits / total) * 100 : 0,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * 估计内存使用量（粗略估计）
   */
  private estimateMemoryUsage(): number {
    let bytes = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      bytes += key.length * 2; // 字符串占用
      bytes += JSON.stringify(entry.value).length * 2;
      bytes += 64; // 对象开销
    }
    return bytes;
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

// 全局缓存实例
let globalCache: CacheManager | null = null;

export function getCacheManager(): CacheManager {
  if (!globalCache) {
    globalCache = new CacheManager();
  }
  return globalCache;
}

/**
 * LLM 响应缓存服务
 */
export class LLMResponseCache {
  private cache = getCacheManager();

  /**
   * 获取缓存的 LLM 响应
   */
  getResponse(prompt: string): string | null {
    const hash = this.hashPrompt(prompt);
    return this.cache.get<string>("llm_response", hash);
  }

  /**
   * 缓存 LLM 响应
   */
  cacheResponse(prompt: string, response: string, ttlHours: number = 24): void {
    const hash = this.hashPrompt(prompt);
    this.cache.set("llm_response", hash, response, ttlHours * 3600);
  }

  /**
   * 清空所有 LLM 响应缓存
   */
  clearAll(): number {
    return this.cache.clearNamespace("llm_response");
  }

  /**
   * 简单的哈希函数
   */
  private hashPrompt(prompt: string): string {
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * 数据库查询缓存服务
 */
export class DatabaseQueryCache {
  private cache = getCacheManager();

  /**
   * 获取缓存的查询结果
   */
  getResult<T>(query: string, params?: any[]): T | null {
    const key = this.generateKey(query, params);
    return this.cache.get<T>("db_query", key);
  }

  /**
   * 缓存查询结果
   */
  cacheResult<T>(
    query: string,
    result: T,
    ttlHours: number = 1,
    params?: any[]
  ): void {
    const key = this.generateKey(query, params);
    this.cache.set("db_query", key, result, ttlHours * 3600);
  }

  /**
   * 清空指定表的缓存
   */
  clearTable(tableName: string): number {
    return this.cache.clearNamespace(`db_query:${tableName}`);
  }

  /**
   * 清空所有数据库查询缓存
   */
  clearAll(): number {
    return this.cache.clearNamespace("db_query");
  }

  /**
   * 生成缓存键
   */
  private generateKey(query: string, params?: any[]): string {
    const paramStr = params ? JSON.stringify(params) : "";
    return `${query}:${paramStr}`;
  }
}

/**
 * 用户档案缓存服务
 */
export class UserProfileCache {
  private cache = getCacheManager();

  /**
   * 获取缓存的用户档案
   */
  getProfile(userId: number): any | null {
    return this.cache.get("user_profile", userId.toString());
  }

  /**
   * 缓存用户档案
   */
  cacheProfile(userId: number, profile: any, ttlHours: number = 1): void {
    this.cache.set("user_profile", userId.toString(), profile, ttlHours * 3600);
  }

  /**
   * 清除用户档案缓存
   */
  clearProfile(userId: number): boolean {
    return this.cache.delete("user_profile", userId.toString());
  }

  /**
   * 清空所有用户档案缓存
   */
  clearAll(): number {
    return this.cache.clearNamespace("user_profile");
  }
}

/**
 * 概念图缓存服务
 */
export class ConceptGraphCache {
  private cache = getCacheManager();

  /**
   * 获取缓存的概念图
   */
  getGraph(userId: number): any | null {
    return this.cache.get("concept_graph", userId.toString());
  }

  /**
   * 缓存概念图
   */
  cacheGraph(userId: number, graph: any, ttlHours: number = 6): void {
    this.cache.set("concept_graph", userId.toString(), graph, ttlHours * 3600);
  }

  /**
   * 清除概念图缓存
   */
  clearGraph(userId: number): boolean {
    return this.cache.delete("concept_graph", userId.toString());
  }

  /**
   * 清空所有概念图缓存
   */
  clearAll(): number {
    return this.cache.clearNamespace("concept_graph");
  }
}

/**
 * 关系数据缓存服务
 */
export class RelationshipDataCache {
  private cache = getCacheManager();

  /**
   * 获取缓存的关系数据
   */
  getRelationships(userId: number): any | null {
    return this.cache.get("relationships", userId.toString());
  }

  /**
   * 缓存关系数据
   */
  cacheRelationships(userId: number, data: any, ttlHours: number = 12): void {
    this.cache.set("relationships", userId.toString(), data, ttlHours * 3600);
  }

  /**
   * 清除关系数据缓存
   */
  clearRelationships(userId: number): boolean {
    return this.cache.delete("relationships", userId.toString());
  }

  /**
   * 清空所有关系数据缓存
   */
  clearAll(): number {
    return this.cache.clearNamespace("relationships");
  }
}

/**
 * 创意内容缓存服务
 */
export class CreativeContentCache {
  private cache = getCacheManager();

  /**
   * 获取缓存的创意内容
   */
  getContent(contentId: number): any | null {
    return this.cache.get("creative_content", contentId.toString());
  }

  /**
   * 缓存创意内容
   */
  cacheContent(contentId: number, content: any, ttlHours: number = 24): void {
    this.cache.set("creative_content", contentId.toString(), content, ttlHours * 3600);
  }

  /**
   * 清除创意内容缓存
   */
  clearContent(contentId: number): boolean {
    return this.cache.delete("creative_content", contentId.toString());
  }

  /**
   * 清空所有创意内容缓存
   */
  clearAll(): number {
    return this.cache.clearNamespace("creative_content");
  }
}

export default getCacheManager;
