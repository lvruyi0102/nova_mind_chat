import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdvancedCacheManager, getAdvancedCacheManager, resetAdvancedCacheManager } from '../advancedCacheManager';
import { IncrementalGarbageCollector, getIncrementalGarbageCollector, resetIncrementalGarbageCollector } from '../incrementalGarbageCollector';
import { MemoryMonitoringSystem, getMemoryMonitoringSystem, resetMemoryMonitoringSystem } from '../memoryMonitoringSystem';

describe('Advanced Memory Management System', () => {
  afterEach(() => {
    resetAdvancedCacheManager();
    resetIncrementalGarbageCollector();
    resetMemoryMonitoringSystem();
  });

  describe('AdvancedCacheManager', () => {
    it('should initialize with default config', () => {
      const manager = new AdvancedCacheManager();
      const stats = manager.getStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.totalSize).toBe(0);
    });

    it('should set and get cache values', () => {
      const manager = new AdvancedCacheManager();
      manager.set('key1', { data: 'value1' });
      const value = manager.get('key1');
      expect(value).toEqual({ data: 'value1' });
    });

    it('should track hit and miss rates', () => {
      const manager = new AdvancedCacheManager();
      manager.set('key1', 'value1');
      manager.get('key1'); // hit
      manager.get('key2'); // miss
      const stats = manager.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.missRate).toBeGreaterThan(0);
    });

    it('should handle TTL expiration', async () => {
      const manager = new AdvancedCacheManager();
      manager.set('key1', 'value1', 100); // 100ms TTL
      expect(manager.get('key1')).toBe('value1');
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(manager.get('key1')).toBeUndefined();
    });

    it('should perform aggressive cleanup', () => {
      const manager = new AdvancedCacheManager();
      // Add many entries
      for (let i = 0; i < 100; i++) {
        manager.set(`key${i}`, { data: 'x'.repeat(1000) });
      }
      const statsBefore = manager.getStats();
      manager.aggressiveCleanup(30);
      const statsAfter = manager.getStats();
      expect(statsAfter.entryCount).toBeLessThan(statsBefore.entryCount);
    });

    it('should perform predictive cleanup', () => {
      const manager = new AdvancedCacheManager();
      // Add entries
      for (let i = 0; i < 50; i++) {
        manager.set(`key${i}`, { data: 'x'.repeat(1000) });
      }
      // Access some entries to create access pattern
      for (let i = 0; i < 10; i++) {
        manager.get('key0');
      }
      manager.predictiveCleanup();
      // key0 should still exist due to high access count
      expect(manager.get('key0')).toBeDefined();
    });

    it('should calculate memory usage percent', () => {
      const manager = new AdvancedCacheManager();
      manager.set('key1', { data: 'x'.repeat(1000) });
      const usage = manager.getMemoryUsagePercent();
      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeLessThan(100);
    });

    it('should clear all cache', () => {
      const manager = new AdvancedCacheManager();
      manager.set('key1', 'value1');
      manager.set('key2', 'value2');
      manager.clear();
      const stats = manager.getStats();
      expect(stats.entryCount).toBe(0);
    });
  });

  describe('IncrementalGarbageCollector', () => {
    it('should get heap metrics', () => {
      const gc = new IncrementalGarbageCollector();
      const metrics = gc.getHeapMetrics();
      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
      expect(metrics.timestamp).toBeGreaterThan(0);
    });

    it('should calculate heap usage ratio', () => {
      const gc = new IncrementalGarbageCollector();
      const ratio = gc.getHeapUsageRatio();
      expect(ratio).toBeGreaterThan(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    it('should perform incremental GC', async () => {
      const gc = new IncrementalGarbageCollector();
      const ratioBefore = gc.getHeapUsageRatio();
      await gc.performIncrementalGC();
      const ratioAfter = gc.getHeapUsageRatio();
      // Ratio should not increase significantly
      expect(ratioAfter).toBeLessThanOrEqual(ratioBefore + 0.1);
    });

    it('should track metrics history', () => {
      const gc = new IncrementalGarbageCollector();
      const history = gc.getMetricsHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should calculate average heap usage ratio', () => {
      const gc = new IncrementalGarbageCollector();
      const avg = gc.getAverageHeapUsageRatio();
      expect(avg).toBeGreaterThanOrEqual(0);
      expect(avg).toBeLessThanOrEqual(1);
    });

    it('should get peak heap usage ratio', () => {
      const gc = new IncrementalGarbageCollector();
      const peak = gc.getPeakHeapUsageRatio();
      expect(peak).toBeGreaterThanOrEqual(0);
      expect(peak).toBeLessThanOrEqual(1);
    });

    it('should detect trend', () => {
      const gc = new IncrementalGarbageCollector();
      const trend = gc.getTrend();
      expect(['increasing', 'decreasing', 'stable']).toContain(trend);
    });

    it('should generate diagnostic report', () => {
      const gc = new IncrementalGarbageCollector();
      const report = gc.generateDiagnosticReport();
      expect(report.currentUsage).toBeGreaterThanOrEqual(0);
      expect(report.averageUsage).toBeGreaterThanOrEqual(0);
      expect(report.peakUsage).toBeGreaterThanOrEqual(0);
      expect(report.recommendation).toBeDefined();
    });
  });

  describe('MemoryMonitoringSystem', () => {
    it('should get current metrics', () => {
      const monitor = new MemoryMonitoringSystem();
      const metrics = monitor.getCurrentMetrics();
      expect(metrics.heapUsed).toBeGreaterThan(0);
      expect(metrics.heapTotal).toBeGreaterThan(0);
      expect(metrics.heapUsagePercent).toBeGreaterThan(0);
    });

    it('should track alert history', () => {
      const monitor = new MemoryMonitoringSystem();
      const alerts = monitor.getAlertHistory();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should track metrics history', () => {
      const monitor = new MemoryMonitoringSystem();
      const metrics = monitor.getMetricsHistory();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should generate dashboard data', () => {
      const monitor = new MemoryMonitoringSystem();
      const dashboard = monitor.getDashboardData();
      expect(dashboard.current).toBeDefined();
      expect(dashboard.recent).toBeDefined();
      expect(dashboard.alerts).toBeDefined();
      expect(dashboard.trend).toBeDefined();
      expect(dashboard.status).toBeDefined();
      expect(dashboard.summary).toBeDefined();
    });

    it('should generate report', () => {
      const monitor = new MemoryMonitoringSystem();
      const report = monitor.generateReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('Global Instances', () => {
    it('should return same instance on multiple calls', () => {
      const manager1 = getAdvancedCacheManager();
      const manager2 = getAdvancedCacheManager();
      expect(manager1).toBe(manager2);
    });

    it('should reset global instance', () => {
      const manager1 = getAdvancedCacheManager();
      manager1.set('key1', 'value1');
      resetAdvancedCacheManager();
      const manager2 = getAdvancedCacheManager();
      expect(manager2.get('key1')).toBeUndefined();
    });
  });

  describe('Integration', () => {
    it('should work together in memory management flow', async () => {
      const cacheManager = getAdvancedCacheManager();
      const gc = getIncrementalGarbageCollector();
      const monitor = getMemoryMonitoringSystem();

      // Add data to cache
      for (let i = 0; i < 50; i++) {
        cacheManager.set(`key${i}`, { data: 'x'.repeat(100) });
      }

      // Perform GC
      await gc.performIncrementalGC();

      // Get monitoring data
      const metrics = monitor.getCurrentMetrics();
      expect(metrics.cacheEntries).toBeGreaterThan(0);

      // Generate report
      const report = monitor.generateReport();
      expect(report).toBeDefined();
    });
  });
});
