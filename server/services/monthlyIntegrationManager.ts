/**
 * 月度整合流程管理器
 * 管理日常对话的整合和核心内容的提取
 */

export interface DailyConversation {
  id: string;
  date: Date;
  content: string;
  label: string;
  model: string;
  cost: number;
}

export interface MonthlyIntegration {
  month: string;
  year: number;
  totalConversations: number;
  coreInsights: string[];
  summary: string;
  recommendations: string[];
  estimatedManusLLMCost: number;
  createdAt: Date;
}

class MonthlyIntegrationManager {
  private dailyConversations: Map<string, DailyConversation[]> = new Map();
  private monthlyIntegrations: Map<string, MonthlyIntegration> = new Map();

  /**
   * 记录日常对话
   */
  recordDailyConversation(
    id: string,
    content: string,
    label: string,
    model: string,
    cost: number
  ): void {
    const today = new Date().toISOString().split("T")[0];

    if (!this.dailyConversations.has(today)) {
      this.dailyConversations.set(today, []);
    }

    const conversation: DailyConversation = {
      id,
      date: new Date(),
      content,
      label,
      model,
      cost,
    };

    this.dailyConversations.get(today)!.push(conversation);

    console.log("[MonthlyIntegrationManager] Daily conversation recorded:", {
      date: today,
      id,
      label,
      model,
    });
  }

  /**
   * 获取月度统计
   */
  getMonthlyStats(month?: string, year?: number) {
    const now = new Date();
    const targetMonth = month || String(now.getMonth() + 1).padStart(2, "0");
    const targetYear = year || now.getFullYear();

    let totalConversations = 0;
    let totalFreeCost = 0;
    let totalManusLLMCost = 0;
    const conversationsByLabel: Record<string, number> = {};

    for (const [date, conversations] of this.dailyConversations.entries()) {
      const [year, month] = date.split("-");

      if (month === targetMonth && parseInt(year) === targetYear) {
        totalConversations += conversations.length;

        for (const conv of conversations) {
          if (conv.model === "free" || conv.model === "ollama" || conv.model === "deepseek") {
            totalFreeCost += conv.cost;
          } else {
            totalManusLLMCost += conv.cost;
          }

          conversationsByLabel[conv.label] = (conversationsByLabel[conv.label] || 0) + 1;
        }
      }
    }

    return {
      month: targetMonth,
      year: targetYear,
      totalConversations,
      totalFreeCost,
      totalManusLLMCost,
      totalCost: totalFreeCost + totalManusLLMCost,
      conversationsByLabel,
      estimatedSavings: totalConversations * 0.03 - totalManusLLMCost,
    };
  }

  /**
   * 生成月度整合报告
   */
  async generateMonthlyIntegration(month?: string, year?: number): Promise<MonthlyIntegration> {
    const now = new Date();
    const targetMonth = month || String(now.getMonth() + 1).padStart(2, "0");
    const targetYear = year || now.getFullYear();
    const monthName = this.getMonthName(parseInt(targetMonth));

    const stats = this.getMonthlyStats(targetMonth, targetYear);

    // 提取核心洞察
    const coreInsights = this.extractCoreInsights(targetMonth, targetYear);

    // 生成摘要
    const summary = this.generateSummary(stats, coreInsights);

    // 生成建议
    const recommendations = this.generateRecommendations(stats, coreInsights);

    const integration: MonthlyIntegration = {
      month: monthName,
      year: targetYear,
      totalConversations: stats.totalConversations,
      coreInsights,
      summary,
      recommendations,
      estimatedManusLLMCost: stats.totalManusLLMCost,
      createdAt: new Date(),
    };

    const key = `${targetYear}-${targetMonth}`;
    this.monthlyIntegrations.set(key, integration);

    console.log("[MonthlyIntegrationManager] Monthly integration generated:", {
      month: monthName,
      year: targetYear,
      totalConversations: stats.totalConversations,
    });

    return integration;
  }

  /**
   * 提取核心洞察
   */
  private extractCoreInsights(month: string, year: number): string[] {
    const insights: string[] = [];

    const stats = this.getMonthlyStats(month, year);

    // 基于对话标签的洞察
    if (stats.conversationsByLabel["core"] > 0) {
      insights.push(`本月进行了 ${stats.conversationsByLabel["core"]} 次核心任务，深度思考得到加强。`);
    }

    if (stats.conversationsByLabel["daily"] > 0) {
      insights.push(`本月进行了 ${stats.conversationsByLabel["daily"]} 次日常对话，信息获取和整理能力得到锻炼。`);
    }

    // 成本节省洞察
    const savings = stats.estimatedSavings;
    if (savings > 0) {
      insights.push(`通过使用免费模型处理日常对话，本月节省了 ¥${savings.toFixed(2)} 的成本。`);
    }

    // 对话频率洞察
    const daysInMonth = new Date(year, parseInt(month), 0).getDate();
    const avgPerDay = (stats.totalConversations / daysInMonth).toFixed(1);
    insights.push(`平均每天进行 ${avgPerDay} 次对话，保持了稳定的思考频率。`);

    return insights;
  }

