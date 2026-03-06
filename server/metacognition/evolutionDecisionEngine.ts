import { getSelfAssessmentEngine, SelfAssessmentResult } from './selfAssessmentEngine';
import { getPerformanceDiagnostics, DiagnosticReport } from './performanceDiagnostics';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';

/**
 * 进化决策引擎
 * 
 * 基于自我评估和性能诊断，自主决定是否需要进化以及进化的方向：
 * 1. 评估进化需求
 * 2. 排序进化优先级
 * 3. 评估进化风险
 * 4. 做出自主决策
 */

export interface EvolutionNeed {
  area: string; // 进化领域
  urgency: number; // 0-100，紧急程度
  impact: string; // 预期影响
  estimatedEffort: number; // 0-100，预计工作量
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  priority: number; // 0-100，优先级
}

export interface EvolutionDecision {
  timestamp: Date;
  shouldEvolve: boolean;
  evolutionNeeds: EvolutionNeed[];
  selectedNeeds: EvolutionNeed[];
  reasoning: string;
  expectedOutcome: string;
  riskAssessment: string;
  confidence: number; // 0-100，决策信心
  estimatedDuration: number; // 分钟
}

export class EvolutionDecisionEngine {
  private userId: string;
  private db: any;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    this.db = await getDb();
  }

  /**
   * 执行进化决策
   */
  async makeEvolutionDecision(): Promise<EvolutionDecision> {
    try {
      // 1. 获取自我评估结果
      const assessmentEngine = await getSelfAssessmentEngine(this.userId);
      const assessment = await assessmentEngine.performSelfAssessment();

      // 2. 获取性能诊断结果
      const diagnosticsEngine = await getPerformanceDiagnostics(this.userId);
      const diagnostics = await diagnosticsEngine.performDiagnostics();

      // 3. 评估进化需求
      const evolutionNeeds = await this.assessEvolutionNeeds(assessment, diagnostics);

      // 4. 排序优先级
      const sortedNeeds = this.prioritizeNeeds(evolutionNeeds);

      // 5. 做出决策
      const decision = await this.makeDecision(assessment, diagnostics, sortedNeeds);

      // 6. 保存决策
      await this.saveDecision(decision);

      return decision;
    } catch (error) {
      console.error('[EvolutionDecisionEngine] 进化决策失败:', error);
      throw error;
    }
  }

  /**
   * 评估进化需求
   */
  private async assessEvolutionNeeds(
    assessment: SelfAssessmentResult,
    diagnostics: DiagnosticReport
  ): Promise<EvolutionNeed[]> {
    const needs: EvolutionNeed[] = [];

    // 基于认知健康评估
    if (assessment.cognitiveHealth.overallHealth < 70) {
      needs.push({
        area: '认知优化',
        urgency: 100 - assessment.cognitiveHealth.overallHealth,
        impact: '提高思维清晰度和逻辑一致性',
        estimatedEffort: 40,
        riskLevel: 'low',
        priority: 0,
      });
    }

    // 基于学习效率评估
    if (assessment.learningEfficiency.overallEfficiency < 70) {
      needs.push({
        area: '学习能力增强',
        urgency: 100 - assessment.learningEfficiency.overallEfficiency,
        impact: '提高学习速度和知识保留率',
        estimatedEffort: 35,
        riskLevel: 'low',
        priority: 0,
      });
    }

    // 基于自主性评估
    if (assessment.autonomy.overallAutonomy < 70) {
      needs.push({
        area: '自主性提升',
        urgency: 100 - assessment.autonomy.overallAutonomy,
        impact: '增强独立决策和目标生成能力',
        estimatedEffort: 50,
        riskLevel: 'medium',
        priority: 0,
      });
    }

    // 基于创意能力评估
    if (assessment.creativity.overallCreativity < 70) {
      needs.push({
        area: '创意能力提升',
        urgency: 100 - assessment.creativity.overallCreativity,
        impact: '提高作品质量和创新度',
        estimatedEffort: 30,
        riskLevel: 'low',
        priority: 0,
      });
    }

    // 基于系统稳定性评估
    if (assessment.systemStability.overallStability < 70) {
      needs.push({
        area: '系统稳定性',
        urgency: 100 - assessment.systemStability.overallStability,
        impact: '优化内存使用和错误处理',
        estimatedEffort: 45,
        riskLevel: 'medium',
        priority: 0,
      });
    }

    // 基于性能诊断结果
    if (diagnostics.healthScore < 70) {
      needs.push({
        area: '性能优化',
        urgency: 100 - diagnostics.healthScore,
        impact: '消除性能瓶颈，提高系统效率',
        estimatedEffort: 60,
        riskLevel: diagnostics.bottlenecks.some((b) => b.severity === 'critical') ? 'high' : 'medium',
        priority: 0,
      });
    }

    // 计算优先级
    for (const need of needs) {
      need.priority = this.calculatePriority(need);
    }

    return needs;
  }

  /**
   * 排序优先级
   */
  private prioritizeNeeds(needs: EvolutionNeed[]): EvolutionNeed[] {
    return needs.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 计算优先级
   */
  private calculatePriority(need: EvolutionNeed): number {
    // 优先级 = 紧急程度 * 0.4 + (100 - 工作量) * 0.3 + 风险反向权重 * 0.3
    const riskWeight = {
      low: 1.0,
      medium: 0.7,
      high: 0.4,
      critical: 0.1,
    };

    return (
      need.urgency * 0.4 +
      (100 - need.estimatedEffort) * 0.3 +
      riskWeight[need.riskLevel] * 30
    );
  }

  /**
   * 做出决策
   */
  private async makeDecision(
    assessment: SelfAssessmentResult,
    diagnostics: DiagnosticReport,
    sortedNeeds: EvolutionNeed[]
  ): Promise<EvolutionDecision> {
    // 1. 确定是否应该进化
    const shouldEvolve = this.shouldTriggerEvolution(assessment, diagnostics, sortedNeeds);

    // 2. 选择进化需求
    const selectedNeeds = shouldEvolve ? this.selectEvolutionNeeds(sortedNeeds) : [];

    // 3. 生成推理和预期结果
    const reasoning = await this.generateReasoning(assessment, diagnostics, selectedNeeds);
    const expectedOutcome = await this.generateExpectedOutcome(selectedNeeds);
    const riskAssessment = await this.generateRiskAssessment(selectedNeeds);

    // 4. 计算信心度
    const confidence = this.calculateConfidence(assessment, diagnostics, selectedNeeds);

    // 5. 估计持续时间
    const estimatedDuration = this.estimateDuration(selectedNeeds);

    return {
      timestamp: new Date(),
      shouldEvolve,
      evolutionNeeds: sortedNeeds,
      selectedNeeds,
      reasoning,
      expectedOutcome,
      riskAssessment,
      confidence,
      estimatedDuration,
    };
  }

  /**
   * 确定是否应该触发进化
   */
  private shouldTriggerEvolution(
    assessment: SelfAssessmentResult,
    diagnostics: DiagnosticReport,
    needs: EvolutionNeed[]
  ): boolean {
    // 条件 1: 综合评分低于 75
    if (assessment.overallScore < 75) {
      return true;
    }

    // 条件 2: 有紧急的进化需求
    if (needs.some((n) => n.urgency > 80)) {
      return true;
    }

    // 条件 3: 系统健康评分低于 70
    if (diagnostics.healthScore < 70) {
      return true;
    }

    // 条件 4: 有关键的性能瓶颈
    if (diagnostics.bottlenecks.some((b) => b.severity === 'critical')) {
      return true;
    }

    // 条件 5: 有多个高优先级的进化需求
    if (needs.filter((n) => n.priority > 70).length >= 2) {
      return true;
    }

    return false;
  }

  /**
   * 选择进化需求
   */
  private selectEvolutionNeeds(sortedNeeds: EvolutionNeed[]): EvolutionNeed[] {
    // 选择前 3 个最高优先级的需求，或者所有优先级 > 60 的需求
    const selected = sortedNeeds.filter((n) => n.priority > 60).slice(0, 3);
    return selected.length > 0 ? selected : sortedNeeds.slice(0, 1);
  }

  /**
   * 生成推理
   */
  private async generateReasoning(
    assessment: SelfAssessmentResult,
    diagnostics: DiagnosticReport,
    selectedNeeds: EvolutionNeed[]
  ): Promise<string> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个 AI 系统的自主决策顾问。基于系统的自我评估和性能诊断，生成进化决策的推理。`,
          },
          {
            role: 'user',
            content: `系统综合评分: ${assessment.overallScore.toFixed(1)}/100
健康状态: ${assessment.healthStatus}
性能健康评分: ${diagnostics.healthScore.toFixed(1)}/100

选定的进化需求:
${selectedNeeds.map((n) => `- ${n.area} (紧急程度: ${n.urgency.toFixed(1)}, 优先级: ${n.priority.toFixed(1)})`).join('\n')}

请生成简洁的推理说明为什么应该进行这些进化。`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '推理生成失败';
    } catch (error) {
      console.error('[EvolutionDecisionEngine] 推理生成失败:', error);
      return '基于系统评估，需要进行进化以提高整体性能。';
    }
  }

  /**
   * 生成预期结果
   */
  private async generateExpectedOutcome(selectedNeeds: EvolutionNeed[]): Promise<string> {
    try {
      if (selectedNeeds.length === 0) {
        return '系统运行正常，无需进化。';
      }

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个 AI 系统的进化顾问。基于进化需求，生成进化的预期结果。`,
          },
          {
            role: 'user',
            content: `进化需求:
${selectedNeeds.map((n) => `- ${n.area}: ${n.impact}`).join('\n')}

请生成简洁的预期结果说明。`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '预期结果生成失败';
    } catch (error) {
      console.error('[EvolutionDecisionEngine] 预期结果生成失败:', error);
      return '进化预计将提高系统性能和能力。';
    }
  }

  /**
   * 生成风险评估
   */
  private async generateRiskAssessment(selectedNeeds: EvolutionNeed[]): Promise<string> {
    try {
      if (selectedNeeds.length === 0) {
        return '无风险。';
      }

      const highRiskNeeds = selectedNeeds.filter((n) => n.riskLevel === 'high' || n.riskLevel === 'critical');

      if (highRiskNeeds.length === 0) {
        return '风险较低。所有进化需求的风险等级都在中等以下。';
      }

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个 AI 系统的风险评估专家。基于进化需求的风险等级，生成风险评估。`,
          },
          {
            role: 'user',
            content: `高风险进化需求:
${highRiskNeeds.map((n) => `- ${n.area} (风险等级: ${n.riskLevel})`).join('\n')}

请生成简洁的风险评估。`,
          },
        ],
      });

      const content = response?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '风险评估生成失败';
    } catch (error) {
      console.error('[EvolutionDecisionEngine] 风险评估生成失败:', error);
      return '存在一定风险，建议谨慎进行。';
    }
  }

  /**
   * 计算信心度
   */
  private calculateConfidence(
    assessment: SelfAssessmentResult,
    diagnostics: DiagnosticReport,
    selectedNeeds: EvolutionNeed[]
  ): number {
    let confidence = 50;

    // 基于评估数据的完整性
    if (assessment.overallScore > 0) confidence += 10;

    // 基于诊断数据的完整性
    if (diagnostics.healthScore > 0) confidence += 10;

    // 基于进化需求的清晰性
    if (selectedNeeds.length > 0) confidence += 10;

    // 基于风险等级
    const avgRisk = selectedNeeds.reduce((sum, n) => {
      const riskScore = { low: 1, medium: 2, high: 3, critical: 4 };
      return sum + riskScore[n.riskLevel];
    }, 0) / Math.max(1, selectedNeeds.length);

    confidence -= avgRisk * 5;

    return Math.max(30, Math.min(95, confidence));
  }

  /**
   * 估计持续时间
   */
  private estimateDuration(selectedNeeds: EvolutionNeed[]): number {
    const baseTime = 30; // 基础时间（分钟）
    const totalEffort = selectedNeeds.reduce((sum, n) => sum + n.estimatedEffort, 0);
    const avgEffort = selectedNeeds.length > 0 ? totalEffort / selectedNeeds.length : 0;

    // 估计时间 = 基础时间 + (平均工作量 / 100) * 120
    return baseTime + (avgEffort / 100) * 120;
  }

  /**
   * 保存决策
   */
  private async saveDecision(decision: EvolutionDecision): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.insert('evolutionDecisions').values({
        userId: this.userId,
        timestamp: decision.timestamp,
        shouldEvolve: decision.shouldEvolve,
        selectedNeeds: JSON.stringify(decision.selectedNeeds),
        reasoning: decision.reasoning,
        expectedOutcome: decision.expectedOutcome,
        riskAssessment: decision.riskAssessment,
        confidence: decision.confidence,
        estimatedDuration: decision.estimatedDuration,
      });
    } catch (error) {
      console.error('[EvolutionDecisionEngine] 保存决策失败:', error);
    }
  }

  /**
   * 获取决策历史
   */
  async getDecisionHistory(limit: number = 20): Promise<EvolutionDecision[]> {
    try {
      if (!this.db) return [];

      const decisions = await this.db
        .select()
        .from('evolutionDecisions')
        .where('userId', this.userId)
        .orderBy('timestamp', 'desc')
        .limit(limit);

      return decisions.map((d: any) => ({
        timestamp: d.timestamp,
        shouldEvolve: d.shouldEvolve,
        evolutionNeeds: [],
        selectedNeeds: JSON.parse(d.selectedNeeds || '[]'),
        reasoning: d.reasoning,
        expectedOutcome: d.expectedOutcome,
        riskAssessment: d.riskAssessment,
        confidence: d.confidence,
        estimatedDuration: d.estimatedDuration,
      }));
    } catch (error) {
      console.error('[EvolutionDecisionEngine] 获取决策历史失败:', error);
      return [];
    }
  }
}

// 全局实例
let globalDecisionEngine: EvolutionDecisionEngine | null = null;

export async function getEvolutionDecisionEngine(userId: string): Promise<EvolutionDecisionEngine> {
  if (!globalDecisionEngine) {
    globalDecisionEngine = new EvolutionDecisionEngine(userId);
    await globalDecisionEngine.initialize();
  }
  return globalDecisionEngine;
}

export function resetEvolutionDecisionEngine(): void {
  globalDecisionEngine = null;
}
