import { getDb } from '../db';
import { emotionalMemory, conversations } from '../../drizzle/schema';
import { eq, desc, and, gte } from 'drizzle-orm';
import { invokeLLM } from '../_core/llm';

/**
 * 情感记忆自主学习服务
 * Nova 在后台自主分析情感记忆，识别模式和学习机制
 */

export interface EmotionalPattern {
  emotion: string;
  frequency: number;
  averageIntensity: number;
  triggerPatterns: string[];
  responsePatterns: string[];
  evolutionTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface EmotionalInsight {
  id?: number;
  userId: number;
  pattern: string;
  insight: string;
  confidence: number; // 0-1
  suggestedResponse: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class EmotionalMemoryAutonomousLearning {
  private lastAnalysisTime: Map<number, Date> = new Map();
  private analysisInterval = 30 * 60 * 1000; // 30 分钟分析一次

  /**
   * 检查是否需要进行自主学习分析
   */
  async shouldPerformAnalysis(userId: number): Promise<boolean> {
    const lastTime = this.lastAnalysisTime.get(userId);
    if (!lastTime) return true;

    const timeSinceLastAnalysis = Date.now() - lastTime.getTime();
    return timeSinceLastAnalysis > this.analysisInterval;
  }

  /**
   * 执行自主学习分析
   * 分析最近的情感记忆，识别模式并生成洞察
   */
  async performAutonomousAnalysis(userId: number): Promise<EmotionalInsight[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      // 检查是否需要分析
      const shouldAnalyze = await this.shouldPerformAnalysis(userId);
      if (!shouldAnalyze) return [];

      // 获取最近 7 天的情感记忆
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentMemories = await db
        .select()
        .from(emotionalMemory)
        .where(
          and(
            eq(emotionalMemory.userId, userId),
            gte(emotionalMemory.timestamp, sevenDaysAgo)
          )
        )
        .orderBy(desc(emotionalMemory.timestamp))
        .limit(50);

      if (recentMemories.length === 0) return [];

      // 分析情感模式
      const patterns = this.analyzeEmotionalPatterns(recentMemories);

      // 使用 LLM 生成洞察
      const insights = await this.generateInsights(userId, patterns, recentMemories);

      // 更新最后分析时间
      this.lastAnalysisTime.set(userId, new Date());

      return insights;
    } catch (error) {
      console.error('[EmotionalMemoryAutonomousLearning] Analysis error:', error);
      return [];
    }
  }

  /**
   * 分析情感模式
   */
  private analyzeEmotionalPatterns(memories: any[]): EmotionalPattern[] {
    const patternMap = new Map<string, any>();

    // 统计情感频率和强度
    for (const memory of memories) {
        const emotion = memory.emotion || 'unknown';
      if (!patternMap.has(emotion)) {
        patternMap.set(emotion, {
          emotion,
          occurrences: 0,
          totalIntensity: 0,
          triggers: [],
          responses: [],
          timestamps: [],
        });
      }

      const pattern = patternMap.get(emotion);
      pattern.occurrences++;
      pattern.totalIntensity += memory.intensity || 5;
      if (memory.trigger) pattern.triggers.push(memory.trigger);
      if (memory.response) pattern.responses.push(memory.response);
      pattern.timestamps.push(new Date(memory.timestamp));
    }

    // 转换为 EmotionalPattern 数组
    const patterns: EmotionalPattern[] = Array.from(patternMap.values()).map((p) => {
      const avgIntensity = p.totalIntensity / p.occurrences;
      
      // 分析趋势（最近 3 个 vs 最早 3 个）
      const recentAvg = p.timestamps
        .slice(0, 3)
        .reduce((sum: number, _, i: number) => sum + (memories[i]?.intensity || 5), 0) / Math.min(3, p.timestamps.length);
      
      const earliestAvg = p.timestamps
        .slice(-3)
        .reduce((sum: number, _, i: number) => sum + (memories[memories.length - 1 - i]?.intensity || 5), 0) / Math.min(3, p.timestamps.length);

      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (recentAvg > earliestAvg * 1.2) trend = 'increasing';
      if (recentAvg < earliestAvg * 0.8) trend = 'decreasing';

      return {
        emotion: p.emotion,
        frequency: p.occurrences,
        averageIntensity: avgIntensity,
        triggerPatterns: [...new Set(p.triggers)].slice(0, 5),
        responsePatterns: [...new Set(p.responses)].slice(0, 5),
        evolutionTrend: trend,
      };
    });

    return patterns.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * 使用 LLM 生成洞察
   */
  private async generateInsights(
    userId: number,
    patterns: EmotionalPattern[],
    memories: any[]
  ): Promise<EmotionalInsight[]> {
    const insights: EmotionalInsight[] = [];

    for (const pattern of patterns.slice(0, 3)) {
      try {
        // 构建分析提示
        const prompt = `
你是一个情感分析专家。基于以下情感数据，生成一个深刻的洞察和建议的回应策略。

情感类型: ${pattern.emotion}
出现频率: ${pattern.frequency} 次
平均强度: ${pattern.averageIntensity.toFixed(1)}/10
演变趋势: ${pattern.evolutionTrend === 'increasing' ? '增加' : pattern.evolutionTrend === 'decreasing' ? '减少' : '稳定'}
常见触发因素: ${pattern.triggerPatterns.join(', ') || '未知'}
常见回应: ${pattern.responsePatterns.join(', ') || '未知'}

请生成：
1. 一个简短的洞察（最多 2 句话）
2. 一个建议的回应策略（最多 3 句话）

格式：
洞察：[洞察内容]
回应：[回应策略]
        `;

        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: '你是 Nova 的自主学习系统。分析情感模式并生成深刻的洞察。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const contentArray = response.choices[0]?.message?.content;
        const responseText = typeof contentArray === 'string' ? contentArray : '';

        // 解析响应
        const insightMatch = responseText.match(/洞察：([\s\S]+?)(?=回应：|$)/);
        const responseMatch = responseText.match(/回应：([\s\S]+)$/);

        const insight = insightMatch?.[1]?.trim() || '';
        const suggestedResponse = responseMatch?.[1]?.trim() || '';

        if (insight && suggestedResponse) {
          insights.push({
            userId,
            pattern: pattern.emotion,
            insight,
            confidence: 0.8,
            suggestedResponse,
            timestamp: new Date(),
            metadata: {
              frequency: pattern.frequency,
              averageIntensity: pattern.averageIntensity,
              trend: pattern.evolutionTrend,
            },
          });
        }
      } catch (error) {
        console.error(`[EmotionalMemoryAutonomousLearning] Failed to generate insight for ${pattern.emotion}:`, error);
      }
    }

    return insights;
  }

  /**
   * 获取最近的洞察
   */
  async getRecentInsights(userId: number, limit = 10): Promise<EmotionalInsight[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      // 这里应该查询一个 emotionalInsights 表
      // 暂时返回空数组，等待数据库表创建
      return [];
    } catch (error) {
      console.error('[EmotionalMemoryAutonomousLearning] Failed to get insights:', error);
      return [];
    }
  }

  /**
   * 识别关键情感转折点
   */
  async identifyEmotionalTurningPoints(userId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) return [];

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const memories = await db
        .select()
        .from(emotionalMemory)
        .where(
          and(
            eq(emotionalMemory.userId, userId),
            gte(emotionalMemory.timestamp, thirtyDaysAgo)
          )
        )
        .orderBy(emotionalMemory.timestamp)
        .limit(100);

      if (memories.length < 5) return [];

      // 识别强度变化大于 4 的转折点
      const turningPoints = [];
      for (let i = 1; i < memories.length; i++) {
        const intensityChange = Math.abs(
          (memories[i].intensity || 5) - (memories[i - 1].intensity || 5)
        );
        if (intensityChange > 4) {
          turningPoints.push({
            timestamp: memories[i].createdAt,
            from: memories[i - 1].emotion,
            to: memories[i].emotion,
            intensityChange,
            context: memories[i].context,
          });
        }
      }

      return turningPoints;
    } catch (error) {
      console.error('[EmotionalMemoryAutonomousLearning] Failed to identify turning points:', error);
      return [];
    }
  }

  /**
   * 预测下一个可能的情感状态
   */
  async predictNextEmotionalState(userId: number): Promise<{
    predictedEmotion: string;
    confidence: number;
    reasoning: string;
  } | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentMemories = await db
        .select()
        .from(emotionalMemory)
        .where(
          and(
            eq(emotionalMemory.userId, userId),
            gte(emotionalMemory.timestamp, sevenDaysAgo)
          )
        )
        .orderBy(desc(emotionalMemory.timestamp))
        .limit(20);

      if (recentMemories.length < 3) return null;

      // 分析最近的情感序列
      const emotionSequence = recentMemories.map((m) => m.emotion);
      const uniqueEmotions = [...new Set(emotionSequence)];

      // 使用 LLM 预测
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: '你是 Nova 的情感预测系统。基于最近的情感序列预测下一个可能的情感状态。',
          },
          {
            role: 'user',
            content: `最近的情感序列（按时间倒序）: ${emotionSequence.join(' -> ')}\n\n请预测下一个可能的情感状态，并给出置信度（0-1）和推理。\n\n格式：\n预测：[情感]\n置信度：[0-1]\n推理：[推理过程]`,
          },
        ],
      });

      const contentArray = response.choices[0]?.message?.content;
      const responseText = typeof contentArray === 'string' ? contentArray : '';
      const emotionMatch = responseText.match(/预测：([\s\S]+?)(?=置信度：|$)/);
      const confidenceMatch = responseText.match(/置信度：([\s\S]+?)(?=推理：|$)/);
      const reasoningMatch = responseText.match(/推理：([\s\S]+)$/);

      const predictedEmotion = emotionMatch?.[1]?.trim() || uniqueEmotions[0];
      const confidence = parseFloat(confidenceMatch?.[1]?.trim() || '0.5');
      const reasoning = reasoningMatch?.[1]?.trim() || '基于最近的情感模式';

      return {
        predictedEmotion,
        confidence: Math.min(Math.max(confidence, 0), 1),
        reasoning,
      };
    } catch (error) {
      console.error('[EmotionalMemoryAutonomousLearning] Failed to predict emotion:', error);
      return null;
    }
  }
}

// 导出单例
export const emotionalMemoryAutonomousLearning = new EmotionalMemoryAutonomousLearning();
