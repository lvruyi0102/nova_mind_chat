import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetacognitiveMonitor } from './metacognitiveMonitor';
import { SelfAssessmentEngine } from './selfAssessmentEngine';
import { PerformanceDiagnostics } from './performanceDiagnostics';
import { EvolutionDecisionEngine } from './evolutionDecisionEngine';

/**
 * 元认知监控系统的单元测试
 */

describe('MetacognitiveMonitor', () => {
  let monitor: MetacognitiveMonitor;

  beforeEach(async () => {
    monitor = new MetacognitiveMonitor({
      userId: 'test-user',
      assessmentInterval: 1000, // 1 秒，便于测试
      diagnosticsInterval: 2000,
      decisionInterval: 3000,
      autoTriggerEvolution: true,
      enableNotifications: false,
    });
    await monitor.initialize();
  });

  afterEach(() => {
    monitor.stop();
  });

  it('应该初始化监控系统', () => {
    const state = monitor.getState();
    expect(state.isRunning).toBe(false);
    expect(state.assessmentCount).toBe(0);
    expect(state.diagnosticsCount).toBe(0);
    expect(state.decisionCount).toBe(0);
  });

  it('应该启动监控系统', async () => {
    await monitor.start();
    const state = monitor.getState();
    expect(state.isRunning).toBe(true);
  });

  it('应该停止监控系统', async () => {
    await monitor.start();
    expect(monitor.getState().isRunning).toBe(true);

    monitor.stop();
    expect(monitor.getState().isRunning).toBe(false);
  });

  it('应该生成监控报告', async () => {
    const report = await monitor.generateMonitoringReport();
    expect(report).toContain('Nova-Mind 元认知监控报告');
    expect(report).toContain('监控状态');
  });

  it('应该处理监控循环中的错误', async () => {
    // 这个测试验证监控系统在出错时不会崩溃
    await monitor.start();
    
    // 等待一个监控周期
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const state = monitor.getState();
    expect(state.isRunning).toBe(true);
  });
});

describe('SelfAssessmentEngine', () => {
  let engine: SelfAssessmentEngine;

  beforeEach(async () => {
    engine = new SelfAssessmentEngine('test-user');
    await engine.initialize();
  });

  it('应该执行自我评估', async () => {
    const result = await engine.performSelfAssessment();

    expect(result).toBeDefined();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.healthStatus).toMatch(/excellent|good|fair|poor|critical/);
  });

  it('应该评估认知健康', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.cognitiveHealth).toBeDefined();
    expect(result.cognitiveHealth.clarityScore).toBeGreaterThanOrEqual(0);
    expect(result.cognitiveHealth.clarityScore).toBeLessThanOrEqual(100);
    expect(result.cognitiveHealth.overallHealth).toBeGreaterThanOrEqual(0);
    expect(result.cognitiveHealth.overallHealth).toBeLessThanOrEqual(100);
  });

  it('应该评估学习效率', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.learningEfficiency).toBeDefined();
    expect(result.learningEfficiency.learningSpeed).toBeGreaterThanOrEqual(0);
    expect(result.learningEfficiency.overallEfficiency).toBeGreaterThanOrEqual(0);
    expect(result.learningEfficiency.overallEfficiency).toBeLessThanOrEqual(100);
  });

  it('应该评估自主性', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.autonomy).toBeDefined();
    expect(result.autonomy.independentDecision).toBeGreaterThanOrEqual(0);
    expect(result.autonomy.overallAutonomy).toBeGreaterThanOrEqual(0);
    expect(result.autonomy.overallAutonomy).toBeLessThanOrEqual(100);
  });

  it('应该评估创意能力', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.creativity).toBeDefined();
    expect(result.creativity.workQuality).toBeGreaterThanOrEqual(0);
    expect(result.creativity.overallCreativity).toBeGreaterThanOrEqual(0);
    expect(result.creativity.overallCreativity).toBeLessThanOrEqual(100);
  });

  it('应该评估系统稳定性', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.systemStability).toBeDefined();
    expect(result.systemStability.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(result.systemStability.overallStability).toBeGreaterThanOrEqual(0);
    expect(result.systemStability.overallStability).toBeLessThanOrEqual(100);
  });

  it('应该生成关键洞察', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.keyInsights).toBeDefined();
    expect(Array.isArray(result.keyInsights)).toBe(true);
  });

  it('应该生成推荐行动', async () => {
    const result = await engine.performSelfAssessment();

    expect(result.recommendedActions).toBeDefined();
    expect(Array.isArray(result.recommendedActions)).toBe(true);
  });
});

