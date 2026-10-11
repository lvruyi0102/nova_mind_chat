import { describe, expect, it } from 'vitest';
import { SystemDiagnosticsEngine } from './systemDiagnostics';

describe('SystemDiagnosticsEngine data quality', () => {
  it('marks database and API metrics as unavailable until they are instrumented', () => {
    const result = new SystemDiagnosticsEngine().diagnose();

    expect(result.dataQuality.completeness).toBe('partial');
    expect(result.dataQuality.unavailableMetrics).toContain('database.activeConnections');
    expect(result.dataQuality.unavailableMetrics).toContain('api.requestCount');
    expect(result.dataQuality.unavailableMetrics).toContain('api.errorCount');
  });

  it('still returns real process metrics alongside the instrumentation warning', () => {
    const result = new SystemDiagnosticsEngine().diagnose();

    expect(result.metrics.memory.heapUsed).toBeGreaterThan(0);
    expect(result.metrics.process.uptime).toBeGreaterThan(0);
    expect(result.dataQuality.completeness).not.toBe('complete');
  });
});
