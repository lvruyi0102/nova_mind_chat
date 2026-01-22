/**
 * Memory Optimization Service for Nova-Mind
 * 
 * Implements aggressive cache cleanup strategies and streaming processing
 * to reduce heap memory usage from 94%+ to target 70% or below
 */

import { EventEmitter } from 'events';

/**
 * Cache entry with TTL and size tracking
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  size: number;
}

/**
 * Memory usage statistics
 */
interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapUsagePercentage: number;
  external: number;
  rss: number;
  timestamp: number;
}

/**
 * Aggressive LRU Cache with automatic cleanup
 */
export class AggressiveLRUCache<T> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private maxSize: number;
  private maxEntries: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private memoryThreshold: number; // 80% heap usage triggers cleanup
  private aggressiveThreshold: number; // 90% heap usage triggers aggressive cleanup

  constructor(
    maxSize: number = 50 * 1024 * 1024, // 50MB default
    maxEntries: number = 1000,
    memoryThreshold: number = 0.8,
    aggressiveThreshold: number = 0.9
  ) {
    super();
    this.maxSize = maxSize;
    this.maxEntries = maxEntries;
    this.memoryThreshold = memoryThreshold;
    this.aggressiveThreshold = aggressiveThreshold;
    this.startAutoCleanup();
  }

  /**
   * Set value in cache with TTL
   */
  set(key: string, value: T, ttl: number = 5 * 60 * 1000): void {
    // Estimate size (rough approximation)
    const size = JSON.stringify(value).length;

    // Check if adding this entry would exceed limits
    if (this.getTotalSize() + size > this.maxSize) {
      this.evictLRU();
    }

    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      size,
    });

    // Update access order
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    this.emit('set', { key, size });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return undefined;
    }

    // Update access order (move to end)
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);

    return entry.value;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const keyToEvict = this.accessOrder.shift();
    if (keyToEvict) {
      const entry = this.cache.get(keyToEvict);
      this.cache.delete(keyToEvict);
      this.emit('evict', { key: keyToEvict, size: entry?.size || 0 });
    }
  }

  /**
   * Get total cache size in bytes
   */
  private getTotalSize(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Clear expired entries
   */
  private clearExpired(): void {
    const now = Date.now();
    let clearedSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        clearedSize += entry.size;
      }
    }

    if (clearedSize > 0) {
      this.emit('cleanup', { clearedSize, reason: 'expired' });
    }
  }

  /**
   * Aggressive cleanup when memory usage is high
   */
  private aggressiveCleanup(): void {
    const stats = this.getMemoryStats();
    const usagePercentage = stats.heapUsagePercentage;

    if (usagePercentage > this.aggressiveThreshold) {
      // Remove 50% of cache entries
      const entriesToRemove = Math.ceil(this.cache.size * 0.5);
      let removedSize = 0;

      for (let i = 0; i < entriesToRemove; i++) {
        const key = this.accessOrder.shift();
        if (key) {
          const entry = this.cache.get(key);
          this.cache.delete(key);
          removedSize += entry?.size || 0;
        }
      }

      this.emit('cleanup', { 
        clearedSize: removedSize, 
        reason: 'aggressive',
        heapUsage: usagePercentage,
      });
    } else if (usagePercentage > this.memoryThreshold) {
      // Remove 25% of cache entries
      const entriesToRemove = Math.ceil(this.cache.size * 0.25);
      let removedSize = 0;

      for (let i = 0; i < entriesToRemove; i++) {
        const key = this.accessOrder.shift();
        if (key) {
          const entry = this.cache.get(key);
          this.cache.delete(key);
          removedSize += entry?.size || 0;
        }
      }

      this.emit('cleanup', { 
        clearedSize: removedSize, 
        reason: 'normal',
        heapUsage: usagePercentage,
      });
    }
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.clearExpired();
      this.aggressiveCleanup();
    }, 30 * 1000); // Run every 30 seconds

    // Allow interval to be garbage collected if needed
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Stop automatic cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: number;
    totalSize: number;
  } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
      totalSize: this.getTotalSize(),
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsagePercentage: memUsage.heapUsed / memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.emit('clear', { reason: 'manual' });
  }
}

/**
 * Streaming processor for large datasets
 */
export class StreamingProcessor<T, R> {
  private batchSize: number;
  private processingDelay: number;

  constructor(batchSize: number = 100, processingDelay: number = 10) {
    this.batchSize = batchSize;
    this.processingDelay = processingDelay;
  }

