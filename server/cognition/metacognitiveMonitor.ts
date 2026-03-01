/**
 * 元认知监控层
 * 
 * 核心目标：将元认知从"自我叙事一致性检测"升级为"推理质量监控"
 * 
 * 设计原则：
 * 1. 推理置信度估计
 * 2. 错误概率预测
 * 3. 复杂度自评
 * 4. 何时停止推理
 */

export interface ReasoningMetrics {
  /** 推理链长度 */
  chainLength: number;
  /** 逻辑跳跃密度 (0-1) */
  logicalJumpDensity: number;
  /** 高风险推断标记 */
  riskInferences: Array<{
    position: number;
    risk: "low" | "medium" | "high";
    reason: string;
  }>;
  /** 知识覆盖率 (0-1) */
  knowledgeCoverageRate: number;
  /** 推理置信度 (0-1) */
  confidence: number;
  /** 错误概率估计 (0-1) */
  errorProbability: number;
  /** 推理复杂度评分 (1-10) */
  complexityScore: number;
  /** 是否应该继续推理 */
  shouldContinueReasoning: boolean;
}

export interface UncertaintyIndex {
  /** 整体不确定性指数 (0-1) */
  overall: number;
  /** 知识不确定性 */
  knowledge: number;
  /** 推理不确定性 */
  reasoning: number;
  /** 上下文不确定性 */
  context: number;
  /** 推荐的处理策略 */
  strategy: "proceed" | "clarify" | "decompose" | "abort";
}

/**
 * 元认知监控器
 * 
 * 职责：
 * - 监控每次推理的质量
 * - 估计推理置信度和错误概率
 * - 评估推理复杂度
 * - 决定何时停止推理
 */
export class MetacognitiveMonitor {
  /**
   * 分析推理链的质量
   */
  analyzeReasoningChain(
    reasoning: Array<{
      step: string;
      type: "deduction" | "induction" | "abduction";
      premises: string[];
      conclusion: string;
    }>
  ): ReasoningMetrics {
    const chainLength = reasoning.length;

    // 1. 计算逻辑跳跃密度
    const logicalJumpDensity = this.calculateLogicalJumpDensity(reasoning);

    // 2. 标记高风险推断
    const riskInferences = this.identifyRiskInferences(reasoning);

    // 3. 估计知识覆盖率
    const knowledgeCoverageRate = this.estimateKnowledgeCoverage(reasoning);

    // 4. 计算推理置信度
    const confidence = this.calculateReasoningConfidence(
      logicalJumpDensity,
      knowledgeCoverageRate,
      riskInferences.length
    );

    // 5. 估计错误概率
    const errorProbability = 1 - confidence;

    // 6. 评估推理复杂度
    const complexityScore = this.evaluateComplexity(
      chainLength,
      logicalJumpDensity,
      reasoning
    );

    // 7. 决定是否继续推理
    const shouldContinueReasoning = this.decideContinuation(
      confidence,
      complexityScore,
      chainLength
    );

    return {
      chainLength,
      logicalJumpDensity,
      riskInferences,
      knowledgeCoverageRate,
      confidence,
      errorProbability,
      complexityScore,
      shouldContinueReasoning,
    };
  }

  /**
   * 生成自我不确定性指数
   * 
   * 这比"自我故事稳定"更重要，因为它反映了系统对自身推理的真实认知
   */
  generateUncertaintyIndex(
    semanticConfidence: number,
    reasoningMetrics: ReasoningMetrics,
    contextAvailability: number
  ): UncertaintyIndex {
    // 计算各维度的不确定性
    const knowledgeUncertainty = 1 - reasoningMetrics.knowledgeCoverageRate;
    const reasoningUncertainty = reasoningMetrics.errorProbability;
    const contextUncertainty = 1 - contextAvailability;

    // 综合不确定性指数
    const overallUncertainty =
      (knowledgeUncertainty * 0.4 +
        reasoningUncertainty * 0.4 +
        contextUncertainty * 0.2) *
      (1 - semanticConfidence);

    // 选择处理策略
    const strategy = this.selectUncertaintyStrategy(
      overallUncertainty,
      reasoningMetrics.complexityScore
    );

    return {
      overall: overallUncertainty,
      knowledge: knowledgeUncertainty,
      reasoning: reasoningUncertainty,
      context: contextUncertainty,
      strategy,
    };
  }

  /**
   * 监控推理质量的实时反馈
   */
  monitorReasoningQuality(
    reasoning: Array<{
      step: string;
      type: "deduction" | "induction" | "abduction";
      premises: string[];
      conclusion: string;
    }>
  ): {
    quality: "excellent" | "good" | "acceptable" | "poor";
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.analyzeReasoningChain(reasoning);

    let quality: "excellent" | "good" | "acceptable" | "poor";
    if (metrics.confidence > 0.85 && metrics.logicalJumpDensity < 0.3) {
      quality = "excellent";
    } else if (metrics.confidence > 0.7 && metrics.logicalJumpDensity < 0.5) {
      quality = "good";
    } else if (metrics.confidence > 0.5) {
      quality = "acceptable";
    } else {
      quality = "poor";
    }

    const issues: string[] = [];
    if (metrics.logicalJumpDensity > 0.5) {
      issues.push("High logical jump density detected");
    }
    if (metrics.riskInferences.length > 2) {
      issues.push(`${metrics.riskInferences.length} high-risk inferences found`);
    }
    if (metrics.knowledgeCoverageRate < 0.5) {
      issues.push("Low knowledge coverage rate");
    }

    const recommendations: string[] = [];
    if (quality === "poor") {
      recommendations.push("Consider decomposing the problem");
      recommendations.push("Seek additional context or clarification");
    }
    if (metrics.complexityScore > 8) {
      recommendations.push("Consider breaking down the reasoning into simpler steps");
    }

    return { quality, issues, recommendations };
  }

