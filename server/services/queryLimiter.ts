/**
 * 数据库查询限制器
 * 限制单次查询返回的记录数，防止内存溢出
 */

interface QueryLimitConfig {
  maxRecordsPerQuery: number; // 单次查询最大记录数
  maxBatchSize: number; // 批处理最大大小
  enablePagination: boolean; // 是否启用分页
}

class QueryLimiter {
  private static instance: QueryLimiter | null = null;
  private config: QueryLimitConfig = {
    maxRecordsPerQuery: 50, // 严格限制：最多 50 条记录
    maxBatchSize: 20, // 批处理最多 20 条
    enablePagination: true,
  };

  private queryStats = {
    totalQueries: 0,
    limitedQueries: 0,
    totalRecordsReturned: 0,
  };

  private constructor() {}

  static getInstance(): QueryLimiter {
    if (!QueryLimiter.instance) {
      QueryLimiter.instance = new QueryLimiter();
    }
    return QueryLimiter.instance;
  }

  /**
   * 获取安全的查询限制
   */
  getSafeLimit(requestedLimit?: number): number {
    const limit = requestedLimit || this.config.maxRecordsPerQuery;
    return Math.min(limit, this.config.maxRecordsPerQuery);
  }

  /**
   * 获取安全的偏移量
   */
  getSafeOffset(requestedOffset?: number): number {
    return Math.max(0, requestedOffset || 0);
  }

  /**
   * 检查查询是否超过限制
   */
  isQueryLimited(recordCount: number): boolean {
    return recordCount > this.config.maxRecordsPerQuery;
  }

  /**
   * 记录查询统计
   */
  recordQuery(recordCount: number): void {
    this.queryStats.totalQueries++;
    this.queryStats.totalRecordsReturned += recordCount;

    if (this.isQueryLimited(recordCount)) {
      this.queryStats.limitedQueries++;
    }
  }

  /**
   * 获取查询统计
   */
  getStats() {
    return {
      ...this.queryStats,
      averageRecordsPerQuery:
        this.queryStats.totalQueries > 0
          ? (this.queryStats.totalRecordsReturned / this.queryStats.totalQueries).toFixed(2)
          : 0,
      limitPercentage:
        this.queryStats.totalQueries > 0
          ? ((this.queryStats.limitedQueries / this.queryStats.totalQueries) * 100).toFixed(1)
          : 0,
    };
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.queryStats = {
      totalQueries: 0,
      limitedQueries: 0,
      totalRecordsReturned: 0,
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<QueryLimitConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[QueryLimiter] Config updated:", this.config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): QueryLimitConfig {
    return { ...this.config };
  }
}

export function getQueryLimiter(): QueryLimiter {
  return QueryLimiter.getInstance();
}

/**
 * 包装查询以应用限制
 */
export function applyQueryLimit<T>(
  records: T[],
  limit?: number,
  offset?: number
): T[] {
  const limiter = getQueryLimiter();
  const safeLimit = limiter.getSafeLimit(limit);
  const safeOffset = limiter.getSafeOffset(offset);

  const result = records.slice(safeOffset, safeOffset + safeLimit);
  limiter.recordQuery(result.length);

  return result;
}

/**
 * 分页查询助手
 */
export async function paginatedQuery<T>(
  fetchFn: (limit: number, offset: number) => Promise<T[]>,
  totalNeeded: number = 50
): Promise<T[]> {
  const limiter = getQueryLimiter();
  const batchSize = limiter.getConfig().maxBatchSize;
  const results: T[] = [];

  let offset = 0;
  while (results.length < totalNeeded) {
    const batch = await fetchFn(batchSize, offset);
    if (batch.length === 0) break;

    results.push(...batch.slice(0, totalNeeded - results.length));
    offset += batchSize;
  }

  return results;
}
