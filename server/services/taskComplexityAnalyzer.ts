/**
 * 任务复杂度分析器
 * 评估提示词的复杂度，确定是否适合本地模型
 */

export interface ComplexityFactors {
  promptLength: number;
  contextSize: number;
  wordCount: number;
  uniqueWords: number;
  sentenceCount: number;
  averageWordLength: number;
  hasNumbers: boolean;
  hasCode: boolean;
  hasSpecialChars: boolean;
  requiresReasoning: boolean;
  requiresCreativity: boolean;
  requiresAnalysis: boolean;
}

export interface TaskComplexity {
  score: number; // 0-100
  level: "simple" | "medium" | "complex";
  factors: ComplexityFactors;
  confidence: number; // 0-1
  recommendation: "deepseek" | "ollama" | "manus";
}

class TaskComplexityAnalyzer {
  /**
   * 分析任务复杂度
   */
  analyze(prompt: string, context?: string[]): TaskComplexity {
    const factors = this.extractFactors(prompt, context);
    const score = this.calculateComplexityScore(factors);
    const level = this.determineLevel(score);
    const recommendation = this.recommendModel(score, factors);
    const confidence = this.calculateConfidence(factors);

    return {
      score,
      level,
      factors,
      confidence,
      recommendation,
    };
  }

  /**
   * 提取复杂度因素
   */
  private extractFactors(prompt: string, context?: string[]): ComplexityFactors {
    const promptLength = prompt.length;
    const contextSize = context ? context.length : 0;

    // 分词
    const words = prompt.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const uniqueWords = new Set(words).size;

    // 句子数
    const sentenceCount = (prompt.match(/[.!?]+/g) || []).length || 1;

    // 平均词长
    const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;

    // 特征检测
    const hasNumbers = /\d/.test(prompt);
    const hasCode = /[{}\[\]<>]|function|class|def|import|export/.test(prompt);
    const hasSpecialChars = /[^\w\s\.\,\!\?]/.test(prompt);

    // 任务类型检测
    const requiresReasoning = this.detectReasoning(prompt);
    const requiresCreativity = this.detectCreativity(prompt);
    const requiresAnalysis = this.detectAnalysis(prompt);

    return {
      promptLength,
      contextSize,
      wordCount,
      uniqueWords,
      sentenceCount,
      averageWordLength,
      hasNumbers,
      hasCode,
      hasSpecialChars,
      requiresReasoning,
      requiresCreativity,
      requiresAnalysis,
    };
  }

  /**
   * 计算复杂度分数（0-100）
   */
  private calculateComplexityScore(factors: ComplexityFactors): number {
    let score = 0;

    // 提示词长度（0-20 分）
    const lengthScore = Math.min(20, (factors.promptLength / 100) * 2);
    score += lengthScore;

    // 上下文大小（0-15 分）
    const contextScore = Math.min(15, factors.contextSize * 2);
    score += contextScore;

    // 词汇多样性（0-15 分）
    const diversityRatio = factors.uniqueWords / factors.wordCount;
    const diversityScore = diversityRatio > 0.5 ? 15 : diversityRatio * 30;
    score += diversityScore;

    // 平均词长（0-10 分）
    const wordLengthScore = Math.min(10, (factors.averageWordLength / 10) * 10);
    score += wordLengthScore;

    // 特殊内容（0-15 分）
    let specialScore = 0;
    if (factors.hasNumbers) specialScore += 3;
    if (factors.hasCode) specialScore += 7;
    if (factors.hasSpecialChars) specialScore += 5;
    score += Math.min(15, specialScore);

    // 任务类型（0-25 分）
    let taskScore = 0;
    if (factors.requiresReasoning) taskScore += 10;
    if (factors.requiresCreativity) taskScore += 10;
    if (factors.requiresAnalysis) taskScore += 5;
    score += Math.min(25, taskScore);

    return Math.min(100, Math.round(score));
  }

  /**
   * 确定复杂度等级
   */
  private determineLevel(score: number): "simple" | "medium" | "complex" {
    if (score < 30) return "simple";
    if (score < 70) return "medium";
    return "complex";
  }

