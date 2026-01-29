/**
 * 成本追踪系统
 * 记录所有 API 调用、数据库查询、缓存命中等成本相关信息
 */

interface CostEntry {
  timestamp: number;
  type: "llm" | "database" | "cache_hit" | "cache_miss";
  service: string;
  cost: number;
  details: Record<string, any>;
}

interface DailyCostSummary {
  date: string;
  llmCost: number;
  databaseCost: number;
  totalCost: number;
  llmCalls: number;
  dbQueries: number;
  cacheHitRate: number;
}

interface CostStats {
  totalCost: number;
  llmCost: number;
  databaseCost: number;
  savingsCost: number;
  averageDailyCost: number;
  costTrend: "increasing" | "decreasing" | "stable";
}

class CostTracker {
  private costHistory: CostEntry[] = [];
  private dailySummaries: Map<string, DailyCostSummary> = new Map();

  private readonly MAX_HISTORY_ENTRIES = 10000;
  private readonly COST_PER_LLM_CALL = 0.03; // 平均 0.03 元/次
  private readonly COST_PER_DB_QUERY = 0.0001; // 平均 0.0001 元/次

  /**
   * 记录 LLM 调用成本
   */
  recordLLMCall(
    service: string,
    cost: number,
    details?: Record<string, any>
  ): void {
    this.recordCost("llm", service, cost, details);
  }

  /**
   * 记录数据库查询成本
   */
  recordDatabaseQuery(
    service: string,
    cost: number = this.COST_PER_DB_QUERY,
    details?: Record<string, any>
  ): void {
    this.recordCost("database", service, cost, details);
  }

  /**
   * 记录缓存命中
   */
  recordCacheHit(
    service: string,
    savedCost: number,
    details?: Record<string, any>
  ): void {
    this.recordCost("cache_hit", service, savedCost, {
      ...details,
      saved: true,
    });
  }

  /**
   * 记录缓存未命中
   */
  recordCacheMiss(service: string, details?: Record<string, any>): void {
    this.recordCost("cache_miss", service, 0, details);
  }

  /**
   * 内部记录成本方法
   */
  private recordCost(
    type: "llm" | "database" | "cache_hit" | "cache_miss",
    service: string,
    cost: number,
    details?: Record<string, any>
  ): void {
    const entry: CostEntry = {
      timestamp: Date.now(),
      type,
      service,
      cost,
      details: details || {},
    };

    this.costHistory.push(entry);

    // 保持历史记录大小
    if (this.costHistory.length > this.MAX_HISTORY_ENTRIES) {
      this.costHistory = this.costHistory.slice(-this.MAX_HISTORY_ENTRIES);
    }

    // 更新每日汇总
    this.updateDailySummary(entry);
  }

  /**
   * 更新每日成本汇总
   */
  private updateDailySummary(entry: CostEntry): void {
    const date = new Date(entry.timestamp).toISOString().split("T")[0];
    let summary = this.dailySummaries.get(date);

    if (!summary) {
      summary = {
        date,
        llmCost: 0,
        databaseCost: 0,
        totalCost: 0,
        llmCalls: 0,
        dbQueries: 0,
        cacheHitRate: 0,
      };
      this.dailySummaries.set(date, summary);
    }

    if (entry.type === "llm") {
      summary.llmCost += entry.cost;
      summary.llmCalls++;
    } else if (entry.type === "database") {
      summary.databaseCost += entry.cost;
      summary.dbQueries++;
    }

    summary.totalCost = summary.llmCost + summary.databaseCost;
  }

  /**
   * 获取总成本统计
   */
  getStats(): CostStats {
    let totalCost = 0;
    let llmCost = 0;
    let databaseCost = 0;
    let savingsCost = 0;
    let cacheHits = 0;
    let cacheMisses = 0;

    for (const entry of this.costHistory) {
      if (entry.type === "llm") {
        llmCost += entry.cost;
        totalCost += entry.cost;
      } else if (entry.type === "database") {
        databaseCost += entry.cost;
        totalCost += entry.cost;
      } else if (entry.type === "cache_hit") {
        savingsCost += entry.cost;
        cacheHits++;
      } else if (entry.type === "cache_miss") {
        cacheMisses++;
      }
    }

    const averageDailyCost =
      this.dailySummaries.size > 0
        ? totalCost / this.dailySummaries.size
        : 0;

    // 判断成本趋势
    const costTrend = this.calculateCostTrend();

    return {
      totalCost,
      llmCost,
      databaseCost,
      savingsCost,
      averageDailyCost,
      costTrend,
    };
  }

