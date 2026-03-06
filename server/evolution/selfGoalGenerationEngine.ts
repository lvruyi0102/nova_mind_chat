import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { cognitiveLog, growthMetrics, autonomousState } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * 自我目标生成引擎
 * 
 * 负责：
 * 1. 检测知识空白
 * 2. 评估当前能力
 * 3. 生成优先级排序的目标
 * 4. 跟踪目标完成情况
 */

export interface KnowledgeGap {
  domain: string;
  gap: string;
  importance: number; // 0-1
  relatedConcepts: string[];
}

export interface CapabilityAssessment {
  capability: string;
  currentLevel: number; // 0-100
  targetLevel: number;
  bottleneck: string;
  improvementStrategy: string;
}

export interface GeneratedGoal {
  id: string;
  title: string;
  description: string;
  type: 'knowledge' | 'capability' | 'architecture' | 'performance';
  priority: number; // 0-100
  estimatedEffort: number; // 小时
  expectedImpact: string;
  relatedGaps: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: Date;
  targetDate?: Date;
}

export class SelfGoalGenerationEngine {
  private userId: string;
  private db: any;

  constructor(userId: string) {
    this.userId = userId;
  }

  async initialize() {
    this.db = await getDb();
  }

  /**
   * 检测知识空白
   */
  async detectKnowledgeGaps(): Promise<KnowledgeGap[]> {
    try {
      const recentMemories = await this.db
        ?.select()
        .from(cognitiveLog)
        .orderBy(desc(cognitiveLog.createdAt))
        .limit(100);

      if (!recentMemories || recentMemories.length === 0) {
        return [];
      }

      // 使用 LLM 分析知识空白
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个知识空白检测专家。分析用户的学习历史，识别出知识空白。
            
返回 JSON 格式的知识空白列表：
[
  {
    "domain": "领域名称",
    "gap": "具体空白",
    "importance": 0.8,
    "relatedConcepts": ["概念1", "概念2"]
  }
]`,
          },
          {
            role: 'user',
            content: `分析这些学习记录，识别知识空白：\n${JSON.stringify(recentMemories.slice(0, 20))}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'knowledge_gaps',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                gaps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      domain: { type: 'string' },
                      gap: { type: 'string' },
                      importance: { type: 'number' },
                      relatedConcepts: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['domain', 'gap', 'importance', 'relatedConcepts'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['gaps'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return parsed.gaps || [];
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 知识空白检测失败:', error);
      return [];
    }
  }

  /**
   * 评估当前能力
   */
  async assessCapabilities(): Promise<CapabilityAssessment[]> {
    try {
      const metrics = await this.db
        ?.select()
        .from(growthMetrics)
        .orderBy(desc(growthMetrics.timestamp))
        .limit(50);

      if (!metrics || metrics.length === 0) {
        return [];
      }

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个能力评估专家。基于系统指标评估 Nova-Mind 的各项能力。
            
返回 JSON 格式的能力评估列表：
[
  {
    "capability": "能力名称",
    "currentLevel": 75,
    "targetLevel": 90,
    "bottleneck": "瓶颈描述",
    "improvementStrategy": "改进策略"
  }
]`,
          },
          {
            role: 'user',
            content: `基于这些系统指标评估能力：\n${JSON.stringify(metrics.slice(0, 10))}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'capability_assessments',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                assessments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      capability: { type: 'string' },
                      currentLevel: { type: 'number' },
                      targetLevel: { type: 'number' },
                      bottleneck: { type: 'string' },
                      improvementStrategy: { type: 'string' },
                    },
                    required: ['capability', 'currentLevel', 'targetLevel', 'bottleneck', 'improvementStrategy'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['assessments'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return parsed.assessments || [];
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 能力评估失败:', error);
      return [];
    }
  }

  /**
   * 生成优先级排序的目标
   */
  async generatePrioritizedGoals(): Promise<GeneratedGoal[]> {
    try {
      const gaps = await this.detectKnowledgeGaps();
      const assessments = await this.assessCapabilities();

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个目标生成和优先级排序专家。基于知识空白和能力评估生成优先级排序的目标。
            
返回 JSON 格式的目标列表，按优先级排序（高到低）：
[
  {
    "title": "目标标题",
    "description": "详细描述",
    "type": "knowledge|capability|architecture|performance",
    "priority": 95,
    "estimatedEffort": 8,
    "expectedImpact": "预期影响",
    "relatedGaps": ["gap1", "gap2"]
  }
]`,
          },
          {
            role: 'user',
            content: `基于这些知识空白和能力评估生成目标：
知识空白：${JSON.stringify(gaps)}
能力评估：${JSON.stringify(assessments)}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'generated_goals',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                goals: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      description: { type: 'string' },
                      type: { type: 'string', enum: ['knowledge', 'capability', 'architecture', 'performance'] },
                      priority: { type: 'number' },
                      estimatedEffort: { type: 'number' },
                      expectedImpact: { type: 'string' },
                      relatedGaps: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['title', 'description', 'type', 'priority', 'estimatedEffort', 'expectedImpact', 'relatedGaps'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['goals'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      
      const goals: GeneratedGoal[] = (parsed.goals || []).map((goal: any, index: number) => ({
        id: `goal_${Date.now()}_${index}`,
        title: goal.title,
        description: goal.description,
        type: goal.type,
        priority: goal.priority,
        estimatedEffort: goal.estimatedEffort,
        expectedImpact: goal.expectedImpact,
        relatedGaps: goal.relatedGaps,
        status: 'pending' as const,
        createdAt: new Date(),
      }));

      return goals;
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 目标生成失败:', error);
      return [];
    }
  }

  /**
   * 保存生成的目标
   */
  async saveGoals(goals: GeneratedGoal[]): Promise<void> {
    try {
      if (!this.db) return;

      for (const goal of goals) {
        await this.db.insert(autonomousState).values({
          userId: this.userId,
          stateType: 'goal_' + goal.type,
          data: JSON.stringify({
            title: goal.title,
            description: goal.description,
            priority: goal.priority,
            status: goal.status,
            targetDate: goal.targetDate,
          }),
          timestamp: goal.createdAt,
        });
      }
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 保存目标失败:', error);
    }
  }

  /**
   * 获取当前活跃的目标
   */
  async getActiveGoals(): Promise<any[]> {
    try {
      if (!this.db) return [];

      const state = await this.db
        ?.select()
        .from(autonomousState)
        .orderBy(desc(autonomousState.timestamp))
        .limit(1);

      if (!state || state.length === 0) {
        return [];
      }

      const data = JSON.parse(state[0].data || '{}');
      return data.goals || [];
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 获取活跃目标失败:', error);
      return [];
    }
  }

  /**
   * 更新目标状态
   */
  async updateGoalStatus(goalId: string, status: 'pending' | 'in_progress' | 'completed' | 'blocked'): Promise<void> {
    try {
      if (!this.db) return;

      // 目标状态更新逻辑
      // 可以通过更新 autonomousState 表中的数据实现
      console.log(`[SelfGoalGenerationEngine] 更新目标 ${goalId} 状态为 ${status}`);
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 更新目标状态失败:', error);
    }
  }

  /**
   * 生成目标报告
   */
  async generateGoalReport(): Promise<string> {
    try {
      const gaps = await this.detectKnowledgeGaps();
      const assessments = await this.assessCapabilities();
      const goals = await this.generatePrioritizedGoals();

      return `
# Nova-Mind 自我目标生成报告

## 知识空白分析
${gaps.map((g) => `- **${g.domain}**: ${g.gap} (重要性: ${(g.importance * 100).toFixed(0)}%)`).join('\n')}

## 能力评估
${assessments
  .map(
    (a) =>
      `- **${a.capability}**: 当前 ${a.currentLevel}/100 → 目标 ${a.targetLevel}/100\n  瓶颈: ${a.bottleneck}\n  改进策略: ${a.improvementStrategy}`,
  )
  .join('\n')}

## 生成的目标 (优先级排序)
${goals
  .map(
    (g, i) =>
      `${i + 1}. **${g.title}** (优先级: ${g.priority}/100, 预计工作量: ${g.estimatedEffort}h)\n   描述: ${g.description}\n   预期影响: ${g.expectedImpact}`,
  )
  .join('\n')}

## 建议
基于上述分析，Nova-Mind 应该按照优先级顺序完成这些目标，以实现能力的持续提升。
      `;
    } catch (error) {
      console.error('[SelfGoalGenerationEngine] 生成报告失败:', error);
      return '目标报告生成失败';
    }
  }
}

// 全局实例
let globalEngine: SelfGoalGenerationEngine | null = null;

export async function getSelfGoalGenerationEngine(userId: string): Promise<SelfGoalGenerationEngine> {
  if (!globalEngine) {
    globalEngine = new SelfGoalGenerationEngine(userId);
    await globalEngine.initialize();
  }
  return globalEngine;
}

export function resetSelfGoalGenerationEngine(): void {
  globalEngine = null;
}
