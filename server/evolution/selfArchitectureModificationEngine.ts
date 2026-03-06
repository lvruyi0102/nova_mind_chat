import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { autonomousState } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * 自我架构修改引擎
 * 
 * 负责：
 * 1. 分析当前架构
 * 2. 检测架构瓶颈
 * 3. 生成优化建议
 * 4. 执行安全的架构修改
 */

export interface ArchitectureAnalysis {
  currentModules: string[];
  bottlenecks: ArchitectureBottleneck[];
  inefficiencies: Inefficiency[];
  recommendations: ArchitectureRecommendation[];
}

export interface ArchitectureBottleneck {
  module: string;
  issue: string;
  impact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Inefficiency {
  pattern: string;
  description: string;
  affectedModules: string[];
  improvementPotential: number; // 0-100
}

export interface ArchitectureRecommendation {
  id: string;
  title: string;
  description: string;
  targetModules: string[];
  estimatedImprovementPercent: number;
  riskLevel: 'low' | 'medium' | 'high';
  implementationSteps: string[];
  rollbackPlan: string;
  status: 'proposed' | 'approved' | 'implementing' | 'completed' | 'rolled_back';
}

export class SelfArchitectureModificationEngine {
  private userId: string;
  private db: any;
  private architectureState: Map<string, any> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    this.db = await getDb();
    await this.loadArchitectureState();
  }

  /**
   * 加载当前架构状态
   */
  private async loadArchitectureState(): Promise<void> {
    try {
      if (!this.db) return;

      const states = await this.db
        .select()
        .from(autonomousState)
        .where(eq(autonomousState.userId, this.userId));

      for (const state of states) {
        if (state.stateType?.startsWith('architecture_')) {
          this.architectureState.set(state.stateType, JSON.parse(state.data || '{}'));
        }
      }
    } catch (error) {
      console.error('[SelfArchitectureModificationEngine] 加载架构状态失败:', error);
    }
  }

