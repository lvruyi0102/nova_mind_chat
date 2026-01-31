/**
 * 反馈循环测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  FeedbackLoopManager,
  getFeedbackLoopManager,
  AutonomousImprovementEngine,
  getAutonomousImprovementEngine,
  ActionExecution,
  Feedback,
} from '../reasoning/feedbackLoop';
import {
  ExecutionTracker,
  getExecutionTracker,
  FeedbackProcessor,
  getFeedbackProcessor,
} from '../reasoning/executionTracker';

describe('FeedbackLoopManager', () => {
  let manager: FeedbackLoopManager;

  beforeEach(() => {
    manager = new FeedbackLoopManager();
  });

  describe('行动执行记录', () => {
    it('应该能够记录和获取行动执行', () => {
      const execution: ActionExecution = {
        id: 'exec1',
        decisionId: 'decision1',
        action: 'send_message',
        parameters: { content: 'Hello' },
        timestamp: new Date(),
        status: 'completed',
      };

      manager.recordExecution(execution);
      const retrieved = manager.getExecution('exec1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.action).toBe('send_message');
    });

    it('应该能够更新执行状态', () => {
      const execution: ActionExecution = {
        id: 'exec1',
        decisionId: 'decision1',
        action: 'send_message',
        parameters: {},
        timestamp: new Date(),
        status: 'pending',
      };

      manager.recordExecution(execution);
      manager.updateExecutionStatus('exec1', 'completed', { success: true });

      const updated = manager.getExecution('exec1');
      expect(updated?.status).toBe('completed');
      expect(updated?.result).toEqual({ success: true });
    });
  });

  describe('反馈记录', () => {
    it('应该能够记录反馈', () => {
      const feedback: Feedback = {
        id: 'feedback1',
        executionId: 'exec1',
        decisionId: 'decision1',
        success: true,
        score: 0.9,
        feedback: 'Great decision!',
        timestamp: new Date(),
      };

      manager.recordFeedback(feedback);
      const retrieved = manager.getFeedback('feedback1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.score).toBe(0.9);
    });

    it('应该能够获取决策的所有反馈', () => {
      const feedback1: Feedback = {
        id: 'feedback1',
        executionId: 'exec1',
        decisionId: 'decision1',
        success: true,
        score: 0.9,
        feedback: 'Good',
        timestamp: new Date(),
      };

      const feedback2: Feedback = {
        id: 'feedback2',
        executionId: 'exec2',
        decisionId: 'decision1',
        success: false,
        score: 0.5,
        feedback: 'Not so good',
        timestamp: new Date(),
      };

      manager.recordFeedback(feedback1);
      manager.recordFeedback(feedback2);

      const feedbacks = manager.getDecisionFeedbacks('decision1');
      expect(feedbacks.length).toBe(2);
    });
  });

  describe('决策质量跟踪', () => {
    it('应该能够跟踪决策质量', () => {
      const feedback1: Feedback = {
        id: 'feedback1',
        executionId: 'exec1',
        decisionId: 'decision1',
        success: true,
        score: 0.9,
        feedback: 'Good',
        timestamp: new Date(),
      };

      const feedback2: Feedback = {
        id: 'feedback2',
        executionId: 'exec2',
        decisionId: 'decision1',
        success: true,
        score: 0.8,
        feedback: 'Good',
        timestamp: new Date(),
      };

      manager.recordFeedback(feedback1);
      manager.recordFeedback(feedback2);

      const quality = manager.getDecisionQuality('decision1');
      expect(quality).toBeDefined();
      expect(quality?.successCount).toBe(2);
      expect(quality?.averageScore).toBeGreaterThan(0.8);
    });

    it('应该能够计算决策质量趋势', () => {
      // 记录初始反馈
      for (let i = 0; i < 5; i++) {
        const feedback: Feedback = {
          id: `feedback${i}`,
          executionId: `exec${i}`,
          decisionId: 'decision1',
          success: i < 2,
          score: i < 2 ? 0.5 : 0.9,
          feedback: 'Test',
          timestamp: new Date(Date.now() - i * 1000),
        };
        manager.recordFeedback(feedback);
      }

      const quality = manager.getDecisionQuality('decision1');
      expect(quality?.trend).toBeDefined();
    });
  });

  describe('学习反馈生成', () => {
    it('应该能够生成学习反馈', () => {
      const feedback: Feedback = {
        id: 'feedback1',
        executionId: 'exec1',
        decisionId: 'decision1',
        success: true,
        score: 0.9,
        feedback: 'Good',
        timestamp: new Date(),
      };

      manager.recordFeedback(feedback);
      const learningFeedbacks = manager.getLearningFeedbacks();

      expect(learningFeedbacks.length).toBeGreaterThan(0);
    });
  });

  describe('统计信息', () => {
    it('应该能够获取统计信息', () => {
      const execution: ActionExecution = {
        id: 'exec1',
        decisionId: 'decision1',
        action: 'test',
        parameters: {},
        timestamp: new Date(),
        status: 'completed',
      };

      manager.recordExecution(execution);

      const feedback: Feedback = {
        id: 'feedback1',
        executionId: 'exec1',
        decisionId: 'decision1',
        success: true,
        score: 0.9,
        feedback: 'Good',
        timestamp: new Date(),
      };

      manager.recordFeedback(feedback);

      const stats = manager.getStatistics();
      expect(stats.totalExecutions).toBe(1);
      expect(stats.totalFeedbacks).toBe(1);
      expect(stats.averageScore).toBe(0.9);
    });
  });
});

describe('ExecutionTracker', () => {
  let tracker: ExecutionTracker;

  beforeEach(() => {
    tracker = getExecutionTracker();
    tracker.reset();
  });

  describe('执行跟踪', () => {
    it('应该能够开始和完成执行跟踪', () => {
      const trace = tracker.startExecution('exec1', 'decision1');

      expect(trace).toBeDefined();
      expect(trace.executionId).toBe('exec1');
      expect(trace.status).toBe('pending');

      tracker.completeExecution('exec1', true);
      const completed = tracker.getTrace('exec1');

      expect(completed?.status).toBe('completed');
    });

    it('应该能够记录执行步骤', () => {
      tracker.startExecution('exec1', 'decision1');
      tracker.recordStep('exec1', 1, 'action1', {}, { result: 'ok' });

      const trace = tracker.getTrace('exec1');
      expect(trace?.steps.length).toBe(1);
      expect(trace?.steps[0].action).toBe('action1');
    });

    it('应该能够生成执行报告', () => {
      tracker.startExecution('exec1', 'decision1');
      tracker.recordStep('exec1', 1, 'action1', {}, { result: 'ok' });
      tracker.recordStep('exec1', 2, 'action2', {}, { result: 'ok' });
      tracker.completeExecution('exec1', true);

      const report = tracker.generateExecutionReport('exec1');
      expect(report.stepCount).toBe(2);
      expect(report.successStepCount).toBe(2);
      expect(report.status).toBe('completed');
    });
  });
});

describe('FeedbackProcessor', () => {
  let processor: FeedbackProcessor;
  let tracker: ExecutionTracker;

  beforeEach(() => {
    tracker = getExecutionTracker();
    tracker.reset();
    processor = getFeedbackProcessor();
  });

  describe('反馈处理', () => {
    it('应该能够处理反馈', () => {
      tracker.startExecution('exec1', 'decision1');
      tracker.completeExecution('exec1', true);

      const feedback = processor.processFeedback(
        'exec1',
        true,
        0.9,
        'Great!'
      );

      expect(feedback).toBeDefined();
      expect(feedback.success).toBe(true);
      expect(feedback.score).toBe(0.9);
    });

    it('应该能够自动评分执行', () => {
      tracker.startExecution('exec1', 'decision1');
      tracker.recordStep('exec1', 1, 'action1', {}, { result: 'ok' });
      tracker.recordStep('exec1', 2, 'action2', {}, { result: 'ok' });
      tracker.completeExecution('exec1', true);

      const score = processor.autoScoreExecution('exec1');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('应该能够生成反馈建议', () => {
      tracker.startExecution('exec1', 'decision1');
      tracker.recordStep('exec1', 1, 'action1', {}, undefined, 'Error');
      tracker.completeExecution('exec1', false);

      const suggestions = processor.generateFeedbackSuggestions('exec1');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('应该能够获取反馈统计', () => {
      tracker.startExecution('exec1', 'decision1');
      tracker.recordStep('exec1', 1, 'action1', {}, { result: 'ok' });
      tracker.completeExecution('exec1', true);

      processor.processFeedback('exec1', true, 0.9, 'Good');

      const stats = processor.getFeedbackStatistics('decision1');
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.averageScore).toBe(0.9);
    });
  });
});

describe('AutonomousImprovementEngine', () => {
  let engine: AutonomousImprovementEngine;
  let tracker: ExecutionTracker;
  let processor: FeedbackProcessor;

  beforeEach(() => {
    tracker = getExecutionTracker();
    tracker.reset();
    processor = getFeedbackProcessor();
    engine = getAutonomousImprovementEngine();
  });

  describe('改进分析', () => {
    it('应该能够分析反馈并生成改进', () => {
      // 创建多个执行和反馈
      for (let i = 0; i < 3; i++) {
        tracker.startExecution(`exec${i}`, 'decision1');
        tracker.recordStep(`exec${i}`, 1, 'action', {}, { result: 'ok' });
        tracker.completeExecution(`exec${i}`, i < 2);
        processor.processFeedback(`exec${i}`, i < 2, i < 2 ? 0.9 : 0.3, 'Test');
      }

      const improvements = engine.analyzeFeedbackAndGenerateImprovements('decision1');
      expect(improvements).toBeDefined();
      expect(improvements.improvements.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('全局实例', () => {
  it('应该能够获取全局反馈循环管理器', () => {
    const manager1 = getFeedbackLoopManager();
    const manager2 = getFeedbackLoopManager();

    expect(manager1).toBe(manager2);
  });

  it('应该能够获取全局执行跟踪器', () => {
    const tracker1 = getExecutionTracker();
    const tracker2 = getExecutionTracker();

    expect(tracker1).toBe(tracker2);
  });

  it('应该能够获取全局反馈处理器', () => {
    const processor1 = getFeedbackProcessor();
    const processor2 = getFeedbackProcessor();

    expect(processor1).toBe(processor2);
  });

  it('应该能够获取全局自主改进引擎', () => {
    const engine1 = getAutonomousImprovementEngine();
    const engine2 = getAutonomousImprovementEngine();

    expect(engine1).toBe(engine2);
  });
});
