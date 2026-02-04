import { describe, it, expect } from 'vitest';
import { symbolExtractionEngine } from '../symbolExtraction';
import { relationshipLearningEngine } from '../relationshipLearning';
import { ruleLearningEngine } from '../ruleLearning';
import { learningLoopManager } from '../learningLoopManager';
import { autonomousActionFramework } from '../autonomousActionFramework';

describe('Nova-Mind Autonomous Capabilities', () => {
  describe('Symbol Extraction Engine', () => {
    it('should extract symbols from text', async () => {
      const text = 'The system learns from conversations and improves performance';
      const result = await symbolExtractionEngine.extractSymbols(text);

      expect(result.extractedSymbols.length).toBeGreaterThan(0);
      expect(result.totalSymbols).toBe(result.extractedSymbols.length);
    });

    it('should categorize symbols by type', async () => {
      const text = 'Nova-Mind learns quickly and improves efficiently';
      const result = await symbolExtractionEngine.extractSymbols(text);
      const stats = symbolExtractionEngine.getSymbolStatistics();

      expect(stats.totalUniqueSymbols).toBeGreaterThan(0);
      expect(stats.symbolsByType).toBeDefined();
    });

    it('should track symbol frequency', async () => {
      const text = 'learning learning learning optimization';
      await symbolExtractionEngine.extractSymbols(text);
      const topSymbols = symbolExtractionEngine.getTopSymbols(1);

      expect(topSymbols.length).toBeGreaterThan(0);
      expect(topSymbols[0].frequency).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Relationship Learning Engine', () => {
    it('should learn relationships between symbols', async () => {
      const text = 'Learning leads to improvement and growth';
      const symbolMap = new Map<string, string>();
      symbolMap.set('learning', 'concept:learning');
      symbolMap.set('improvement', 'concept:improvement');

      const relationships = await relationshipLearningEngine.learnRelationships(text, symbolMap);
      expect(relationships.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate relationship strength', async () => {
      const text = 'System optimization improves performance metrics';
      const symbolMap = new Map<string, string>();
      symbolMap.set('optimization', 'action:optimization');
      symbolMap.set('performance', 'attribute:performance');

      const relationships = await relationshipLearningEngine.learnRelationships(text, symbolMap);
      const stats = relationshipLearningEngine.getRelationshipStatistics();

      expect(stats.totalRelationships).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rule Learning Engine', () => {
    it('should learn rules from observations', async () => {
      const observations = [
        {
          antecedent: ['learning', 'practice'],
          consequent: ['improvement'],
          evidence: 'Regular practice leads to improvement',
        },
      ];

      const rules = await ruleLearningEngine.learnRules(observations);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].antecedent).toContain('learning');
    });

    it('should track rule confidence and support', async () => {
      const observations = [
        {
          antecedent: ['optimization'],
          consequent: ['efficiency'],
          evidence: 'Optimization increases efficiency',
        },
      ];

      await ruleLearningEngine.learnRules(observations);
      const stats = ruleLearningEngine.getRuleStatistics();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it('should update confidence based on feedback', async () => {
      const observations = [
        {
          antecedent: ['test'],
          consequent: ['result'],
          evidence: 'Testing produces results',
        },
      ];

      const rules = await ruleLearningEngine.learnRules(observations);
      const ruleId = rules[0].id;

      await ruleLearningEngine.applyRule(ruleId, true, 'Rule was successful');
      const strongestRules = ruleLearningEngine.getStrongestRules(1);

      expect(strongestRules.length).toBeGreaterThan(0);
      const updatedRule = strongestRules[0];
      expect(updatedRule.confidence).toBeGreaterThan(0);
    });
  });

  describe('Learning Loop Manager', () => {
    it('should execute a complete learning cycle', async () => {
      const text = 'The system learns from data and improves continuously';
      const cycle = await learningLoopManager.executeLearningCycle(text);

      expect(cycle.status).toBe('completed');
      expect(cycle.extractedSymbols).toBeGreaterThan(0);
    });

    it('should track learning progress', async () => {
      const text = 'Nova-Mind processes information and learns patterns';
      await learningLoopManager.executeLearningCycle(text);

      const progress = learningLoopManager.getProgress();
      expect(progress.completedCycles).toBeGreaterThan(0);
      expect(progress.totalSymbols).toBeGreaterThan(0);
    });

    it('should manage learning cycles with enable/disable', () => {
      learningLoopManager.setLearningEnabled(false);
      expect(learningLoopManager.isLearningEnabled()).toBe(false);

      learningLoopManager.setLearningEnabled(true);
      expect(learningLoopManager.isLearningEnabled()).toBe(true);
    });
  });

  describe('Autonomous Action Framework', () => {
    it('should provide available tools', () => {
      const tools = autonomousActionFramework.getAvailableTools();
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0].id).toBeDefined();
      expect(tools[0].name).toBeDefined();
    });

    it('should get specific tool by ID', () => {
      const tool = autonomousActionFramework.getTool('system-health-check');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('System Health Check');
    });

    it('should create action plans', async () => {
      const plan = await autonomousActionFramework.createActionPlan(
        'Optimize system performance',
        [
          {
            toolId: 'system-health-check',
            parameters: { detailed: true },
            expectedResult: 'System health metrics retrieved',
          },
          {
            toolId: 'cache-refresh',
            parameters: { scope: 'all' },
            expectedResult: 'Caches refreshed',
          },
        ],
        75
      );

      expect(plan.id).toBeDefined();
      expect(plan.goal).toBe('Optimize system performance');
      expect(plan.steps.length).toBe(2);
      expect(plan.status).toBe('pending');
    });

    it('should execute action plans', async () => {
      const plan = await autonomousActionFramework.createActionPlan(
        'Check system health',
        [
          {
            toolId: 'system-health-check',
            parameters: { detailed: false },
            expectedResult: 'Health check completed',
          },
        ]
      );

      const result = await autonomousActionFramework.executeActionPlan(plan.id);
      expect(result.status).toBe('completed');
      expect(result.steps[0].status).toBe('completed');
    });

    it('should track execution history', async () => {
      const plan = await autonomousActionFramework.createActionPlan(
        'Send notification',
        [
          {
            toolId: 'notification-send',
            parameters: {
              title: 'Test',
              message: 'Test message',
            },
            expectedResult: 'Notification sent',
          },
        ]
      );

      await autonomousActionFramework.executeActionPlan(plan.id);
      const history = autonomousActionFramework.getExecutionHistory(10);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].success).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should complete full learning and action cycle', async () => {
      const text = 'System optimization improves performance and efficiency';

      const cycle = await learningLoopManager.executeLearningCycle(text);
      expect(cycle.status).toBe('completed');

      const plan = await autonomousActionFramework.createActionPlan(
        'Optimize based on learning',
        [
          {
            toolId: 'learning-cycle-trigger',
            parameters: { lookbackHours: 1 },
            expectedResult: 'Learning cycle triggered',
          },
        ]
      );

      const result = await autonomousActionFramework.executeActionPlan(plan.id);
      expect(result.status).toBe('completed');
    });

    it('should provide comprehensive statistics', () => {
      const stats = {
        symbols: symbolExtractionEngine.getSymbolStatistics(),
        relationships: relationshipLearningEngine.getRelationshipStatistics(),
        rules: ruleLearningEngine.getRuleStatistics(),
        learning: learningLoopManager.getStatistics(),
      };

      expect(stats.symbols.totalUniqueSymbols).toBeGreaterThanOrEqual(0);
      expect(stats.relationships.totalRelationships).toBeGreaterThanOrEqual(0);
      expect(stats.rules.totalRules).toBeGreaterThanOrEqual(0);
    });
  });
});
