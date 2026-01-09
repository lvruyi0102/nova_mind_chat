/**
 * 受保护的混合 LLM 优化器
 * 集成护栏系统和增强的任务分类，确保核心功能质量
 */

import { getHybridLLMOptimizer } from "./hybridLLMOptimizer";
import { getOptimizationGuardrails } from "./optimizationGuardrails";
import { getEnhancedTaskClassifier } from "./enhancedTaskClassifier";
import { getCostTracker } from "./costTracker";

export interface GuardedHybridCallOptions {
  useLocalModels?: boolean;
  prioritize?: "quality" | "cost" | "speed" | "balanced";
  fallbackToManus?: boolean;
  taskType?: string;
  strategy?: string;
  enforceGuardrails?: boolean;
}

export interface GuardedHybridCallResult {
  response: string;
  modelUsed: string;
  cost: number;
  complexity: string;
  guardrailsApplied: boolean;
  reason: string;
}

class GuardedHybridLLMOptimizer {
  private hybridOptimizer = getHybridLLMOptimizer();
  private guardrails = getOptimizationGuardrails();
  private classifier = getEnhancedTaskClassifier();
  private costTracker = getCostTracker();

  /**
   * 受保护的混合调用
   * 确保所有调用都符合护栏要求
   */
  async guardedHybridCall(
    prompt: string,
    options: GuardedHybridCallOptions = {}
  ): Promise<GuardedHybridCallResult> {
    const {
      useLocalModels = true,
      prioritize = "balanced",
      fallbackToManus = true,
      taskType = "unknown",
      strategy = "balanced",
      enforceGuardrails = true,
    } = options;

    // 分类任务
    const classification = this.classifier.classifyTask(taskType, prompt);

    console.log("[GuardedHybridLLMOptimizer] Task classification:", {
      taskType,
      category: classification.category,
      complexity: classification.complexity,
      requiresHighQuality: classification.requiresHighQuality,
    });

    // 如果启用护栏且任务需要高质量
    if (enforceGuardrails && classification.requiresHighQuality) {
      console.log(
        "[GuardedHybridLLMOptimizer] High quality required, using Manus LLM for",
        taskType
      );

      const result = await this.hybridOptimizer.hybridCall(prompt, {
        useLocalModels: false, // 禁用本地模型
        prioritize: "quality",
        fallbackToManus: true,
      });

      this.guardrails.logModelSelection(taskType, result.modelUsed, strategy, result.cost);

      return {
        response: result.response,
        modelUsed: result.modelUsed,
        cost: result.cost,
        complexity: classification.complexity,
        guardrailsApplied: true,
        reason: `核心认知功能 (${classification.category})，强制使用 Manus LLM`,
      };
    }

    // 对于非核心任务，进行正常的混合调用
    const result = await this.hybridOptimizer.hybridCall(prompt, {
      useLocalModels,
      prioritize,
      fallbackToManus,
    });

    // 验证模型选择是否符合护栏
    const validation = this.guardrails.validateModelSelection(
      taskType,
      result.modelUsed,
      strategy,
      prompt
    );

    if (!validation.valid) {
      console.warn("[GuardedHybridLLMOptimizer] Guardrail violation detected:", validation.reason);

      // 如果违反护栏，使用推荐的模型重新调用
      if (validation.recommendation) {
        console.log("[GuardedHybridLLMOptimizer] Retrying with recommendation:", validation.recommendation);

        const retryResult = await this.hybridOptimizer.hybridCall(prompt, {
          useLocalModels: false,
          prioritize: "quality",
          fallbackToManus: true,
        });

        this.guardrails.logModelSelection(taskType, retryResult.modelUsed, strategy, retryResult.cost);

        return {
          response: retryResult.response,
          modelUsed: retryResult.modelUsed,
          cost: retryResult.cost,
          complexity: classification.complexity,
          guardrailsApplied: true,
          reason: `护栏调整: ${validation.reason}`,
        };
      }
    }

    this.guardrails.logModelSelection(taskType, result.modelUsed, strategy, result.cost);

    return {
      response: result.response,
      modelUsed: result.modelUsed,
      cost: result.cost,
      complexity: classification.complexity,
      guardrailsApplied: enforceGuardrails,
      reason: validation.reason || "正常混合调用",
    };
  }

  /**
   * 批量受保护的混合调用
   */
  async batchGuardedHybridCall(
    prompts: string[],
    options: GuardedHybridCallOptions = {}
  ): Promise<GuardedHybridCallResult[]> {
    const results: GuardedHybridCallResult[] = [];

    for (const prompt of prompts) {
      const result = await this.guardedHybridCall(prompt, options);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取任务分类
   */
  getTaskClassification(taskType: string, prompt?: string) {
    return this.classifier.classifyTask(taskType, prompt);
  }

  /**
   * 检查任务是否需要高质量
   */
  requiresHighQuality(taskType: string, prompt?: string): boolean {
    return this.classifier.classifyTask(taskType, prompt).requiresHighQuality;
  }

  /**
   * 生成护栏报告
   */
  generateGuardrailReport(): string {
    return this.guardrails.generateReport();
  }

  /**
   * 生成任务分类报告
   */
  generateClassificationReport(): string {
    return this.classifier.generateReport();
  }

  /**
   * 生成完整的优化报告
   */
  generateCompleteReport(): string {
    let report = "# 受保护的混合 LLM 优化报告\n\n";

    report += "## 任务分类\n";
    report += this.classifier.generateReport();

    report += "\n## 护栏策略\n";
    report += this.guardrails.generateReport();

    report += "\n## 核心认知任务列表\n";
    const coreTasks = this.classifier.getCoreCognitionTasks();
    report += "这些任务必须使用 Manus LLM：\n";
    for (const task of coreTasks) {
      report += `- ${task}\n`;
    }

    report += "\n## 伦理推理任务列表\n";
    const ethicalTasks = this.classifier.getEthicalReasoningTasks();
    report += "这些任务必须使用 Manus LLM：\n";
    for (const task of ethicalTasks) {
      report += `- ${task}\n`;
    }

    report += "\n## 创意生成任务列表\n";
    const creativeTasks = this.classifier.getCreativeGenerationTasks();
    report += "这些任务优先使用 Manus LLM：\n";
    for (const task of creativeTasks) {
      report += `- ${task}\n`;
    }

    return report;
  }
}

// 全局实例
let globalGuardedOptimizer: GuardedHybridLLMOptimizer | null = null;

export function getGuardedHybridLLMOptimizer(): GuardedHybridLLMOptimizer {
  if (!globalGuardedOptimizer) {
    globalGuardedOptimizer = new GuardedHybridLLMOptimizer();
  }
  return globalGuardedOptimizer;
}

export default getGuardedHybridLLMOptimizer;
