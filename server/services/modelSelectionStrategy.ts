import { TaskComplexity } from "./taskComplexityAnalyzer";
import { LocalModel } from "./localModelManager";

/**
 * 模型选择策略
 * 根据任务复杂度、成本、可用性等因素选择最优模型
 */

export interface SelectionContext {
  taskComplexity: TaskComplexity;
  availableModels: LocalModel[];
  costBudget?: number;
  prioritize?: "cost" | "quality" | "speed" | "balanced";
  fallbackModel?: string;
}

export interface SelectionResult {
  selectedModel: string;
  reason: string;
  confidence: number;
  alternatives: string[];
  estimatedCost: number;
  estimatedResponseTime: number;
}

class ModelSelectionStrategy {
  /**
   * 选择最优模型
   */
  selectModel(context: SelectionContext): SelectionResult {
    const { taskComplexity, availableModels, costBudget, prioritize = "balanced", fallbackModel } = context;

    // 获取候选模型
    const candidates = this.getCandidates(taskComplexity, availableModels);

    if (candidates.length === 0) {
      // 无合适的本地模型，使用 Manus LLM
      return {
        selectedModel: fallbackModel || "manus",
        reason: "No suitable local models available",
        confidence: 0.5,
        alternatives: [],
        estimatedCost: 0.03,
        estimatedResponseTime: 3000,
      };
    }

    // 根据优先级排序候选模型
    let selectedModel: LocalModel;
    let reason: string;

    if (prioritize === "cost") {
      selectedModel = this.selectByCost(candidates);
      reason = "Selected for minimum cost";
    } else if (prioritize === "quality") {
      selectedModel = this.selectByQuality(candidates);
      reason = "Selected for best quality";
    } else if (prioritize === "speed") {
      selectedModel = this.selectBySpeed(candidates);
      reason = "Selected for fastest response";
    } else {
      selectedModel = this.selectBalanced(candidates, taskComplexity);
      reason = "Selected for balanced performance";
    }

    // 检查成本预算
    if (costBudget && selectedModel.costPerCall > costBudget) {
      const withinBudget = candidates.filter((m) => m.costPerCall <= costBudget);
      if (withinBudget.length > 0) {
        selectedModel = withinBudget[0];
        reason = "Selected within cost budget";
      }
    }

    // 获取替代方案
    const alternatives = candidates
      .filter((m) => m.id !== selectedModel.id)
      .slice(0, 2)
      .map((m) => m.id);

    return {
      selectedModel: selectedModel.id,
      reason,
      confidence: taskComplexity.confidence,
      alternatives,
      estimatedCost: selectedModel.costPerCall,
      estimatedResponseTime: selectedModel.avgResponseTime,
    };
  }

  /**
   * 获取候选模型
   */
  private getCandidates(complexity: TaskComplexity, availableModels: LocalModel[]): LocalModel[] {
    const healthyModels = availableModels.filter((m) => m.status === "healthy");

    if (complexity.level === "simple") {
      // 简单任务：优先 DeepSeek，其次 Ollama
      return healthyModels.sort((a, b) => {
        const aScore = a.type === "deepseek" ? 0 : a.type === "ollama" ? 1 : 2;
        const bScore = b.type === "deepseek" ? 0 : b.type === "ollama" ? 1 : 2;
        return aScore - bScore;
      });
    } else if (complexity.level === "medium") {
      // 中等任务：优先 Ollama，其次 DeepSeek
      return healthyModels.sort((a, b) => {
        const aScore = a.type === "ollama" ? 0 : a.type === "deepseek" ? 1 : 2;
        const bScore = b.type === "ollama" ? 0 : b.type === "deepseek" ? 1 : 2;
        return aScore - bScore;
      });
    } else {
      // 复杂任务：返回所有健康的模型（会转移到 Manus）
      return healthyModels;
    }
  }

  /**
   * 按成本选择
   */
  private selectByCost(models: LocalModel[]): LocalModel {
    return models.reduce((min, current) => (current.costPerCall < min.costPerCall ? current : min));
  }

  /**
   * 按质量选择（成功率）
   */
  private selectByQuality(models: LocalModel[]): LocalModel {
    return models.reduce((max, current) => (current.successRate > max.successRate ? current : max));
  }

