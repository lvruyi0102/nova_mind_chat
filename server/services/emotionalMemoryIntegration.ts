/**
 * Emotional Memory Integration Service
 * 
 * Automatically captures and stores emotional memories during message processing
 * Enables Nova to build emotional understanding of users over time
 * 
 * Features:
 * - Automatic emotion detection from user messages
 * - Context extraction and storage
 * - Intensity calculation based on message content
 * - Integration with conversation flow
 * - Emotional pattern tracking
 */

import { getEmotionalMemoryService } from './emotionalMemoryService';
import { invokeLLM } from '../_core/llm';
import { getDb } from '../db';
import { messages, conversations } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

interface EmotionAnalysisResult {
  emotion: string;
  intensity: number;
  context: string;
  reasoning: string;
}

/**
 * Emotional Memory Integration Service
 */
export class EmotionalMemoryIntegration {
  private emotionalMemoryService = getEmotionalMemoryService();
  private analysisCache: Map<string, EmotionAnalysisResult> = new Map();
  private maxCacheSize = 100;

  /**
   * Process message and store emotional memory
   * Called after each user message is received
   */
  async processMessageForEmotionalMemory(
    userId: number,
    conversationId: number,
    userMessage: string,
    novaResponse: string
  ): Promise<void> {
    try {
      // Analyze emotion from user message
      const analysis = await this.analyzeEmotion(userMessage);

      if (!analysis) {
        console.log('[EmotionalMemoryIntegration] No significant emotion detected');
        return;
      }

      // Build comprehensive context
      const context = await this.buildContext(
        userId,
        conversationId,
        userMessage,
        novaResponse,
        analysis
      );

      // Store emotional memory
      const memory = await this.emotionalMemoryService.storeMemory(userId, {
        emotion: analysis.emotion,
        context,
        intensity: analysis.intensity,
      });

      if (memory) {
        console.log(
          `[EmotionalMemoryIntegration] Stored emotional memory: ${analysis.emotion} (intensity: ${analysis.intensity})`
        );
      }
    } catch (error) {
      console.error('[EmotionalMemoryIntegration] Failed to process emotional memory:', error);
    }
  }

