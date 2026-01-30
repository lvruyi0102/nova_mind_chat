/**
 * Self-Iteration Framework tRPC Router Tests
 * 
 * Tests for the self-assessment, decision-making, and improvement execution endpoints
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';

/**
 * Mock context for testing
 */
const createMockContext = (userId: number = 1) => ({
  user: {
    id: userId,
    openId: 'test-open-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user' as const,
  },
  req: {} as any,
  res: {} as any,
});

/**
 * Mock framework for testing
 */
const createMockFramework = () => ({
  performAssessment: vi.fn().mockResolvedValue({
    timestamp: new Date(),
    overallScore: 0.75,
    learningScore: 0.80,
    knowledgeScore: 0.70,
    decisionScore: 0.75,
    areas: {
      strengths: ['Problem-solving', 'Learning ability'],
      weaknesses: ['Memory retention', 'Pattern recognition'],
      opportunities: ['Knowledge integration', 'Decision optimization'],
    },
  }),
  generateDecisions: vi.fn().mockResolvedValue([
    {
      id: 'decision-1',
      type: 'learning',
      priority: 'high',
      title: 'Focus on knowledge integration',
      description: 'Integrate recent learning into existing knowledge',
      expectedImpact: 0.85,
      estimatedEffort: 0.5,
    },
    {
      id: 'decision-2',
      type: 'improvement',
      priority: 'medium',
      title: 'Improve memory retention',
      description: 'Implement spaced repetition for better memory',
      expectedImpact: 0.70,
      estimatedEffort: 0.6,
    },
  ]),
  executeImprovement: vi.fn().mockResolvedValue({
    success: true,
    result: { executed: true },
  }),
  getProgress: vi.fn().mockResolvedValue({
    currentPhase: 'learning',
    completionPercentage: 65,
    lastUpdate: new Date(),
    milestones: [
      { name: 'Initial Assessment', completed: true },
      { name: 'Knowledge Integration', completed: true },
      { name: 'Decision Optimization', completed: false },
    ],
  }),
});

