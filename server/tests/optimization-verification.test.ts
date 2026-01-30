/**
 * 优化效果验证测试
 * 
 * 测试项：
 * 1. LRU 缓存功能
 * 2. 数据去重功能
 * 3. 内存监控功能
 * 4. 缓存命中率
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LRUCache } from '../services/knowledgeCompression';
import { DataDeduplicator } from '../services/knowledgeCompression';

describe('优化效果验证', () => {
  describe('LRU 缓存测试', () => {
    let cache: LRUCache<string, any>;

    beforeEach(() => {
      cache = new LRUCache(10, 100); // 10MB, 最多 100 项
    });

    afterEach(() => {
      cache.clear();
    });

    it('应该能够存储和检索数据', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('应该在缓存未命中时返回 undefined', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('应该跟踪缓存统计信息', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // 命中
      cache.get('key2'); // 未命中

      const stats = cache.getStats();
      expect(stats.totalItems).toBe(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it('应该在超过项数限制时删除最少使用的项', () => {
      const cache = new LRUCache(10, 3); // 只允许 3 项

      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // 访问 key1 和 key2，使 key3 成为最少使用的
      cache.get('key1');
      cache.get('key2');

      // 添加第 4 项，应该删除 key3
      cache.set('key4', 'value4');

      const stats = cache.getStats();
      expect(stats.totalItems).toBeLessThanOrEqual(3);
    });

    it('应该计算缓存命中率', () => {
      cache.set('key1', 'value1');

      // 进行多次访问
      for (let i = 0; i < 10; i++) {
        cache.get('key1'); // 命中
        cache.get('nonexistent'); // 未命中
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.5, 1); // 应该接近 50%
    });
  });

  describe('数据去重测试', () => {
    let deduplicator: DataDeduplicator;

    beforeEach(() => {
      deduplicator = new DataDeduplicator();
    });

    afterEach(() => {
      deduplicator.clear();
    });

    it('应该去重相同的字符串', () => {
      const str1 = deduplicator.deduplicateString('hello');
      const str2 = deduplicator.deduplicateString('hello');

      expect(str1).toBe(str2); // 应该是同一个引用
    });

    it('应该去重不同的字符串', () => {
      const str1 = deduplicator.deduplicateString('hello');
      const str2 = deduplicator.deduplicateString('world');

      expect(str1).not.toBe(str2);
    });

    it('应该去重对象', () => {
      const obj = { name: 'Nova', type: 'AI' };
      const dedup1 = deduplicator.deduplicateObject(obj, 'nova-1');
      const dedup2 = deduplicator.deduplicateObject(obj, 'nova-1');

      expect(dedup1).toBe(dedup2); // 应该是同一个引用
    });

    it('应该跟踪去重统计信息', () => {
      deduplicator.deduplicateString('hello');
      deduplicator.deduplicateString('world');
      deduplicator.deduplicateObject({ id: 1 }, 'obj-1');

      const stats = deduplicator.getStats();
      expect(stats.stringPoolSize).toBe(2);
      expect(stats.objectPoolSize).toBe(1);
    });
  });

  describe('内存优化集成测试', () => {
    it('应该在添加大量数据时保持内存使用在限制内', () => {
      const cache = new LRUCache(5, 50); // 5MB, 最多 50 项

      // 添加大量数据
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, {
          id: i,
          data: 'x'.repeat(10000), // 大约 10KB 的数据
        });
      }

      const stats = cache.getStats();
      expect(stats.totalItems).toBeLessThanOrEqual(50); // 应该不超过 50 项
      expect(stats.totalMemory).toBeLessThanOrEqual(5 * 1024 * 1024); // 应该不超过 5MB
    });

    it('应该在高缓存命中率下保持性能', () => {
      const cache = new LRUCache(10, 100);

      // 设置初始数据
      for (let i = 0; i < 10; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      // 进行大量访问
      for (let i = 0; i < 1000; i++) {
        cache.get(`key-${i % 10}`); // 重复访问前 10 个键
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.9); // 应该有超过 90% 的命中率
    });
  });

  describe('性能基准测试', () => {
    it('LRU 缓存应该有快速的 get/set 操作', () => {
      const cache = new LRUCache(10, 1000);
      const startTime = Date.now();

      // 进行 10000 次操作
      for (let i = 0; i < 10000; i++) {
        cache.set(`key-${i % 100}`, `value-${i}`);
        cache.get(`key-${i % 100}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
    });

    it('数据去重应该有快速的字符串池查询', () => {
      const deduplicator = new DataDeduplicator();
      const startTime = Date.now();

      // 进行 10000 次去重操作
      for (let i = 0; i < 10000; i++) {
        deduplicator.deduplicateString(`string-${i % 100}`);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(500); // 应该在 500ms 内完成
    });
  });
});
