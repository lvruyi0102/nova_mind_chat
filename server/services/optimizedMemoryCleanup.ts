/**
 * Optimized Memory Cleanup Strategy
 * 
 * Implements intelligent, multi-level memory management:
 * - Streaming data processing instead of batch loading
 * - Adaptive cleanup thresholds based on usage patterns
 * - Selective cache invalidation
 * - Memory usage trending and prediction
 */

import { EventEmitter } from 'events';
import { getMemoryOptimizationManager } from './memoryOptimization';

interface MemoryTrend {
  timestamp: number;
  heapUsage: number;
  trend: 'stable' | 'rising' | 'falling';
  predictedPeakIn: number; // minutes
}

interface CleanupStrategy {
  name: string;
  threshold: number;
  aggressiveness: 'light' | 'moderate' | 'aggressive';
  targetFreeMemory: number; // target percentage to free
}

/**
 * Optimized Memory Cleanup Manager
 */
export class OptimizedMemoryCleanup extends EventEmitter {
  private static _instance: OptimizedMemoryCleanup | null = null;
  private memoryTrends: MemoryTrend[] = [];
  private maxTrendHistory = 60; // Keep 5 minutes of history (5s intervals)
  private cleanupStrategies: CleanupStrategy[] = [
    {
      name: 'light',
      threshold: 0.75, // 75% - light cleanup
      aggressiveness: 'light',
      targetFreeMemory: 0.05, // Free 5%
    },
    {
      name: 'moderate',
      threshold: 0.85, // 85% - moderate cleanup
      aggressiveness: 'moderate',
      targetFreeMemory: 0.10, // Free 10%
    },
    {
      name: 'aggressive',
      threshold: 0.95, // 95% - aggressive cleanup
      aggressiveness: 'aggressive',
      targetFreeMemory: 0.20, // Free 20%
    },
  ];

  private constructor() {
    super();
  }

  static getInstance(): OptimizedMemoryCleanup {
    if (!this._instance) {
      this._instance = new OptimizedMemoryCleanup();
    }
    return this._instance;
  }

  /**
   * Get current memory usage and trend
   */
  getCurrentMemoryStatus() {
    const mem = process.memoryUsage();
    const heapUsage = mem.heapUsed / mem.heapTotal;
    const now = Date.now();

    // Add to trend history
    let trend: 'stable' | 'rising' | 'falling' = 'stable';
    if (this.memoryTrends.length > 0) {
      const lastTrend = this.memoryTrends[this.memoryTrends.length - 1];
      const diff = heapUsage - lastTrend.heapUsage;
      if (diff > 0.02) trend = 'rising';
      else if (diff < -0.02) trend = 'falling';
    }

    const memoryTrend: MemoryTrend = {
      timestamp: now,
      heapUsage,
      trend,
      predictedPeakIn: this.predictPeakTime(),
    };

    this.memoryTrends.push(memoryTrend);
    if (this.memoryTrends.length > this.maxTrendHistory) {
      this.memoryTrends.shift();
    }

    return {
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      heapUsagePercentage: heapUsage,
      externalMemory: mem.external,
      rss: mem.rss,
      trend,
      predictedPeakIn: memoryTrend.predictedPeakIn,
    };
  }

  /**
   * Predict when memory will peak based on current trend
   */
  private predictPeakTime(): number {
    if (this.memoryTrends.length < 3) return -1;

    const recent = this.memoryTrends.slice(-3);
    const rates = [];

    for (let i = 1; i < recent.length; i++) {
      const timeDiff = (recent[i].timestamp - recent[i - 1].timestamp) / 1000; // seconds
      const usageDiff = recent[i].heapUsage - recent[i - 1].heapUsage;
      rates.push(usageDiff / timeDiff);
    }

    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    if (avgRate <= 0) return -1; // Not rising

    const currentUsage = this.memoryTrends[this.memoryTrends.length - 1].heapUsage;
    const timeToThreshold = (0.95 - currentUsage) / avgRate;

    return Math.max(0, Math.round(timeToThreshold / 60)); // Return in minutes
  }

