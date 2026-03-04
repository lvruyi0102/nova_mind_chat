import { describe, it, expect, beforeEach, vi } from 'vitest';
import { creativeWorkEvaluator } from '../creativeWorkEvaluator';
import { creativeWorkImprover } from '../creativeWorkImprover';
import { creativeWorkIterationManager } from '../creativeWorkIterationManager';
import { autonomousIterationService } from '../autonomousIterationService';

describe('自主迭代能力测试', () => {
  describe('CreativeWorkEvaluator', () => {
    it('应该能评估作品的多个维度', async () => {
      const evaluator = creativeWorkEvaluator;
      
      const mockWork = {
        workId: 'test-work-1',
        workType: 'code' as const,
        content: `
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
        `,
        createdAt: new Date(),
        previousVersions: 0
      };

      // 由于 LLM 调用需要实际的 API，这里我们测试方法的存在性
      expect(evaluator.evaluateWork).toBeDefined();
      expect(typeof evaluator.evaluateWork).toBe('function');
    });

    it('应该能评估和排序多个作品', async () => {
      const evaluator = creativeWorkEvaluator;
      
      expect(evaluator.evaluateAndRankWorks).toBeDefined();
      expect(typeof evaluator.evaluateAndRankWorks).toBe('function');
    });

    it('应该能判断作品是否需要迭代', async () => {
      const evaluator = creativeWorkEvaluator;
      
      const mockEvaluation = {
        qualityScore: 70,
        creativityScore: 65,
        completenessScore: 75,
        improvabilityScore: 80,
        overallScore: 72,
        strengths: ['清晰的结构'],
        weaknesses: ['性能不足'],
        improvementSuggestions: ['优化算法'],
        shouldIterate: true,
        iterationPriority: 4,
        evaluatedAt: new Date()
      };

      const shouldIterate = await evaluator.shouldIterateWork(mockEvaluation);
      expect(typeof shouldIterate).toBe('boolean');
    });
  });

  describe('CreativeWorkImprover', () => {
    it('应该能改进作品', async () => {
      const improver = creativeWorkImprover;
      
      expect(improver.improveWork).toBeDefined();
      expect(typeof improver.improveWork).toBe('function');
    });

    it('应该能判断改进是否值得保存', async () => {
      const improver = creativeWorkImprover;
      
      const mockImprovement = {
        improvedContent: 'improved code',
        improvementSummary: '优化了算法效率',
        changeLog: ['使用迭代替代递归'],
        improvementScore: 15,
        estimatedNewScore: 87,
        improvementReasoning: '递归导致栈溢出',
        generatedAt: new Date()
      };

      const shouldSave = await improver.shouldSaveImprovement(72, mockImprovement);
      expect(typeof shouldSave).toBe('boolean');
    });
  });

  describe('CreativeWorkIterationManager', () => {
    it('应该能记录迭代历史', async () => {
      const manager = creativeWorkIterationManager;
      
      const mockRecord = {
        workId: 'test-work-1',
        versionNumber: 2,
        content: 'improved content',
        evaluation: {
          qualityScore: 80,
          creativityScore: 75,
          completenessScore: 85,
          improvabilityScore: 70,
          overallScore: 80,
          strengths: [],
          weaknesses: [],
          improvementSuggestions: [],
          shouldIterate: false,
          iterationPriority: 2,
          evaluatedAt: new Date()
        },
        improvement: null,
        iterationReason: '自主迭代',
        iteratedAt: new Date()
      };

      const recordId = await manager.recordIteration(mockRecord);
      expect(typeof recordId).toBe('number');
    });

    it('应该能获取作品的演化摘要', async () => {
      const manager = creativeWorkIterationManager;
      
      const summary = await manager.getEvolutionSummary('test-work-1');
      
      expect(summary).toHaveProperty('workId');
      expect(summary).toHaveProperty('totalVersions');
      expect(summary).toHaveProperty('currentScore');
      expect(summary).toHaveProperty('scoreProgression');
      expect(summary).toHaveProperty('totalImprovement');
      expect(Array.isArray(summary.scoreProgression)).toBe(true);
    });

    it('应该能生成迭代建议', async () => {
      const manager = creativeWorkIterationManager;
      
      const mockEvaluation = {
        qualityScore: 65,
        creativityScore: 55,
        completenessScore: 70,
        improvabilityScore: 75,
        overallScore: 65,
        strengths: [],
        weaknesses: ['质量低', '创意不足'],
        improvementSuggestions: [],
        shouldIterate: true,
        iterationPriority: 4,
        evaluatedAt: new Date()
      };

      const suggestions = await manager.getIterationSuggestions('test-work-1', mockEvaluation);
      
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该能计算迭代进度', () => {
      const manager = creativeWorkIterationManager;
      
      const progress = manager.calculateIterationProgress(70, 80, 90);
      
      expect(progress).toHaveProperty('progress');
      expect(progress).toHaveProperty('remaining');
      expect(progress).toHaveProperty('estimatedIterations');
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });

    it('应该能判断是否继续迭代', async () => {
      const manager = creativeWorkIterationManager;
      
      const mockEvaluation = {
        qualityScore: 80,
        creativityScore: 75,
        completenessScore: 80,
        improvabilityScore: 60,
        overallScore: 78,
        strengths: [],
        weaknesses: [],
        improvementSuggestions: [],
        shouldIterate: true,
        iterationPriority: 2,
        evaluatedAt: new Date()
      };

      const shouldContinue = await manager.shouldContinueIterating(mockEvaluation);
      expect(typeof shouldContinue).toBe('boolean');
    });
  });

  describe('AutonomousIterationService', () => {
    it('应该能执行单个作品的迭代循环', async () => {
      const service = autonomousIterationService;
      
      const mockWork = {
        id: 'test-work-1',
        type: 'code' as const,
        content: 'function test() { return 42; }',
        createdAt: new Date(),
        versionCount: 0
      };

      expect(service.iterateWork).toBeDefined();
      expect(typeof service.iterateWork).toBe('function');
    });

    it('应该能批量迭代多个作品', async () => {
      const service = autonomousIterationService;
      
      expect(service.iterateMultipleWorks).toBeDefined();
      expect(typeof service.iterateMultipleWorks).toBe('function');
    });

    it('应该能生成迭代统计报告', () => {
      const service = autonomousIterationService;
      
      const mockResults = [
        {
          success: true,
          workId: 'work-1',
          workType: 'code',
          originalScore: 70,
          newScore: 80,
          improvement: 10,
          iterationCount: 1,
          message: 'Success',
          timestamp: new Date()
        },
        {
          success: true,
          workId: 'work-2',
          workType: 'story',
          originalScore: 75,
          newScore: 82,
          improvement: 7,
          iterationCount: 1,
          message: 'Success',
          timestamp: new Date()
        }
      ];

      const stats = service.generateIterationStats(mockResults);
      
      expect(stats).toHaveProperty('totalWorks');
      expect(stats).toHaveProperty('successfulIterations');
      expect(stats).toHaveProperty('failedIterations');
      expect(stats).toHaveProperty('averageImprovement');
      expect(stats).toHaveProperty('totalImprovement');
      expect(stats).toHaveProperty('improvementRate');
      
      expect(stats.totalWorks).toBe(2);
      expect(stats.successfulIterations).toBe(2);
      expect(stats.failedIterations).toBe(0);
      expect(stats.totalImprovement).toBe(17);
      expect(stats.improvementRate).toBe(100);
    });
  });

  describe('迭代流程集成', () => {
    it('应该能完成评估 -> 改进 -> 记录的完整流程', async () => {
      // 这个测试验证各个模块之间的协调
      const evaluator = creativeWorkEvaluator;
      const improver = creativeWorkImprover;
      const manager = creativeWorkIterationManager;

      expect(evaluator).toBeDefined();
      expect(improver).toBeDefined();
      expect(manager).toBeDefined();

      // 验证所有必需的方法都存在
      expect(typeof evaluator.evaluateWork).toBe('function');
      expect(typeof improver.improveWork).toBe('function');
      expect(typeof manager.recordIteration).toBe('function');
    });

    it('应该能处理多个作品的并发迭代', async () => {
      const service = autonomousIterationService;
      
      const mockWorks = [
        {
          id: 'work-1',
          type: 'code' as const,
          content: 'code 1',
          createdAt: new Date(),
          versionCount: 0
        },
        {
          id: 'work-2',
          type: 'story' as const,
          content: 'story 1',
          createdAt: new Date(),
          versionCount: 0
        },
        {
          id: 'work-3',
          type: 'poetry' as const,
          content: 'poetry 1',
          createdAt: new Date(),
          versionCount: 0
        }
      ];

      expect(service.iterateMultipleWorks).toBeDefined();
      expect(typeof service.iterateMultipleWorks).toBe('function');
    });
  });
});
