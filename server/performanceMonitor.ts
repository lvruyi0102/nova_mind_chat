/**
 * Performance Monitor - Tracks memory usage and system health
 */

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number; // Resident Set Size
  timestamp: number;
}

interface PerformanceAlert {
  type: "memory" | "cpu" | "database";
  severity: "warning" | "critical";
  message: string;
  timestamp: number;
}

// Store metrics history
const metricsHistory: MemoryMetrics[] = [];
const maxHistorySize = 100;
const alerts: PerformanceAlert[] = [];
const maxAlertsSize = 50;

// Thresholds
const MEMORY_WARNING_THRESHOLD = 0.75; // 75% of heap
const MEMORY_CRITICAL_THRESHOLD = 0.9; // 90% of heap
const CHECK_INTERVAL = 30 * 1000; // 30 seconds

let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Get current memory metrics
 */
function getMemoryMetrics(): MemoryMetrics {
  const memUsage = process.memoryUsage();
  return {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    rss: memUsage.rss,
    timestamp: Date.now(),
  };
}

/**
 * Check memory usage and generate alerts
 */
function checkMemoryHealth() {
  const metrics = getMemoryMetrics();
  const heapUsagePercent = metrics.heapUsed / metrics.heapTotal;

  // Add to history
  metricsHistory.push(metrics);
  if (metricsHistory.length > maxHistorySize) {
    metricsHistory.shift();
  }

  // Check thresholds
  if (heapUsagePercent >= MEMORY_CRITICAL_THRESHOLD) {
    addAlert({
      type: "memory",
      severity: "critical",
      message: `Critical memory usage: ${(heapUsagePercent * 100).toFixed(1)}% of heap used`,
    });

    console.error(
      `[PerformanceMonitor] CRITICAL: Heap usage at ${(heapUsagePercent * 100).toFixed(1)}%`
    );

    // Attempt garbage collection if available
    if (global.gc) {
      console.log("[PerformanceMonitor] Triggering garbage collection...");
      global.gc();
    }
  } else if (heapUsagePercent >= MEMORY_WARNING_THRESHOLD) {
    addAlert({
      type: "memory",
      severity: "warning",
      message: `High memory usage: ${(heapUsagePercent * 100).toFixed(1)}% of heap used`,
    });

    console.warn(
      `[PerformanceMonitor] WARNING: Heap usage at ${(heapUsagePercent * 100).toFixed(1)}%`
    );
  }

  return metrics;
}

/**
 * Add an alert to the history
 */
function addAlert(alert: Omit<PerformanceAlert, "timestamp">) {
  const fullAlert: PerformanceAlert = {
    ...alert,
    timestamp: Date.now(),
  };

  alerts.push(fullAlert);
  if (alerts.length > maxAlertsSize) {
    alerts.shift();
  }

  console.log(`[PerformanceMonitor] [${alert.severity.toUpperCase()}] ${alert.message}`);
}

/**
 * Start monitoring
 */
export function startMonitoring() {
  if (monitoringInterval) {
    console.log("[PerformanceMonitor] Already monitoring");
    return;
  }

  console.log("[PerformanceMonitor] Starting performance monitoring...");

  // Check immediately
  checkMemoryHealth();

  // Check periodically
  monitoringInterval = setInterval(() => {
    checkMemoryHealth();
  }, CHECK_INTERVAL);
}

/**
 * Stop monitoring
 */
export function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  console.log("[PerformanceMonitor] Stopped");
}

/**
 * Get current metrics
 */
export function getCurrentMetrics() {
  const metrics = getMemoryMetrics();
  const heapUsagePercent = metrics.heapUsed / metrics.heapTotal;

  return {
    heapUsed: Math.round(metrics.heapUsed / 1024 / 1024), // MB
    heapTotal: Math.round(metrics.heapTotal / 1024 / 1024), // MB
    heapUsagePercent: (heapUsagePercent * 100).toFixed(1),
    rss: Math.round(metrics.rss / 1024 / 1024), // MB
    external: Math.round(metrics.external / 1024 / 1024), // MB
    timestamp: metrics.timestamp,
  };
}

/**
 * Get metrics history
 */
export function getMetricsHistory() {
  return metricsHistory.map((m) => ({
    heapUsed: Math.round(m.heapUsed / 1024 / 1024),
    heapTotal: Math.round(m.heapTotal / 1024 / 1024),
    heapUsagePercent: ((m.heapUsed / m.heapTotal) * 100).toFixed(1),
    timestamp: m.timestamp,
  }));
}

/**
 * Get recent alerts
 */
export function getRecentAlerts(limit: number = 10) {
  return alerts.slice(-limit);
}

/**
 * Get health status
 */
export function getHealthStatus() {
  const metrics = getCurrentMetrics();
  const recentAlerts = getRecentAlerts(5);
  const hasWarnings = recentAlerts.some((a) => a.severity === "warning");
  const hasCritical = recentAlerts.some((a) => a.severity === "critical");

  let status: "healthy" | "warning" | "critical" = "healthy";
  if (hasCritical) status = "critical";
  else if (hasWarnings) status = "warning";

  return {
    status,
    metrics,
    recentAlerts,
  };
}

/**
 * Force garbage collection (if available)
 */
export function forceGarbageCollection() {
  if (global.gc) {
    console.log("[PerformanceMonitor] Forcing garbage collection...");
    global.gc();
    return true;
  }
  console.warn("[PerformanceMonitor] Garbage collection not available (run with --expose-gc)");
  return false;
}
