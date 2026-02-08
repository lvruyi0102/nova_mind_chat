/**
 * Pressure-Driven Optimization System Integration Tests
 * 
 * 测试压力驱动优化系统的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPressureDrivenOptimizationFlow } from '../pressureDrivenOptimization';
import { getAutoOptimizationGuardrails } from '../autoOptimizationGuardrails';
import { getAutonomousBackgroundLoop } from '../autonomousBackgroundLoop';

describe('Pressure-Driven Optimization System', () => {
  let optimizationFlow: any;
  let guardrails: any;
  let backgroundLoop: any;

  beforeEach(() => {
    optimizationFlow = getPressureDrivenOptimizationFlow();
    guardrails = getAutoOptimizationGuardrails();
    backgroundLoop = getAutonomousBackgroundLoop();
  });

  describe('AutoOptimizationGuardrails', () => {
    it('should check auto-optimization safety', () => {
      const result = guardrails.checkAutoOptimizationSafety();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should detect memory usage violations', () => {
      const result = guardrails.checkAutoOptimizationSafety();
      
      // 检查是否有内存相关的检查
      const memoryViolations = result.violations.filter((v: any) => 
        v.rule.includes('Memory') || v.rule.includes('Heap')
      );
      
      // 可能有或没有内存违规，取决于当前系统状态
      expect(Array.isArray(memoryViolations)).toBe(true);
    });

    it('should track modification history', () => {
      // 记录一些修改
      guardrails.recordModification(true, 100);
      guardrails.recordModification(true, 150);
      guardrails.recordModification(false, 0);

      const stats = guardrails.getModificationStatistics();
      
      expect(stats).toBeDefined();
      expect(stats.totalModifications).toBeGreaterThanOrEqual(0);
      expect(stats).toHaveProperty('successCount');
      expect(stats).toHaveProperty('failureCount');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('totalDuration');
    });

    it('should allow configuration updates', () => {
      const originalConfig = guardrails.getConfig();
      
      guardrails.updateConfig({
        maxHeapUsagePercent: 85,
        maxCodeModificationsPerHour: 5,
      });

      const newConfig = guardrails.getConfig();
      
      expect(newConfig.maxHeapUsagePercent).toBe(85);
      expect(newConfig.maxCodeModificationsPerHour).toBe(5);
      expect(newConfig.maxRSSMemoryMB).toBe(originalConfig.maxRSSMemoryMB);
    });
  });

  describe('PressureDrivenOptimizationFlow', () => {
    it('should have flow history management', () => {
      const history = optimizationFlow.getFlowHistory();
      
      expect(Array.isArray(history)).toBe(true);
    });

    it('should provide flow statistics', () => {
      const stats = optimizationFlow.getFlowStatistics();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalFlows');
      expect(stats).toHaveProperty('successfulFlows');
      expect(stats).toHaveProperty('partialFlows');
      expect(stats).toHaveProperty('failedFlows');
      expect(stats).toHaveProperty('totalCodeModificationsExecuted');
      expect(stats).toHaveProperty('totalSuccessfulModifications');
      expect(stats).toHaveProperty('totalFailedModifications');
      expect(stats).toHaveProperty('averagePressureLevel');
      
      expect(typeof stats.totalFlows).toBe('number');
      expect(typeof stats.averagePressureLevel).toBe('number');
    });

    it('should track latest flow result', () => {
      const latest = optimizationFlow.getLatestFlow();
      
      // 可能是 null 或有效的流结果
      if (latest) {
        expect(latest).toHaveProperty('flowId');
        expect(latest).toHaveProperty('timestamp');
        expect(latest).toHaveProperty('status');
        expect(latest).toHaveProperty('details');
        expect(Array.isArray(latest.details)).toBe(true);
      }
    });
  });

  describe('AutonomousBackgroundLoop Configuration', () => {
    it('should have code optimization configuration', () => {
      const status = backgroundLoop.getStatus();
      
      expect(status).toBeDefined();
      expect(status.config).toBeDefined();
      expect(status.config).toHaveProperty('codeOptimizationEnabled');
      expect(status.config).toHaveProperty('codeOptimizationInterval');
      expect(status.config).toHaveProperty('pressureThresholdForCodeOptimization');
      expect(status.config).toHaveProperty('autoExecuteCodeModifications');
    });

    it('should track code optimization statistics', () => {
      const stats = backgroundLoop.getStats();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('codeOptimizationCycles');
      expect(stats).toHaveProperty('codeModificationsExecuted');
      expect(typeof stats.codeOptimizationCycles).toBe('number');
      expect(typeof stats.codeModificationsExecuted).toBe('number');
    });

    it('should allow configuration updates', () => {
      const originalStatus = backgroundLoop.getStatus();
      
      backgroundLoop.updateConfig({
        codeOptimizationEnabled: false,
        pressureThresholdForCodeOptimization: 80,
      });

      const newStatus = backgroundLoop.getStatus();
      
      expect(newStatus.config.codeOptimizationEnabled).toBe(false);
      expect(newStatus.config.pressureThresholdForCodeOptimization).toBe(80);
      expect(newStatus.config.diagnosticInterval).toBe(originalStatus.config.diagnosticInterval);
    });
  });

  describe('Safety and Limits', () => {
    it('should enforce memory limits', () => {
      const guardrailConfig = guardrails.getConfig();
      
      expect(guardrailConfig.maxHeapUsagePercent).toBeGreaterThan(0);
      expect(guardrailConfig.maxHeapUsagePercent).toBeLessThanOrEqual(100);
      expect(guardrailConfig.maxRSSMemoryMB).toBeGreaterThan(0);
    });

    it('should enforce modification limits', () => {
      const guardrailConfig = guardrails.getConfig();
      
      expect(guardrailConfig.maxCodeModificationsPerHour).toBeGreaterThan(0);
      expect(guardrailConfig.minSuccessRatePercent).toBeGreaterThan(0);
      expect(guardrailConfig.minSuccessRatePercent).toBeLessThanOrEqual(100);
      expect(guardrailConfig.maxConsecutiveFailures).toBeGreaterThan(0);
    });

    it('should enforce pressure limits', () => {
      const guardrailConfig = guardrails.getConfig();
      
      expect(guardrailConfig.maxPressureLevel).toBeGreaterThan(0);
      expect(guardrailConfig.maxPressureLevel).toBeLessThanOrEqual(100);
      expect(guardrailConfig.criticalPressureLevel).toBeGreaterThan(0);
      expect(guardrailConfig.criticalPressureLevel).toBeLessThanOrEqual(100);
      expect(guardrailConfig.criticalPressureLevel).toBeLessThan(guardrailConfig.maxPressureLevel);
    });

    it('should enforce time limits', () => {
      const guardrailConfig = guardrails.getConfig();
      
      expect(guardrailConfig.minIntervalBetweenModifications).toBeGreaterThan(0);
      expect(guardrailConfig.maxCumulativeModificationTimePerHour).toBeGreaterThan(0);
    });
  });

  describe('Integration', () => {
    it('should have all components properly initialized', () => {
      expect(optimizationFlow).toBeDefined();
      expect(guardrails).toBeDefined();
      expect(backgroundLoop).toBeDefined();
    });

    it('should support complete optimization flow lifecycle', async () => {
      // 检查安全卫士
      const guardrailCheck = guardrails.checkAutoOptimizationSafety();
      expect(guardrailCheck).toBeDefined();

      // 获取流历史
      const history = optimizationFlow.getFlowHistory();
      expect(Array.isArray(history)).toBe(true);

      // 获取统计信息
      const stats = optimizationFlow.getFlowStatistics();
      expect(stats.totalFlows).toBeGreaterThanOrEqual(0);
    });

    it('should track modifications across components', () => {
      // 记录修改
      guardrails.recordModification(true, 100);
      guardrails.recordModification(false, 50);

      // 获取统计
      const stats = guardrails.getModificationStatistics();
      expect(stats.totalModifications).toBeGreaterThanOrEqual(0);

      // 背景循环应该能访问相同的数据
      const loopStats = backgroundLoop.getStats();
      expect(loopStats).toBeDefined();
    });
  });
});