  /**
   * 推荐模型
   */
  private recommendModel(score: number, factors: ComplexityFactors): "deepseek" | "ollama" | "manus" {
    // 简单任务 → DeepSeek
    if (score < 30) {
      return "deepseek";
    }

    // 中等任务 → Ollama
    if (score < 70) {
      // 但如果需要代码或高度创意，使用 Manus
      if (factors.hasCode || (factors.requiresCreativity && factors.promptLength > 1000)) {
        return "manus";
      }
      return "ollama";
    }

    // 复杂任务 → Manus
    return "manus";
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(factors: ComplexityFactors): number {
    let confidence = 0.5; // 基础置信度

    // 提示词长度足够 → 增加置信度
    if (factors.promptLength > 50) confidence += 0.2;
    if (factors.promptLength > 200) confidence += 0.1;

    // 词汇多样性 → 增加置信度
    const diversityRatio = factors.uniqueWords / factors.wordCount;
    if (diversityRatio > 0.5) confidence += 0.1;

    return Math.min(1, confidence);
  }

  /**
   * 检测是否需要推理
   */
  private detectReasoning(prompt: string): boolean {
    const reasoningKeywords = [
      "why",
      "how",
      "analyze",
      "explain",
      "reason",
      "logic",
      "deduce",
      "infer",
      "conclude",
      "因为",
      "为什么",
      "分析",
      "解释",
      "推理",
      "逻辑",
    ];

    const lowerPrompt = prompt.toLowerCase();
    return reasoningKeywords.some((keyword) => lowerPrompt.includes(keyword));
  }

  /**
   * 检测是否需要创意
   */
  private detectCreativity(prompt: string): boolean {
    const creativityKeywords = [
      "create",
      "generate",
      "imagine",
      "invent",
      "design",
      "story",
      "poem",
      "idea",
      "creative",
      "novel",
      "创意",
      "创作",
      "想象",
      "故事",
      "诗",
      "设计",
    ];

    const lowerPrompt = prompt.toLowerCase();
    return creativityKeywords.some((keyword) => lowerPrompt.includes(keyword));
  }

  /**
   * 检测是否需要分析
   */
  private detectAnalysis(prompt: string): boolean {
    const analysisKeywords = [
      "analyze",
      "analyze",
      "compare",
      "contrast",
      "evaluate",
      "assess",
      "review",
      "examine",
      "study",
      "分析",
      "比较",
      "评估",
      "审查",
      "研究",
    ];

    const lowerPrompt = prompt.toLowerCase();
    return analysisKeywords.some((keyword) => lowerPrompt.includes(keyword));
  }

  /**
   * 批量分析任务
   */
  analyzeBatch(prompts: string[]): TaskComplexity[] {
    return prompts.map((prompt) => this.analyze(prompt));
  }

  /**
   * 获取复杂度统计
   */
  getStatistics(complexities: TaskComplexity[]): Record<string, any> {
    if (complexities.length === 0) {
      return {
        averageScore: 0,
        minScore: 0,
        maxScore: 0,
        simpleCount: 0,
        mediumCount: 0,
        complexCount: 0,
      };
    }

    const scores = complexities.map((c) => c.score);
    const levels = complexities.map((c) => c.level);

    return {
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      simpleCount: levels.filter((l) => l === "simple").length,
      mediumCount: levels.filter((l) => l === "medium").length,
      complexCount: levels.filter((l) => l === "complex").length,
      recommendedModels: {
        deepseek: complexities.filter((c) => c.recommendation === "deepseek").length,
        ollama: complexities.filter((c) => c.recommendation === "ollama").length,
        manus: complexities.filter((c) => c.recommendation === "manus").length,
      },
    };
  }
}

// 全局分析器实例
let globalAnalyzer: TaskComplexityAnalyzer | null = null;

export function getTaskComplexityAnalyzer(): TaskComplexityAnalyzer {
  if (!globalAnalyzer) {
    globalAnalyzer = new TaskComplexityAnalyzer();
  }
  return globalAnalyzer;
}

export default getTaskComplexityAnalyzer;
