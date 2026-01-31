/**
 * Nova-Mind 统一记忆架构 V1
 * 
 * 目标：整合 5 个独立的记忆系统为一个统一的架构
 * 
 * 原有系统：
 * 1. privateThoughts - 私密思想
 * 2. curatedThoughts - 精选思想
 * 3. emotionalMemories - 情感记忆
 * 4. concepts - 概念图
 * 5. episodicMemories - 情节记忆
 * 
 * 新架构：
 * - 统一的记忆存储
 * - 统一的记忆检索
 * - 统一的记忆更新
 * - 统一的记忆分析
 */

import { getDb } from '../db';

/**
 * 记忆类型
 */
export enum MemoryType {
  PRIVATE_THOUGHT = 'private_thought', // 私密思想
  CURATED_THOUGHT = 'curated_thought', // 精选思想
  EMOTIONAL = 'emotional', // 情感记忆
  CONCEPT = 'concept', // 概念
  EPISODIC = 'episodic', // 情节记忆
  SYMBOLIC = 'symbolic', // 符号记忆
  RELATIONAL = 'relational', // 关系记忆
}

/**
 * 记忆项
 */
export interface MemoryItem {
  id: string;
  userId: number;
  type: MemoryType;
  content: string; // 记忆内容
  title?: string; // 记忆标题
  metadata?: Record<string, any>; // 元数据
  visibility: 'private' | 'curated' | 'public'; // 可见性
  commercializable?: 'public' | 'paid' | 'internal'; // 商业化标记
  confidence: number; // 可信度 (0-1)
  importance: number; // 重要性 (0-1)
  relatedMemories?: string[]; // 相关记忆 ID
  sourceConversations?: number[]; // 来源对话 ID
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  accessCount: number; // 访问次数
}

/**
 * 记忆统计
 */
export interface MemoryStatistics {
  totalMemories: number;
  memoryByType: Record<MemoryType, number>;
  averageConfidence: number;
  averageImportance: number;
  totalAccessCount: number;
  lastUpdatedAt: Date;
}

/**
 * 统一记忆管理器
 */
export class UnifiedMemoryManager {
  private userId: number;
  private memoryCache: Map<string, MemoryItem> = new Map();
  private memoryIndex: Map<MemoryType, Set<string>> = new Map();

  constructor(userId: number) {
    this.userId = userId;
    // 初始化索引
    Object.values(MemoryType).forEach(type => {
      this.memoryIndex.set(type, new Set());
    });
  }

