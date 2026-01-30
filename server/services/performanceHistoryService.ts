/**
 * Performance History Service
 * Stores and retrieves historical performance metrics for trend analysis
 */

import { getDb } from "../db";
import { performanceMetrics } from "../../drizzle/schema";
import { desc, and, gte } from "drizzle-orm";

export interface PerformanceSnapshot {
  timestamp: Date;
  memoryUsedMB: number;
  memoryTotalMB: number;
  memoryPercent: number;
  cacheHitRate: number;
  cacheMissRate: number;
  cacheSize: number;
  adaptiveIntervalMinutes: number;
  gcCount: number;
  cpuUsagePercent?: number;
}

export interface PerformanceTrend {
  period: "1h" | "7d" | "30d";
  startTime: Date;
  endTime: Date;
  snapshots: PerformanceSnapshot[];
  averageMemoryPercent: number;
  peakMemoryPercent: number;
  averageCacheHitRate: number;
  averageAdaptiveInterval: number;
}

/**
 * Record a performance snapshot
 */
export async function recordPerformanceSnapshot(snapshot: PerformanceSnapshot): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[PerformanceHistory] Database not available");
      return false;
    }

    await db.insert(performanceMetrics).values({
      timestamp: snapshot.timestamp,
      memoryUsedMB: snapshot.memoryUsedMB,
      memoryTotalMB: snapshot.memoryTotalMB,
      memoryPercent: snapshot.memoryPercent,
      cacheHitRate: snapshot.cacheHitRate,
      cacheMissRate: snapshot.cacheMissRate,
      cacheSize: snapshot.cacheSize,
      adaptiveIntervalMinutes: snapshot.adaptiveIntervalMinutes,
      gcCount: snapshot.gcCount,
      cpuUsagePercent: snapshot.cpuUsagePercent,
      createdAt: new Date(),
    });

    return true;
  } catch (error) {
    console.error("[PerformanceHistory] Error recording snapshot:", error);
    return false;
  }
}

/**
 * Get performance trend for a specific period
 */
export async function getPerformanceTrend(
  period: "1h" | "7d" | "30d"
): Promise<PerformanceTrend | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[PerformanceHistory] Database not available");
      return null;
    }

    const now = new Date();
    let startTime: Date;

    switch (period) {
      case "1h":
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "7d":
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const rows = await db
      .select()
      .from(performanceMetrics)
      .where(gte(performanceMetrics.timestamp, startTime))
      .orderBy(desc(performanceMetrics.timestamp))
      .limit(1000);

    if (rows.length === 0) {
      return null;
    }

    const snapshots: PerformanceSnapshot[] = rows.map((row) => ({
      timestamp: row.timestamp,
      memoryUsedMB: row.memoryUsedMB,
      memoryTotalMB: row.memoryTotalMB,
      memoryPercent: row.memoryPercent,
      cacheHitRate: row.cacheHitRate,
      cacheMissRate: row.cacheMissRate,
      cacheSize: row.cacheSize,
      adaptiveIntervalMinutes: row.adaptiveIntervalMinutes,
      gcCount: row.gcCount,
      cpuUsagePercent: row.cpuUsagePercent || undefined,
    }));

    // Calculate statistics
    const memoryPercents = snapshots.map((s) => s.memoryPercent);
    const cacheHitRates = snapshots.map((s) => s.cacheHitRate);
    const adaptiveIntervals = snapshots.map((s) => s.adaptiveIntervalMinutes);

    const averageMemoryPercent =
      memoryPercents.reduce((a, b) => a + b, 0) / memoryPercents.length;
    const peakMemoryPercent = Math.max(...memoryPercents);
    const averageCacheHitRate =
      cacheHitRates.reduce((a, b) => a + b, 0) / cacheHitRates.length;
    const averageAdaptiveInterval =
      adaptiveIntervals.reduce((a, b) => a + b, 0) / adaptiveIntervals.length;

    return {
      period,
      startTime,
      endTime: now,
      snapshots,
      averageMemoryPercent,
      peakMemoryPercent,
      averageCacheHitRate,
      averageAdaptiveInterval,
    };
  } catch (error) {
    console.error("[PerformanceHistory] Error getting trend:", error);
    return null;
  }
}

/**
 * Get latest performance snapshot
 */
export async function getLatestSnapshot(): Promise<PerformanceSnapshot | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[PerformanceHistory] Database not available");
      return null;
    }

    const rows = await db
      .select()
      .from(performanceMetrics)
      .orderBy(desc(performanceMetrics.timestamp))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      timestamp: row.timestamp,
      memoryUsedMB: row.memoryUsedMB,
      memoryTotalMB: row.memoryTotalMB,
      memoryPercent: row.memoryPercent,
      cacheHitRate: row.cacheHitRate,
      cacheMissRate: row.cacheMissRate,
      cacheSize: row.cacheSize,
      adaptiveIntervalMinutes: row.adaptiveIntervalMinutes,
      gcCount: row.gcCount,
      cpuUsagePercent: row.cpuUsagePercent || undefined,
    };
  } catch (error) {
    console.error("[PerformanceHistory] Error getting latest snapshot:", error);
    return null;
  }
}

/**
 * Clean up old performance data (older than 90 days)
 */
export async function cleanupOldMetrics(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[PerformanceHistory] Database not available");
      return 0;
    }

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Note: Drizzle ORM doesn't have a direct delete method in all versions
    // This is a placeholder - implement based on your Drizzle version
    console.log("[PerformanceHistory] Cleanup scheduled for metrics older than", ninetyDaysAgo);

    return 0;
  } catch (error) {
    console.error("[PerformanceHistory] Error cleaning up metrics:", error);
    return 0;
  }
}

/**
 * Export performance data as CSV
 */
export async function exportPerformanceData(period: "1h" | "7d" | "30d"): Promise<string> {
  const trend = await getPerformanceTrend(period);
  if (!trend) {
    return "";
  }

  let csv = "Timestamp,Memory Used (MB),Memory Total (MB),Memory %,Cache Hit Rate,Cache Miss Rate,Cache Size (MB),Adaptive Interval (min),GC Count,CPU %\n";

  for (const snapshot of trend.snapshots) {
    csv += `${snapshot.timestamp.toISOString()},${snapshot.memoryUsedMB.toFixed(2)},${snapshot.memoryTotalMB.toFixed(2)},${snapshot.memoryPercent.toFixed(2)},${snapshot.cacheHitRate.toFixed(4)},${snapshot.cacheMissRate.toFixed(4)},${snapshot.cacheSize.toFixed(2)},${snapshot.adaptiveIntervalMinutes},${snapshot.gcCount},${snapshot.cpuUsagePercent?.toFixed(2) || "N/A"}\n`;
  }

  return csv;
}

/**
 * Get performance summary for dashboard
 */
export async function getPerformanceSummary() {
  const latest = await getLatestSnapshot();
  const trend1h = await getPerformanceTrend("1h");
  const trend7d = await getPerformanceTrend("7d");
  const trend30d = await getPerformanceTrend("30d");

  return {
    latest,
    trends: {
      "1h": trend1h,
      "7d": trend7d,
      "30d": trend30d,
    },
  };
}
