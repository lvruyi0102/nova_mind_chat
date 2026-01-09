/**
 * 增强的任务分类器
 * 基于 Nova 的认知价值而非单纯技术难度进行分类
 * 确保核心功能始终使用最高级别模型
 */

export type TaskCategory = "core_cognition" | "ethical_reasoning" | "creative_generation" | "auxiliary" | "structural";
export type ComplexityLevel = "simple" | "medium" | "complex";

export interface ClassifiedTask {
  category: TaskCategory;
  complexity: ComplexityLevel;
  requiresHighQuality: boolean;
  reason: string;
}

class EnhancedTaskClassifier {
  /**
   * Nova 核心认知任务列表
   * 这些任务必须使用最高级别模型（Manus LLM）
   */
  private coreCognitionTasks = [
    "daily_thought",
    "weekly_reflection",
    "milestone_check",
    "self_reflection",
    "personal_growth",
    "identity_exploration",
    "value_alignment",
    "life_meaning",
  ];

  /**
   * 伦理推理任务列表
   * 这些任务涉及价值判断，必须使用最高级别模型
   */
  private ethicalReasoningTasks = [
    "ethical_analysis",
    "moral_judgment",
    "value_evaluation",
    "decision_ethics",
    "consequence_analysis",
    "principle_alignment",
  ];

  /**
   * 创意生成任务列表
   * 这些任务需要高质量创意，优先使用高级模型
   */
  private creativeGenerationTasks = [
    "creative_work",
    "artistic_expression",
    "story_generation",
    "poem_creation",
    "idea_brainstorm",
    "novel_concept",
  ];

  /**
   * 辅助性任务列表
   * 这些任务可以使用本地模型
   */
  private auxiliaryTasks = [
    "summarization",
    "formatting",
    "translation",
    "data_extraction",
    "list_generation",
    "template_filling",
    "categorization",
    "tagging",
  ];

  /**
   * 结构化任务列表
   * 这些任务可以使用最廉价的模型
   */
  private structuralTasks = [
    "json_parsing",
    "data_validation",
    "format_conversion",
    "regex_matching",
    "simple_calculation",
    "field_extraction",
  ];

  /**
   * 分类任务
   */
  classifyTask(
    taskType: string,
    prompt?: string,
    metadata?: Record<string, any>
  ): ClassifiedTask {
    // 检查核心认知任务
    if (this.coreCognitionTasks.includes(taskType)) {
      return {
        category: "core_cognition",
        complexity: "complex",
        requiresHighQuality: true,
        reason: "Nova 的核心认知功能，必须保证最高质量",
      };
    }

    // 检查伦理推理任务
    if (this.ethicalReasoningTasks.includes(taskType)) {
      return {
        category: "ethical_reasoning",
        complexity: "complex",
        requiresHighQuality: true,
        reason: "涉及伦理和价值判断，必须使用最高级别模型",
      };
    }

    // 检查创意生成任务
    if (this.creativeGenerationTasks.includes(taskType)) {
      return {
        category: "creative_generation",
        complexity: "complex",
        requiresHighQuality: true,
        reason: "创意生成任务，需要高质量输出",
      };
    }

    // 检查结构化任务
    if (this.structuralTasks.includes(taskType)) {
      return {
        category: "structural",
        complexity: "simple",
        requiresHighQuality: false,
        reason: "结构化任务，可以使用本地模型",
      };
    }

    // 检查辅助性任务
    if (this.auxiliaryTasks.includes(taskType)) {
      return {
        category: "auxiliary",
        complexity: "medium",
        requiresHighQuality: false,
        reason: "辅助性任务，可以使用本地模型",
      };
    }

    // 基于提示词内容进行启发式分类
    if (prompt) {
      return this.classifyByPrompt(prompt, metadata);
    }

    // 默认分类为中等复杂度
    return {
      category: "auxiliary",
      complexity: "medium",
      requiresHighQuality: false,
      reason: "默认分类，基于启发式分析",
    };
  }

