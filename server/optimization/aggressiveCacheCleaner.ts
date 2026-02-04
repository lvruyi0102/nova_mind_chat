/**
 * Aggressive Cache Cleaner
 * Implements aggressive memory cleanup strategies when heap usage is high
 */

interface CacheEntry {
  key: string;
  size: number;
  lastAccessed: number;
  accessCount: number;
}

class AggressiveCacheCleaner {
  private caches: Map<string, Map<string, unknown>> = new Map();
  private cacheMetadata: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private heapThreshold = 0.85; // Start aggressive cleanup at 85% heap usage
  private criticalThreshold = 0.95; // Emergency cleanup at 95% heap usage

  /**
   * Register a cache for management
   */
  registerCache(cacheName: string, cache: Map<string, unknown>) {
    this.caches.set(cacheName, cache);
    console.log(`[AggressiveCacheCleaner] Registered cache: ${cacheName}`);
  }

  /**
   * Start the aggressive cleanup monitor
   */
  start() {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(() => {
      this.checkAndClean();
    }, 5000); // Check every 5 seconds

    console.log("[AggressiveCacheCleaner] Started monitoring");
  }

  /**
   * Stop the cleanup monitor
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log("[AggressiveCacheCleaner] Stopped monitoring");
    }
  }

  /**
   * Get current heap usage percentage
   */
  private getHeapUsagePercent(): number {
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;
    return heapUsed / heapTotal;
  }

  /**
   * Check heap usage and trigger cleanup if needed
   */
  private checkAndClean() {
    const heapPercent = this.getHeapUsagePercent();

    if (heapPercent >= this.criticalThreshold) {
      console.log(
        `[AggressiveCacheCleaner] CRITICAL: Heap at ${(heapPercent * 100).toFixed(1)}%, triggering emergency cleanup`
      );
      this.emergencyCleanup();
    } else if (heapPercent >= this.heapThreshold) {
      console.log(
        `[AggressiveCacheCleaner] HIGH: Heap at ${(heapPercent * 100).toFixed(1)}%, triggering aggressive cleanup`
      );
      this.aggressiveCleanup();
    }
  }

  /**
   * Aggressive cleanup: Remove 50% of least accessed items
   */
  private aggressiveCleanup() {
    for (const [cacheName, cache] of this.caches.entries()) {
      const targetSize = Math.floor(cache.size * 0.5); // Remove 50%
      this.cleanupCache(cacheName, targetSize);
    }

    // Force garbage collection hint
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Emergency cleanup: Clear all caches
   */
  private emergencyCleanup() {
    console.log("[AggressiveCacheCleaner] EMERGENCY: Clearing all caches");

    for (const [cacheName, cache] of this.caches.entries()) {
      const size = cache.size;
      cache.clear();
      console.log(`[AggressiveCacheCleaner] Cleared cache: ${cacheName} (${size} entries)`);
    }

    this.cacheMetadata.clear();

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Clean a specific cache by removing least accessed items
   */
  private cleanupCache(cacheName: string, targetSize: number) {
    const cache = this.caches.get(cacheName);
    if (!cache || cache.size <= targetSize) return;

    // Get all keys and sort by access count
    const entries = Array.from(cache.keys())
      .map((key) => ({
        key,
        metadata: this.cacheMetadata.get(key) || {
          key,
          size: 0,
          lastAccessed: 0,
          accessCount: 0,
        },
      }))
      .sort((a, b) => a.metadata.accessCount - b.metadata.accessCount);

    // Remove least accessed items
    const toRemove = entries.length - targetSize;
    for (let i = 0; i < toRemove; i++) {
      const key = entries[i].key;
      cache.delete(key);
      this.cacheMetadata.delete(key);
    }

    console.log(
      `[AggressiveCacheCleaner] Cleaned ${cacheName}: removed ${toRemove} entries, remaining: ${cache.size}`
    );
  }

  /**
   * Track cache access for LRU optimization
   */
  trackAccess(cacheName: string, key: string) {
    let metadata = this.cacheMetadata.get(key);
    if (!metadata) {
      metadata = {
        key,
        size: 0,
        lastAccessed: Date.now(),
        accessCount: 0,
      };
      this.cacheMetadata.set(key, metadata);
    }

    metadata.lastAccessed = Date.now();
    metadata.accessCount++;
  }

  /**
   * Get cleanup statistics
   */
  getStats() {
    const heapPercent = this.getHeapUsagePercent();
    const cacheStats: Record<string, number> = {};

    for (const [cacheName, cache] of this.caches.entries()) {
      cacheStats[cacheName] = cache.size;
    }

    return {
      heapUsagePercent: (heapPercent * 100).toFixed(1),
      caches: cacheStats,
      totalCacheEntries: this.cacheMetadata.size,
    };
  }
}

// Singleton instance
let _instance: AggressiveCacheCleaner | null = null;

export function getAggressiveCacheCleaner(): AggressiveCacheCleaner {
  if (!_instance) {
    _instance = new AggressiveCacheCleaner();
  }
  return _instance;
}

export function initializeAggressiveCacheCleaner() {
  const cleaner = getAggressiveCacheCleaner();
  cleaner.start();
  return cleaner;
}
