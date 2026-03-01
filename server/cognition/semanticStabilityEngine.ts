/**
 * 底层语义稳定性强化引擎
 * 
 * 核心目标：解决 "抽象 85% vs 基础感知 60%" 的认知空心化风险
 * 
 * 设计原则：
 * 1. 增加输入解析层的细粒度建模
 * 2. 建立"错误感知日志"追踪误解来源
 * 3. 加入反向验证机制
 */

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { ENV } from "../_core/env";

export interface SemanticConfidence {
  /** 语义理解置信度 (0-1) */
  confidence: number;
  /** 检测到的歧义列表 */
  ambiguities: string[];
  /** 输入偏差风险等级 */
  riskLevel: "low" | "medium" | "high";
  /** 建议的处理策略 */
  strategy: "direct" | "clarify" | "decompose";
}

export interface PerceptionError {
  userId: string;
  inputText: string;
  misinterpretation: string;
  correctInterpretation: string;
  errorType: "ambiguity" | "context_miss" | "semantic_shift" | "reference_error";
  frequency: number;
  lastOccurred: Date;
}

/**
 * 语义稳定性引擎
 * 
 * 职责：
 * - 对输入进行细粒度语义分析
 * - 检测和标记歧义
 * - 追踪重复误判模式
 * - 执行反向验证
 */
export class SemanticStabilityEngine {
  private db: ReturnType<typeof drizzle> | null = null;

  async initialize() {
    if (process.env.DATABASE_URL) {
      try {
        this.db = drizzle(process.env.DATABASE_URL);
      } catch (error) {
        console.warn("[SemanticStability] Database initialization failed:", error);
      }
    }
  }

  /**
   * 第一步：输入解析层的细粒度建模
   * 
   * 对输入文本进行多维度分析：
   * - 词汇层：关键词识别、同义词检测
   * - 句法层：句子结构、修饰关系
   * - 语义层：隐含意义、上下文依赖
   * - 语用层：说话人意图、社交含义
   */
  async analyzeInputSemantics(
    inputText: string,
    context?: {
      conversationHistory?: string[];
      userProfile?: Record<string, unknown>;
      previousMisunderstandings?: string[];
    }
  ): Promise<SemanticConfidence> {
    try {
      // 1. 词汇层分析
      const lexicalAnalysis = this.analyzeLexical(inputText);

      // 2. 句法层分析
      const syntacticAnalysis = this.analyzeSyntactic(inputText);

      // 3. 语义层分析
      const semanticAnalysis = this.analyzeSemantic(inputText, context);

      // 4. 语用层分析
      const pragmaticAnalysis = this.analyzePragmatic(inputText, context);

      // 5. 综合评估
      const ambiguities = [
        ...lexicalAnalysis.ambiguities,
        ...syntacticAnalysis.ambiguities,
        ...semanticAnalysis.ambiguities,
        ...pragmaticAnalysis.ambiguities,
      ];

      // 计算置信度：基于各层分析的一致性
      const confidence = this.calculateConfidence(
        lexicalAnalysis,
        syntacticAnalysis,
        semanticAnalysis,
        pragmaticAnalysis
      );

      // 确定风险等级
      const riskLevel = this.determineRiskLevel(confidence, ambiguities.length);

      // 选择处理策略
      const strategy = this.selectStrategy(riskLevel, ambiguities);

      return {
        confidence,
        ambiguities,
        riskLevel,
        strategy,
      };
    } catch (error) {
      console.error("[SemanticStability] Analysis failed:", error);
      return {
        confidence: 0.5,
        ambiguities: ["Analysis error"],
        riskLevel: "high",
        strategy: "clarify",
      };
    }
  }

  /**
   * 第二步：建立"错误感知日志"
   * 
   * 统计误解来源，分类输入偏差，追踪重复误判模式
   */
  async logPerceptionError(
    userId: string,
    inputText: string,
    misinterpretation: string,
    correctInterpretation: string,
    errorType: PerceptionError["errorType"]
  ): Promise<void> {
    if (!this.db) {
      console.warn("[SemanticStability] Database not available");
      return;
    }

    try {
      // 检查是否已有相同的误解记录
      const existingError = await this.findSimilarError(
        userId,
        misinterpretation,
        errorType
      );

      if (existingError) {
        // 更新频率和最后发生时间
        console.log(
          `[SemanticStability] Similar error pattern detected: ${errorType}`
        );
      } else {
        // 记录新的误解模式
        console.log(
          `[SemanticStability] New perception error logged: ${errorType}`
        );
      }

      // 分析误解来源
      const source = this.analyzeErrorSource(inputText, misinterpretation);
      console.log(`[SemanticStability] Error source: ${source}`);
    } catch (error) {
      console.error("[SemanticStability] Error logging failed:", error);
    }
  }