  /**
   * 按速度选择
   */
  private selectBySpeed(models: LocalModel[]): LocalModel {
    return models.reduce((fastest, current) =>
      current.avgResponseTime < fastest.avgResponseTime ? current : fastest
    );
  }

  /**
   * 平衡选择
   */
  private selectBalanced(models: LocalModel[], complexity: TaskComplexity): LocalModel {
    // 计算每个模型的平衡分数
    const scores = models.map((model) => {
      // 成本分数（越低越好）
      const costScore = 1 - Math.min(model.costPerCall / 0.03, 1);

      // 质量分数（成功率）
      const qualityScore = model.successRate / 100;

      // 速度分数（越快越好）
      const speedScore = 1 - Math.min(model.avgResponseTime / 5000, 1);

      // 综合分数
      const totalScore = costScore * 0.3 + qualityScore * 0.4 + speedScore * 0.3;

      return { model, score: totalScore };
    });

    // 返回分数最高的模型
    return scores.reduce((max, current) => (current.score > max.score ? current : max)).model;
  }

  /**
   * 处理模型故障转移
   */
  getFailoverModel(failedModelId: string, availableModels: LocalModel[]): LocalModel | null {
    // 获取健康的模型
    const healthyModels = availableModels.filter((m) => m.status === "healthy" && m.id !== failedModelId);

    if (healthyModels.length === 0) {
      return null; // 无可用的转移模型
    }

    // 优先选择成功率最高的
    return healthyModels.reduce((max, current) => (current.successRate > max.successRate ? current : max));
  }

  /**
   * 获取模型推荐
   */
  getRecommendations(
    availableModels: LocalModel[]
  ): Record<string, { model: LocalModel; score: number; reason: string }> {
    const recommendations: Record<string, { model: LocalModel; score: number; reason: string }> = {};

    for (const model of availableModels) {
      if (model.status !== "healthy") continue;

      let score = 0;
      let reason = "";

      if (model.type === "deepseek") {
        score = model.successRate * 0.8 + (1 - Math.min(model.avgResponseTime / 5000, 1)) * 0.2;
        reason = "Excellent for simple tasks, good cost-benefit ratio";
      } else if (model.type === "ollama") {
        score = model.successRate * 0.7 + (1 - Math.min(model.costPerCall / 0.03, 1)) * 0.3;
        reason = "Great for medium tasks, zero API cost";
      } else {
        score = model.successRate * 0.9;
        reason = "Custom model with custom performance";
      }

      recommendations[model.id] = { model, score, reason };
    }

    return recommendations;
  }

  /**
   * 生成选择报告
   */
  generateReport(
    selections: SelectionResult[],
    availableModels: LocalModel[]
  ): Record<string, any> {
    const modelUsage: Record<string, number> = {};
    let totalCost = 0;
    let totalResponseTime = 0;

    for (const selection of selections) {
      modelUsage[selection.selectedModel] = (modelUsage[selection.selectedModel] || 0) + 1;
      totalCost += selection.estimatedCost;
      totalResponseTime += selection.estimatedResponseTime;
    }

    const averageCost = totalCost / selections.length;
    const averageResponseTime = totalResponseTime / selections.length;

    // 计算模型健康状态
    const healthStatus: Record<string, any> = {};
    for (const model of availableModels) {
      healthStatus[model.id] = {
        status: model.status,
        successRate: model.successRate.toFixed(2),
        avgResponseTime: model.avgResponseTime.toFixed(0),
        costPerCall: model.costPerCall,
      };
    }

    return {
      totalSelections: selections.length,
      modelUsage,
      averageCost: averageCost.toFixed(4),
      totalCost: totalCost.toFixed(4),
      averageResponseTime: averageResponseTime.toFixed(0),
      healthStatus,
      recommendations: this.getRecommendations(availableModels),
    };
  }
}

// 全局策略实例
let globalStrategy: ModelSelectionStrategy | null = null;

export function getModelSelectionStrategy(): ModelSelectionStrategy {
  if (!globalStrategy) {
    globalStrategy = new ModelSelectionStrategy();
  }
  return globalStrategy;
}

export default getModelSelectionStrategy;
