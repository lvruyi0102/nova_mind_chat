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

    // 1. 采样对话
    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId));

    if (allMessages.length === 0) {
      console.log('[ImprovedLearning] No messages to learn from');
      return { success: true, thoughtCount: 0, conceptCount: 0 };
    }

    let selectedMessages = allMessages;
    if (strategy === 'recent') {
      selectedMessages = allMessages
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, sampleCount);
    } else {
      // 随机采样
      selectedMessages = [];
      const indices = new Set<number>();
      while (selectedMessages.length < Math.min(sampleCount, allMessages.length)) {
        const idx = Math.floor(Math.random() * allMessages.length);
        if (!indices.has(idx)) {
          indices.add(idx);
          selectedMessages.push(allMessages[idx]);
        }
      }
    }

    // 2. 转换为对话格式
    const conversationMessages = selectedMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // 3. 执行改进的学习
    const result = await performIntegratedLearning(
      userId,
      conversationMessages,
      `学习 - ${new Date().toLocaleDateString()}`
    );

    // 4. 保存学习思考到私密思考表
    await db.insert(privateThoughts).values({
      userId,
      content: `改进学习完成：提取了 ${result.concepts.length} 个概念，${result.keywords.length} 个关键词`,
      thoughtType: 'improved_learning',
      visibility: 'private',
      createdAt: new Date(),
    });

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
