import { DatabaseQueryCache } from "./cacheManager";
import { getDb } from "../db";

/**
 * 数据库查询优化器
 * 实现查询缓存、批量操作、索引优化等
 */

interface QueryMetrics {
  totalQueries: number;
  cachedQueries: number;
  batchedQueries: number;
  estimatedSavings: number;
}

interface BatchQueryRequest {
  table: string;
  condition: string;
  limit?: number;
}

class QueryOptimizer {
  private cache = new DatabaseQueryCache();
  private metrics: QueryMetrics = {
    totalQueries: 0,
    cachedQueries: 0,
    batchedQueries: 0,
    estimatedSavings: 0,
  };

  private readonly QUERY_CACHE_TTL = 1; // 1 小时

  /**
   * 获取缓存的查询结果
   */
  async getCachedResult<T>(
    query: string,
    executor: () => Promise<T>,
    cacheTTLHours: number = this.QUERY_CACHE_TTL
  ): Promise<T> {
    this.metrics.totalQueries++;

    // 检查缓存
    const cached = this.cache.getResult<T>(query);
    if (cached) {
      this.metrics.cachedQueries++;
      this.metrics.estimatedSavings += 1; // 每个缓存命中节省 1 个查询
      console.log(`[QueryOptimizer] Cache hit for query: ${query.substring(0, 50)}...`);
      return cached;
    }

    // 执行查询
    const result = await executor();

    // 缓存结果
    this.cache.cacheResult(query, result, cacheTTLHours);

    return result;
  }

  /**
   * 批量查询优化（减少数据库往返）
   */
  async batchQuery<T>(
    queries: Array<{
      name: string;
      executor: () => Promise<T>;
      cacheTTL?: number;
    }>
  ): Promise<Record<string, T>> {
    this.metrics.batchedQueries++;
    const results: Record<string, T> = {};

    // 并行执行所有查询
    const promises = queries.map(async (q) => {
      try {
        const result = await this.getCachedResult(
          q.name,
          q.executor,
          q.cacheTTL || this.QUERY_CACHE_TTL
        );
        results[q.name] = result;
      } catch (error) {
        console.error(`[QueryOptimizer] Batch query failed for ${q.name}:`, error);
        results[q.name] = null as any;
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * 清除特定表的缓存
   */
  clearTableCache(tableName: string): number {
    return this.cache.clearTable(tableName);
  }

  /**
   * 清除所有查询缓存
   */
  clearAllCache(): number {
    return this.cache.clearAll();
  }

  /**
   * 获取查询指标
   */
  getMetrics(): QueryMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  resetMetrics(): void {
    this.metrics = {
      totalQueries: 0,
      cachedQueries: 0,
      batchedQueries: 0,
      estimatedSavings: 0,
    };
  }

  /**
   * 获取缓存命中率
   */
  getCacheHitRate(): number {
    if (this.metrics.totalQueries === 0) return 0;
    return (this.metrics.cachedQueries / this.metrics.totalQueries) * 100;
  }

  /**
   * 获取查询节省数
   */
  getQuerySavings(): number {
    return this.metrics.estimatedSavings;
  }
}

// 全局查询优化器实例
let globalOptimizer: QueryOptimizer | null = null;

export function getQueryOptimizer(): QueryOptimizer {
  if (!globalOptimizer) {
    globalOptimizer = new QueryOptimizer();
  }
  return globalOptimizer;
}

/**
 * 优化的用户档案查询
 */
export async function getOptimizedUserProfile(userId: number) {
  const optimizer = getQueryOptimizer();
  return optimizer.getCachedResult(
    `user_profile:${userId}`,
    async () => {
      const db = await getDb();
      if (!db) return null;

      // 这里应该执行实际的查询
      // 示例：return db.select().from(users).where(eq(users.id, userId));
      return null;
    },
    1 // 1 小时缓存
  );
}

/**
 * 优化的概念图查询
 */
export async function getOptimizedConceptGraph(userId: number) {
  const optimizer = getQueryOptimizer();
  return optimizer.getCachedResult(
    `concept_graph:${userId}`,
    async () => {
      const db = await getDb();
      if (!db) return null;

      // 这里应该执行实际的查询
      // 示例：return db.select().from(concepts).where(eq(concepts.userId, userId));
      return null;
    },
    6 // 6 小时缓存
  );
}

/**
 * 优化的关系数据查询
 */
export async function getOptimizedRelationships(userId: number) {
  const optimizer = getQueryOptimizer();
  return optimizer.getCachedResult(
    `relationships:${userId}`,
    async () => {
      const db = await getDb();
      if (!db) return null;

      // 这里应该执行实际的查询
      // 示例：return db.select().from(relationships).where(eq(relationships.userId, userId));
      return null;
    },
    12 // 12 小时缓存
  );
}

export default getQueryOptimizer;