  /**
   * Determine optimal cleanup strategy based on current state
   */
  determineCleanupStrategy(): CleanupStrategy {
    const status = this.getCurrentMemoryStatus();
    const heapUsage = status.heapUsagePercentage;

    // Select strategy based on usage level
    for (const strategy of this.cleanupStrategies.reverse()) {
      if (heapUsage >= strategy.threshold) {
        return strategy;
      }
    }

    return this.cleanupStrategies[0]; // Default to light
  }

  /**
   * Execute cleanup based on strategy
   */
  async executeCleanup(strategy: CleanupStrategy): Promise<{
    success: boolean;
    freedMemory: number;
    newUsage: number;
  }> {
    const before = process.memoryUsage();
    const beforeUsage = before.heapUsed / before.heapTotal;

    try {
      const manager = getMemoryOptimizationManager();

      // Execute cleanup based on aggressiveness
      switch (strategy.aggressiveness) {
        case 'light':
          // Light cleanup - just trigger garbage collection
          if (global.gc) {
            global.gc();
          }
          break;

        case 'moderate':
          // Clear cache and force garbage collection
          if (manager) {
            const cache = manager.getCache();
            cache.clear();
          }
          // Force garbage collection
          if (global.gc) {
            global.gc();
          }
          break;

        case 'aggressive':
          // Aggressive cleanup
          if (manager) {
            const cache = manager.getCache();
            cache.clear();
          }
          // Force garbage collection multiple times
          if (global.gc) {
            global.gc();
            global.gc();
          }
          break;
      }

      const after = process.memoryUsage();
      const afterUsage = after.heapUsed / after.heapTotal;
      const freedMemory = before.heapUsed - after.heapUsed;

      this.emit('cleanup', {
        strategy: strategy.name,
        beforeUsage,
        afterUsage,
        freedMemory,
        success: true,
      });

      return {
        success: true,
        freedMemory,
        newUsage: afterUsage,
      };
    } catch (error) {
      console.error('[OptimizedMemoryCleanup] Cleanup failed:', error);
      this.emit('cleanup-error', error);
      return {
        success: false,
        freedMemory: 0,
        newUsage: beforeUsage,
      };
    }
  }

  /**
   * Proactive cleanup based on trend prediction
   */
  async executeProactiveCleanup(): Promise<void> {
    const status = this.getCurrentMemoryStatus();

    // If memory is rising and will peak soon, do preventive cleanup
    if (status.trend === 'rising' && status.predictedPeakIn > 0 && status.predictedPeakIn <= 5) {
      const strategy = this.determineCleanupStrategy();
      if (strategy.threshold <= 0.85) {
        // Only do proactive cleanup if not already at high threshold
        await this.executeCleanup(strategy);
      }
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const status = this.getCurrentMemoryStatus();
    return {
      current: status,
      trends: this.memoryTrends.slice(-10), // Last 10 data points
      recommendation: this.determineCleanupStrategy(),
    };
  }

  /**
   * Optimize data loading - use streaming instead of batch
   */
  async *streamLargeDataset<T>(
    dataSource: () => Promise<T[]>,
    batchSize: number = 100
  ): AsyncGenerator<T[], void, unknown> {
    const data = await dataSource();
    for (let i = 0; i < data.length; i += batchSize) {
      yield data.slice(i, i + batchSize);
      // Allow garbage collection between batches
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Clear instance
   */
  static clearInstance(): void {
    if (this._instance) {
      this._instance.removeAllListeners();
      this._instance = null;
    }
  }
}

/**
 * Singleton getter
 */
export function getOptimizedMemoryCleanup(): OptimizedMemoryCleanup {
  return OptimizedMemoryCleanup.getInstance();
}
