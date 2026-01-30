/**
 * 成本监控和控制服务
 * 追踪 LLM 调用成本，确保不超过月度预算
 */

interface CostRecord {
  timestamp: Date;
  service: string; // "openai", "claude", "gemini" 等
  model: string;
  costUSD: number;
  tokensUsed: number;
  purpose: string; // "monthly_learning", "chat", 等
}

interface MonthlyBudget {
  year: number;
  month: number;
  budgetUSD: number;
  spentUSD: number;
  records: CostRecord[];
}

class CostMonitor {
  private budgets: Map<string, MonthlyBudget> = new Map();
  private currentBudgetKey: string = "";
  private maxMonthlyBudget: number = 1.0; // 1 美元
  private alertThreshold: number = 0.8; // 80% 时告警

  constructor() {
    this.initializeCurrentMonth();
  }

  /**
   * 初始化当前月份的预算
   */
  private initializeCurrentMonth(): void {
    const now = new Date();
    const key = this.getMonthKey(now);
    this.currentBudgetKey = key;

    if (!this.budgets.has(key)) {
      this.budgets.set(key, {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        budgetUSD: this.maxMonthlyBudget,
        spentUSD: 0,
        records: [],
      });
    }
  }

  /**
   * 获取月份键
   */
  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  /**
   * 记录 LLM 调用成本
   */
  recordCost(
    service: string,
    model: string,
    costUSD: number,
    tokensUsed: number,
    purpose: string
  ): { allowed: boolean; remainingBudget: number; alert: boolean } {
    this.initializeCurrentMonth();
    const budget = this.budgets.get(this.currentBudgetKey);

    if (!budget) {
      console.error("[CostMonitor] Current budget not found");
      return { allowed: false, remainingBudget: 0, alert: false };
    }

    // 检查是否超过预算
    if (budget.spentUSD + costUSD > budget.budgetUSD) {
      console.warn(
        `[CostMonitor] Cost ${costUSD} USD would exceed monthly budget. Current: ${budget.spentUSD} USD, Limit: ${budget.budgetUSD} USD`
      );
      return {
        allowed: false,
        remainingBudget: budget.budgetUSD - budget.spentUSD,
        alert: true,
      };
    }

    // 记录成本
    const record: CostRecord = {
      timestamp: new Date(),
      service,
      model,
      costUSD,
      tokensUsed,
      purpose,
    };

    budget.records.push(record);
    budget.spentUSD += costUSD;

    // 检查是否达到告警阈值
    const usagePercent = budget.spentUSD / budget.budgetUSD;
    const alert = usagePercent >= this.alertThreshold;

    if (alert) {
      console.warn(
        `[CostMonitor] Monthly budget usage at ${(usagePercent * 100).toFixed(1)}%`
      );
    }

    console.log(
      `[CostMonitor] Cost recorded: ${costUSD} USD (${service}/${model}), Total: ${budget.spentUSD} USD / ${budget.budgetUSD} USD`
    );

    return {
      allowed: true,
      remainingBudget: budget.budgetUSD - budget.spentUSD,
      alert,
    };
  }

  /**
   * 获取当前月份的预算信息
   */
  getCurrentMonthBudget(): MonthlyBudget | null {
    this.initializeCurrentMonth();
    return this.budgets.get(this.currentBudgetKey) || null;
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): number {
    const budget = this.getCurrentMonthBudget();
    if (!budget) return 0;
    return Math.max(0, budget.budgetUSD - budget.spentUSD);
  }

  /**
   * 获取已消耗的预算
   */
  getSpentBudget(): number {
    const budget = this.getCurrentMonthBudget();
    if (!budget) return 0;
    return budget.spentUSD;
  }

  /**
   * 检查是否已达到预算上限
   */
  isBudgetExhausted(): boolean {
    const budget = this.getCurrentMonthBudget();
    if (!budget) return false;
    return budget.spentUSD >= budget.budgetUSD;
  }

  /**
   * 获取预算使用百分比
   */
  getBudgetUsagePercent(): number {
    const budget = this.getCurrentMonthBudget();
    if (!budget) return 0;
    return (budget.spentUSD / budget.budgetUSD) * 100;
  }

  /**
   * 获取成本记录
   */
  getCostRecords(limit: number = 10): CostRecord[] {
    const budget = this.getCurrentMonthBudget();
    if (!budget) return [];
    return budget.records.slice(-limit);
  }

  /**
   * 获取按用途分类的成本
   */
  getCostByPurpose(): Record<string, number> {
    const budget = this.getCurrentMonthBudget();
    if (!budget) return {};

    const costByPurpose: Record<string, number> = {};
    budget.records.forEach((record) => {
      costByPurpose[record.purpose] = (costByPurpose[record.purpose] || 0) + record.costUSD;
    });

    return costByPurpose;
  }

  /**
   * 重置月度预算（通常在每月 1 号调用）
   */
  resetMonthlyBudget(): void {
    const now = new Date();
    const key = this.getMonthKey(now);

    this.budgets.set(key, {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      budgetUSD: this.maxMonthlyBudget,
      spentUSD: 0,
      records: [],
    });

    console.log(`[CostMonitor] Monthly budget reset for ${key}`);
  }

  /**
   * 获取历史预算
   */
  getHistoricalBudgets(): MonthlyBudget[] {
    return Array.from(this.budgets.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }

  /**
   * 设置月度预算上限
   */
  setMonthlyBudgetLimit(budgetUSD: number): void {
    this.maxMonthlyBudget = budgetUSD;
    console.log(`[CostMonitor] Monthly budget limit set to ${budgetUSD} USD`);
  }

  /**
   * 设置告警阈值
   */
  setAlertThreshold(percent: number): void {
    this.alertThreshold = Math.max(0, Math.min(1, percent));
    console.log(`[CostMonitor] Alert threshold set to ${(this.alertThreshold * 100).toFixed(1)}%`);
  }
}

// 单例模式
let instance: CostMonitor | null = null;

export function getCostMonitor(): CostMonitor {
  if (!instance) {
    instance = new CostMonitor();
  }
  return instance;
}

/**
 * 记录 LLM 调用成本
 */
export function recordLLMCost(
  service: string,
  model: string,
  costUSD: number,
  tokensUsed: number,
  purpose: string
): { allowed: boolean; remainingBudget: number; alert: boolean } {
  const monitor = getCostMonitor();
  return monitor.recordCost(service, model, costUSD, tokensUsed, purpose);
}

/**
 * 获取剩余预算
 */
export function getRemainingBudget(): number {
  const monitor = getCostMonitor();
  return monitor.getRemainingBudget();
}

/**
 * 检查是否已达到预算上限
 */
export function isBudgetExhausted(): boolean {
  const monitor = getCostMonitor();
  return monitor.isBudgetExhausted();
}

/**
 * 获取预算使用信息
 */
export function getBudgetInfo() {
  const monitor = getCostMonitor();
  return {
    spent: monitor.getSpentBudget(),
    remaining: monitor.getRemainingBudget(),
    usagePercent: monitor.getBudgetUsagePercent(),
    isExhausted: monitor.isBudgetExhausted(),
    costByPurpose: monitor.getCostByPurpose(),
  };
}
