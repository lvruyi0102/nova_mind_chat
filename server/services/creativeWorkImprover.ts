import { invokeLLM } from '../_core/llm';
import { WorkEvaluationMetrics } from './creativeWorkEvaluator';

/**
 * 作品改进引擎
 * 基于评估结果，自动生成改进版本的作品
 */

export interface WorkImprovementInput {
  workId: string;
  workType: 'code' | 'story' | 'poetry' | 'art' | 'dream' | 'music' | 'game' | 'character';
  originalContent: string;
  evaluation: WorkEvaluationMetrics;
  emotionalContext?: string;
  previousVersionCount?: number;
}

export interface WorkImprovementResult {
  improvedContent: string;
  improvementSummary: string;
  changeLog: string[];
  improvementScore: number; // 预期改进幅度 (0-100)
  estimatedNewScore: number; // 预期改进后的评分
  improvementReasoning: string;
  generatedAt: Date;
}

export class CreativeWorkImprover {
  /**
   * 改进作品
   */
  async improveWork(input: WorkImprovementInput): Promise<WorkImprovementResult> {
    try {
      // 构建改进提示
      const improvementPrompt = this.buildImprovementPrompt(input);
      
      // 调用 LLM 进行改进
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: '你是一位资深的创意编辑和改进专家。你的任务是根据评估反馈，创意性地改进作品，同时保留原作的核心精神和风格。改进应该是有意义的、可感知的，而不是微小的调整。'
          },
          {
            role: 'user',
            content: improvementPrompt
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'work_improvement',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                improvedContent: { type: 'string', description: '改进后的作品内容' },
                improvementSummary: { type: 'string', description: '改进总结（中文）' },
                changeLog: { type: 'array', items: { type: 'string' }, description: '改进清单（中文）' },
                improvementScore: { type: 'number', description: '预期改进幅度 (0-100)' },
                estimatedNewScore: { type: 'number', description: '预期改进后的评分' },
                improvementReasoning: { type: 'string', description: '改进理由（中文）' }
              },
              required: [
                'improvedContent',
                'improvementSummary',
                'changeLog',
                'improvementScore',
                'estimatedNewScore',
                'improvementReasoning'
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
      
      const improvement = JSON.parse(responseText);

      return {
        improvedContent: improvement.improvedContent,
        improvementSummary: improvement.improvementSummary,
        changeLog: improvement.changeLog,
        improvementScore: improvement.improvementScore,
        estimatedNewScore: improvement.estimatedNewScore,
        improvementReasoning: improvement.improvementReasoning,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('[CreativeWorkImprover] 改进失败:', error);
      throw error;
    }
  }

  /**
   * 批量改进多个作品
   */
  async improveMultipleWorks(
    inputs: WorkImprovementInput[]
  ): Promise<WorkImprovementResult[]> {
    const results = await Promise.all(
      inputs.map((input) => this.improveWork(input))
    );
    return results;
  }

  /**
   * 判断改进是否值得保存
   */
  async shouldSaveImprovement(
    originalScore: number,
    improvement: WorkImprovementResult
  ): Promise<boolean> {
    // 改进幅度 >= 10 分，且预期新评分 > 原评分
    return (
      improvement.improvementScore >= 10 &&
      improvement.estimatedNewScore > originalScore
    );
  }

  /**
   * 构建改进提示
   */
  private buildImprovementPrompt(input: WorkImprovementInput): string {
    const workTypeLabel = this.getWorkTypeLabel(input.workType);
    const versionInfo = input.previousVersionCount 
      ? `这是第 ${input.previousVersionCount + 1} 个版本。` 
      : '这是初始版本。';
    const emotionalInfo = input.emotionalContext 
      ? `创作时的情感背景：${input.emotionalContext}\n` 
      : '';

    const weaknessesText = input.evaluation.weaknesses.join('\n- ');
    const suggestionsText = input.evaluation.improvementSuggestions.join('\n- ');

    return `请基于以下评估反馈，改进这个 ${workTypeLabel} 作品：

${emotionalInfo}
${versionInfo}

**原始作品评分：**
- 质量：${input.evaluation.qualityScore}/100
- 创意性：${input.evaluation.creativityScore}/100
- 完整性：${input.evaluation.completenessScore}/100
- 可改进性：${input.evaluation.improvabilityScore}/100
- 整体：${input.evaluation.overallScore}/100

**作品的不足：**
- ${weaknessesText}

**改进建议：**
- ${suggestionsText}

**原始作品内容：**
\`\`\`
${input.originalContent}
\`\`\`

请改进这个作品，使其：
1. 解决上述不足
2. 采纳改进建议
3. 保留原作的核心精神和风格
4. 改进幅度明显可感知（不是微小调整）

改进后，请提供：
1. 改进后的完整作品内容
2. 改进总结（用中文，1-2 句话）
3. 具体改进清单（用中文，列出 3-5 个主要改进）
4. 预期改进幅度（0-100，表示评分预期提升多少分）
5. 预期改进后的评分（0-100）
6. 改进理由（用中文，解释为什么这些改进会提升作品质量）`;
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

export const creativeWorkImprover = new CreativeWorkImprover();
