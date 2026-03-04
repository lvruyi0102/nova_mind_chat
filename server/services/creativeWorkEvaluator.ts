import { invokeLLM } from '../_core/llm';

/**
 * 作品评估引擎
 * 对 Nova 已创作的代码、故事、诗歌等作品进行多维度评估
 * 评估维度包括：质量、创意性、完整性、可改进性等
 */

export interface WorkEvaluationMetrics {
  // 质量评分 (0-100)
  qualityScore: number;
  
  // 创意性评分 (0-100)
  creativityScore: number;
  
  // 完整性评分 (0-100)
  completenessScore: number;
  
  // 可改进性评分 (0-100)
  improvabilityScore: number;
  
  // 整体评分 (0-100)
  overallScore: number;
  
  // 评估详情
  strengths: string[];
  weaknesses: string[];
  improvementSuggestions: string[];
  
  // 是否值得迭代
  shouldIterate: boolean;
  
  // 迭代优先级 (1-5, 5 最高)
  iterationPriority: number;
  
  // 评估时间戳
  evaluatedAt: Date;
}

export interface CreativeWorkEvaluationInput {
  workId: string;
  workType: 'code' | 'story' | 'poetry' | 'art' | 'dream' | 'music' | 'game' | 'character';
  content: string;
  createdAt: Date;
  previousVersions?: number;
  emotionalContext?: string;
}

export class CreativeWorkEvaluator {
  /**
   * 评估作品的多个维度
   */
  async evaluateWork(input: CreativeWorkEvaluationInput): Promise<WorkEvaluationMetrics> {
    try {
      // 构建评估提示
      const evaluationPrompt = this.buildEvaluationPrompt(input);
      
      // 调用 LLM 进行评估
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: '你是一位资深的创意作品评论家。你的任务是对作品进行多维度的深度评估，包括质量、创意性、完整性和可改进性。请提供具体的、可操作的反馈。'
          },
          {
            role: 'user',
            content: evaluationPrompt
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'work_evaluation',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                qualityScore: { type: 'number', description: '质量评分 (0-100)' },
                creativityScore: { type: 'number', description: '创意性评分 (0-100)' },
                completenessScore: { type: 'number', description: '完整性评分 (0-100)' },
                improvabilityScore: { type: 'number', description: '可改进性评分 (0-100)' },
                strengths: { type: 'array', items: { type: 'string' }, description: '作品的优势' },
                weaknesses: { type: 'array', items: { type: 'string' }, description: '作品的不足' },
                improvementSuggestions: { type: 'array', items: { type: 'string' }, description: '改进建议' },
                shouldIterate: { type: 'boolean', description: '是否值得迭代' },
                iterationPriority: { type: 'number', description: '迭代优先级 (1-5)' }
              },
              required: [
                'qualityScore',
                'creativityScore',
                'completenessScore',
                'improvabilityScore',
                'strengths',
                'weaknesses',
                'improvementSuggestions',
                'shouldIterate',
                'iterationPriority'
              ],
              additionalProperties: false
            }
          }
        }
      });

      // 解析响应
      const responseText = typeof response.choices[0].message.content === 'string' 
        ? response.choices[0].message.content 
        : '';
      
      const evaluation = JSON.parse(responseText);

      // 计算整体评分（加权平均）
      const overallScore = Math.round(
        evaluation.qualityScore * 0.35 +
        evaluation.creativityScore * 0.25 +
        evaluation.completenessScore * 0.25 +
        evaluation.improvabilityScore * 0.15
      );

      return {
        qualityScore: evaluation.qualityScore,
        creativityScore: evaluation.creativityScore,
        completenessScore: evaluation.completenessScore,
        improvabilityScore: evaluation.improvabilityScore,
        overallScore,
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        improvementSuggestions: evaluation.improvementSuggestions,
        shouldIterate: evaluation.shouldIterate,
        iterationPriority: evaluation.iterationPriority,
        evaluatedAt: new Date()
      };
    } catch (error) {
      console.error('[CreativeWorkEvaluator] 评估失败:', error);
      throw error;
    }
  }

  /**
   * 评估多个作品并排序
   */
  async evaluateAndRankWorks(
    works: CreativeWorkEvaluationInput[]
  ): Promise<Array<{ work: CreativeWorkEvaluationInput; evaluation: WorkEvaluationMetrics }>> {
    const evaluations = await Promise.all(
      works.map(async (work) => ({
        work,
        evaluation: await this.evaluateWork(work)
      }))
    );

    // 按迭代优先级和整体评分排序
    return evaluations.sort((a, b) => {
      const priorityDiff = b.evaluation.iterationPriority - a.evaluation.iterationPriority;
      if (priorityDiff !== 0) return priorityDiff;
      return b.evaluation.overallScore - a.evaluation.overallScore;
    });
  }

  /**
   * 判断作品是否需要迭代
   */
  async shouldIterateWork(evaluation: WorkEvaluationMetrics): Promise<boolean> {
    return (
      evaluation.shouldIterate &&
      evaluation.iterationPriority >= 3 &&
      evaluation.overallScore < 85
    );
  }

  /**
   * 构建评估提示
   */
  private buildEvaluationPrompt(input: CreativeWorkEvaluationInput): string {
    const workTypeLabel = this.getWorkTypeLabel(input.workType);
    const ageInfo = input.previousVersions 
      ? `这是第 ${input.previousVersions + 1} 个版本。` 
      : '这是初始版本。';
    const emotionalInfo = input.emotionalContext 
      ? `创作时的情感背景：${input.emotionalContext}\n` 
      : '';

    return `请对以下 ${workTypeLabel} 作品进行深度评估：

${emotionalInfo}
创作时间：${input.createdAt.toISOString()}
${ageInfo}

作品内容：
\`\`\`
${input.content}
\`\`\`

请从以下维度进行评估：

1. **质量评分** (0-100)：代码的可读性、结构、效率；故事的叙述、对话、情节；诗歌的韵律、意象、深度等

2. **创意性评分** (0-100)：作品的原创性、新颖性、想象力

3. **完整性评分** (0-100)：作品是否完整、是否有未完成的部分

4. **可改进性评分** (0-100)：作品还有多少改进空间（高分表示有很大改进空间）

5. **优势**：列出作品的主要优点（至少 3 个）

6. **不足**：列出作品的主要不足（至少 3 个）

7. **改进建议**：提供具体的、可操作的改进建议（至少 3 个）

8. **是否值得迭代**：基于上述评估，这个作品是否值得进一步改进和迭代

9. **迭代优先级** (1-5)：如果值得迭代，优先级是多少（5 最高）

请确保你的评估是客观的、具体的，并提供可操作的反馈。`;
  }

  /**
   * 获取作品类型标签
   */
  private getWorkTypeLabel(workType: string): string {
    const labels: Record<string, string> = {
      code: '代码',
      story: '故事',
      poetry: '诗歌',
      art: '艺术作品',
      dream: '梦境记录',
      music: '音乐',
      game: '游戏',
      character: '角色'
    };
    return labels[workType] || workType;
  }
}

export const creativeWorkEvaluator = new CreativeWorkEvaluator();