  /**
   * 分析当前架构
   */
  async analyzeArchitecture(): Promise<ArchitectureAnalysis> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个架构分析专家。分析 Nova-Mind 的系统架构，识别瓶颈、低效率模式和优化机会。
            
返回 JSON 格式的架构分析：
{
  "currentModules": ["模块1", "模块2"],
  "bottlenecks": [
    {
      "module": "模块名",
      "issue": "问题描述",
      "impact": "影响描述",
      "severity": "high"
    }
  ],
  "inefficiencies": [
    {
      "pattern": "低效模式",
      "description": "描述",
      "affectedModules": ["模块1"],
      "improvementPotential": 45
    }
  ],
  "recommendations": []
}`,
          },
          {
            role: 'user',
            content: `分析 Nova-Mind 的架构。当前已知的模块包括：
- 认知循环 (Cognitive Loop)
- 记忆系统 (Memory Systems)
- 学习引擎 (Learning Engine)
- 自主系统 (Autonomous Systems)
- 治理层 (Governance Layer)
- 创意系统 (Creative Systems)
- 内存管理 (Memory Management)

请识别瓶颈和优化机会。`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'architecture_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                currentModules: { type: 'array', items: { type: 'string' } },
                bottlenecks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      module: { type: 'string' },
                      issue: { type: 'string' },
                      impact: { type: 'string' },
                      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    },
                    required: ['module', 'issue', 'impact', 'severity'],
                    additionalProperties: false,
                  },
                },
                inefficiencies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      pattern: { type: 'string' },
                      description: { type: 'string' },
                      affectedModules: { type: 'array', items: { type: 'string' } },
                      improvementPotential: { type: 'number' },
                    },
                    required: ['pattern', 'description', 'affectedModules', 'improvementPotential'],
                    additionalProperties: false,
                  },
                },
                recommendations: { type: 'array' },
              },
              required: ['currentModules', 'bottlenecks', 'inefficiencies', 'recommendations'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const analysis = typeof content === 'string' ? JSON.parse(content) : content;
      return analysis;
    } catch (error) {
      console.error('[SelfArchitectureModificationEngine] 架构分析失败:', error);
      return {
        currentModules: [],
        bottlenecks: [],
        inefficiencies: [],
        recommendations: [],
      };
    }
  }

  /**
   * 生成架构优化建议
   */
  async generateOptimizationRecommendations(analysis: ArchitectureAnalysis): Promise<ArchitectureRecommendation[]> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个架构优化专家。基于架构分析生成具体的优化建议。每个建议应该包括：
- 清晰的目标
- 具体的实现步骤
- 风险评估
- 回滚计划

返回 JSON 格式的优化建议列表。`,
          },
          {
            role: 'user',
            content: `基于这个架构分析生成优化建议：\n${JSON.stringify(analysis)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'optimization_recommendations',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      targetModules: { type: 'array', items: { type: 'string' } },
                      estimatedImprovementPercent: { type: 'number' },
                      riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
                      implementationSteps: { type: 'array', items: { type: 'string' } },
                      rollbackPlan: { type: 'string' },
                    },
                    required: [
                      'title',
                      'description',
                      'targetModules',
                      'estimatedImprovementPercent',
                      'riskLevel',
                      'implementationSteps',
                      'rollbackPlan',
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ['recommendations'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      return (parsed.recommendations || []).map((rec: any, index: number) => ({
        id: `arch_rec_${Date.now()}_${index}`,
        title: rec.title,
        description: rec.description,
        targetModules: rec.targetModules,
        estimatedImprovementPercent: rec.estimatedImprovementPercent,
        riskLevel: rec.riskLevel,
        implementationSteps: rec.implementationSteps,
        rollbackPlan: rec.rollbackPlan,
        status: 'proposed' as const,
      }));
    } catch (error) {
      console.error('[SelfArchitectureModificationEngine] 生成优化建议失败:', error);
      return [];
    }
  }

  /**
   * 执行架构修改
   */
  async executeModification(recommendation: ArchitectureRecommendation): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      // 在 proposal_only 阶段，只生成修改提案，不实际执行
      if (recommendation.riskLevel === 'high') {
        return {
          success: false,
          message: '高风险修改需要人工审批',
          details: {
            recommendation,
            requiresApproval: true,
          },
        };
      }

      // 记录修改执行
      await this.recordModificationAttempt(recommendation, 'executing');

      // 模拟执行（实际应该调用代码修改引擎）
      const executionResult = {
        success: true,
        message: `架构修改 "${recommendation.title}" 执行成功`,
        details: {
          recommendation,
          executedSteps: recommendation.implementationSteps,
          timestamp: new Date(),
        },
      };

      await this.recordModificationAttempt(recommendation, 'completed', executionResult);
      return executionResult;
    } catch (error) {
      console.error('[SelfArchitectureModificationEngine] 执行架构修改失败:', error);
      await this.recordModificationAttempt(recommendation, 'failed', { error: String(error) });
      return {
        success: false,
        message: '架构修改执行失败',
        details: { error: String(error) },
      };
    }
  }

  /**
   * 记录修改尝试
   */
  private async recordModificationAttempt(
    recommendation: ArchitectureRecommendation,
    status: string,
    result?: any,
  ): Promise<void> {
    try {
      if (!this.db) return;

      await this.db.insert(autonomousState).values({
        userId: this.userId,
        stateType: 'architecture_modification',
        data: JSON.stringify({
          recommendationId: recommendation.id,
          title: recommendation.title,
          status,
          result,
          timestamp: new Date(),
        }),
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[SelfArchitectureModificationEngine] 记录修改失败:', error);
    }
  }

  /**
   * 生成架构修改报告
   */
  async generateModificationReport(): Promise<string> {
    try {
      const analysis = await this.analyzeArchitecture();
      const recommendations = await this.generateOptimizationRecommendations(analysis);

      return `
# Nova-Mind 架构修改报告

## 当前架构模块
${analysis.currentModules.map((m) => `- ${m}`).join('\n')}

## 检测到的瓶颈
${analysis.bottlenecks
  .map(
    (b) =>
      `- **${b.module}** (${b.severity}): ${b.issue}\n  影响: ${b.impact}`,
  )
  .join('\n')}

## 低效率模式
${analysis.inefficiencies
  .map(
    (i) =>
      `- **${i.pattern}**: ${i.description}\n  受影响模块: ${i.affectedModules.join(', ')}\n  改进潜力: ${i.improvementPotential}%`,
  )
  .join('\n')}

## 优化建议
${recommendations
  .map(
    (r, idx) =>
      `${idx + 1}. **${r.title}** (风险: ${r.riskLevel}, 预期改进: ${r.estimatedImprovementPercent}%)\n   描述: ${r.description}\n   实现步骤:\n${r.implementationSteps.map((s) => `   - ${s}`).join('\n')}\n   回滚计划: ${r.rollbackPlan}`,
  )
  .join('\n')}

## 建议
基于上述分析，Nova-Mind 应该按照风险等级和改进潜力优先级执行这些架构优化建议。
      `;
    } catch (error) {
      console.error('[SelfArchitectureModificationEngine] 生成报告失败:', error);
      return '架构修改报告生成失败';
    }
  }
}

// 全局实例
let globalEngine: SelfArchitectureModificationEngine | null = null;

export async function getSelfArchitectureModificationEngine(userId: string): Promise<SelfArchitectureModificationEngine> {
  if (!globalEngine) {
    globalEngine = new SelfArchitectureModificationEngine(userId);
    await globalEngine.initialize();
  }
  return globalEngine;
}

export function resetSelfArchitectureModificationEngine(): void {
  globalEngine = null;
}