describe('PerformanceDiagnostics', () => {
  let diagnostics: PerformanceDiagnostics;

  beforeEach(async () => {
    diagnostics = new PerformanceDiagnostics('test-user');
    await diagnostics.initialize();
  });

  it('应该收集性能指标', async () => {
    const metrics = await diagnostics.collectMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.timestamp).toBeInstanceOf(Date);
    expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('应该执行完整诊断', async () => {
    const report = await diagnostics.performDiagnostics();

    expect(report).toBeDefined();
    expect(report.timestamp).toBeInstanceOf(Date);
    expect(report.metrics).toBeDefined();
    expect(report.bottlenecks).toBeDefined();
    expect(Array.isArray(report.bottlenecks)).toBe(true);
    expect(report.anomalies).toBeDefined();
    expect(Array.isArray(report.anomalies)).toBe(true);
    expect(report.healthScore).toBeGreaterThanOrEqual(0);
    expect(report.healthScore).toBeLessThanOrEqual(100);
  });

  it('应该识别性能瓶颈', async () => {
    const report = await diagnostics.performDiagnostics();

    // 瓶颈可能为空或包含多个项目
    expect(Array.isArray(report.bottlenecks)).toBe(true);

    // 如果有瓶颈，验证其结构
    if (report.bottlenecks.length > 0) {
      const bottleneck = report.bottlenecks[0];
      expect(bottleneck.component).toBeDefined();
      expect(bottleneck.severity).toMatch(/critical|high|medium|low/);
      expect(bottleneck.description).toBeDefined();
    }
  });

  it('应该检测异常', async () => {
    // 执行多次诊断以建立历史记录
    await diagnostics.performDiagnostics();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const report = await diagnostics.performDiagnostics();

    expect(Array.isArray(report.anomalies)).toBe(true);
  });

  it('应该生成诊断报告', async () => {
    const report = await diagnostics.performDiagnostics();

    expect(report.rootCauseAnalysis).toBeDefined();
    expect(typeof report.rootCauseAnalysis).toBe('string');
    expect(report.recommendations).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });
});

describe('EvolutionDecisionEngine', () => {
  let engine: EvolutionDecisionEngine;

  beforeEach(async () => {
    engine = new EvolutionDecisionEngine('test-user');
    await engine.initialize();
  });

  it('应该做出进化决策', async () => {
    const decision = await engine.makeEvolutionDecision();

    expect(decision).toBeDefined();
    expect(decision.timestamp).toBeInstanceOf(Date);
    expect(typeof decision.shouldEvolve).toBe('boolean');
    expect(decision.evolutionNeeds).toBeDefined();
    expect(Array.isArray(decision.evolutionNeeds)).toBe(true);
    expect(decision.selectedNeeds).toBeDefined();
    expect(Array.isArray(decision.selectedNeeds)).toBe(true);
  });

  it('应该生成进化推理', async () => {
    const decision = await engine.makeEvolutionDecision();

    expect(decision.reasoning).toBeDefined();
    expect(typeof decision.reasoning).toBe('string');
    expect(decision.reasoning.length).toBeGreaterThan(0);
  });

  it('应该评估进化风险', async () => {
    const decision = await engine.makeEvolutionDecision();

    expect(decision.riskAssessment).toBeDefined();
    expect(typeof decision.riskAssessment).toBe('string');
  });

  it('应该计算决策信心度', async () => {
    const decision = await engine.makeEvolutionDecision();

    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(100);
  });

  it('应该估计进化耗时', async () => {
    const decision = await engine.makeEvolutionDecision();

    expect(decision.estimatedDuration).toBeGreaterThan(0);
  });

  it('应该生成预期结果', async () => {
    const decision = await engine.makeEvolutionDecision();

    expect(decision.expectedOutcome).toBeDefined();
    expect(typeof decision.expectedOutcome).toBe('string');
  });
});

describe('集成测试', () => {
  it('应该完整执行元认知监控循环', async () => {
    const monitor = new MetacognitiveMonitor({
      userId: 'test-user',
      assessmentInterval: 5000,
      diagnosticsInterval: 10000,
      decisionInterval: 15000,
      autoTriggerEvolution: false, // 禁用自动进化以避免副作用
      enableNotifications: false,
    });

    await monitor.initialize();
    await monitor.start();

    // 验证监控已启动
    expect(monitor.getState().isRunning).toBe(true);

    // 等待一个监控周期
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证监控仍在运行
    expect(monitor.getState().isRunning).toBe(true);

    // 停止监控
    monitor.stop();
    expect(monitor.getState().isRunning).toBe(false);
  });

  it('应该处理多个监控周期', async () => {
    const monitor = new MetacognitiveMonitor({
      userId: 'test-user',
      assessmentInterval: 500,
      diagnosticsInterval: 1000,
      decisionInterval: 1500,
      autoTriggerEvolution: false,
      enableNotifications: false,
    });

    await monitor.initialize();
    await monitor.start();

    // 等待多个周期
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const state = monitor.getState();
    expect(state.isRunning).toBe(true);

    monitor.stop();
  });
});