  /**
   * Analyze emotion from user message using LLM
   */
  private async analyzeEmotion(userMessage: string): Promise<EmotionAnalysisResult | null> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(userMessage);
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey) || null;
      }

      // Call LLM for emotion analysis
      const systemPrompt = `You are an emotion analysis expert. Analyze the user's message and extract:
1. Primary emotion (joy, sadness, anger, fear, surprise, disgust, trust, anticipation, neutral)
2. Intensity (1-10, where 1 is very subtle and 10 is extremely intense)
3. Brief context (what triggered this emotion)
4. Reasoning (why you think this emotion is present)

Respond in JSON format: {"emotion": "...", "intensity": number, "context": "...", "reasoning": "..."}
Only respond with JSON, no other text.`;

      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `You are an emotion analysis expert. Analyze the user's message and extract:
1. Primary emotion (joy, sadness, anger, fear, surprise, disgust, trust, anticipation, neutral)
2. Intensity (1-10, where 1 is very subtle and 10 is extremely intense)
3. Brief context (what triggered this emotion)
4. Reasoning (why you think this emotion is present)

Respond in JSON format: {"emotion": "...", "intensity": number, "context": "...", "reasoning": "..."}
Only respond with JSON, no other text.`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'emotion_analysis',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                emotion: {
                  type: 'string',
                  description: 'Primary emotion detected',
                },
                intensity: {
                  type: 'integer',
                  description: 'Intensity level 1-10',
                },
                context: {
                  type: 'string',
                  description: 'What triggered this emotion',
                },
                reasoning: {
                  type: 'string',
                  description: 'Why this emotion was detected',
                },
              },
              required: ['emotion', 'intensity', 'context', 'reasoning'],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        return null;
      }

      // Parse JSON response
      const analysis = JSON.parse(content) as EmotionAnalysisResult;

      // Validate intensity
      if (analysis.intensity < 1 || analysis.intensity > 10) {
        analysis.intensity = Math.max(1, Math.min(10, analysis.intensity));
      }

      // Cache result
      this.cacheAnalysis(cacheKey, analysis);

      return analysis;
    } catch (error) {
      console.error('[EmotionalMemoryIntegration] Emotion analysis failed:', error);
      return null;
    }
  }

  /**
   * Build comprehensive context for emotional memory
   */
  private async buildContext(
    userId: number,
    conversationId: number,
    userMessage: string,
    novaResponse: string,
    analysis: EmotionAnalysisResult
  ): Promise<string> {
    try {
      const db = await getDb();
      if (!db) {
        return `User said: "${userMessage}". Nova responded: "${novaResponse}". Emotion context: ${analysis.context}`;
      }

      // Get conversation info
      const conv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      const conversationTitle = conv[0]?.title || 'Unknown Conversation';

      // Get recent message history for context
      const recentMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(5);

      const messageHistory = recentMessages
        .reverse()
        .map(m => `${m.role}: ${m.content.substring(0, 100)}...`)
        .join('\n');

      // Build rich context
      const context = `
Conversation: ${conversationTitle}
User Message: "${userMessage}"
Nova's Response: "${novaResponse}"

Emotion Analysis:
- Emotion: ${analysis.emotion}
- Intensity: ${analysis.intensity}/10
- Trigger: ${analysis.context}
- Reasoning: ${analysis.reasoning}

Recent Conversation Context:
${messageHistory}
      `.trim();

      return context;
    } catch (error) {
      console.error('[EmotionalMemoryIntegration] Failed to build context:', error);
      return `User said: "${userMessage}". Nova responded: "${novaResponse}". Emotion context: ${analysis.context}`;
    }
  }

  /**
   * Get cache key for message
   */
  private getCacheKey(message: string): string {
    // Use first 50 chars as cache key
    return message.substring(0, 50);
  }

  /**
   * Cache analysis result
   */
  private cacheAnalysis(key: string, analysis: EmotionAnalysisResult): void {
    this.analysisCache.set(key, analysis);

    // Limit cache size
    if (this.analysisCache.size > this.maxCacheSize) {
      const firstKey = this.analysisCache.keys().next().value;
      if (firstKey) {
        this.analysisCache.delete(firstKey);
      }
    }
  }

  /**
   * Get emotional summary for user
   */
  async getEmotionalSummary(userId: number): Promise<string> {
    try {
      return await this.emotionalMemoryService.generateEmotionalSummary(userId);
    } catch (error) {
      console.error('[EmotionalMemoryIntegration] Failed to get emotional summary:', error);
      return 'Unable to generate emotional summary.';
    }
  }

  /**
   * Get emotional patterns for user
   */
  async getEmotionalPatterns(userId: number): Promise<Record<string, number>> {
    try {
      return await this.emotionalMemoryService.getEmotionalPatterns(userId);
    } catch (error) {
      console.error('[EmotionalMemoryIntegration] Failed to get emotional patterns:', error);
      return {};
    }
  }

  /**
   * Get significant emotional memories
   */
  async getSignificantMemories(userId: number, limit: number = 10) {
    try {
      return await this.emotionalMemoryService.getSignificantMemories(userId, limit);
    } catch (error) {
      console.error('[EmotionalMemoryIntegration] Failed to get significant memories:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.analysisCache.clear();
    console.log('[EmotionalMemoryIntegration] Cache cleared');
  }
}

// Singleton instance
let instance: EmotionalMemoryIntegration | null = null;

export function getEmotionalMemoryIntegration(): EmotionalMemoryIntegration {
  if (!instance) {
    instance = new EmotionalMemoryIntegration();
  }
  return instance;
}
