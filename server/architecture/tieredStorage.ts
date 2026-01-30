/**
 * 分层存储系统 (Tiered Storage System)
 * 
 * 灵感来源：人脑的长期记忆（磁盘）和工作记忆（内存）
 * 
 * 原理：
 * 1. 热数据（最近使用）存储在内存中
 * 2. 冷数据（不常用）存储在磁盘上
 * 3. 自动在两层之间移动数据
 * 4. 透明的数据访问接口
 * 
 * 预期效果：
 * - 内存占用：降低 80-90%
 * - 访问速度：热数据 < 1ms，冷数据 < 100ms
 * - 存储容量：理论无限
 */

import * as fs from 'fs';
import * as path from 'path';

interface StorageEntry {
  key: string;
  value: any;
  tier: 'hot' | 'cold'; // 存储层
  size: number; // 字节
  lastAccessed: number;
  accessCount: number;
  createdAt: number;
}

interface TierConfig {
  maxHotMemory: number; // 热数据最大内存（字节）
  hotThreshold: number; // 升级为热数据的访问次数
  coldThreshold: number; // 降级为冷数据的时间（毫秒）
  storagePath: string; // 冷数据存储路径
}

/**
 * 分层存储管理器
 */
export class TieredStorageManager {
  private config: TierConfig;
  private hotStorage: Map<string, StorageEntry> = new Map();
  private coldStorageIndex: Map<string, string> = new Map(); // key -> 文件路径
  private currentHotMemory: number = 0;
  private stats = {
    hotReads: 0,
    coldReads: 0,
    promotions: 0, // 冷 -> 热
    demotions: 0, // 热 -> 冷
  };

  constructor(config: Partial<TierConfig> = {}) {
    this.config = {
      maxHotMemory: (config.maxHotMemory || 50) * 1024 * 1024, // 默认 50MB
      hotThreshold: config.hotThreshold || 3,
      coldThreshold: config.coldThreshold || 5 * 60 * 1000, // 5 分钟
      storagePath: config.storagePath || '/tmp/nova-cold-storage',
    };

    // 创建冷存储目录
    if (!fs.existsSync(this.config.storagePath)) {
      fs.mkdirSync(this.config.storagePath, { recursive: true });
    }

    // 启动定期清理任务
    this.startMaintenanceTask();
  }

  /**
   * 设置数据
   */
  async set(key: string, value: any): Promise<void> {
    const size = this.estimateSize(value);

    // 检查是否已存在
    if (this.hotStorage.has(key)) {
      const entry = this.hotStorage.get(key)!;
      this.currentHotMemory -= entry.size;
      this.hotStorage.delete(key);
    }

    // 如果冷存储中存在，删除
    if (this.coldStorageIndex.has(key)) {
      const filePath = this.coldStorageIndex.get(key)!;
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // 忽略错误
      }
      this.coldStorageIndex.delete(key);
    }

    // 检查是否需要腾出空间
    if (this.currentHotMemory + size > this.config.maxHotMemory) {
      await this.demoteToColStorage();
    }

    // 添加到热存储
    const entry: StorageEntry = {
      key,
      value,
      tier: 'hot',
      size,
      lastAccessed: Date.now(),
      accessCount: 1,
      createdAt: Date.now(),
    };

