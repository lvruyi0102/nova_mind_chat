/**
 * 自动优化策略管理器
 * 根据成本和性能动态调整模型选择策略
 */

import { getCostBudgetManager } from "./costBudgetManager";
import { getCostTracker } from "./costTracker";
import { getModelSelectionStrategy } from "./modelSelectionStrategy";

export type OptimizationStrategy = "cost" | "quality" | "speed" | "balanced" | "aggressive";

export interface OptimizationPolicy {
  strategy: OptimizationStrategy;
  localModelUsageTarget: number; // 0-100，本地模型使用目标比例
  deepseekUsageTarget: number; // 0-100，DeepSeek 使用目标比例
  ollamaUsageTarget: number; // 0-100，Ollama 使用目标比例
  manusUsageTarget: number; // 0-100，Manus LLM 使用目标比例
  description: string;
}

class AutoOptimizationManager {
  private currentStrategy: OptimizationStrategy = "balanced";
  private budgetManager = getCostBudgetManager();
  private costTracker = getCostTracker();
  private policies: Map<OptimizationStrategy, OptimizationPolicy> = new Map();
  private lastOptimizationTime: number = 0;
  private optimizationInterval: number = 60 * 60 * 1000; // 1 小时

  constructor() {
    this.initializePolicies();
  }

  /**
   * 初始化优化策略
   */
  private initializePolicies(): void {
    // 成本优先策略
    this.policies.set("cost", {
      strategy: "cost",
      localModelUsageTarget: 80,
      deepseekUsageTarget: 50,
      ollamaUsageTarget: 30,
      manusUsageTarget: 20,
      description: "最大化成本节省，优先使用本地模型",
    });

    // 质量优先策略
    this.policies.set("quality", {
      strategy: "quality",
      localModelUsageTarget: 30,
      deepseekUsageTarget: 20,
      ollamaUsageTarget: 10,
      manusUsageTarget: 70,
      description: "优先保证输出质量，主要使用 Manus LLM",
    });

    // 速度优先策略
    this.policies.set("speed", {
      strategy: "speed",
      localModelUsageTarget: 60,
      deepseekUsageTarget: 30,
      ollamaUsageTarget: 30,
      manusUsageTarget: 40,
      description: "优先响应速度，平衡使用本地模型和 Manus LLM",
    });

    // 平衡策略
    this.policies.set("balanced", {
      strategy: "balanced",
      localModelUsageTarget: 50,
      deepseekUsageTarget: 25,
      ollamaUsageTarget: 25,
      manusUsageTarget: 50,
      description: "平衡成本、质量和速度",
    });

    // 激进策略（成本超预算时）
    this.policies.set("aggressive", {
      strategy: "aggressive",
      localModelUsageTarget: 90,
      deepseekUsageTarget: 60,
      ollamaUsageTarget: 30,
      manusUsageTarget: 10,
      description: "激进降低成本，最大化本地模型使用",
    });

    console.log("[AutoOptimizationManager] Policies initialized");
  }

  /**
   * 自动调整策略
   */
  async autoAdjustStrategy(): Promise<OptimizationStrategy> {
    const now = Date.now();

    // 检查是否需要调整（间隔限制）
    if (now - this.lastOptimizationTime < this.optimizationInterval) {
      return this.currentStrategy;
    }

    // 获取预算状态
    const budgetStatus = this.budgetManager.getBudgetStatus();

    // 根据预算状态调整策略
    let newStrategy: OptimizationStrategy = "balanced";

    if (budgetStatus.status === "critical") {
      // 成本严重超支 → 激进策略
      newStrategy = "aggressive";
      console.log("[AutoOptimizationManager] Switching to aggressive strategy due to critical cost");
    } else if (budgetStatus.status === "warning") {
      // 成本接近预算 → 成本优先策略
      newStrategy = "cost";
      console.log("[AutoOptimizationManager] Switching to cost strategy due to budget warning");
    } else if (budgetStatus.percentageUsed < 50) {
      // 成本低于 50% → 可以考虑质量优先
      newStrategy = "quality";
      console.log("[AutoOptimizationManager] Switching to quality strategy due to low cost usage");
    }

    // 更新策略
    if (newStrategy !== this.currentStrategy) {
      this.currentStrategy = newStrategy;
      this.lastOptimizationTime = now;

      console.log(
        `[AutoOptimizationManager] Strategy updated: ${this.currentStrategy} (cost: ${budgetStatus.percentageUsed.toFixed(1)}%)`
      );

      // 记录策略变化
      this.logStrategyChange(this.currentStrategy, budgetStatus);
    }

    return this.currentStrategy;
  }

