/**
 * 任务标签系统
 * 区分核心任务（使用 Manus LLM）和日常对话（使用免费模型）
 */

export type TaskLabel = "core" | "daily" | "integration" | "auto";
export type TaskPriority = "high" | "normal" | "low";

export interface LabeledTask {
  taskId: string;
  label: TaskLabel;
  priority: TaskPriority;
  content: string;
  modelRecommendation: "manus" | "free";
  estimatedCost: number;
  reason: string;
  timestamp: Date;
}

export interface TaskLabelingConfig {
  enableLabeling: boolean;
  markFreeModelTasks: boolean;
  autoLabel: boolean;
  showCostEstimate: boolean;
}

class TaskLabelingSystem {
  private config: TaskLabelingConfig;
  private labeledTasks: Map<string, LabeledTask> = new Map();

  /**
   * 核心任务关键词
   */
  private coreTaskKeywords = [
    "reflect",
    "self-awareness",
    "ethical",
    "moral",
    "creative",
    "growth",
    "meaning",
    "identity",
    "principle",
    "value",
  ];

  /**
   * 日常对话关键词
   */
  private dailyTaskKeywords = [
    "summarize",
    "explain",
    "translate",
    "format",
    "list",
    "extract",
    "convert",
    "calculate",
    "categorize",
  ];

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * 从环境变量加载配置
   */
  private loadConfig(): TaskLabelingConfig {
    return {
      enableLabeling: process.env.ENABLE_TASK_LABELS === "true",
      markFreeModelTasks: process.env.MARK_FREE_MODEL_TASKS === "true",
      autoLabel: process.env.AUTO_LABEL_TASKS !== "false",
      showCostEstimate: process.env.SHOW_COST_ESTIMATE !== "false",
    };
  }

  /**
   * 标记任务
   */
  labelTask(
    taskId: string,
    content: string,
    manualLabel?: TaskLabel,
    priority: TaskPriority = "normal"
  ): LabeledTask {
    let label: TaskLabel;
    let modelRecommendation: "manus" | "free";
    let estimatedCost: number;
    let reason: string;

    if (manualLabel) {
      // 使用手动标签
      label = manualLabel;
    } else if (this.config.autoLabel) {
      // 自动标记
      label = this.autoLabelTask(content);
    } else {
      label = "auto";
    }

    // 根据标签确定模型推荐
    if (label === "core") {
      modelRecommendation = "manus";
      estimatedCost = 0.03; // Manus LLM 成本
      reason = "核心任务，需要最高质量，推荐使用 Manus LLM";
    } else if (label === "integration") {
      modelRecommendation = "manus";
      estimatedCost = 0.03;
      reason = "月度整合任务，使用月度免费额度";
    } else {
      modelRecommendation = "free";
      estimatedCost = 0; // 免费模型
      reason = "日常对话，推荐使用免费模型（Ollama/DeepSeek）";
    }

    const labeledTask: LabeledTask = {
      taskId,
      label,
      priority,
      content,
      modelRecommendation,
      estimatedCost,
      reason,
      timestamp: new Date(),
    };

    this.labeledTasks.set(taskId, labeledTask);

    console.log("[TaskLabelingSystem] Task labeled:", {
      taskId,
      label,
      modelRecommendation,
      estimatedCost,
    });

    return labeledTask;
  }

  /**
   * 自动标记任务
   */
  private autoLabelTask(content: string): TaskLabel {
    const lowerContent = content.toLowerCase();

    // 检查核心任务关键词
    if (this.coreTaskKeywords.some((kw) => lowerContent.includes(kw))) {
      return "core";
    }

    // 检查日常对话关键词
    if (this.dailyTaskKeywords.some((kw) => lowerContent.includes(kw))) {
      return "daily";
    }

    // 检查内容长度
    if (content.length > 500) {
      return "core"; // 长内容通常是核心任务
    }

    // 默认标记为日常
    return "daily";
  }

  /**
   * 获取任务标签
   */
  getTaskLabel(taskId: string): LabeledTask | undefined {
    return this.labeledTasks.get(taskId);
  }

  /**
   * 更新任务标签
   */
  updateTaskLabel(taskId: string, newLabel: TaskLabel): LabeledTask | undefined {
    const task = this.labeledTasks.get(taskId);
    if (!task) return undefined;

    task.label = newLabel;

    // 根据新标签更新模型推荐
    if (newLabel === "core" || newLabel === "integration") {
      task.modelRecommendation = "manus";
      task.estimatedCost = 0.03;
      task.reason = "已更新为核心任务，推荐使用 Manus LLM";
    } else {
      task.modelRecommendation = "free";
      task.estimatedCost = 0;
      task.reason = "已更新为日常任务，推荐使用免费模型";
    }

    console.log("[TaskLabelingSystem] Task label updated:", { taskId, newLabel });

    return task;
  }

