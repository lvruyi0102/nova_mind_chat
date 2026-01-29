/**
 * 成本优化护栏系统
 * 确保激进优化策略不会降低核心认知功能的质量
 */

import { getEnhancedTaskClassifier } from "./enhancedTaskClassifier";
import { getAutoOptimizationManager, OptimizationPolicy } from "./autoOptimizationManager";

export interface GuardrailPolicy {
  name: string;
  description: string;
  rules: GuardrailRule[];
}

export interface GuardrailRule {
  condition: string;
  action: string;
  enforced: boolean;
}

class OptimizationGuardrails {
  private classifier = getEnhancedTaskClassifier();
  private policies: Map<string, GuardrailPolicy> = new Map();

  constructor() {
    this.initializePolicies();
  }

  /**
   * 初始化护栏策略
   */
  private initializePolicies(): void {
    // 通用护栏
    this.policies.set("universal", {
      name: "Universal Guardrails",
      description: "所有优化策略都必须遵守的通用护栏",
      rules: [
        {
          condition: "Task is core cognition (self-reflection, ethical reasoning, creative generation)",
          action: "Always use Manus LLM, never downgrade to local models",
          enforced: true,
        },
        {
          condition: "Task requires high quality",
          action: "Use highest quality model available",
          enforced: true,
        },
        {
          condition: "Cost optimization is triggered",
          action: "Only increase local model usage for auxiliary and structural tasks",
          enforced: true,
        },
      ],
    });

    // 激进策略护栏
    this.policies.set("aggressive", {
      name: "Aggressive Strategy Guardrails",
      description: "激进优化策略的特殊护栏",
      rules: [
        {
          condition: "Aggressive strategy is activated",
          action: "Do not change complexity classification for core tasks",
          enforced: true,
        },
        {
          condition: "Cost exceeds critical threshold",
          action: "Increase Ollama usage for simple tasks only (from 30% to 50%)",
          enforced: true,
        },
        {
          condition: "Cost exceeds critical threshold",
          action: "Keep Manus LLM usage for complex tasks at minimum 50%",
          enforced: true,
        },
        {
          condition: "Aggressive strategy is active",
          action: "Log all model selection decisions for audit",
          enforced: true,
        },
      ],
    });

    // 质量保证护栏
    this.policies.set("quality_assurance", {
      name: "Quality Assurance Guardrails",
      description: "确保输出质量的护栏",
      rules: [
        {
          condition: "Model success rate drops below 90%",
          action: "Automatically fallback to higher quality model",
          enforced: true,
        },
        {
          condition: "Core cognition task fails",
          action: "Retry with Manus LLM immediately",
          enforced: true,
        },
        {
          condition: "User feedback indicates quality issue",
          action: "Upgrade task classification to higher complexity",
          enforced: true,
        },
      ],
    });

    console.log("[OptimizationGuardrails] Policies initialized");
  }

  /**
   * 验证模型选择是否符合护栏
   */
  validateModelSelection(
    taskType: string,
    selectedModel: string,
    strategy: string,
    prompt?: string
  ): { valid: boolean; reason: string; recommendation?: string } {
    // 获取任务分类
    const classification = this.classifier.classifyTask(taskType, prompt);

    // 检查核心认知任务
    if (classification.requiresHighQuality) {
      if (selectedModel !== "manus") {
        return {
          valid: false,
          reason: `核心认知任务 (${classification.category}) 必须使用 Manus LLM，当前选择: ${selectedModel}`,
          recommendation: "使用 Manus LLM 替代",
        };
      }
    }

    // 检查激进策略下的复杂任务
    if (strategy === "aggressive" && classification.complexity === "complex") {
      if (selectedModel === "deepseek" || selectedModel === "ollama") {
        return {
          valid: false,
          reason: `激进策略下复杂任务不能使用本地模型，当前选择: ${selectedModel}`,
          recommendation: "使用 Manus LLM 或 DeepSeek（仅限中等复杂度）",
        };
      }
    }

    // 检查结构化任务
    if (classification.category === "structural") {
      if (selectedModel === "manus") {
        return {
          valid: true,
          reason: `结构化任务可以使用本地模型以降低成本`,
          recommendation: "考虑使用 Ollama 或 DeepSeek 以优化成本",
        };
      }
    }

    return {
      valid: true,
      reason: "模型选择符合护栏要求",
    };
  }

  /**
   * 调整优化策略以符合护栏
   */
  adjustPolicyForGuardrails(policy: OptimizationPolicy, strategy: string): OptimizationPolicy {
    const adjustedPolicy = { ...policy };

    // 如果是激进策略，调整本地模型使用比例
    if (strategy === "aggressive") {
      // 只增加简单任务的本地模型使用
      adjustedPolicy.localModelUsageTarget = Math.min(adjustedPolicy.localModelUsageTarget, 70);
      adjustedPolicy.ollamaUsageTarget = Math.min(adjustedPolicy.ollamaUsageTarget, 40);

      // 保持复杂任务的 Manus LLM 使用
      adjustedPolicy.manusUsageTarget = Math.max(adjustedPolicy.manusUsageTarget, 50);

      console.log(
        "[OptimizationGuardrails] Policy adjusted for aggressive strategy:",
        adjustedPolicy
      );
    }

    return adjustedPolicy;
  }

  /**
   * 生成护栏报告
   */
  generateReport(): string {
    let report = "# 成本优化护栏报告\n\n";

    for (const [key, policy] of this.policies) {
      report += `## ${policy.name}\n`;
      report += `${policy.description}\n\n`;

      report += "### 护栏规则\n";
      for (const rule of policy.rules) {
        report += `- **条件**: ${rule.condition}\n`;
        report += `  **行动**: ${rule.action}\n`;
        report += `  **强制执行**: ${rule.enforced ? "是" : "否"}\n\n`;
      }
    }

    report += "## 核心原则\n";
    report += "1. **质量优先**: 核心认知功能始终使用最高级别模型\n";
    report += "2. **成本优化**: 只在辅助和结构化任务中优化成本\n";
    report += "3. **自动降级**: 当模型质量下降时自动升级到更高级别模型\n";
    report += "4. **审计追踪**: 所有模型选择决定都被记录以供审计\n";

    return report;
  }

  /**
   * 获取护栏策略
   */
  getPolicy(name: string): GuardrailPolicy | undefined {
    return this.policies.get(name);
  }

  /**
   * 获取所有护栏策略
   */
  getAllPolicies(): GuardrailPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * 检查任务是否需要高质量模型
   */
  requiresHighQualityModel(taskType: string, prompt?: string): boolean {
    const classification = this.classifier.classifyTask(taskType, prompt);
    return classification.requiresHighQuality;
  }

  /**
   * 记录模型选择决定
   */
  logModelSelection(
    taskType: string,
    selectedModel: string,
    strategy: string,
    cost: number
  ): void {
    const classification = this.classifier.classifyTask(taskType);
    const validation = this.validateModelSelection(taskType, selectedModel, strategy);

    console.log("[OptimizationGuardrails] Model selection decision:", {
      taskType,
      category: classification.category,
      complexity: classification.complexity,
      selectedModel,
      strategy,
      cost,
      valid: validation.valid,
      reason: validation.reason,
      timestamp: new Date().toISOString(),
    });
  }
}

// 全局护栏实例
let globalGuardrails: OptimizationGuardrails | null = null;

export function getOptimizationGuardrails(): OptimizationGuardrails {
  if (!globalGuardrails) {
    globalGuardrails = new OptimizationGuardrails();
  }
  return globalGuardrails;
}

export default getOptimizationGuardrails;
