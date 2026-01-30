/**
 * 情感记忆清理服务
 * 定期清理过期的情感记忆记录，减少数据库存储压力
 */

import { getDb } from "../db";
import { emotionalMemory } from "../../drizzle/schema";
import { lt, and } from "drizzle-orm";

interface CleanupStats {
  deletedCount: number;
  totalRecords: number;
  freedMemory: number;
}

class EmotionalMemoryCleanup {
  private readonly RETENTION_DAYS = 30; // 保留 30 天的记忆
  private readonly BATCH_SIZE = 100; // 每批删除 100 条记录
  private readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 每 24 小时清理一次
  private lastCleanupTime = 0;

  /**
   * 执行情感记忆清理
   */
  async performCleanup(): Promise<CleanupStats> {
    const db = await getDb();
    if (!db) {
      console.warn("[EmotionalMemoryCleanup] Database not available");
      return { deletedCount: 0, totalRecords: 0, freedMemory: 0 };
    }

    try {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000);

      console.log(
        `[EmotionalMemoryCleanup] Starting cleanup - removing records before ${cutoffDate.toISOString()}`
      );

      // 获取要删除的记录数
      const recordsToDelete = await db
        .select()
        .from(emotionalMemory)
        .where(lt(emotionalMemory.createdAt, cutoffDate));

      const totalRecords = recordsToDelete.length;

      if (totalRecords === 0) {
        console.log("[EmotionalMemoryCleanup] No records to delete");
        return { deletedCount: 0, totalRecords: 0, freedMemory: 0 };
      }

      // 批量删除记录
      let deletedCount = 0;
      for (let i = 0; i < totalRecords; i += this.BATCH_SIZE) {
        const batch = recordsToDelete.slice(i, i + this.BATCH_SIZE);
        const batchIds = batch.map((r) => r.id);

        await db
          .delete(emotionalMemory)
          .where(
            and(
              lt(emotionalMemory.createdAt, cutoffDate),
              emotionalMemory.id.inArray ? emotionalMemory.id.inArray(batchIds) : undefined
            )
          );

        deletedCount += batch.length;

        console.log(
          `[EmotionalMemoryCleanup] Deleted batch: ${i + batch.length}/${totalRecords}`
        );
      }

      // 估算释放的内存（每条记录约 200 字节）
      const freedMemory = deletedCount * 200;

      console.log(
        `[EmotionalMemoryCleanup] Cleanup completed - deleted ${deletedCount} records, freed ~${(freedMemory / 1024).toFixed(2)}KB`
      );

      return { deletedCount, totalRecords, freedMemory };
    } catch (error) {
      console.error("[EmotionalMemoryCleanup] Cleanup error:", error);
      return { deletedCount: 0, totalRecords: 0, freedMemory: 0 };
    }
  }

  /**
   * 检查是否需要执行清理
   */
  shouldCleanup(): boolean {
    const now = Date.now();
    return now - this.lastCleanupTime > this.CLEANUP_INTERVAL;
  }

  /**
   * 更新最后清理时间
   */
  updateLastCleanupTime(): void {
    this.lastCleanupTime = Date.now();
  }

  /**
   * 获取情感记忆统计信息
   */
  async getStats(): Promise<{
    totalRecords: number;
    oldestRecord: Date | null;
    newestRecord: Date | null;
  }> {
    const db = await getDb();
    if (!db) {
      return { totalRecords: 0, oldestRecord: null, newestRecord: null };
    }

    try {
      const records = await db.select().from(emotionalMemory);

      if (records.length === 0) {
        return { totalRecords: 0, oldestRecord: null, newestRecord: null };
      }

      const dates = records.map((r) => r.createdAt).filter((d) => d !== null) as Date[];
      const oldestRecord = new Date(Math.min(...dates.map((d) => d.getTime())));
      const newestRecord = new Date(Math.max(...dates.map((d) => d.getTime())));

      return { totalRecords: records.length, oldestRecord, newestRecord };
    } catch (error) {
      console.error("[EmotionalMemoryCleanup] Stats error:", error);
      return { totalRecords: 0, oldestRecord: null, newestRecord: null };
    }
  }
}

let instance: EmotionalMemoryCleanup | null = null;

export function getEmotionalMemoryCleanup(): EmotionalMemoryCleanup {
  if (!instance) {
    instance = new EmotionalMemoryCleanup();
  }
  return instance;
}