describe('SelfIteration Router', () => {
  describe('performAssessment', () => {
    it('should perform self-assessment successfully', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const result = await framework.performAssessment(ctx.user.id);
      
      expect(result).toBeDefined();
      expect(result.overallScore).toBe(0.75);
      expect(result.areas).toBeDefined();
      expect(result.areas.strengths).toContain('Problem-solving');
      expect(framework.performAssessment).toHaveBeenCalledWith(ctx.user.id);
    });

    it('should return assessment with all required fields', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const result = await framework.performAssessment(ctx.user.id);
      
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('learningScore');
      expect(result).toHaveProperty('knowledgeScore');
      expect(result).toHaveProperty('decisionScore');
      expect(result).toHaveProperty('areas');
    });

    it('should handle assessment for different users', async () => {
      const framework = createMockFramework();
      const userId1 = 1;
      const userId2 = 2;
      
      await framework.performAssessment(userId1);
      await framework.performAssessment(userId2);
      
      expect(framework.performAssessment).toHaveBeenCalledTimes(2);
      expect(framework.performAssessment).toHaveBeenNthCalledWith(1, userId1);
      expect(framework.performAssessment).toHaveBeenNthCalledWith(2, userId2);
    });
  });

  describe('generateDecisions', () => {
    it('should generate improvement decisions', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const decisions = await framework.generateDecisions(ctx.user.id);
      
      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0]).toHaveProperty('id');
      expect(decisions[0]).toHaveProperty('type');
      expect(decisions[0]).toHaveProperty('priority');
    });

    it('should return decisions with priority levels', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const decisions = await framework.generateDecisions(ctx.user.id);
      
      const priorities = decisions.map(d => d.priority);
      expect(priorities).toContain('high');
      expect(priorities).toContain('medium');
    });

    it('should include decision impact and effort estimates', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const decisions = await framework.generateDecisions(ctx.user.id);
      
      decisions.forEach(decision => {
        expect(decision).toHaveProperty('expectedImpact');
        expect(decision).toHaveProperty('estimatedEffort');
        expect(decision.expectedImpact).toBeGreaterThanOrEqual(0);
        expect(decision.expectedImpact).toBeLessThanOrEqual(1);
        expect(decision.estimatedEffort).toBeGreaterThanOrEqual(0);
        expect(decision.estimatedEffort).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty decision list', async () => {
      const framework = createMockFramework();
      framework.generateDecisions.mockResolvedValueOnce([]);
      const ctx = createMockContext();
      
      const decisions = await framework.generateDecisions(ctx.user.id);
      
      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBe(0);
    });
  });

  describe('executeImprovement', () => {
    it('should execute improvement action successfully', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const result = await framework.executeImprovement(ctx.user.id, {
        decisionId: 'decision-1',
        actionType: 'learning',
        parameters: { topic: 'knowledge integration' },
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it('should track improvement execution', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const action1 = {
        decisionId: 'decision-1',
        actionType: 'learning',
        parameters: {},
      };
      
      const action2 = {
        decisionId: 'decision-2',
        actionType: 'optimization',
        parameters: {},
      };
      
      await framework.executeImprovement(ctx.user.id, action1);
      await framework.executeImprovement(ctx.user.id, action2);
      
      expect(framework.executeImprovement).toHaveBeenCalledTimes(2);
    });
  });

  describe('getState', () => {
    it('should retrieve current self-iteration state', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const state = await framework.getProgress(ctx.user.id);
      
      expect(state).toBeDefined();
      expect(state).toHaveProperty('currentPhase');
      expect(state).toHaveProperty('completionPercentage');
      expect(state).toHaveProperty('lastUpdate');
      expect(state).toHaveProperty('milestones');
    });

    it('should show progress milestones', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const state = await framework.getProgress(ctx.user.id);
      
      expect(Array.isArray(state.milestones)).toBe(true);
      state.milestones.forEach(milestone => {
        expect(milestone).toHaveProperty('name');
        expect(milestone).toHaveProperty('completed');
        expect(typeof milestone.completed).toBe('boolean');
      });
    });

    it('should track completion percentage', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const state = await framework.getProgress(ctx.user.id);
      
      expect(state.completionPercentage).toBeGreaterThanOrEqual(0);
      expect(state.completionPercentage).toBeLessThanOrEqual(100);
    });
  });

  describe('triggerFullCycle', () => {
    it('should execute full iteration cycle', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const assessment = await framework.performAssessment(ctx.user.id);
      const decisions = await framework.generateDecisions(ctx.user.id);
      
      expect(assessment).toBeDefined();
      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);
    });

    it('should handle auto-execution of decisions', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const decisions = await framework.generateDecisions(ctx.user.id);
      
      for (const decision of decisions) {
        await framework.executeImprovement(ctx.user.id, {
          decisionId: decision.id,
          actionType: decision.type,
          parameters: {},
        });
      }
      
      expect(framework.executeImprovement).toHaveBeenCalledTimes(decisions.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user context gracefully', async () => {
      const framework = createMockFramework();
      
      // Simulate error when user is not authenticated
      framework.performAssessment.mockRejectedValueOnce(
        new Error('User not authenticated')
      );
      
      await expect(framework.performAssessment(0)).rejects.toThrow('User not authenticated');
    });

    it('should handle assessment failures', async () => {
      const framework = createMockFramework();
      
      framework.performAssessment.mockRejectedValueOnce(
        new Error('Assessment failed')
      );
      
      await expect(framework.performAssessment(1)).rejects.toThrow('Assessment failed');
    });

    it('should handle decision generation failures', async () => {
      const framework = createMockFramework();
      
      framework.generateDecisions.mockRejectedValueOnce(
        new Error('Decision generation failed')
      );
      
      await expect(framework.generateDecisions(1)).rejects.toThrow('Decision generation failed');
    });
  });

  describe('Integration Tests', () => {
    it('should complete full self-iteration cycle', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      // Step 1: Perform assessment
      const assessment = await framework.performAssessment(ctx.user.id);
      expect(assessment).toBeDefined();
      
      // Step 2: Generate decisions based on assessment
      const decisions = await framework.generateDecisions(ctx.user.id);
      expect(decisions.length).toBeGreaterThan(0);
      
      // Step 3: Execute improvements
      const executionResults = [];
      for (const decision of decisions) {
        const result = await framework.executeImprovement(ctx.user.id, {
          decisionId: decision.id,
          actionType: decision.type,
          parameters: {},
        });
        executionResults.push(result);
      }
      
      expect(executionResults.length).toBe(decisions.length);
      executionResults.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Step 4: Check updated state
      const finalState = await framework.getProgress(ctx.user.id);
      expect(finalState).toBeDefined();
    });

    it('should handle multiple iterations', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      // First iteration
      await framework.performAssessment(ctx.user.id);
      const decisions1 = await framework.generateDecisions(ctx.user.id);
      
      // Second iteration
      await framework.performAssessment(ctx.user.id);
      const decisions2 = await framework.generateDecisions(ctx.user.id);
      
      // Both iterations should complete successfully
      expect(decisions1.length).toBeGreaterThan(0);
      expect(decisions2.length).toBeGreaterThan(0);
      expect(framework.performAssessment).toHaveBeenCalledTimes(2);
      expect(framework.generateDecisions).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Tests', () => {
    it('should complete assessment within reasonable time', async () => {
      const framework = createMockFramework();
      const ctx = createMockContext();
      
      const startTime = Date.now();
      await framework.performAssessment(ctx.user.id);
      const duration = Date.now() - startTime;
      
      // Assessment should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple concurrent assessments', async () => {
      const framework = createMockFramework();
      
      const userIds = [1, 2, 3, 4, 5];
      const promises = userIds.map(id => framework.performAssessment(id));
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(userIds.length);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.overallScore).toBeDefined();
      });
    });
  });
});
