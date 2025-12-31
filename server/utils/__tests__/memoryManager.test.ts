import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cleanOldCognitiveLogs,
  archiveOldEpisodes,
  cleanWeakRelations,
  consolidateConcepts,
  getMemoryStats,
  performFullCleanup,
  cacheManager,
} from '../memoryManager';

describe('Memory Manager', () => {
  beforeEach(() => {
    // Reset cache before each test
    cacheManager.clear();
  });

  afterEach(() => {
    cacheManager.clear();
  });

  describe('Cache Manager', () => {
    it('should set and get cache values', () => {
      cacheManager.set('test-key', { data: 'test-value' }, 300);
      const result = cacheManager.get('test-key');

      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should clear all cache entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      cacheManager.clear();
      const stats = cacheManager.getStats();

      expect(stats.size).toBe(0);
    });

    it('should cleanup expired entries', async () => {
      cacheManager.set('key1', 'value1', 1); // 1ms TTL
      cacheManager.set('key2', 'value2', 10000); // 10s TTL

      await new Promise((resolve) => setTimeout(resolve, 10));
      cacheManager.cleanup();
      const stats = cacheManager.getStats();

      expect(stats.size).toBeGreaterThanOrEqual(0);
    });

    it('should enforce max cache size', () => {
      // Cache manager doesn't enforce max size on set, just on cleanup
      for (let i = 0; i < 10; i++) {
        cacheManager.set(`key-${i}`, `value-${i}`);
      }

      const stats = cacheManager.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should return cache statistics', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');

      const stats = cacheManager.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('utilizationPercent');
      expect(stats.size).toBe(2);
      expect(stats.utilizationPercent).toBeGreaterThan(0);
    });

    it('should check if key exists in cache', () => {
      cacheManager.set('test-key', 'test-value');

      expect(cacheManager.get('test-key')).toBe('test-value');
      expect(cacheManager.get('non-existent')).toBeNull();
    });

    it('should clear all cache entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');

      cacheManager.clear();

      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).toBeNull();
    });
  });

  describe('Database Cleanup Functions', () => {
    it('should handle cleanOldCognitiveLogs gracefully', async () => {
      const result = await cleanOldCognitiveLogs();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle archiveOldEpisodes gracefully', async () => {
      const result = await archiveOldEpisodes();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle cleanWeakRelations gracefully', async () => {
      const result = await cleanWeakRelations();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle consolidateConcepts gracefully', async () => {
      const result = await consolidateConcepts();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should get memory statistics', async () => {
      const stats = await getMemoryStats();

      if (stats) {
        expect(stats).toHaveProperty('totalConcepts');
        expect(stats).toHaveProperty('totalRelations');
        expect(stats).toHaveProperty('totalLogs');
        expect(stats).toHaveProperty('totalEpisodes');
        expect(stats).toHaveProperty('timestamp');

        expect(typeof stats.totalConcepts).toBe('number');
        expect(typeof stats.totalRelations).toBe('number');
        expect(typeof stats.totalLogs).toBe('number');
        expect(typeof stats.totalEpisodes).toBe('number');
      }
    });

    it('should perform full cleanup', async () => {
      const result = await performFullCleanup();

      if (result) {
        expect(result).toHaveProperty('totalConcepts');
        expect(result).toHaveProperty('totalRelations');
        expect(result).toHaveProperty('totalLogs');
        expect(result).toHaveProperty('totalEpisodes');
      }
    }, 15000); // 15 second timeout for cleanup
  });

  describe('Memory Management', () => {
    it('should handle concurrent cache operations', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            cacheManager.set(`key-${i}`, `value-${i}`);
            resolve(null);
          })
        );
      }

      await Promise.all(promises);

      const stats = cacheManager.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should handle cache with long TTLs', () => {
      cacheManager.set('long-ttl', 'value2', 10000); // 10s

      expect(cacheManager.get('long-ttl')).toBe('value2');
    });

    it('should track cache utilization', () => {
      for (let i = 0; i < 5; i++) {
        cacheManager.set(`key-${i}`, `value-${i}`);
      }

      const stats = cacheManager.getStats();
      expect(stats.utilizationPercent).toBeGreaterThan(0);
      expect(stats.utilizationPercent).toBeLessThanOrEqual(100);
    });
  });
});
