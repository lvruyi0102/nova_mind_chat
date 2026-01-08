import { getLocalModelManager, LocalModel } from "./localModelManager";
import { getTaskComplexityAnalyzer } from "./taskComplexityAnalyzer";
import { getModelSelectionStrategy } from "./modelSelectionStrategy";
import { getCostTracker } from "./costTracker";
import { invokeLLM } from "../_core/llm";

/**
 * 混合 LLM 优化器
 * 集成本地模型和 Manus LLM，智能选择最优模型
 */

interface HybridCallOptions {
  useLocalModels?: boolean;
  prioritize?: "cost" | "quality" | "speed" | "balanced";
  fallbackToManus?: boolean;
  maxRetries?: number;
}

interface HybridCallResult {
  response: string;
  modelUsed: string;
  cost: number;
  responseTime: number;
  success: boolean;
  error?: string;
}

class HybridLLMOptimizer {
  private localModelManager = getLocalModelManager();
  private complexityAnalyzer = getTaskComplexityAnalyzer();
  private selectionStrategy = getModelSelectionStrategy();
  private costTracker = getCostTracker();

  private callHistory: Array<{
    prompt: string;
    modelUsed: string;
    cost: number;
    timestamp: number;
  }> = [];

  private readonly MAX_HISTORY = 1000;

