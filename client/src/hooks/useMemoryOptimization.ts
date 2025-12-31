/**
 * useMemoryOptimization Hook
 * Manages client-side memory usage and caching
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

interface MemoryOptimizationConfig {
  maxCacheSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  enableCompression: boolean;
}

const DEFAULT_CONFIG: MemoryOptimizationConfig = {
  maxCacheSize: 50,
  defaultTTL: 5 * 60 * 1000,
  cleanupInterval: 60 * 1000,
  enableCompression: true,
};

class ClientMemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: MemoryOptimizationConfig;

  constructor(config: Partial<MemoryOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  set<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.size >= this.config.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      removed++;
    });

    return removed;
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      utilizationPercent: (this.cache.size / this.config.maxCacheSize) * 100,
    };
  }
}

const globalCache = new ClientMemoryCache();

/**
 * Hook for memory optimization
 */
export function useMemoryOptimization(config?: Partial<MemoryOptimizationConfig>) {
  const cacheRef = useRef(globalCache);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (config) {
      cacheRef.current = new ClientMemoryCache(config);
    }

    cleanupIntervalRef.current = setInterval(() => {
      const removed = cacheRef.current.cleanup();
      if (removed > 0) {
        console.log(`[MemoryOptimization] Cleaned up ${removed} expired cache entries`);
      }
    }, config?.cleanupInterval || DEFAULT_CONFIG.cleanupInterval);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [config]);

  const setCached = useCallback(
    <T,>(key: string, data: T, ttl?: number) => {
      cacheRef.current.set(key, data, ttl);
    },
    []
  );

  const getCached = useCallback(<T,>(key: string): T | null => {
    return cacheRef.current.get<T>(key);
  }, []);

  const hasCached = useCallback((key: string): boolean => {
    return cacheRef.current.has(key);
  }, []);

  const deleteCached = useCallback((key: string) => {
    cacheRef.current.delete(key);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheRef.current.getStats();
  }, []);

  const forceGarbageCollection = useCallback(() => {
    if ((window as any).gc) {
      (window as any).gc();
      console.log('[MemoryOptimization] Garbage collection triggered');
    }
  }, []);

  const getMemoryUsage = useCallback(() => {
    const perf = performance as any;
    if (!perf.memory) {
      return null;
    }

    return {
      usedJSHeapSize: perf.memory.usedJSHeapSize,
      totalJSHeapSize: perf.memory.totalJSHeapSize,
      jsHeapSizeLimit: perf.memory.jsHeapSizeLimit,
      utilizationPercent:
        (perf.memory.usedJSHeapSize / perf.memory.jsHeapSizeLimit) * 100,
    };
  }, []);

  return {
    setCached,
    getCached,
    hasCached,
    deleteCached,
    clearCache,
    getCacheStats,
    forceGarbageCollection,
    getMemoryUsage,
  };
}

/**
 * Hook for managing large lists with virtual scrolling
 */
export function useVirtualizedList<T extends any>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 5);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + 5
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    offsetY,
    startIndex,
    endIndex,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    },
  };
}

/**
 * Hook for debouncing expensive operations
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling expensive operations
 */
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const handler = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(handler);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const img = new Image();

    const handleLoad = () => {
      setImageSrc(src);
      setIsLoading(false);
    };

    const handleError = (err: any) => {
      setError(err);
      setIsLoading(false);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    img.src = src;

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src]);

  return { imageSrc, isLoading, error };
}

export { ClientMemoryCache, globalCache };