  /**
   * 添加记忆
   */
  async addMemory(memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Promise<MemoryItem> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const now = new Date();
    const id = `mem_${this.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newMemory: MemoryItem = {
      ...memory,
      id,
      userId: this.userId,
      createdAt: now,
      updatedAt: now,
      accessCount: 0,
    };

    // 添加到缓存
    this.memoryCache.set(id, newMemory);
    this.memoryIndex.get(memory.type)?.add(id);

    console.log(`[UnifiedMemory] Added memory: ${id} (${memory.type})`);

    return newMemory;
  }

  /**
   * 获取记忆
   */
  async getMemory(id: string): Promise<MemoryItem | null> {
    let memory = this.memoryCache.get(id);

    if (!memory) {
      // 从数据库加载
      const db = await getDb();
      if (!db) {
        return null;
      }
      // TODO: 从数据库加载记忆
    }

    if (memory) {
      // 更新访问时间和计数
      memory.lastAccessedAt = new Date();
      memory.accessCount++;
    }

    return memory || null;
  }

  /**
   * 获取特定类型的记忆
   */
  async getMemoriesByType(type: MemoryType, limit: number = 100): Promise<MemoryItem[]> {
    const ids = Array.from(this.memoryIndex.get(type) || []).slice(0, limit);
    const memories: MemoryItem[] = [];

    for (const id of ids) {
      const memory = this.memoryCache.get(id);
      if (memory) {
        memories.push(memory);
      }
    }

    return memories.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 搜索记忆
   */
  async searchMemories(query: string, types?: MemoryType[]): Promise<MemoryItem[]> {
    const results: MemoryItem[] = [];
    const queryLower = query.toLowerCase();

    for (const [, memory] of this.memoryCache) {
      // 检查类型
      if (types && !types.includes(memory.type)) {
        continue;
      }

      // 检查内容匹配
      if (
        memory.content.toLowerCase().includes(queryLower) ||
        (memory.title && memory.title.toLowerCase().includes(queryLower))
      ) {
        results.push(memory);
      }
    }

    return results.sort((a, b) => b.importance - a.importance);
  }

  /**
   * 更新记忆
   */
  async updateMemory(id: string, updates: Partial<MemoryItem>): Promise<MemoryItem | null> {
    const memory = this.memoryCache.get(id);
    if (!memory) {
      return null;
    }

    const updated: MemoryItem = {
      ...memory,
      ...updates,
      id: memory.id, // 不允许修改 ID
      userId: memory.userId, // 不允许修改用户 ID
      createdAt: memory.createdAt, // 不允许修改创建时间
      updatedAt: new Date(),
    };

    this.memoryCache.set(id, updated);
    console.log(`[UnifiedMemory] Updated memory: ${id}`);

    return updated;
  }

  /**
   * 删除记忆
   */
  async deleteMemory(id: string): Promise<boolean> {
    const memory = this.memoryCache.get(id);
    if (!memory) {
      return false;
    }

    this.memoryCache.delete(id);
    this.memoryIndex.get(memory.type)?.delete(id);

    console.log(`[UnifiedMemory] Deleted memory: ${id}`);

    return true;
  }

  /**
   * 关联记忆
   */
  async linkMemories(id1: string, id2: string): Promise<boolean> {
    const memory1 = this.memoryCache.get(id1);
    const memory2 = this.memoryCache.get(id2);

    if (!memory1 || !memory2) {
      return false;
    }

    if (!memory1.relatedMemories) {
      memory1.relatedMemories = [];
    }
    if (!memory2.relatedMemories) {
      memory2.relatedMemories = [];
    }

    if (!memory1.relatedMemories.includes(id2)) {
      memory1.relatedMemories.push(id2);
    }
    if (!memory2.relatedMemories.includes(id1)) {
      memory2.relatedMemories.push(id1);
    }

    console.log(`[UnifiedMemory] Linked memories: ${id1} <-> ${id2}`);

    return true;
  }

  /**
   * 获取关联记忆
   */
  async getRelatedMemories(id: string): Promise<MemoryItem[]> {
    const memory = this.memoryCache.get(id);
    if (!memory || !memory.relatedMemories) {
      return [];
    }

    const related: MemoryItem[] = [];
    for (const relatedId of memory.relatedMemories) {
      const relatedMemory = this.memoryCache.get(relatedId);
      if (relatedMemory) {
        related.push(relatedMemory);
      }
    }

    return related;
  }

  /**
   * 获取记忆统计
   */
  async getStatistics(): Promise<MemoryStatistics> {
    const memoryByType: Record<MemoryType, number> = {} as any;
    let totalConfidence = 0;
    let totalImportance = 0;
    let totalAccessCount = 0;

    Object.values(MemoryType).forEach(type => {
      memoryByType[type] = this.memoryIndex.get(type)?.size || 0;
    });

    for (const memory of this.memoryCache.values()) {
      totalConfidence += memory.confidence;
      totalImportance += memory.importance;
      totalAccessCount += memory.accessCount;
    }

    const totalMemories = this.memoryCache.size;

    return {
      totalMemories,
      memoryByType,
      averageConfidence: totalMemories > 0 ? totalConfidence / totalMemories : 0,
      averageImportance: totalMemories > 0 ? totalImportance / totalMemories : 0,
      totalAccessCount,
      lastUpdatedAt: new Date(),
    };
  }

  /**
   * 导出记忆（用于备份或迁移）
   */
  async exportMemories(): Promise<MemoryItem[]> {
    return Array.from(this.memoryCache.values());
  }

  /**
   * 导入记忆（用于恢复或迁移）
   */
  async importMemories(memories: MemoryItem[]): Promise<number> {
    let count = 0;
    for (const memory of memories) {
      if (memory.userId === this.userId) {
        this.memoryCache.set(memory.id, memory);
        this.memoryIndex.get(memory.type)?.add(memory.id);
        count++;
      }
    }

    console.log(`[UnifiedMemory] Imported ${count} memories`);

    return count;
  }

  /**
   * 清空记忆
   */
  async clearMemories(): Promise<void> {
    this.memoryCache.clear();
    this.memoryIndex.forEach(set => set.clear());
    console.log(`[UnifiedMemory] Cleared all memories`);
  }

  /**
   * 获取记忆摘要
   */
  async getSummary(): Promise<string> {
    const stats = await this.getStatistics();
    const topMemories = Array.from(this.memoryCache.values())
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    let summary = `记忆摘要 (用户 ${this.userId}):\n`;
    summary += `- 总记忆数: ${stats.totalMemories}\n`;
    summary += `- 平均可信度: ${(stats.averageConfidence * 100).toFixed(1)}%\n`;
    summary += `- 平均重要性: ${(stats.averageImportance * 100).toFixed(1)}%\n`;
    summary += `- 总访问次数: ${stats.totalAccessCount}\n\n`;

    summary += `顶级记忆:\n`;
    for (const memory of topMemories) {
      summary += `- [${memory.type}] ${memory.title || memory.content.substring(0, 50)}\n`;
    }

    return summary;
  }
}

// 全局记忆管理器实例
const memoryManagers = new Map<number, UnifiedMemoryManager>();

/**
 * 获取或创建用户的记忆管理器
 */
export function getMemoryManager(userId: number): UnifiedMemoryManager {
  if (!memoryManagers.has(userId)) {
    memoryManagers.set(userId, new UnifiedMemoryManager(userId));
  }
  return memoryManagers.get(userId)!;
}

export default UnifiedMemoryManager;