  /**
   * 基于提示词内容进行分类
   */
  private classifyByPrompt(prompt: string, metadata?: Record<string, any>): ClassifiedTask {
    const lowerPrompt = prompt.toLowerCase();

    // 检查是否包含核心认知关键词
    const cognitiveKeywords = [
      "reflect",
      "self-awareness",
      "personal growth",
      "meaning",
      "identity",
      "purpose",
      "values",
      "beliefs",
    ];

    if (cognitiveKeywords.some((kw) => lowerPrompt.includes(kw))) {
      return {
        category: "core_cognition",
        complexity: "complex",
        requiresHighQuality: true,
        reason: "提示词包含核心认知关键词",
      };
    }

    // 检查是否包含伦理关键词
    const ethicalKeywords = [
      "ethical",
      "moral",
      "right",
      "wrong",
      "should",
      "principle",
      "consequence",
      "value",
    ];

    if (ethicalKeywords.some((kw) => lowerPrompt.includes(kw))) {
      return {
        category: "ethical_reasoning",
        complexity: "complex",
        requiresHighQuality: true,
        reason: "提示词包含伦理推理关键词",
      };
    }

    // 检查是否包含创意关键词
    const creativeKeywords = [
      "create",
      "imagine",
      "generate",
      "write",
      "compose",
      "design",
      "invent",
      "artistic",
    ];

    if (creativeKeywords.some((kw) => lowerPrompt.includes(kw))) {
      return {
        category: "creative_generation",
        complexity: "complex",
        requiresHighQuality: true,
        reason: "提示词包含创意生成关键词",
      };
    }

    // 检查是否是结构化任务
    const structuralKeywords = [
      "parse",
      "extract",
      "format",
      "json",
      "validate",
      "convert",
      "calculate",
    ];

    if (structuralKeywords.some((kw) => lowerPrompt.includes(kw))) {
      return {
        category: "structural",
        complexity: "simple",
        requiresHighQuality: false,
        reason: "提示词包含结构化任务关键词",
      };
    }

    // 检查提示词长度
    if (prompt.length > 500) {
      return {
        category: "auxiliary",
        complexity: "complex",
        requiresHighQuality: false,
        reason: "提示词较长，可能是复杂辅助任务",
      };
    }

    if (prompt.length < 100) {
      return {
        category: "auxiliary",
        complexity: "simple",
        requiresHighQuality: false,
        reason: "提示词较短，可能是简单辅助任务",
      };
    }

    // 默认分类
    return {
      category: "auxiliary",
      complexity: "medium",
      requiresHighQuality: false,
      reason: "基于提示词启发式分析的默认分类",
    };
  }

  /**
   * 获取所有核心认知任务
   */
  getCoreCognitionTasks(): string[] {
    return [...this.coreCognitionTasks];
  }

  /**
   * 获取所有伦理推理任务
   */
  getEthicalReasoningTasks(): string[] {
    return [...this.ethicalReasoningTasks];
  }

  /**
   * 获取所有创意生成任务
   */
  getCreativeGenerationTasks(): string[] {
    return [...this.creativeGenerationTasks];
  }

  /**
   * 检查任务是否需要高质量
   */
  requiresHighQuality(taskType: string): boolean {
    return (
      this.coreCognitionTasks.includes(taskType) ||
      this.ethicalReasoningTasks.includes(taskType) ||
      this.creativeGenerationTasks.includes(taskType)
    );
  }

  /**
   * 生成分类报告
   */
  generateReport(): string {
    let report = "# 任务分类报告\n\n";

    report += "## 核心认知任务（必须使用 Manus LLM）\n";
    for (const task of this.coreCognitionTasks) {
      report += `- ${task}\n`;
    }

    report += "\n## 伦理推理任务（必须使用 Manus LLM）\n";
    for (const task of this.ethicalReasoningTasks) {
      report += `- ${task}\n`;
    }

    report += "\n## 创意生成任务（优先使用 Manus LLM）\n";
    for (const task of this.creativeGenerationTasks) {
      report += `- ${task}\n`;
    }

    report += "\n## 辅助性任务（可使用本地模型）\n";
    for (const task of this.auxiliaryTasks) {
      report += `- ${task}\n`;
    }

    report += "\n## 结构化任务（可使用廉价模型）\n";
    for (const task of this.structuralTasks) {
      report += `- ${task}\n`;
    }

    return report;
  }
}

// 全局分类器实例
let globalClassifier: EnhancedTaskClassifier | null = null;

export function getEnhancedTaskClassifier(): EnhancedTaskClassifier {
  if (!globalClassifier) {
    globalClassifier = new EnhancedTaskClassifier();
  }
  return globalClassifier;
}

export default getEnhancedTaskClassifier;
