/**
 * 成本预算和告警管理器
 * 管理月度成本预算、追踪成本、触发告警
 */

import { getCostTracker } from "./costTracker";
import { notifyOwner } from "../_core/notification";

export interface BudgetConfig {
  monthlyBudget: number;
  alertThreshold: number; // 百分比，如 80 表示 80%
  criticalThreshold: number; // 百分比，如 95 表示 95%
  enableAlerts: boolean;
  enableAutoOptimization: boolean;
}

export interface BudgetStatus {
  currentMonth: string;
  monthlyBudget: number;
  currentCost: number;
  percentageUsed: number;
  remainingBudget: number;
  status: "normal" | "warning" | "critical";
  projectedCost: number;
}

class CostBudgetManager {
  private config: BudgetConfig;
  private costTracker = getCostTracker();
  private lastAlertTime: number = 0;
  private alertCooldown: number = 60 * 60 * 1000; // 1 小时冷却时间

  constructor(config: Partial<BudgetConfig> = {}) {
    this.config = {
      monthlyBudget: config.monthlyBudget || 100,
      alertThreshold: config.alertThreshold || 80,
      criticalThreshold: config.criticalThreshold || 95,
      enableAlerts: config.enableAlerts !== false,
      enableAutoOptimization: config.enableAutoOptimization !== false,
    };

    console.log("[CostBudgetManager] Initialized with config:", this.config);
  }

  /**
   * 获取当前月份
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  /**
   * 获取预算状态
   */
  getBudgetStatus(): BudgetStatus {
    const costStats = this.costTracker.getMonthlyStats();
    const currentMonth = this.getCurrentMonth();
    const currentCost = costStats[currentMonth] || 0;
    const percentageUsed = (currentCost / this.config.monthlyBudget) * 100;
    const remainingBudget = Math.max(0, this.config.monthlyBudget - currentCost);

    // 计算预测成本（基于当前进度）
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const projectedCost = (currentCost / currentDay) * daysInMonth;

    // 确定状态
    let status: "normal" | "warning" | "critical" = "normal";
    if (percentageUsed >= this.config.criticalThreshold) {
      status = "critical";
    } else if (percentageUsed >= this.config.alertThreshold) {
      status = "warning";
    }

    return {
      currentMonth,
      monthlyBudget: this.config.monthlyBudget,
      currentCost,
      percentageUsed,
      remainingBudget,
      status,
      projectedCost,
    };
  }

  /**
   * 检查预算状态并触发告警
   */
  async checkBudgetAndAlert(): Promise<void> {
    const status = this.getBudgetStatus();

    if (!this.config.enableAlerts) {
      return;
    }

    // 检查冷却时间
    const now = Date.now();
    if (now - this.lastAlertTime < this.alertCooldown) {
      return;
    }

    // 触发告警
    if (status.status === "critical") {
      await this.sendCriticalAlert(status);
      this.lastAlertTime = now;
    } else if (status.status === "warning") {
      await this.sendWarningAlert(status);
      this.lastAlertTime = now;
    }
  }

  /**
   * 发送警告告警
   */
  private async sendWarningAlert(status: BudgetStatus): Promise<void> {
    const message = `
Nova-Mind 成本预警：本月成本已达到预算的 ${status.percentageUsed.toFixed(1)}%

当前成本: ¥${status.currentCost.toFixed(2)}
月度预算: ¥${status.monthlyBudget.toFixed(2)}
剩余预算: ¥${status.remainingBudget.toFixed(2)}
预测月度成本: ¥${status.projectedCost.toFixed(2)}

建议采取以下措施：
1. 检查本地模型是否正常运行
2. 考虑提高本地模型使用比例
3. 查看成本监控仪表板了解详细信息
    `;

    try {
      await notifyOwner({
        title: "⚠️ Nova-Mind 成本预警",
        content: message,
      });

      console.log("[CostBudgetManager] Warning alert sent");
    } catch (error) {
      console.error("[CostBudgetManager] Failed to send warning alert:", error);
    }
  }

  /**
   * 发送严重告警
   */
  private async sendCriticalAlert(status: BudgetStatus): Promise<void> {
    const message = `
🚨 Nova-Mind 严重成本告警：本月成本已达到预算的 ${status.percentageUsed.toFixed(1)}%

当前成本: ¥${status.currentCost.toFixed(2)}
月度预算: ¥${status.monthlyBudget.toFixed(2)}
剩余预算: ¥${status.remainingBudget.toFixed(2)}
预测月度成本: ¥${status.projectedCost.toFixed(2)}

立即采取行动：
1. 立即检查本地模型状态
2. 立即提高本地模型使用比例
3. 考虑临时降低 LLM 调用频率
4. 访问成本监控仪表板查看详细信息

如果问题持续，系统将自动启用激进的成本优化策略。
    `;

    try {
      await notifyOwner({
        title: "🚨 Nova-Mind 严重成本告警",
        content: message,
      });

      console.log("[CostBudgetManager] Critical alert sent");
    } catch (error) {
      console.error("[CostBudgetManager] Failed to send critical alert:", error);
    }
  }

  /**
   * 更新预算配置
   */
  updateConfig(config: Partial<BudgetConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("[CostBudgetManager] Config updated:", this.config);
  }

  /**
   * 获取预算配置
   */
  getConfig(): BudgetConfig {
    return { ...this.config };
  }

  /**
   * 生成预算报告
   */
  generateReport(): string {
    const status = this.getBudgetStatus();

    let report = "# 成本预算报告\n\n";

    report += `## ${status.currentMonth} 月度预算\n`;
    report += `- 月度预算: ¥${status.monthlyBudget.toFixed(2)}\n`;
    report += `- 当前成本: ¥${status.currentCost.toFixed(2)}\n`;
    report += `- 使用比例: ${status.percentageUsed.toFixed(1)}%\n`;
    report += `- 剩余预算: ¥${status.remainingBudget.toFixed(2)}\n`;
    report += `- 预测月度成本: ¥${status.projectedCost.toFixed(2)}\n`;
    report += `- 状态: ${this.getStatusLabel(status.status)}\n\n`;

    report += "## 预算配置\n";
    report += `- 警告阈值: ${this.config.alertThreshold}%\n`;
    report += `- 严重阈值: ${this.config.criticalThreshold}%\n`;
    report += `- 告警启用: ${this.config.enableAlerts ? "是" : "否"}\n`;
    report += `- 自动优化: ${this.config.enableAutoOptimization ? "是" : "否"}\n`;

    if (status.status !== "normal") {
      report += "\n## ⚠️ 建议\n";
      if (status.status === "warning") {
        report += "- 监控成本趋势\n";
        report += "- 考虑提高本地模型使用比例\n";
        report += "- 检查是否有异常的 LLM 调用\n";
      } else if (status.status === "critical") {
        report += "- 立即采取行动降低成本\n";
        report += "- 启用激进的本地模型优化策略\n";
        report += "- 考虑临时降低后台任务频率\n";
      }
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

  /**
   * 重置月度成本（仅用于测试）
   */
  resetMonthlyStats(): void {
    this.costTracker.resetMonthlyStats();
    console.log("[CostBudgetManager] Monthly stats reset");
  }
}

// 全局预算管理器实例
let globalBudgetManager: CostBudgetManager | null = null;

export function getCostBudgetManager(config?: Partial<BudgetConfig>): CostBudgetManager {
  if (!globalBudgetManager) {
    globalBudgetManager = new CostBudgetManager(config);
  }
  return globalBudgetManager;
}

export default getCostBudgetManager;
