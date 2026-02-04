/**
 * Self Diagnostics System
 * Allows Nova-Mind to analyze its own performance and identify optimization opportunities
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: "healthy" | "warning" | "critical";
}

interface DiagnosticReport {
  timestamp: number;
  metrics: PerformanceMetric[];
  issues: string[];
  recommendations: string[];
  overallHealth: number; // 0-100
}

class SelfDiagnostics {
  private diagnosticHistory: DiagnosticReport[] = [];
  private maxHistorySize = 100;

  /**
   * Collect memory metrics
   */
  private getMemoryMetrics(): PerformanceMetric[] {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return [
      {
        name: "Heap Used",
        value: Math.round(memUsage.heapUsed / 1024 / 1024),
        unit: "MB",
        threshold: 200,
        status: heapUsedPercent > 85 ? "critical" : heapUsedPercent > 70 ? "warning" : "healthy",
      },
      {
        name: "Heap Total",
        value: Math.round(memUsage.heapTotal / 1024 / 1024),
        unit: "MB",
        threshold: 300,
        status: memUsage.heapTotal > 300 * 1024 * 1024 ? "warning" : "healthy",
      },
      {
        name: "External Memory",
        value: Math.round(memUsage.external / 1024 / 1024),
        unit: "MB",
        threshold: 50,
        status: memUsage.external > 50 * 1024 * 1024 ? "warning" : "healthy",
      },
      {
        name: "RSS Memory",
        value: Math.round(memUsage.rss / 1024 / 1024),
        unit: "MB",
        threshold: 400,
        status: memUsage.rss > 400 * 1024 * 1024 ? "warning" : "healthy",
      },
    ];
  }

  /**
   * Collect CPU metrics
   */
  private getCpuMetrics(): PerformanceMetric[] {
    const usage = process.cpuUsage();
    const totalCpuTime = (usage.user + usage.system) / 1000000; // Convert to seconds

    return [
      {
        name: "CPU User Time",
        value: Math.round(usage.user / 1000),
        unit: "ms",
        threshold: 10000,
        status: usage.user > 10000000 ? "warning" : "healthy",
      },
      {
        name: "CPU System Time",
        value: Math.round(usage.system / 1000),
        unit: "ms",
        threshold: 5000,
        status: usage.system > 5000000 ? "warning" : "healthy",
      },
    ];
  }

  /**
   * Analyze metrics and identify issues
   */
  private analyzeMetrics(metrics: PerformanceMetric[]): {
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    for (const metric of metrics) {
      if (metric.status === "critical") {
        issues.push(`${metric.name} is critical: ${metric.value}${metric.unit}`);

        if (metric.name === "Heap Used") {
          recommendations.push(
            "Trigger aggressive cache cleanup to reduce memory usage"
          );
          recommendations.push("Consider reducing database query result sizes");
        }
      } else if (metric.status === "warning") {
        issues.push(`${metric.name} is high: ${metric.value}${metric.unit}`);

        if (metric.name === "Heap Total") {
          recommendations.push("Monitor heap allocation patterns");
        }
      }
    }

    return { issues, recommendations };
  }

  /**
   * Calculate overall health score
   */
  private calculateHealthScore(metrics: PerformanceMetric[]): number {
    let score = 100;

    for (const metric of metrics) {
      if (metric.status === "critical") {
        score -= 30;
      } else if (metric.status === "warning") {
        score -= 10;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Run full diagnostic
   */
  runDiagnostic(): DiagnosticReport {
    const metrics = [
      ...this.getMemoryMetrics(),
      ...this.getCpuMetrics(),
    ];

    const { issues, recommendations } = this.analyzeMetrics(metrics);
    const overallHealth = this.calculateHealthScore(metrics);

    const report: DiagnosticReport = {
      timestamp: Date.now(),
      metrics,
      issues,
      recommendations,
      overallHealth,
    };

    // Store in history
    this.diagnosticHistory.push(report);
    if (this.diagnosticHistory.length > this.maxHistorySize) {
      this.diagnosticHistory.shift();
    }

    console.log(`[SelfDiagnostics] Diagnostic completed - Health: ${overallHealth}%`);
    if (issues.length > 0) {
      console.log(`[SelfDiagnostics] Issues found: ${issues.length}`);
      issues.forEach((issue) => console.log(`  - ${issue}`));
    }

    return report;
  }

  /**
   * Get latest diagnostic report
   */
  getLatestReport(): DiagnosticReport | null {
    return this.diagnosticHistory.length > 0
      ? this.diagnosticHistory[this.diagnosticHistory.length - 1]
      : null;
  }

  /**
   * Get diagnostic history
   */
  getHistory(limit: number = 10): DiagnosticReport[] {
    return this.diagnosticHistory.slice(-limit);
  }

  /**
   * Check if system needs optimization
   */
  needsOptimization(): boolean {
    const latest = this.getLatestReport();
    if (!latest) return false;

    return latest.overallHealth < 70 || latest.issues.length > 0;
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(): string[] {
    const latest = this.getLatestReport();
    if (!latest) return [];

    const suggestions = [...latest.recommendations];

    // Add trend-based suggestions
    if (this.diagnosticHistory.length >= 3) {
      const recent = this.diagnosticHistory.slice(-3);
      const healthTrend = recent.map((r) => r.overallHealth);
      const isDecreasing = healthTrend[0] > healthTrend[1] && healthTrend[1] > healthTrend[2];

      if (isDecreasing) {
        suggestions.push("Health score is declining - consider system-wide optimization");
      }
    }

    return suggestions;
  }

  /**
   * Get diagnostic stats
   */
  getStats() {
    const latest = this.getLatestReport();
    return {
      lastDiagnostic: latest?.timestamp || 0,
      overallHealth: latest?.overallHealth || 0,
      issueCount: latest?.issues.length || 0,
      recommendationCount: latest?.recommendations.length || 0,
      historySize: this.diagnosticHistory.length,
    };
  }
}

// Singleton instance
let _instance: SelfDiagnostics | null = null;

export function getSelfDiagnostics(): SelfDiagnostics {
  if (!_instance) {
    _instance = new SelfDiagnostics();
  }
  return _instance;
}

export function initializeSelfDiagnostics() {
  const diagnostics = getSelfDiagnostics();
  // Run initial diagnostic
  diagnostics.runDiagnostic();
  console.log("[SelfDiagnostics] Initialized");
  return diagnostics;
}