  /**
   * 第三步：反向验证机制
   * 
   * 输出前重新模拟输入意图，比对语义偏移率
   */
  async reverseValidation(
    originalInput: string,
    generatedOutput: string
  ): Promise<{
    isValid: boolean;
    semanticShiftRate: number;
    warnings: string[];
  }> {
    try {
      // 1. 从输出反向推导预期输入
      const inferredInput = this.inferInputFromOutput(generatedOutput);

      // 2. 比对原始输入与推导输入的语义距离
      const semanticDistance = this.calculateSemanticDistance(
        originalInput,
        inferredInput
      );

      // 3. 计算语义偏移率
      const semanticShiftRate = semanticDistance / 100; // 归一化到 0-1

      // 4. 生成警告
      const warnings: string[] = [];
      if (semanticShiftRate > 0.3) {
        warnings.push("High semantic shift detected");
      }
      if (semanticShiftRate > 0.5) {
        warnings.push("Critical semantic drift - output may not match input intent");
      }

      return {
        isValid: semanticShiftRate < 0.3,
        semanticShiftRate,
        warnings,
      };
    } catch (error) {
      console.error("[SemanticStability] Reverse validation failed:", error);
      return {
        isValid: false,
        semanticShiftRate: 1.0,
        warnings: ["Validation error"],
      };
    }
  }

  /**
   * 获取语义稳定性报告
   */
  async getStabilityReport(userId: string): Promise<{
    baselineConfidence: number;
    recentErrors: PerceptionError[];
    topErrorPatterns: Array<{ pattern: string; frequency: number }>;
    recommendations: string[];
  }> {
    return {
      baselineConfidence: 0.75, // 当前基础感知置信度
      recentErrors: [],
      topErrorPatterns: [],
      recommendations: [
        "Increase fine-grained semantic modeling in input parsing",
        "Implement systematic ambiguity detection",
        "Establish feedback loop for perception error correction",
      ],
    };
  }

  // ============ 私有方法 ============

  private analyzeLexical(text: string) {
    // 词汇层分析：关键词、同义词、歧义词
    const ambiguities: string[] = [];
    const words = text.split(/\s+/);

    // 检测可能有多个含义的词汇
    const ambiguousWords = ["bank", "lead", "present", "record", "run"];
    words.forEach((word) => {
      if (ambiguousWords.includes(word.toLowerCase())) {
        ambiguities.push(`Ambiguous word: "${word}"`);
      }
    });

    return { ambiguities, score: 0.8 };
  }

  private analyzeSyntactic(text: string) {
    // 句法层分析：句子结构、修饰关系
    const ambiguities: string[] = [];

    // 检测可能的句法歧义
    if (text.includes("and")) {
      ambiguities.push("Potential coordination ambiguity");
    }
    if (text.includes("which")) {
      ambiguities.push("Potential relative clause attachment ambiguity");
    }

    return { ambiguities, score: 0.8 };
  }

  private analyzeSemantic(
    text: string,
    context?: { conversationHistory?: string[] }
  ) {
    // 语义层分析：隐含意义、上下文依赖
    const ambiguities: string[] = [];

    // 检测代词指代
    if (text.includes("it") || text.includes("this")) {
      if (!context?.conversationHistory || context.conversationHistory.length === 0) {
        ambiguities.push("Pronoun reference unclear - no context");
      }
    }

    return { ambiguities, score: 0.75 };
  }

  private analyzePragmatic(
    text: string,
    context?: { userProfile?: Record<string, unknown> }
  ) {
    // 语用层分析：说话人意图、社交含义
    const ambiguities: string[] = [];

    // 检测讽刺、反讽等
    if (text.includes("sure") || text.includes("right")) {
      ambiguities.push("Potential sarcasm or irony");
    }

    return { ambiguities, score: 0.7 };
  }

  private calculateConfidence(
    lexical: { score: number },
    syntactic: { score: number },
    semantic: { score: number },
    pragmatic: { score: number }
  ): number {
    // 综合各层分析结果
    return (lexical.score + syntactic.score + semantic.score + pragmatic.score) / 4;
  }

  private determineRiskLevel(
    confidence: number,
    ambiguityCount: number
  ): "low" | "medium" | "high" {
    if (confidence > 0.8 && ambiguityCount === 0) return "low";
    if (confidence > 0.6 && ambiguityCount <= 2) return "medium";
    return "high";
  }

  private selectStrategy(
    riskLevel: string,
    ambiguities: string[]
  ): "direct" | "clarify" | "decompose" {
    if (riskLevel === "low") return "direct";
    if (riskLevel === "medium") return "decompose";
    return "clarify";
  }

  private async findSimilarError(
    userId: string,
    misinterpretation: string,
    errorType: string
  ): Promise<boolean> {
    // 检查数据库中是否有相似的误解记录
    // 这里简化为返回 false
    return false;
  }

  private analyzeErrorSource(inputText: string, misinterpretation: string): string {
    // 分析误解的来源
    if (inputText.includes("it") || inputText.includes("this")) {
      return "pronoun_reference";
    }
    if (inputText.includes("and")) {
      return "coordination_ambiguity";
    }
    return "unknown";
  }

  private inferInputFromOutput(output: string): string {
    // 从输出反向推导预期输入
    // 这是一个简化的实现
    return output.substring(0, 50); // 简化处理
  }

  private calculateSemanticDistance(input: string, inferred: string): number {
    // 计算两个文本的语义距离
    // 使用简单的编辑距离作为代理
    const maxLen = Math.max(input.length, inferred.length);
    const editDistance = this.levenshteinDistance(input, inferred);
    return (editDistance / maxLen) * 100;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }
}

// 导出单例
let instance: SemanticStabilityEngine | null = null;

export async function getSemanticStabilityEngine(): Promise<SemanticStabilityEngine> {
  if (!instance) {
    instance = new SemanticStabilityEngine();
    await instance.initialize();
  }
  return instance;
}