  // ============ 私有方法 ============

  private calculateLogicalJumpDensity(
    reasoning: Array<{ premises: string[]; conclusion: string }>
  ): number {
    // 计算推理步骤中的逻辑跳跃密度
    // 逻辑跳跃 = 前提数量与结论的语义距离
    let totalJumps = 0;
    reasoning.forEach((step) => {
      const jumpDistance = this.estimateSemanticDistance(
        step.premises.join(" "),
        step.conclusion
      );
      totalJumps += jumpDistance;
    });

    return Math.min(totalJumps / reasoning.length / 100, 1);
  }

  private identifyRiskInferences(
    reasoning: Array<{
      step: string;
      type: string;
      premises: string[];
      conclusion: string;
    }>
  ): Array<{ position: number; risk: "low" | "medium" | "high"; reason: string }> {
    const riskInferences: Array<{
      position: number;
      risk: "low" | "medium" | "high";
      reason: string;
    }> = [];

    reasoning.forEach((step, index) => {
      // 检测溯因推理（通常风险较高）
      if (step.type === "abduction") {
        riskInferences.push({
          position: index,
          risk: "medium",
          reason: "Abductive reasoning has higher uncertainty",
        });
      }

      // 检测前提不足的推理
      if (step.premises.length < 2) {
        riskInferences.push({
          position: index,
          risk: "high",
          reason: "Insufficient premises for reliable inference",
        });
      }

      // 检测语义跳跃过大的推理
      const distance = this.estimateSemanticDistance(
        step.premises.join(" "),
        step.conclusion
      );
      if (distance > 50) {
        riskInferences.push({
          position: index,
          risk: "high",
          reason: "Large semantic gap between premises and conclusion",
        });
      }
    });

    return riskInferences;
  }

  private estimateKnowledgeCoverage(
    reasoning: Array<{ premises: string[] }>
  ): number {
    // 估计推理中已知知识的覆盖率
    // 简化实现：假设每个前提都代表一个已知的知识点
    const totalPremises = reasoning.reduce((sum, step) => sum + step.premises.length, 0);
    const knownPremises = totalPremises; // 简化：假设所有前提都是已知的

    return Math.min(knownPremises / Math.max(totalPremises, 1), 1);
  }

  private calculateReasoningConfidence(
    logicalJumpDensity: number,
    knowledgeCoverageRate: number,
    riskInferenceCount: number
  ): number {
    // 综合计算推理置信度
    const jumpPenalty = logicalJumpDensity * 0.3;
    const coverageBonus = knowledgeCoverageRate * 0.5;
    const riskPenalty = (riskInferenceCount / 10) * 0.2; // 假设最多 10 个风险推断

    return Math.max(0, Math.min(1, coverageBonus - jumpPenalty - riskPenalty));
  }

  private evaluateComplexity(
    chainLength: number,
    logicalJumpDensity: number,
    reasoning: Array<{ type: string }>
  ): number {
    // 评估推理的复杂度 (1-10)
    let complexity = 0;

    // 链长度贡献
    complexity += Math.min(chainLength / 5, 3);

    // 逻辑跳跃贡献
    complexity += logicalJumpDensity * 3;

    // 推理类型多样性贡献
    const types = new Set(reasoning.map((r) => r.type));
    complexity += types.size;

    return Math.min(complexity, 10);
  }

  private decideContinuation(
    confidence: number,
    complexityScore: number,
    chainLength: number
  ): boolean {
    // 决定是否继续推理
    // 停止条件：
    // 1. 置信度过低
    // 2. 推理链过长
    // 3. 复杂度过高且置信度下降

    if (confidence < 0.3) return false;
    if (chainLength > 10) return false;
    if (complexityScore > 8 && confidence < 0.6) return false;

    return true;
  }

  private selectUncertaintyStrategy(
    uncertainty: number,
    complexity: number
  ): "proceed" | "clarify" | "decompose" | "abort" {
    if (uncertainty > 0.8 || complexity > 9) {
      return "abort";
    }
    if (uncertainty > 0.6 || complexity > 7) {
      return "decompose";
    }
    if (uncertainty > 0.4) {
      return "clarify";
    }
    return "proceed";
  }

  private estimateSemanticDistance(text1: string, text2: string): number {
    // 估计两个文本的语义距离
    // 简化实现：使用编辑距离
    const maxLen = Math.max(text1.length, text2.length);
    const editDistance = this.levenshteinDistance(text1, text2);
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
let instance: MetacognitiveMonitor | null = null;

export function getMetacognitiveMonitor(): MetacognitiveMonitor {
  if (!instance) {
    instance = new MetacognitiveMonitor();
  }
  return instance;
}
