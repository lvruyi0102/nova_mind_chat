/**
 * 改进学习引擎集成
 * 将改进的学习引擎集成到后台学习流程中
 */

import { getDb } from '../db';
import { messages, privateThoughts } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { performIntegratedLearning } from './integratedLearningService';

/**
 * 执行改进的本地学习循环
 */
export async function executeImprovedLocalLearningCycle(
  userId: number,
  options: {
    sampleCount?: number;
    strategy?: 'random' | 'recent';
  } = {}
): Promise<{ success: boolean; thoughtCount: number; conceptCount: number } | null> {
  const {
    sampleCount = 5,
    strategy = 'random',
  } = options;

  try {
    const db = await getDb();
    if (!db) {
      console.warn('[ImprovedLearning] Database not available');
      return null;
    }

    // 1. 采样对话 - 使用分页避免一次性加载所有数据
    const BATCH_SIZE = 100;
    let selectedMessages = [];
    let offset = 0;
    let totalCount = 0;

    // 先获取总数
    const countQuery = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .limit(1);

    if (countQuery.length === 0) {
      console.log('[ImprovedLearning] No messages to learn from');
      return { success: true, thoughtCount: 0, conceptCount: 0 };
    }

    // 分批加载消息
    while (selectedMessages.length < sampleCount) {
      const batch = await db
        .select()
        .from(messages)
        .where(eq(messages.userId, userId))
        .limit(BATCH_SIZE)
        .offset(offset);

      if (batch.length === 0) break;

      if (strategy === 'recent') {
        // 对最新消息进行排序
        const sorted = batch
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, sampleCount - selectedMessages.length);
        selectedMessages.push(...sorted);
      } else {
        // 随机采样
        for (const msg of batch) {
          if (selectedMessages.length >= sampleCount) break;
          if (Math.random() < sampleCount / (totalCount + batch.length)) {
            selectedMessages.push(msg);
          }
        }
      }

      offset += BATCH_SIZE;
      totalCount += batch.length;

      // 如果已经获得足够的样本，停止
      if (selectedMessages.length >= sampleCount) break;
    }

    // 2. 转换为对话格式并清理内存
    const conversationMessages = selectedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 清理原始消息数组
    selectedMessages = [];

    // 3. 执行改进的学习
    const result = await performIntegratedLearning(
      userId,
      conversationMessages,
      `学习 - ${new Date().toLocaleDateString()}`
    );

    // 4. 保存学习思考到私密思考表
    try {
      await db.insert(privateThoughts).values({
        userId,
        content: `改进学习完成：提取了 ${result.concepts.length} 个概念，${result.keywords.length} 个关键词`,
        thoughtType: 'improved_learning',
        visibility: 'private',
        createdAt: new Date(),
      });
    } catch (insertError) {
      console.warn('[ImprovedLearning] Failed to save learning thought:', insertError);
    }

    // 5. 清理对话消息数组
    conversationMessages.length = 0;

    return {
      success: true,
      thoughtCount: 1,
      conceptCount: result.concepts.length,
    };
  } catch (error) {
    console.error('[ImprovedLearning] Error:', error);
    return null;
  }
}

/**
 * 在后台认知循环中使用改进学习
 */
export async function integrateImprovedLearningIntoBackgroundCognition(
  userId: number
): Promise<boolean> {
  try {
    const result = await executeImprovedLocalLearningCycle(userId, {
      sampleCount: 5,
      strategy: 'recent',
    });

    if (result && result.success) {
      console.log(
        `[BackgroundCognition] Improved learning completed: ${result.conceptCount} concepts extracted`
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('[BackgroundCognition] Error integrating improved learning:', error);
    return false;
  }
}
