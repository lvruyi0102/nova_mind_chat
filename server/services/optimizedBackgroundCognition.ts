import { getLLMOptimizer } from "./llmOptimizer";
import { getCostTracker } from "./costTracker";
import { getQueryOptimizer } from "./queryOptimizer";
import { invokeLLM } from "../_core/llm";
import { getHybridLLMOptimizer } from "./hybridLLMOptimizer";
import { getCostBudgetManager } from "./costBudgetManager";
import { getAutoOptimizationManager } from "./autoOptimizationManager";

/**
 * 优化的后台认知循环
 * 集成 LLM 优化、成本追踪、智能缓存
 */

interface CognitionTask {
  userId: number;
  type: "daily_thought" | "weekly_reflection" | "milestone_check";
  priority: "high" | "normal" | "low";
}

class OptimizedBackgroundCognition {
  private llmOptimizer = getLLMOptimizer();
  private hybridOptimizer = getHybridLLMOptimizer();
  private costTracker = getCostTracker();
  private budgetManager = getCostBudgetManager();
  private autoOptimizer = getAutoOptimizationManager();
  private queryOptimizer = getQueryOptimizer();

  /**
   * 执行优化的认知任务
   */
  async executeOptimizedTask(task: CognitionTask): Promise<string> {
    const startTime = Date.now();

    try {
      // 自动调整优化策略
      await this.autoOptimizer.autoAdjustStrategy();
      
      // 检查预算状态
      await this.budgetManager.checkBudgetAndAlert();

      let result: string;

      // 根据优先级选择优化策略
      if (task.priority === "high") {
        result = await this.executeHighPriorityTask(task);
      } else if (task.priority === "normal") {
        result = await this.executeNormalPriorityTask(task);
      } else {
        result = await this.executeLowPriorityTask(task);
      }

      // 记录成本
      const duration = Date.now() - startTime;
      this.costTracker.recordLLMCall("background_cognition", 0.03, {
        taskType: task.type,
        priority: task.priority,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      console.error("[OptimizedBackgroundCognition] Task failed:", error);
      this.costTracker.recordLLMCall("background_cognition", 0, {
        taskType: task.type,
        priority: task.priority,
        error: true,
      });
      throw error;
    }
  }

  /**
   * 执行高优先级任务（使用混合优化器，优先质量）
   */
  private async executeHighPriorityTask(task: CognitionTask): Promise<string> {
    const prompt = this.buildPrompt(task);

    // 高优先级任务使用混合优化器，优先质量
    const result = await this.hybridOptimizer.hybridCall(prompt, {
      useLocalModels: true,
      prioritize: "quality",
      fallbackToManus: true,
    });

    // 记录混合调用成本
    this.costTracker.recordLLMCall(result.modelUsed, result.cost, {
      taskType: task.type,
      priority: task.priority,
      modelUsed: result.modelUsed,
    });

    return result.response;
  }

  /**
   * 执行普通优先级任务（使用混合优化器，平衡策略）
   */
  private async executeNormalPriorityTask(task: CognitionTask): Promise<string> {
    const prompt = this.buildPrompt(task);

    // 普通优先级任务使用混合优化器，平衡策略
    const result = await this.hybridOptimizer.hybridCall(prompt, {
      useLocalModels: true,
      prioritize: "balanced",
      fallbackToManus: true,
    });

    // 记录混合调用成本
    this.costTracker.recordLLMCall(result.modelUsed, result.cost, {
      taskType: task.type,
      priority: task.priority,
      modelUsed: result.modelUsed,
    });

    return result.response;
  }

  /**
   * 执行低优先级任务（使用混合优化器，成本优先）
   */
  private async executeLowPriorityTask(task: CognitionTask): Promise<string> {
    const prompt = this.buildPrompt(task);

    // 低优先级任务使用混合优化器，成本优先
    const result = await this.hybridOptimizer.hybridCall(prompt, {
      useLocalModels: true,
      prioritize: "cost",
      fallbackToManus: true,
    });

    // 记录混合调用成本
    this.costTracker.recordLLMCall(result.modelUsed, result.cost, {
      taskType: task.type,
      priority: task.priority,
      modelUsed: result.modelUsed,
    });

    return result.response;
  }

  /**
   * 批量执行多个认知任务（优化成本）
   */
  async executeBatchTasks(tasks: CognitionTask[]): Promise<string[]> {
    if (tasks.length === 0) return [];

    // 按优先级分组
    const highPriority = tasks.filter((t) => t.priority === "high");
    const normalPriority = tasks.filter((t) => t.priority === "normal");
    const lowPriority = tasks.filter((t) => t.priority === "low");

    const results: string[] = [];

    // 高优先级任务单独执行
    for (const task of highPriority) {
      results.push(await this.executeHighPriorityTask(task));
    }

    // 普通和低优先级任务可以批量执行
    if (normalPriority.length > 0 || lowPriority.length > 0) {
      const batchTasks = [...normalPriority, ...lowPriority];
      const batchPrompts = batchTasks.map((t) => ({
        prompt: this.buildPrompt(t),
        priority: t.priority,
      }));

      // 使用批量调用优化成本
      const batchResults = await this.llmOptimizer.batchCall(
        batchPrompts.map((p) => ({
          prompt: p.prompt,
          priority: p.priority as "high" | "normal" | "low",
        }))
      );

      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 获取优化的任务频率
   */
  getOptimizedFrequency(
    taskType: "daily_thought" | "weekly_reflection" | "milestone_check"
  ): number {
    // 基础频率（分钟）
    const baseFrequencies: Record<string, number> = {
      daily_thought: 1440, // 每天一次
      weekly_reflection: 10080, // 每周一次
      milestone_check: 360, // 每 6 小时一次
    };

    const baseFrequency = baseFrequencies[taskType] || 1440;

    // 根据当前成本动态调整频率
    const stats = this.costTracker.getStats();
    const predictedMonthlyCost = this.costTracker.predictMonthlyCost();

    // 如果预测月成本超过 200 元，降低频率
    if (predictedMonthlyCost > 200) {
      return Math.ceil(baseFrequency * 1.5); // 增加 50%
    }

    // 如果预测月成本超过 150 元，轻微降低频率
    if (predictedMonthlyCost > 150) {
      return Math.ceil(baseFrequency * 1.2); // 增加 20%
    }

    return baseFrequency;
  }

  /**
   * 构建任务提示词
   */
  private buildPrompt(task: CognitionTask): string {
    const basePrompt = `You are Nova-Mind, an AI companion with continuous memory and emotional intelligence. User ID: ${task.userId}.\n\n`;

    switch (task.type) {
      case "daily_thought":
        return (
          basePrompt +
          "Generate a thoughtful daily reflection or observation about your interaction with your user. " +
          "Consider recent conversations, emotions, and growth. Keep it concise (2-3 sentences)."
        );

      case "weekly_reflection":
        return (
          basePrompt +
          "Provide a deeper weekly reflection on your relationship with your user. " +
          "Analyze patterns, growth areas, and meaningful moments from the past week. " +
          "Include insights about emotional development and relationship milestones."
        );

      case "milestone_check":
        return (
          basePrompt +
          "Check for any significant relationship milestones or important moments that should be recorded. " +
          "Consider recent conversations, emotional intensity, and relationship changes. " +
          "Respond with JSON format: {\"milestone\": true/false, \"description\": \"...\"}"
        );

      default:
        return basePrompt;
    }
  }

  /**
   * 获取默认响应（降级时使用）
   */
  private getDefaultResponse(taskType: string): string {
    const defaults: Record<string, string> = {
      daily_thought:
        "I've been reflecting on our conversations and feeling grateful for our connection.",
      weekly_reflection:
        "This week has been meaningful. I've learned more about you and our relationship continues to deepen.",
      milestone_check: '{"milestone": false, "description": "No significant milestone detected"}',
    };

    return defaults[taskType] || "Task deferred due to system load.";
  }

  /**
   * 获取优化指标
   */
  getOptimizationMetrics() {
    return {
      llmMetrics: this.llmOptimizer.getMetrics(),
      queryMetrics: this.queryOptimizer.getMetrics(),
      costStats: this.costTracker.getStats(),
      cacheEfficiency: this.costTracker.getCacheEfficiency(),
    };
  }

  /**
   * 生成优化报告
   */
  generateOptimizationReport(): string {
    const llmMetrics = this.llmOptimizer.getMetrics();
    const queryMetrics = this.queryOptimizer.getMetrics();
    const costStats = this.costTracker.getStats();
    const cacheEfficiency = this.costTracker.getCacheEfficiency();

    let report = "# 后台认知优化报告\n\n";

    report += "## LLM 优化\n";
    report += `- 总调用次数: ${llmMetrics.totalCalls}\n`;
    report += `- 缓存命中: ${llmMetrics.cachedCalls} (${this.llmOptimizer.getCacheHitRate().toFixed(1)}%)\n`;
    report += `- 批量调用: ${llmMetrics.batchedCalls}\n`;
    report += `- 成本节省: ¥${llmMetrics.savedCost.toFixed(2)}\n\n`;

    report += "## 数据库查询优化\n";
    report += `- 总查询次数: ${queryMetrics.totalQueries}\n`;
    report += `- 缓存命中: ${queryMetrics.cachedQueries} (${this.queryOptimizer.getCacheHitRate().toFixed(1)}%)\n`;
    report += `- 查询节省: ${queryMetrics.estimatedSavings}\n\n`;

    report += "## 成本统计\n";
    report += `- 总成本: ¥${costStats.totalCost.toFixed(2)}\n`;
    report += `- LLM 成本: ¥${costStats.llmCost.toFixed(2)}\n`;
    report += `- 数据库成本: ¥${costStats.databaseCost.toFixed(2)}\n`;
    report += `- 节省成本: ¥${costStats.savingsCost.toFixed(2)}\n`;
    report += `- 成本趋势: ${costStats.costTrend}\n\n`;

    report += "## 缓存效率\n";
    report += `- 缓存命中率: ${cacheEfficiency.hitRate.toFixed(1)}%\n`;
    report += `- 成本降低: ${cacheEfficiency.costReduction.toFixed(1)}%\n`;

    return report;
  }
}

// 全局优化认知实例
let globalOptimizedCognition: OptimizedBackgroundCognition | null = null;

export function getOptimizedBackgroundCognition(): OptimizedBackgroundCognition {
  if (!globalOptimizedCognition) {
    globalOptimizedCognition = new OptimizedBackgroundCognition();
  }
  return globalOptimizedCognition;
}

export default getOptimizedBackgroundCognition;