    this.hotStorage.set(key, entry);
    this.currentHotMemory += size;
  }

  /**
   * 获取数据
   */
  async get(key: string): Promise<any> {
    // 检查热存储
    if (this.hotStorage.has(key)) {
      const entry = this.hotStorage.get(key)!;
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      this.stats.hotReads++;

      // 检查是否应该升级为热数据
      if (entry.tier === 'cold' && entry.accessCount >= this.config.hotThreshold) {
        entry.tier = 'hot';
        this.stats.promotions++;
      }

      return entry.value;
    }

    // 检查冷存储
    if (this.coldStorageIndex.has(key)) {
      const filePath = this.coldStorageIndex.get(key)!;
      try {
        const data = fs.readFileSync(filePath, 'utf-8');
        const value = JSON.parse(data);

        this.stats.coldReads++;

        // 升级到热存储
        await this.set(key, value);

        return value;
      } catch (error) {
        console.error(`[TieredStorage] Failed to read cold storage: ${key}`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * 删除数据
   */
  async delete(key: string): Promise<void> {
    // 从热存储删除
    if (this.hotStorage.has(key)) {
      const entry = this.hotStorage.get(key)!;
      this.currentHotMemory -= entry.size;
      this.hotStorage.delete(key);
    }

    // 从冷存储删除
    if (this.coldStorageIndex.has(key)) {
      const filePath = this.coldStorageIndex.get(key)!;
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        // 忽略错误
      }
      this.coldStorageIndex.delete(key);
    }
  }

  /**
   * 降级到冷存储
   */
  private async demoteToColStorage(): Promise<void> {
    // 找到最少使用的热数据
    const entries = Array.from(this.hotStorage.values()).sort(
      (a, b) => a.lastAccessed - b.lastAccessed
    );

    let freedMemory = 0;
    const targetMemory = this.config.maxHotMemory * 0.3; // 释放 30% 的空间

    for (const entry of entries) {
      if (freedMemory >= targetMemory) break;

      // 保存到冷存储
      const fileName = `${entry.key}.json`;
      const filePath = path.join(this.config.storagePath, fileName);

      try {
        fs.writeFileSync(filePath, JSON.stringify(entry.value), 'utf-8');
        this.coldStorageIndex.set(entry.key, filePath);

        // 从热存储删除
        this.hotStorage.delete(entry.key);
        this.currentHotMemory -= entry.size;
        freedMemory += entry.size;
        this.stats.demotions++;

        console.log(
          `[TieredStorage] Demoted to cold storage: ${entry.key} (freed ${(entry.size / 1024).toFixed(1)}KB)`
        );
      } catch (error) {
        console.error(`[TieredStorage] Failed to demote: ${entry.key}`, error);
      }
    }
  }

  /**
   * 估计数据大小
   */
  private estimateSize(value: any): number {
    if (typeof value === 'string') {
      return value.length * 2;
    }
    if (typeof value === 'number') {
      return 8;
    }
    if (typeof value === 'boolean') {
      return 1;
    }
    if (Array.isArray(value)) {
      return value.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).reduce(
        (sum, item) => sum + this.estimateSize(item),
        0
      );
    }
    return 0;
  }

  /**
   * 启动定期维护任务
   */
  private startMaintenanceTask(): void {
    setInterval(() => {
      // 清理过期的冷数据
      const now = Date.now();
      for (const [key, filePath] of this.coldStorageIndex.entries()) {
        try {
          const stat = fs.statSync(filePath);
          if (now - stat.mtimeMs > 24 * 60 * 60 * 1000) {
            // 24 小时未访问
            fs.unlinkSync(filePath);
            this.coldStorageIndex.delete(key);
          }
        } catch (e) {
          // 忽略错误
        }
      }
    }, 60 * 60 * 1000); // 每小时运行一次
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      hotMemory: (this.currentHotMemory / 1024 / 1024).toFixed(1) + 'MB',
      maxHotMemory: (this.config.maxHotMemory / 1024 / 1024).toFixed(1) + 'MB',
      hotItems: this.hotStorage.size,
      coldItems: this.coldStorageIndex.size,
      ...this.stats,
      hitRate: (
        (this.stats.hotReads / (this.stats.hotReads + this.stats.coldReads)) *
        100
      ).toFixed(1) + '%',
    };
  }

  /**
   * 清理所有数据
   */
  async cleanup(): Promise<void> {
    this.hotStorage.clear();
    this.currentHotMemory = 0;

    // 清理冷存储目录
    try {
      const files = fs.readdirSync(this.config.storagePath);
      for (const file of files) {
        fs.unlinkSync(path.join(this.config.storagePath, file));
      }
    } catch (e) {
      // 忽略错误
    }

    this.coldStorageIndex.clear();
  }
}

/**
 * 全局实例
 */
let instance: TieredStorageManager | null = null;

/**
 * 获取分层存储管理器实例
 */
export function getTieredStorageManager(): TieredStorageManager {
  if (!instance) {
    instance = new TieredStorageManager();
  }
  return instance;
}

/**
 * 使用示例：
 * 
 * const storage = getTieredStorageManager();
 * 
 * // 设置数据
 * await storage.set('user-1-memories', {
 *   conversations: [...],
 *   learnings: [...],
 * });
 * 
 * // 获取数据（自动升级热数据）
 * const memories = await storage.get('user-1-memories');
 * 
 * // 查看统计信息
 * console.log(storage.getStats());
 */