  /**
   * 计算成本趋势
   */
  private calculateCostTrend(): "increasing" | "decreasing" | "stable" {
    if (this.dailySummaries.size < 2) return "stable";

    const summaries = Array.from(this.dailySummaries.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const recentDays = summaries.slice(-7);
    if (recentDays.length < 2) return "stable";

    const avgRecent =
      recentDays.reduce((sum, s) => sum + s.totalCost, 0) / recentDays.length;
    const avgPrevious =
      summaries
        .slice(-14, -7)
        .reduce((sum, s) => sum + s.totalCost, 0) / Math.max(1, summaries.length - 7);

    const change = ((avgRecent - avgPrevious) / avgPrevious) * 100;

    if (change > 10) return "increasing";
    if (change < -10) return "decreasing";
    return "stable";
  }

  /**
   * 获取每日成本汇总
   */
  getDailySummaries(days: number = 30): DailyCostSummary[] {
    const summaries = Array.from(this.dailySummaries.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-days);

    return summaries;
  }

  /**
   * 获取最近 N 天的成本
   */
  getCostForLastDays(days: number = 30): number {
    const summaries = this.getDailySummaries(days);
    return summaries.reduce((sum, s) => sum + s.totalCost, 0);
  }

  /**
   * 获取成本预测（基于当前趋势）
   */
  predictMonthlyCost(): number {
    const stats = this.getStats();
    return stats.averageDailyCost * 30;
  }

  /**
   * 获取缓存效率
   */
  getCacheEfficiency(): {
    hitRate: number;
    savedCost: number;
    costReduction: number;
  } {
    let cacheHits = 0;
    let cacheMisses = 0;
    let savedCost = 0;

    for (const entry of this.costHistory) {
      if (entry.type === "cache_hit") {
        cacheHits++;
        savedCost += entry.cost;
      } else if (entry.type === "cache_miss") {
        cacheMisses++;
      }
    }

    const total = cacheHits + cacheMisses;
    const hitRate = total > 0 ? (cacheHits / total) * 100 : 0;

    const stats = this.getStats();
    const costReduction =
      stats.totalCost > 0 ? (savedCost / (stats.totalCost + savedCost)) * 100 : 0;

    return {
      hitRate,
      savedCost,
      costReduction,
    };
  }

  /**
   * 获取服务成本分布
   */
  getServiceCostBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const entry of this.costHistory) {
      if (!breakdown[entry.service]) {
        breakdown[entry.service] = 0;
      }
      breakdown[entry.service] += entry.cost;
    }

    return breakdown;
  }

  /**
   * 导出成本报告
   */
  generateReport(): string {
    const stats = this.getStats();
    const cacheEfficiency = this.getCacheEfficiency();
    const serviceBreakdown = this.getServiceCostBreakdown();
    const dailySummaries = this.getDailySummaries(30);

    let report = "# Nova-Mind 成本报告\n\n";

    report += "## 总体统计\n";
    report += `- 总成本: ¥${stats.totalCost.toFixed(2)}\n`;
    report += `- LLM 成本: ¥${stats.llmCost.toFixed(2)}\n`;
    report += `- 数据库成本: ¥${stats.databaseCost.toFixed(2)}\n`;
    report += `- 节省成本: ¥${stats.savingsCost.toFixed(2)}\n`;
    report += `- 平均日成本: ¥${stats.averageDailyCost.toFixed(2)}\n`;
    report += `- 预测月成本: ¥${this.predictMonthlyCost().toFixed(2)}\n`;
    report += `- 成本趋势: ${stats.costTrend}\n\n`;

    report += "## 缓存效率\n";
    report += `- 缓存命中率: ${cacheEfficiency.hitRate.toFixed(2)}%\n`;
    report += `- 已节省成本: ¥${cacheEfficiency.savedCost.toFixed(2)}\n`;
    report += `- 成本降低: ${cacheEfficiency.costReduction.toFixed(2)}%\n\n`;

    report += "## 服务成本分布\n";
    for (const [service, cost] of Object.entries(serviceBreakdown)) {
      report += `- ${service}: ¥${cost.toFixed(2)}\n`;
    }

    report += "\n## 最近 30 天成本趋势\n";
    for (const summary of dailySummaries) {
      report += `- ${summary.date}: ¥${summary.totalCost.toFixed(2)} (${summary.llmCalls} LLM calls, ${summary.dbQueries} DB queries)\n`;
    }

    return report;
  }

  /**
   * 重置追踪数据
   */
  reset(): void {
    this.costHistory = [];
    this.dailySummaries.clear();
  }
}

// 全局成本追踪器实例
let globalTracker: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!globalTracker) {
    globalTracker = new CostTracker();
  }
  return globalTracker;
}

export default getCostTracker;
