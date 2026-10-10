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
import { and, desc, eq } from 'drizzle-orm';
import { unifiedMemories } from '../../drizzle/schema';

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
  private loadedFromDatabase = false;
  private loadPromise: Promise<void> | null = null;

  constructor(userId: number) {
    this.userId = userId;
    Object.values(MemoryType).forEach(type => this.memoryIndex.set(type, new Set()));
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loadedFromDatabase) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available; persistent memory cannot be loaded");
      const rows = await db.select().from(unifiedMemories)
        .where(eq(unifiedMemories.userId, this.userId))
        .orderBy(desc(unifiedMemories.importanceMilli));
      for (const row of rows) {
        let metadata: Record<string, any> | undefined;
        let relatedMemories: string[] | undefined;
        let sourceConversations: number[] | undefined;
        try { metadata = row.metadataJson ? JSON.parse(row.metadataJson) : undefined; } catch {}
        try { relatedMemories = row.relatedMemoriesJson ? JSON.parse(row.relatedMemoriesJson) : undefined; } catch {}
        try { sourceConversations = row.sourceConversationsJson ? JSON.parse(row.sourceConversationsJson) : undefined; } catch {}
        const type = Object.values(MemoryType).includes(row.type as MemoryType)
          ? row.type as MemoryType : MemoryType.EPISODIC;
        const memory: MemoryItem = {
          id: row.id, userId: row.userId, type, content: row.content,
          title: row.title ?? undefined, metadata,
          visibility: row.visibility, commercializable: row.commercializable ?? undefined,
          confidence: row.confidenceMilli / 1000, importance: row.importanceMilli / 1000,
          relatedMemories, sourceConversations,
          createdAt: row.createdAt, updatedAt: row.updatedAt,
          lastAccessedAt: row.lastAccessedAt ?? undefined, accessCount: row.accessCount,
        };
        this.memoryCache.set(memory.id, memory);
        this.memoryIndex.get(memory.type)?.add(memory.id);
      }
      this.loadedFromDatabase = true;
    })();

    try { await this.loadPromise; } finally { this.loadPromise = null; }
  }

  private async persistMemory(memory: MemoryItem): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available; persistent memory write failed");
    const existing = await db.select({ userId: unifiedMemories.userId })
      .from(unifiedMemories).where(eq(unifiedMemories.id, memory.id)).limit(1);
    if (existing.length && existing[0].userId !== this.userId) {
      throw new Error("Memory ID belongs to a different user");
    }
    const values = {
      type: memory.type, content: memory.content,
      title: memory.title ?? null,
      metadataJson: memory.metadata ? JSON.stringify(memory.metadata) : null,
      visibility: memory.visibility, commercializable: memory.commercializable ?? null,
      confidenceMilli: Math.round(memory.confidence * 1000),
      importanceMilli: Math.round(memory.importance * 1000),
      relatedMemoriesJson: memory.relatedMemories ? JSON.stringify(memory.relatedMemories) : null,
      sourceConversationsJson: memory.sourceConversations ? JSON.stringify(memory.sourceConversations) : null,
      updatedAt: memory.updatedAt, lastAccessedAt: memory.lastAccessedAt ?? null,
      accessCount: memory.accessCount,
    };
    if (existing.length) {
      // Never use a blind upsert for an ID-keyed, user-owned row: a concurrent
      // insert could otherwise turn a failed ownership check into a cross-user overwrite.
      await db.update(unifiedMemories).set(values).where(
        and(eq(unifiedMemories.id, memory.id), eq(unifiedMemories.userId, this.userId)),
      );
      return;
    }
    // If another user races to claim this ID, the primary-key constraint rejects
    // the insert; it cannot silently update that user's row.
    await db.insert(unifiedMemories).values({
      id: memory.id, userId: this.userId, ...values,
      createdAt: memory.createdAt,
    });
  }

  /**
   * 添加记忆
   */
  async addMemory(memory: Omit<MemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'accessCount'>): Promise<MemoryItem> {
    await this.ensureLoaded();
    if (memory.userId !== this.userId) {
      throw new Error("Cannot create memory for a different user");
    }
    if (
      !Number.isFinite(memory.confidence) || memory.confidence < 0 || memory.confidence > 1 ||
      !Number.isFinite(memory.importance) || memory.importance < 0 || memory.importance > 1
    ) {
      throw new Error("Memory confidence and importance must be between 0 and 1");
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

    // Persist first; only publish to cache after the database confirms the write.
    await this.persistMemory(newMemory);
    this.memoryCache.set(id, newMemory);
    this.memoryIndex.get(memory.type)?.add(id);

    console.log(`[UnifiedMemory] Added durable memory: ${id} (${memory.type})`);

    return newMemory;
  }

  /**
   * 获取记忆
   */
  async getMemory(id: string): Promise<MemoryItem | null> {
    await this.ensureLoaded();
    let memory = this.memoryCache.get(id);

    if (memory) {
      // Persist access metadata too, so usage statistics survive process restarts.
      const updated = { ...memory, lastAccessedAt: new Date(), accessCount: memory.accessCount + 1 };
      await this.persistMemory(updated);
      this.memoryCache.set(id, updated);
      return updated;
    }

    return null;
  }

  /**
   * 获取特定类型的记忆
   */
  async getMemoriesByType(type: MemoryType, limit: number = 100): Promise<MemoryItem[]> {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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

    await this.persistMemory(updated);
    if (updated.type !== memory.type) {
      this.memoryIndex.get(memory.type)?.delete(id);
      this.memoryIndex.get(updated.type)?.add(id);
    }
    this.memoryCache.set(id, updated);
    console.log(`[UnifiedMemory] Updated durable memory: ${id}`);

    return updated;
  }

  /**
   * 删除记忆
   */
  async deleteMemory(id: string): Promise<boolean> {
    await this.ensureLoaded();
    const memory = this.memoryCache.get(id);
    if (!memory) {
      return false;
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available; persistent memory delete failed");
    await db.delete(unifiedMemories).where(
      and(eq(unifiedMemories.id, id), eq(unifiedMemories.userId, this.userId)),
    );
    this.memoryCache.delete(id);
    this.memoryIndex.get(memory.type)?.delete(id);

    console.log(`[UnifiedMemory] Deleted memory: ${id}`);

    return true;
  }

  /**
   * 关联记忆
   */
  async linkMemories(id1: string, id2: string): Promise<boolean> {
    await this.ensureLoaded();
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

    await this.persistMemory(memory1);
    await this.persistMemory(memory2);
    console.log(`[UnifiedMemory] Linked memories: ${id1} <-> ${id2}`);

    return true;
  }

  /**
   * 获取关联记忆
   */
  async getRelatedMemories(id: string): Promise<MemoryItem[]> {
    await this.ensureLoaded();
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
    await this.ensureLoaded();
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
    await this.ensureLoaded();
    return Array.from(this.memoryCache.values());
  }

  /**
   * 导入记忆（用于恢复或迁移）
   */
  async importMemories(memories: MemoryItem[]): Promise<number> {
    await this.ensureLoaded();
    let count = 0;
    for (const memory of memories) {
      if (memory.userId === this.userId) {
        await this.persistMemory(memory);
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
    await this.ensureLoaded();
    const db = await getDb();
    if (!db) throw new Error("Database not available; persistent memory clear failed");
    await db.delete(unifiedMemories).where(eq(unifiedMemories.userId, this.userId));
    this.memoryCache.clear();
    this.memoryIndex.forEach(set => set.clear());
    console.log(`[UnifiedMemory] Cleared all memories`);
  }

  /**
   * 获取记忆摘要
   */
  async getSummary(): Promise<string> {
    await this.ensureLoaded();
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