  /**
   * 记录策略变化
   */
  private logStrategyChange(strategy: OptimizationStrategy, budgetStatus: any): void {
    const log = {
      timestamp: new Date().toISOString(),
      strategy,
      budgetStatus: {
        percentageUsed: budgetStatus.percentageUsed,
        currentCost: budgetStatus.currentCost,
        projectedCost: budgetStatus.projectedCost,
      },
    };

    console.log("[AutoOptimizationManager] Strategy change logged:", log);
  }

  /**
   * 获取当前策略
   */
  getCurrentStrategy(): OptimizationStrategy {
    return this.currentStrategy;
  }

  /**
   * 获取当前策略的配置
   */
  getCurrentPolicy(): OptimizationPolicy | undefined {
    return this.policies.get(this.currentStrategy);
  }

  /**
   * 获取所有策略
   */
  getAllPolicies(): OptimizationPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * 手动设置策略
   */
  setStrategy(strategy: OptimizationStrategy): void {
    if (this.policies.has(strategy)) {
      this.currentStrategy = strategy;
      this.lastOptimizationTime = Date.now();
      console.log(`[AutoOptimizationManager] Strategy manually set to: ${strategy}`);
    } else {
      console.warn(`[AutoOptimizationManager] Unknown strategy: ${strategy}`);
    }
  }

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): string[] {
    const budgetStatus = this.budgetManager.getBudgetStatus();
    const costStats = this.costTracker.getMonthlyStats();
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentCost = costStats[currentMonth] || 0;

    const suggestions: string[] = [];

    // 基于成本的建议
    if (budgetStatus.status === "critical") {
      suggestions.push("⚠️ 成本已严重超支，建议立即启用激进优化策略");
      suggestions.push("⚠️ 检查是否有异常的 LLM 调用或后台任务");
      suggestions.push("⚠️ 考虑临时禁用某些高成本的功能");
    } else if (budgetStatus.status === "warning") {
      suggestions.push("⚠️ 成本接近预算，建议提高本地模型使用比例");
      suggestions.push("⚠️ 考虑启用成本优先策略");
    } else {
      suggestions.push("✅ 成本在预算范围内");

      if (budgetStatus.percentageUsed < 30) {
        suggestions.push("💡 成本使用率较低，可以考虑启用质量优先策略");
      }
    }

    // 基于性能的建议
    const policy = this.getCurrentPolicy();
    if (policy) {
      if (policy.localModelUsageTarget > 70) {
        suggestions.push("💡 当前策略优先使用本地模型，确保本地模型服务正常运行");
      }

      if (policy.manusUsageTarget > 60) {
        suggestions.push("💡 当前策略优先使用 Manus LLM，可能导致成本较高");
      }
    }

    return suggestions;
  }

  /**
   * 生成优化报告
   */
  generateReport(): string {
    const budgetStatus = this.budgetManager.getBudgetStatus();
    const policy = this.getCurrentPolicy();

    let report = "# 自动优化报告\n\n";

    report += "## 当前策略\n";
    report += `- 策略: ${this.currentStrategy}\n`;
    if (policy) {
      report += `- 描述: ${policy.description}\n`;
      report += `- 本地模型目标: ${policy.localModelUsageTarget}%\n`;
      report += `- DeepSeek 目标: ${policy.deepseekUsageTarget}%\n`;
      report += `- Ollama 目标: ${policy.ollamaUsageTarget}%\n`;
      report += `- Manus LLM 目标: ${policy.manusUsageTarget}%\n`;
    }

    report += "\n## 预算状态\n";
    report += `- 成本使用率: ${budgetStatus.percentageUsed.toFixed(1)}%\n`;
    report += `- 当前成本: ¥${budgetStatus.currentCost.toFixed(2)}\n`;
    report += `- 预测月度成本: ¥${budgetStatus.projectedCost.toFixed(2)}\n`;
    report += `- 状态: ${this.getStatusLabel(budgetStatus.status)}\n`;

    report += "\n## 优化建议\n";
    const suggestions = this.getOptimizationSuggestions();
    for (const suggestion of suggestions) {
      report += `- ${suggestion}\n`;
    }

    report += "\n## 可用策略\n";
    for (const policy of this.getAllPolicies()) {
      report += `- **${policy.strategy}**: ${policy.description}\n`;
    }

    return report;
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status: "normal" | "warning" | "critical"): string {
    if (status === "normal") return "✅ 正常";
    if (status === "warning") return "⚠️ 警告";
    return "🚨 严重";
  }
}

// 全局自动优化管理器实例
let globalAutoOptimizationManager: AutoOptimizationManager | null = null;

export function getAutoOptimizationManager(): AutoOptimizationManager {
  if (!globalAutoOptimizationManager) {
    globalAutoOptimizationManager = new AutoOptimizationManager();
  }
  return globalAutoOptimizationManager;
}

export default getAutoOptimizationManager;
