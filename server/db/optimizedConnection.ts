import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "../_core/env";

let _db: any = null;
let _pool: mysql.Pool | null = null;
let _queryCache: Map<string, { data: unknown; timestamp: number }> = new Map();

const CACHE_TTL = 5000; // 5 seconds cache TTL
const MAX_CACHE_SIZE = 100; // Maximum number of cached queries
const POOL_CONFIG = {
  connectionLimit: 5, // Reduced from default 10 to 5
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
};

/**
 * Initialize database connection pool with optimized settings
 */
export async function initializeOptimizedDb() {
  if (_db) return _db;

  try {
    const pool = await mysql.createPool({
      ...POOL_CONFIG,
      uri: process.env.DATABASE_URL,
    });

    _pool = pool;
    _db = drizzle(pool);

    console.log("[Database] Optimized connection pool initialized with max 5 connections");
    return _db;
  } catch (error) {
    console.error("[Database] Failed to initialize optimized connection:", error);
    _db = null;
    return null;
  }
}

/**
 * Get database instance with lazy initialization
 */
export async function getOptimizedDb() {
  if (!_db && process.env.DATABASE_URL) {
    return initializeOptimizedDb();
  }
  return _db;
}

/**
 * Execute query with caching
 */
export async function executeWithCache<T>(
  key: string,
  queryFn: () => Promise<T>
): Promise<T> {
  // Check cache
  const cached = _queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }

  // Execute query
  const result = await queryFn();

  // Update cache
  _queryCache.set(key, { data: result, timestamp: Date.now() });

  // Cleanup old cache entries if size exceeds limit
  if (_queryCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(_queryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    toDelete.forEach(([k]) => _queryCache.delete(k));
  }

  return result;
}

/**
 * Clear all cached queries
 */
export function clearQueryCache() {
  const size = _queryCache.size;
  _queryCache.clear();
  console.log(`[Database] Cleared ${size} cached queries`);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cacheSize: _queryCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
    cacheTTL: CACHE_TTL,
  };
}

/**
 * Close database connection pool
 */
export async function closeOptimizedDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
    _queryCache.clear();
    console.log("[Database] Connection pool closed");
  }
}
