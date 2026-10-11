import { describe, expect, it } from 'vitest';
import {
  SelfArchitectureModificationEngine,
  type ArchitectureRecommendation,
} from './selfArchitectureModificationEngine';

const makeRecommendation = (
  riskLevel: ArchitectureRecommendation['riskLevel'] = 'low',
): ArchitectureRecommendation => ({
  id: 'arch_rec_test',
  title: 'Example optimization',
  description: 'A test-only proposal',
  targetModules: ['memory'],
  estimatedImprovementPercent: 10,
  riskLevel,
  implementationSteps: ['Change a module', 'Run tests'],
  rollbackPlan: 'Restore the previous version',
  status: 'proposed',
});

describe('SelfArchitectureModificationEngine proposal-only behavior', () => {
  it('does not claim a low-risk proposal was executed when no executor is connected', async () => {
    const engine = new SelfArchitectureModificationEngine('test-user');

    const result = await engine.executeModification(makeRecommendation('low'));

    expect(result.success).toBe(false);
    expect(result.details.proposalOnly).toBe(true);
    expect(result.details.executionEngineConnected).toBe(false);
    expect(result.details.executedSteps).toEqual([]);
    expect(result.message).toContain('未修改代码');
  });

  it('keeps higher-risk proposals gated for human approval', async () => {
    const engine = new SelfArchitectureModificationEngine('test-user');

    const result = await engine.executeModification(makeRecommendation('high'));

    expect(result.success).toBe(false);
    expect(result.details.proposalOnly).toBe(true);
    expect(result.details.requiresApproval).toBe(true);
    expect(result.details.executedSteps).toEqual([]);
  });
});