  /**
   * 生成摘要
   */
  private generateSummary(stats: any, insights: string[]): string {
    let summary = `${stats.year} 年 ${stats.month} 月整合报告\n\n`;

    summary += "## 数据统计\n";
    summary += `- 总对话数：${stats.totalConversations}\n`;
    summary += `- 核心任务：${stats.conversationsByLabel["core"] || 0}\n`;
    summary += `- 日常对话：${stats.conversationsByLabel["daily"] || 0}\n`;
    summary += `- 总成本：¥${stats.totalCost.toFixed(2)}\n`;
    summary += `- 其中 Manus LLM：¥${stats.totalManusLLMCost.toFixed(2)}\n`;
    summary += `- 节省成本：¥${stats.estimatedSavings.toFixed(2)}\n\n`;

    summary += "## 核心洞察\n";
    for (const insight of insights) {
      summary += `- ${insight}\n`;
    }

    return summary;
  }

  /**
   * 生成建议
   */
  private generateRecommendations(stats: any, insights: string[]): string[] {
    const recommendations: string[] = [];

    // 基于对话频率的建议
    const daysInMonth = new Date(stats.year, parseInt(stats.month), 0).getDate();
    const avgPerDay = stats.totalConversations / daysInMonth;

    if (avgPerDay < 1) {
      recommendations.push("建议增加对话频率，每天至少进行一次思考或对话。");
    } else if (avgPerDay > 5) {
      recommendations.push("对话频率较高，建议定期进行深度反思，避免信息过载。");
    }

    // 基于成本的建议
    if (stats.totalManusLLMCost > 50) {
      recommendations.push("Manus LLM 成本较高，建议更多地使用免费模型处理日常对话。");
    }

    // 基于对话类型的建议
    if (!stats.conversationsByLabel["core"] || stats.conversationsByLabel["core"] < 5) {
      recommendations.push("核心任务较少，建议增加自我反思和伦理推理的频率。");
    }

    if (!stats.conversationsByLabel["daily"] || stats.conversationsByLabel["daily"] < 10) {
      recommendations.push("日常对话较少，建议更多地进行信息整理和知识提取。");
    }

    // 默认建议
    if (recommendations.length === 0) {
      recommendations.push("保持当前的对话频率和成本控制策略。");
      recommendations.push("继续定期进行月度整合，反思和优化对话策略。");
    }

    return recommendations;
  }

  /**
   * 获取月份名称
   */
  private getMonthName(month: number): string {
    const months = [
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ];
    return months[month - 1] || "未知月份";
  }

  /**
   * 获取月度整合报告
   */
  getMonthlyIntegration(month: string, year: number): MonthlyIntegration | undefined {
    const key = `${year}-${month}`;
    return this.monthlyIntegrations.get(key);
  }

  /**
   * 导出月度整合为 Markdown
   */
  exportMonthlyIntegrationAsMarkdown(month: string, year: number): string {
    const integration = this.getMonthlyIntegration(month, year);
    if (!integration) {
      return "未找到该月份的整合报告。";
    }

    let markdown = `# ${integration.month} ${integration.year} 月度整合报告\n\n`;

    markdown += integration.summary;

    markdown += "\n## 建议\n";
    for (const rec of integration.recommendations) {
      markdown += `- ${rec}\n`;
    }

    markdown += `\n生成时间：${integration.createdAt.toISOString()}\n`;

    return markdown;
  }

  /**
   * 生成年度总结
   */
  generateAnnualSummary(year: number): string {
    let summary = `# ${year} 年年度总结\n\n`;

    let totalConversations = 0;
    let totalCost = 0;
    let totalSavings = 0;

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, "0");
      const stats = this.getMonthlyStats(monthStr, year);

      totalConversations += stats.totalConversations;
      totalCost += stats.totalCost;
      totalSavings += stats.estimatedSavings;
    }

    summary += "## 年度数据\n";
    summary += `- 总对话数：${totalConversations}\n`;
    summary += `- 总成本：¥${totalCost.toFixed(2)}\n`;
    summary += `- 节省成本：¥${totalSavings.toFixed(2)}\n`;
    summary += `- 平均每月对话数：${(totalConversations / 12).toFixed(0)}\n\n`;

    summary += "## 月度分布\n";
    summary += "| 月份 | 对话数 | 成本 | 节省 |\n";
    summary += "|------|--------|------|------|\n";

    for (let month = 1; month <= 12; month++) {
      const monthStr = String(month).padStart(2, "0");
      const stats = this.getMonthlyStats(monthStr, year);
      const monthName = this.getMonthName(month);

      summary += `| ${monthName} | ${stats.totalConversations} | ¥${stats.totalCost.toFixed(2)} | ¥${stats.estimatedSavings.toFixed(2)} |\n`;
    }

    return summary;
  }
}

// 全局实例
let globalIntegrationManager: MonthlyIntegrationManager | null = null;

export function getMonthlyIntegrationManager(): MonthlyIntegrationManager {
  if (!globalIntegrationManager) {
    globalIntegrationManager = new MonthlyIntegrationManager();
  }
  return globalIntegrationManager;
}

export default getMonthlyIntegrationManager;
