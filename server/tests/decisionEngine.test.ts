/**
 * 决策引擎测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import DecisionReasoningEngine, { getDecisionEngine, Fact, InferenceRule, DecisionContext } from '../reasoning/decisionEngine';

describe('DecisionReasoningEngine', () => {
  let engine: DecisionReasoningEngine;

  beforeEach(() => {
    engine = new DecisionReasoningEngine();
  });

  describe('事实管理', () => {
    it('应该能够添加和获取事实', () => {
      engine.addFact('user_asking_question', true, 0.9);
      const fact = engine.getFact('user_asking_question');
      
      expect(fact).toBeDefined();
      expect(fact?.symbol).toBe('user_asking_question');
      expect(fact?.confidence).toBe(0.9);
    });

    it('应该能够获取所有事实', () => {
      engine.addFact('fact1', 'value1', 0.8);
      engine.addFact('fact2', 'value2', 0.9);
      
      const facts = engine.getAllFacts();
      expect(facts.length).toBe(2);
    });

    it('应该能够更新事实的置信度', () => {
      engine.addFact('symbol1', 'value1', 0.5);
      engine.addFact('symbol1', 'value1', 0.9); // 更新
      
      const fact = engine.getFact('symbol1');
      expect(fact?.confidence).toBe(0.9);
    });
  });

  describe('规则管理', () => {
    it('应该能够添加规则', () => {
      const rule: InferenceRule = {
        id: 'rule1',
        conditions: ['condition1', 'condition2'],
        conclusion: 'conclusion1',
        confidence: 0.9,
        weight: 1.0,
        frequency: 5,
      };

      engine.addRule(rule);
      const state = engine.getState();
      expect(state.ruleCount).toBe(1);
    });
  });

  describe('前向推理', () => {
    it('应该能够执行前向推理', () => {
      // 添加事实
      engine.addFact('user_asking_question', true, 0.95);
      engine.addFact('question_is_clear', true, 0.9);

      // 添加规则：如果用户提问且问题清晰，则应该回答
      const rule: InferenceRule = {
        id: 'rule1',
        conditions: ['user_asking_question', 'question_is_clear'],
        conclusion: 'should_answer',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      };

      engine.addRule(rule);

      // 执行前向推理
      const newFacts = engine.forwardChaining();

      // 应该推导出新事实
      expect(newFacts.length).toBeGreaterThan(0);
      const shouldAnswerFact = engine.getFact('should_answer');
      expect(shouldAnswerFact).toBeDefined();
      expect(shouldAnswerFact?.confidence).toBeGreaterThan(0);
    });

    it('应该能够处理多步推理', () => {
      // 添加初始事实
      engine.addFact('A', true, 0.9);

      // 添加规则链：A -> B -> C
      engine.addRule({
        id: 'rule1',
        conditions: ['A'],
        conclusion: 'B',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      engine.addRule({
        id: 'rule2',
        conditions: ['B'],
        conclusion: 'C',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      // 执行前向推理
      engine.forwardChaining();

      // 应该推导出 B 和 C
      expect(engine.getFact('B')).toBeDefined();
      expect(engine.getFact('C')).toBeDefined();
    });
  });

  describe('后向推理', () => {
    it('应该能够执行后向推理', () => {
      // 添加事实
      engine.addFact('condition1', true, 0.9);
      engine.addFact('condition2', true, 0.9);

      // 添加规则
      engine.addRule({
        id: 'rule1',
        conditions: ['condition1', 'condition2'],
        conclusion: 'goal',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      // 执行后向推理以达到目标
      const result = engine.backwardChaining('goal');

      expect(result).toBe(true);
      expect(engine.getFact('goal')).toBeDefined();
    });
  });

  describe('置信度计算', () => {
    it('应该能够正确计算置信度', () => {
      // 添加置信度不同的事实
      engine.addFact('fact1', true, 0.8);
      engine.addFact('fact2', true, 0.6);

      // 添加规则
      engine.addRule({
        id: 'rule1',
        conditions: ['fact1', 'fact2'],
        conclusion: 'result',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      // 执行推理
      engine.forwardChaining();

      // 结论的置信度应该是规则置信度 * 最小条件置信度
      const result = engine.getFact('result');
      expect(result?.confidence).toBeLessThanOrEqual(0.9 * 0.6); // 0.54
    });
  });

  describe('决策制定', () => {
    it('应该能够制定决策', async () => {
      // 设置上下文
      const context: DecisionContext = {
        userId: 1,
        conversationId: 1,
        currentState: {
          user_asking_question: true,
          question_is_clear: true,
        },
        timestamp: new Date(),
      };

      // 添加规则
      engine.addRule({
        id: 'rule1',
        conditions: ['user_asking_question', 'question_is_clear'],
        conclusion: 'answer_question',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      // 制定决策
      const decision = await engine.makeDecision(context);

      expect(decision).toBeDefined();
      expect(decision.action).toBeDefined();
      expect(decision.confidence).toBeGreaterThan(0);
      expect(decision.reasoning.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('引擎状态', () => {
    it('应该能够获取引擎状态', () => {
      engine.addFact('fact1', 'value1', 0.9);
      engine.addRule({
        id: 'rule1',
        conditions: ['fact1'],
        conclusion: 'conclusion1',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      const state = engine.getState();

      expect(state.factCount).toBe(1);
      expect(state.ruleCount).toBe(1);
    });

    it('应该能够重置引擎', () => {
      engine.addFact('fact1', 'value1', 0.9);
      engine.reset();

      const state = engine.getState();
      expect(state.factCount).toBe(0);
      expect(state.ruleCount).toBe(0);
    });
  });

  describe('全局引擎实例', () => {
    it('应该能够获取全局引擎实例', () => {
      const globalEngine = getDecisionEngine();
      expect(globalEngine).toBeDefined();
      expect(globalEngine).toBeInstanceOf(DecisionReasoningEngine);
    });

    it('全局实例应该是单例', () => {
      const engine1 = getDecisionEngine();
      const engine2 = getDecisionEngine();
      expect(engine1).toBe(engine2);
    });
  });

  describe('推理日志', () => {
    it('应该能够记录推理步骤', () => {
      engine.addFact('A', true, 0.9);
      engine.addRule({
        id: 'rule1',
        conditions: ['A'],
        conclusion: 'B',
        confidence: 0.9,
        weight: 1.0,
        frequency: 1,
      });

      engine.forwardChaining();
      const logs = engine.getReasoningLogs();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].explanation).toBeDefined();
    });
  });

  describe('性能测试', () => {
    it('应该能够在合理时间内处理大量事实和规则', () => {
      const startTime = Date.now();

      // 添加 100 个事实
      for (let i = 0; i < 100; i++) {
        engine.addFact(`fact_${i}`, `value_${i}`, 0.9);
      }

      // 添加 50 个规则
      for (let i = 0; i < 50; i++) {
        engine.addRule({
          id: `rule_${i}`,
          conditions: [`fact_${i}`, `fact_${(i + 1) % 100}`],
          conclusion: `result_${i}`,
          confidence: 0.9,
          weight: 1.0,
          frequency: 1,
        });
      }

      // 执行推理
      engine.forwardChaining(10);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 应该在 1 秒内完成
      expect(duration).toBeLessThan(1000);
    });
  });
});