  /**
   * Process large array in batches with streaming
   */
  async *processBatches<U, V>(
    items: U[],
    processor: (batch: U[]) => Promise<V[]>
  ): AsyncGenerator<V[], void, unknown> {
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const results = await processor(batch);
      
      yield results;

      // Add small delay to prevent memory spike
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }
  }

  /**
   * Process with memory monitoring
   */
  async processWithMonitoring<U, V>(
    items: U[],
    processor: (batch: U[]) => Promise<V[]>,
    onMemoryWarning?: (stats: MemoryStats) => void
  ): Promise<V[]> {
    const results: V[] = [];
    const memoryThreshold = 0.85; // 85% heap usage

    for await (const batchResults of this.processBatches<U, V>(items, processor)) {
      results.push(...batchResults);

      // Check memory usage
      const memUsage = process.memoryUsage();
      const heapUsage = memUsage.heapUsed / memUsage.heapTotal;

      if (heapUsage > memoryThreshold && onMemoryWarning) {
        onMemoryWarning({
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          heapUsagePercentage: heapUsage,
          external: memUsage.external,
          rss: memUsage.rss,
          timestamp: Date.now(),
        });

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }

    return results;
  }
}

/**
 * Memory monitoring service
 */
export class MemoryMonitor extends EventEmitter {
  private monitorInterval: NodeJS.Timeout | null = null;
  private warningThreshold: number;
  private criticalThreshold: number;
  private lastStats: MemoryStats | null = null;

  constructor(
    warningThreshold: number = 0.80,
    criticalThreshold: number = 0.94
  ) {
    super();
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  /**
   * Start monitoring memory usage
   */
  start(interval: number = 10 * 1000): void {
    this.monitorInterval = setInterval(() => {
      this.checkMemory();
    }, interval);

    // Allow interval to be garbage collected if needed
    if (this.monitorInterval.unref) {
      this.monitorInterval.unref();
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): void {
    const memUsage = process.memoryUsage();
    const heapUsage = memUsage.heapUsed / memUsage.heapTotal;

    const stats: MemoryStats = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsagePercentage: heapUsage,
      external: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now(),
    };

    this.lastStats = stats;

    if (heapUsage > this.criticalThreshold) {
      this.emit('critical', stats);
      console.error(`[MemoryMonitor] CRITICAL: Heap usage at ${(heapUsage * 100).toFixed(1)}%`);

      // Trigger aggressive cleanup
      if (global.gc) {
        global.gc();
      }
    } else if (heapUsage > this.warningThreshold) {
      this.emit('warning', stats);
      console.warn(`[MemoryMonitor] WARNING: Heap usage at ${(heapUsage * 100).toFixed(1)}%`);
    } else {
      this.emit('normal', stats);
    }
  }

  /**
   * Get last recorded stats
   */
  getLastStats(): MemoryStats | null {
    return this.lastStats;
  }

  /**
   * Get current memory stats
   */
  getCurrentStats(): MemoryStats {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapUsagePercentage: memUsage.heapUsed / memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      timestamp: Date.now(),
    };
  }
}

/**
 * Global memory optimization manager
 */
export class MemoryOptimizationManager {
  private cache: AggressiveLRUCache<any>;
  private monitor: MemoryMonitor;
  private streamProcessor: StreamingProcessor<any, any>;

  constructor() {
    this.cache = new AggressiveLRUCache(
      100 * 1024 * 1024, // 100MB
      2000,
      0.80,
      0.94
    );
    this.monitor = new MemoryMonitor(0.80, 0.94);
    this.streamProcessor = new StreamingProcessor(100, 10);

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.monitor.on('critical', (stats) => {
      console.error('[MemoryOptimization] CRITICAL memory usage detected');
      // Clear cache aggressively
      this.cache.clear();
    });

    this.monitor.on('warning', (stats) => {
      console.warn('[MemoryOptimization] WARNING: High memory usage');
    });

    this.cache.on('cleanup', (event) => {
      console.log(`[MemoryOptimization] Cache cleanup: ${event.reason}`, event);
    });
  }

  /**
   * Start monitoring
   */
  start(): void {
    this.monitor.start();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.monitor.stop();
    this.cache.stop();
  }

  /**
   * Get cache instance
   */
  getCache(): AggressiveLRUCache<any> {
    return this.cache;
  }

  /**
   * Get monitor instance
   */
  getMonitor(): MemoryMonitor {
    return this.monitor;
  }

  /**
   * Get stream processor
   */
  getStreamProcessor(): StreamingProcessor<any, any> {
    return this.streamProcessor;
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      cache: this.cache.getStats(),
      memory: this.monitor.getCurrentStats(),
    };
  }
}

// Global instance
let globalManager: MemoryOptimizationManager | null = null;

/**
 * Get global memory optimization manager
 */
export function getMemoryOptimizationManager(): MemoryOptimizationManager {
  if (!globalManager) {
    globalManager = new MemoryOptimizationManager();
  }
  return globalManager;
}

/**
 * Initialize global memory optimization
 */
export function initializeMemoryOptimization(): void {
  const manager = getMemoryOptimizationManager();
  manager.start();
  console.log('[MemoryOptimization] Initialized and started');
}