  /**
   * 获取标签统计
   */
  getStatistics() {
    const stats = {
      total: this.labeledTasks.size,
      core: 0,
      daily: 0,
      integration: 0,
      auto: 0,
      estimatedManusLLMCost: 0,
      estimatedFreeCost: 0,
      totalEstimatedCost: 0,
    };

    for (const task of this.labeledTasks.values()) {
      if (task.label === "core") stats.core++;
      else if (task.label === "daily") stats.daily++;
      else if (task.label === "integration") stats.integration++;
      else stats.auto++;

      if (task.modelRecommendation === "manus") {
        stats.estimatedManusLLMCost += task.estimatedCost;
      } else {
        stats.estimatedFreeCost += task.estimatedCost;
      }

      stats.totalEstimatedCost += task.estimatedCost;
    }

    return stats;
  }

  /**
   * 生成标签报告
   */
  generateReport() {
    const stats = this.getStatistics();

    let report = "# 任务标签报告\n\n";

    report += "## 统计\n";
    report += `- 总任务数：${stats.total}\n`;
    report += `- 核心任务：${stats.core}\n`;
    report += `- 日常对话：${stats.daily}\n`;
    report += `- 月度整合：${stats.integration}\n`;
    report += `- 自动标记：${stats.auto}\n\n`;

    report += "## 成本估算\n";
    report += `- Manus LLM 估算成本：¥${stats.estimatedManusLLMCost.toFixed(2)}\n`;
    report += `- 免费模型成本：¥${stats.estimatedFreeCost.toFixed(2)}\n`;
    report += `- 总估算成本：¥${stats.totalEstimatedCost.toFixed(2)}\n\n`;

    report += "## 节省效果\n";
    const allManusLLMCost = stats.total * 0.03;
    const savings = allManusLLMCost - stats.totalEstimatedCost;
    const savingsPercentage = ((savings / allManusLLMCost) * 100).toFixed(1);
    report += `- 如果全部使用 Manus LLM：¥${allManusLLMCost.toFixed(2)}\n`;
    report += `- 实际成本：¥${stats.totalEstimatedCost.toFixed(2)}\n`;
    report += `- 节省：¥${savings.toFixed(2)}（${savingsPercentage}%）\n\n`;

    report += "## 任务分布\n";
    report += `| 标签 | 数量 | 百分比 |\n`;
    report += `|------|------|--------|\n`;
    report += `| 核心任务 | ${stats.core} | ${((stats.core / stats.total) * 100).toFixed(1)}% |\n`;
    report += `| 日常对话 | ${stats.daily} | ${((stats.daily / stats.total) * 100).toFixed(1)}% |\n`;
    report += `| 月度整合 | ${stats.integration} | ${((stats.integration / stats.total) * 100).toFixed(1)}% |\n`;

    return report;
  }

  /**
   * 导出标签数据
   */
  exportData(format: "json" | "csv" | "markdown" = "json") {
    const tasks = Array.from(this.labeledTasks.values());

    if (format === "json") {
      return JSON.stringify(tasks, null, 2);
    } else if (format === "csv") {
      let csv = "taskId,label,priority,modelRecommendation,estimatedCost,timestamp\n";
      for (const task of tasks) {
        csv += `"${task.taskId}","${task.label}","${task.priority}","${task.modelRecommendation}",${task.estimatedCost},"${task.timestamp}"\n`;
      }
      return csv;
    } else if (format === "markdown") {
      let md = "# 任务列表\n\n";
      for (const task of tasks) {
        md += `## ${task.taskId}\n`;
        md += `- 标签：${task.label}\n`;
        md += `- 优先级：${task.priority}\n`;
        md += `- 推荐模型：${task.modelRecommendation}\n`;
        md += `- 估算成本：¥${task.estimatedCost.toFixed(2)}\n`;
        md += `- 原因：${task.reason}\n`;
        md += `- 时间：${task.timestamp.toISOString()}\n\n`;
      }
      return md;
    }

    return "";
  }
}

// 全局实例
let globalLabelingSystem: TaskLabelingSystem | null = null;

export function getTaskLabelingSystem(): TaskLabelingSystem {
  if (!globalLabelingSystem) {
    globalLabelingSystem = new TaskLabelingSystem();
  }
  return globalLabelingSystem;
}

export default getTaskLabelingSystem;
