/**
 * 元认知监控与后台认知循环的集成
 * 
 * 这个模块提供了将元认知监控系统集成到后台认知循环的工具函数
 */

import { getMetacognitiveMonitor, MetacognitiveMonitor } from './metacognitiveMonitor';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';

let globalMetacognitiveMonitor: MetacognitiveMonitor | null = null;

/**
 * 初始化元认知监控系统
 */
export async function initializeMetacognitiveMonitoring(userId?: string): Promise<MetacognitiveMonitor | null> {
  try {
    let targetUserId = userId;

    // 如果没有指定用户ID，从数据库获取所有者
    if (!targetUserId) {
      const db = await getDb();
      if (db) {
        const owner = await db.select().from(users).limit(1);
        if (owner && owner.length > 0) {
          targetUserId = owner[0].id.toString();
        }
      }
    }

    if (!targetUserId) {
      console.warn('[MetacognitiveIntegration] 无法获取用户ID，跳过元认知监控初始化');
      return null;
    }

    // 创建和启动监控
    globalMetacognitiveMonitor = await getMetacognitiveMonitor({
      userId: targetUserId,
      assessmentInterval: 5 * 60 * 1000, // 5 分钟
      diagnosticsInterval: 10 * 60 * 1000, // 10 分钟
      decisionInterval: 15 * 60 * 1000, // 15 分钟
      autoTriggerEvolution: true,
      enableNotifications: true,
    });

    await globalMetacognitiveMonitor.start();
    console.log('[MetacognitiveIntegration] 元认知监控已初始化并启动');

    return globalMetacognitiveMonitor;
  } catch (error) {
    console.error('[MetacognitiveIntegration] 初始化元认知监控失败:', error);
    return null;
  }
}

/**
 * 停止元认知监控系统
 */
export function stopMetacognitiveMonitoring(): void {
  if (globalMetacognitiveMonitor) {
    globalMetacognitiveMonitor.stop();
    globalMetacognitiveMonitor = null;
    console.log('[MetacognitiveIntegration] 元认知监控已停止');
  }
}

/**
 * 获取当前的元认知监控系统
 */
export function getGlobalMetacognitiveMonitor(): MetacognitiveMonitor | null {
  return globalMetacognitiveMonitor;
}

/**
 * 获取监控状态
 */
export function getMonitoringStatus() {
  if (!globalMetacognitiveMonitor) {
    return {
      isInitialized: false,
      isRunning: false,
      state: null,
    };
  }

  const state = globalMetacognitiveMonitor.getState();
  return {
    isInitialized: true,
    isRunning: state.isRunning,
    state,
  };
}

/**
 * 获取监控报告
 */
export async function getMonitoringReport(): Promise<string> {
  if (!globalMetacognitiveMonitor) {
    return '元认知监控系统未初始化';
  }

  return await globalMetacognitiveMonitor.generateMonitoringReport();
}