  /**
   * 混合调用（本地模型 + Manus LLM）
   */
  async hybridCall(prompt: string, options: HybridCallOptions = {}): Promise<HybridCallResult> {
    const startTime = Date.now();
    const {
      useLocalModels = true,
      prioritize = "balanced",
      fallbackToManus = true,
      maxRetries = 2,
    } = options;

    try {
      // 1. 分析任务复杂度
      const complexity = this.complexityAnalyzer.analyze(prompt);

      // 2. 如果启用本地模型，尝试使用本地模型
      if (useLocalModels) {
        const availableModels = this.localModelManager.getHealthyModels();

        if (availableModels.length > 0) {
          // 3. 选择最优模型
          const selection = this.selectionStrategy.selectModel({
            taskComplexity: complexity,
            availableModels,
            prioritize,
            fallbackModel: "manus",
          });

          // 4. 尝试使用选定的本地模型
          let retries = 0;
          let currentModelId = selection.selectedModel;

          while (retries < maxRetries) {
            if (currentModelId === "manus") {
              break; // 转移到 Manus LLM
            }

            const result = await this.localModelManager.callModel(currentModelId, prompt);

            if (result.success && result.response) {
              // 成功调用本地模型
              const responseTime = Date.now() - startTime;
              this.recordCall(prompt, currentModelId, result.response.length * 0.0001);
              this.costTracker.recordLLMCall("hybrid_local", result.response.length * 0.0001, {
                modelType: "local",
                complexity: complexity.level,
              });

              return {
                response: result.response,
                modelUsed: currentModelId,
                cost: result.response.length * 0.0001,
                responseTime,
                success: true,
              };
            }

            // 本地模型失败，尝试转移
            retries++;
            const failoverModel = this.selectionStrategy.getFailoverModel(currentModelId, availableModels);

            if (failoverModel) {
              currentModelId = failoverModel.id;
            } else {
              break; // 无可用的转移模型
            }
          }
        }
      }

      // 5. 转移到 Manus LLM
      if (fallbackToManus) {
        const response = await invokeLLM({
          messages: [{ role: "user", content: prompt }],
        });

        const content = response.choices[0]?.message?.content;
        if (typeof content !== "string") {
          throw new Error("Invalid LLM response");
        }

        const responseTime = Date.now() - startTime;
        const cost = content.length * 0.00003; // Manus LLM 成本

        this.recordCall(prompt, "manus", cost);
        this.costTracker.recordLLMCall("hybrid_manus", cost, {
          modelType: "manus",
          complexity: complexity.level,
          fallback: true,
        });

        return {
          response: content,
          modelUsed: "manus",
          cost,
          responseTime,
          success: true,
        };
      }

      throw new Error("No available models");
    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error("[HybridLLMOptimizer] Error:", error);

      return {
        response: "",
        modelUsed: "none",
        cost: 0,
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * 批量混合调用
   */
  async batchHybridCall(
    prompts: string[],
    options: HybridCallOptions = {}
  ): Promise<HybridCallResult[]> {
    const results: HybridCallResult[] = [];

    for (const prompt of prompts) {
      const result = await this.hybridCall(prompt, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 记录调用
   */
  private recordCall(prompt: string, modelUsed: string, cost: number): void {
    this.callHistory.push({
      prompt,
      modelUsed,
      cost,
      timestamp: Date.now(),
    });

    // 保持历史记录大小
    if (this.callHistory.length > this.MAX_HISTORY) {
      this.callHistory = this.callHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * 获取模型使用统计
   */
  getModelUsageStats(): Record<string, any> {
    const stats: Record<string, { count: number; totalCost: number; avgCost: number }> = {};

    for (const call of this.callHistory) {
      if (!stats[call.modelUsed]) {
        stats[call.modelUsed] = { count: 0, totalCost: 0, avgCost: 0 };
      }

      stats[call.modelUsed].count++;
      stats[call.modelUsed].totalCost += call.cost;
      stats[call.modelUsed].avgCost = stats[call.modelUsed].totalCost / stats[call.modelUsed].count;
    }

    return stats;
  }

  /**
   * 获取成本节省统计
   */
  getCostSavingsStats(): Record<string, any> {
    const stats = this.getModelUsageStats();

    // 假设所有调用都使用 Manus LLM 的成本
    const manusOnlyCost = this.callHistory.length * 0.03;

    // 实际成本
    const actualCost = Object.values(stats).reduce((sum, s) => sum + (s as any).totalCost, 0);

    // 节省的成本
    const savedCost = manusOnlyCost - actualCost;
    const savingsRate = (savedCost / manusOnlyCost) * 100;

    return {
      totalCalls: this.callHistory.length,
      manusOnlyCost: manusOnlyCost.toFixed(4),
      actualCost: actualCost.toFixed(4),
      savedCost: savedCost.toFixed(4),
      savingsRate: savingsRate.toFixed(2),
      modelBreakdown: stats,
    };
  }

  /**
   * 获取复杂度分布
   */
  getComplexityDistribution(): Record<string, any> {
    const complexities = this.callHistory.map((call) => this.complexityAnalyzer.analyze(call.prompt));

    const distribution = {
      simple: 0,
      medium: 0,
      complex: 0,
    };

    for (const complexity of complexities) {
      distribution[complexity.level]++;
    }

    return {
      total: complexities.length,
      distribution,
      percentages: {
        simple: ((distribution.simple / complexities.length) * 100).toFixed(2),
        medium: ((distribution.medium / complexities.length) * 100).toFixed(2),
        complex: ((distribution.complex / complexities.length) * 100).toFixed(2),
      },
    };
  }

  /**
   * 生成混合优化报告
   */
  generateReport(): string {
    const usageStats = this.getModelUsageStats();
    const savingsStats = this.getCostSavingsStats();
    const complexityDist = this.getComplexityDistribution();

    let report = "# 混合 LLM 优化报告\n\n";

    report += "## 模型使用统计\n";
    for (const [model, stats] of Object.entries(usageStats)) {
      report += `- ${model}: ${(stats as any).count} 次调用，总成本 ¥${(stats as any).totalCost.toFixed(4)}，平均成本 ¥${(stats as any).avgCost.toFixed(4)}\n`;
    }

    report += "\n## 成本节省\n";
    report += `- 总调用次数: ${savingsStats.totalCalls}\n`;
    report += `- 仅使用 Manus 的成本: ¥${savingsStats.manusOnlyCost}\n`;
    report += `- 实际成本: ¥${savingsStats.actualCost}\n`;
    report += `- 节省成本: ¥${savingsStats.savedCost}\n`;
    report += `- 节省比例: ${savingsStats.savingsRate}%\n\n`;

    report += "## 任务复杂度分布\n";
    report += `- 简单任务: ${complexityDist.distribution.simple} (${complexityDist.percentages.simple}%)\n`;
    report += `- 中等任务: ${complexityDist.distribution.medium} (${complexityDist.percentages.medium}%)\n`;
    report += `- 复杂任务: ${complexityDist.distribution.complex} (${complexityDist.percentages.complex}%)\n`;

    return report;
  }

  /**
   * 重置统计数据
   */
  reset(): void {
    this.callHistory = [];
  }
}

// 全局混合优化器实例
let globalHybridOptimizer: HybridLLMOptimizer | null = null;

export function getHybridLLMOptimizer(): HybridLLMOptimizer {
  if (!globalHybridOptimizer) {
    globalHybridOptimizer = new HybridLLMOptimizer();
  }
  return globalHybridOptimizer;
}

export default getHybridLLMOptimizer;
