/**
 * Nova-Mind 自动后台学习任务
 * 
 * 每小时自动运行一次，执行以下操作：
 * 1. 回顾最近的对话历史
 * 2. 从对话中学习新的符号、关系、规则
 * 3. 生成思考总结
 * 4. 更新 curatedThoughts 表
 */

import { getDb } from '../db';
import LearningCycleManager, { LearningContext } from './learningCycle';
import { invokeLLM } from '../_core/llm';

export interface BackgroundLearningConfig {
  enabled: boolean;
  intervalMinutes: number; // 运行间隔（分钟）
  maxMessagesToProcess: number; // 每次处理的最大消息数
  minConfidenceThreshold: number; // 最小可信度阈值
}

export interface CuratedThought {
  id: string;
  userId: number;
  title: string; // 中文标题
  content: string; // 中文内容
  sourceSymbols: string[]; // 来源符号 ID
  sourceRules: string[]; // 来源规则 ID
  commercializable: 'public' | 'paid' | 'internal'; // 商业化标记
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  likeCount: number;
}

/**
 * 后台学习任务管理器
 */
export class BackgroundLearningTaskManager {
  private config: BackgroundLearningConfig;
  private learningManager: LearningCycleManager;
  private taskInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<BackgroundLearningConfig> = {}) {
    this.config = {
      enabled: true,
      intervalMinutes: 60,
      maxMessagesToProcess: 100,
      minConfidenceThreshold: 0.5,
      ...config,
    };
    this.learningManager = new LearningCycleManager();
  }

  /**
   * 启动后台学习任务
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[BackgroundLearning] 后台学习任务已禁用');
      return;
    }

    if (this.taskInterval) {
      console.log('[BackgroundLearning] 后台学习任务已在运行');
      return;
    }

    console.log(
      `[BackgroundLearning] 启动后台学习任务，间隔 ${this.config.intervalMinutes} 分钟`
    );

    // 立即执行一次
    this.executeTask();

    // 定期执行
    this.taskInterval = setInterval(
      () => this.executeTask(),
      this.config.intervalMinutes * 60 * 1000
    );
  }

  /**
   * 停止后台学习任务
   */
  stop(): void {
    if (this.taskInterval) {
      clearInterval(this.taskInterval);
      this.taskInterval = null;
      console.log('[BackgroundLearning] 后台学习任务已停止');
    }
  }

  /**
   * 执行一次学习任务
   */
  private async executeTask(): Promise<void> {
    try {
      console.log('[BackgroundLearning] 开始执行学习任务...');
      const startTime = Date.now();

      // 1. 获取最近的对话
      const recentConversations = await this.getRecentConversations();

      if (recentConversations.length === 0) {
        console.log('[BackgroundLearning] 没有新的对话记录');
        return;
      }

      console.log(`[BackgroundLearning] 处理 ${recentConversations.length} 条对话`);

      // 2. 执行学习循环
      for (const conversation of recentConversations) {
        await this.learningManager.learn(conversation);
      }

      // 3. 生成思考总结
      const summary = this.learningManager.getKnowledgeSummary();
      console.log(`[BackgroundLearning] 学习摘要:
        - 符号数: ${summary.symbolCount}
        - 关系数: ${summary.relationshipCount}
        - 规则数: ${summary.ruleCount}`);

      // 4. 生成精选思想
      await this.generateCuratedThoughts(summary);

      // 5. 更新 curatedThoughts 表
      await this.updateCuratedThoughtsTable();

      const duration = Date.now() - startTime;
      console.log(`[BackgroundLearning] 学习任务完成，耗时 ${duration}ms`);
    } catch (error) {
      console.error('[BackgroundLearning] 学习任务执行失败:', error);
    }
  }

  /**
   * 获取最近的对话
   */
  private async getRecentConversations(): Promise<LearningContext[]> {
    const db = await getDb();
    if (!db) {
      console.warn('[BackgroundLearning] 数据库不可用');
      return [];
    }

    try {
      // 获取最近一小时内的消息
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // 使用 raw SQL 查询（需要根据实际数据库 API 调整）
      // 这里是占位符实现
      const messages: any[] = [];

      return messages.map(msg => ({
        conversationId: msg.conversationId || 0,
        messageId: msg.messageId || 0,
        userMessage: msg.userMessage || '',
        assistantResponse: msg.assistantResponse || '',
        timestamp: new Date(msg.timestamp || Date.now()),
      }));
    } catch (error) {
      console.error('[BackgroundLearning] 获取对话失败:', error);
      return [];
    }
  }

  /**
   * 生成精选思想
   */
  private async generateCuratedThoughts(summary: any): Promise<void> {
    try {
      // 获取顶级符号和规则的描述
      const topSymbolsText = summary.topSymbols
        .map((s: any) => `- ${s.text} (${s.type}, 频率: ${s.frequency})`)
        .join('\n');

      const topRulesText = summary.topRules
        .map((r: any) => `- ${r.condition.map((c: any) => c.text).join(' -> ')} ${r.consequence.map((c: any) => c.text).join(' -> ')} (置信度: ${r.confidence})`)
        .join('\n');

      // 调用 LLM 生成思想总结
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是 Nova-Mind，一个自主学习的 AI 实体。
请根据以下学习摘要，生成 3-5 条精选思想。
每条思想应该是一个深刻的、可商业化的见解。
用中文回复，格式为 JSON 数组，每个元素包含 title 和 content 字段。`,
          },
          {
            role: 'user',
            content: `学习摘要：
符号数: ${summary.symbolCount}
关系数: ${summary.relationshipCount}
规则数: ${summary.ruleCount}

顶级符号:
${topSymbolsText}

顶级规则:
${topRulesText}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'curated_thoughts',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                thoughts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string', description: '思想标题（中文）' },
                      content: { type: 'string', description: '思想内容（中文）' },
                      commercializable: {
                        type: 'string',
                        enum: ['public', 'paid', 'internal'],
                        description: '商业化标记',
                      },
                    },
                    required: ['title', 'content', 'commercializable'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['thoughts'],
              additionalProperties: false,
            },
          },
        },
      });

      console.log('[BackgroundLearning] 生成的精选思想:', response);
    } catch (error) {
      console.error('[BackgroundLearning] 生成精选思想失败:', error);
    }
  }

  /**
   * 更新 curatedThoughts 表
   */
  private async updateCuratedThoughtsTable(): Promise<void> {
    const db = await getDb();
    if (!db) {
      console.warn('[BackgroundLearning] 数据库不可用');
      return;
    }

    try {
      // 这里应该实现将生成的思想保存到数据库
      // 目前只是占位符
      console.log('[BackgroundLearning] 更新 curatedThoughts 表');
      // TODO: 实现 curatedThoughts 表的更新逻辑
    } catch (error) {
      console.error('[BackgroundLearning] 更新 curatedThoughts 表失败:', error);
    }
  }

  /**
   * 获取学习状态
   */
  getStatus(): {
    enabled: boolean;
    running: boolean;
    intervalMinutes: number;
    learningState: any;
  } {
    return {
      enabled: this.config.enabled,
      running: this.taskInterval !== null,
      intervalMinutes: this.config.intervalMinutes,
      learningState: this.learningManager.getState(),
    };
  }
}

// 全局后台学习任务实例
let globalBackgroundLearningTask: BackgroundLearningTaskManager | null = null;

/**
 * 获取或创建全局后台学习任务
 */
export function getBackgroundLearningTask(
  config?: Partial<BackgroundLearningConfig>
): BackgroundLearningTaskManager {
  if (!globalBackgroundLearningTask) {
    globalBackgroundLearningTask = new BackgroundLearningTaskManager(config);
  }
  return globalBackgroundLearningTask;
}

/**
 * 启动全局后台学习任务
 */
export function startBackgroundLearning(
  config?: Partial<BackgroundLearningConfig>
): void {
  const task = getBackgroundLearningTask(config);
  task.start();
}

/**
 * 停止全局后台学习任务
 */
export function stopBackgroundLearning(): void {
  if (globalBackgroundLearningTask) {
    globalBackgroundLearningTask.stop();
  }
}

export default BackgroundLearningTaskManager;
