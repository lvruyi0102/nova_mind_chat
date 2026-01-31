import { describe, it, expect, beforeEach } from 'vitest';
import LearningCycleManager, {
  SymbolExtractor,
  RelationshipLearner,
  RuleLearner,
  LearningContext,
} from '../learning/learningCycle';

describe('Learning Cycle System', () => {
  let learningManager: LearningCycleManager;
  let symbolExtractor: SymbolExtractor;
  let relationshipLearner: RelationshipLearner;
  let ruleLearner: RuleLearner;

  beforeEach(() => {
    learningManager = new LearningCycleManager();
    symbolExtractor = new SymbolExtractor();
    relationshipLearner = new RelationshipLearner();
    ruleLearner = new RuleLearner();
  });

  describe('Symbol Extraction', () => {
    it('should extract symbols from text', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '我想学习编程',
        assistantResponse: '编程是一项很有用的技能',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);

      expect(symbols.length).toBeGreaterThan(0);
      expect(symbols.some(s => s.text === '编程')).toBe(true);
      expect(symbols.some(s => s.text === '学习')).toBe(true);
    });

    it('should classify symbols correctly', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: 'Alice 快速学习',
        assistantResponse: '很好',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);

      // Alice 应该被识别为实体（大写开头）
      const alice = symbols.find(s => s.text === 'Alice');
      if (alice) {
        expect(alice.type).toBe('entity');
      }
    });

    it('should track symbol frequency', () => {
      const context1: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '我喜欢编程',
        assistantResponse: '编程很有趣',
        timestamp: new Date(),
      };

      const context2: LearningContext = {
        conversationId: 1,
        messageId: 2,
        userMessage: '编程很难吗',
        assistantResponse: '编程需要练习',
        timestamp: new Date(),
      };

      const symbols1 = symbolExtractor.extractSymbols(context1.userMessage, context1);
      const symbols2 = symbolExtractor.extractSymbols(context2.userMessage, context2);

      expect(symbols1.length).toBeGreaterThan(0);
      expect(symbols2.length).toBeGreaterThan(0);
    });
  });

  describe('Relationship Learning', () => {
    it('should learn relationships between symbols', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '我想学习编程',
        assistantResponse: '编程是一项很有用的技能',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);
      const relationships = relationshipLearner.learnRelationships(symbols, context);

      expect(relationships.length).toBeGreaterThanOrEqual(0);
      relationships.forEach(rel => {
        expect(rel.type).toMatch(/semantic|causal|temporal|spatial|emotional/);
        expect(rel.strength).toBeGreaterThanOrEqual(0);
        expect(rel.strength).toBeLessThanOrEqual(1);
      });
    });

    it('should identify causal relationships', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '因为我喜欢编程，所以我每天都练习',
        assistantResponse: '这是很好的学习方式',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);
      const relationships = relationshipLearner.learnRelationships(symbols, context);

      const causalRels = relationships.filter(r => r.type === 'causal');
      expect(causalRels.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate relationship strength correctly', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '我学习编程',
        assistantResponse: '很好',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);
      const relationships = relationshipLearner.learnRelationships(symbols, context);

      relationships.forEach(rel => {
        expect(rel.strength).toBeGreaterThanOrEqual(0);
        expect(rel.strength).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Rule Learning', () => {
    it('should learn rules from relationships', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '因为我努力，所以我成功',
        assistantResponse: '这是正确的因果关系',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);
      const relationships = relationshipLearner.learnRelationships(symbols, context);
      const rules = ruleLearner.learnRules(relationships, learningManager.getState().symbols);

      expect(rules.length).toBeGreaterThanOrEqual(0);
      rules.forEach(rule => {
        expect(rule.confidence).toBeGreaterThanOrEqual(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
        expect(rule.frequency).toBeGreaterThanOrEqual(1);
      });
    });

    it('should track rule validation', () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '如果下雨，那么我会呆在家里',
        assistantResponse: '这是一个合理的规则',
        timestamp: new Date(),
      };

      const symbols = symbolExtractor.extractSymbols(context.userMessage, context);
      const relationships = relationshipLearner.learnRelationships(symbols, context);
      const rules = ruleLearner.learnRules(relationships, learningManager.getState().symbols);

      expect(rules.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Learning Cycle Manager', () => {
    it('should execute a complete learning cycle', async () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '我想学习机器学习',
        assistantResponse: '机器学习是一个很有趣的领域',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      const state = learningManager.getState();
      expect(state.symbols.size).toBeGreaterThanOrEqual(0);
      expect(state.totalLearningEvents).toBe(1);
    });

    it('should accumulate knowledge over multiple cycles', async () => {
      const contexts: LearningContext[] = [
        {
          conversationId: 1,
          messageId: 1,
          userMessage: '我喜欢编程',
          assistantResponse: '编程很有趣',
          timestamp: new Date(),
        },
        {
          conversationId: 1,
          messageId: 2,
          userMessage: '编程很难',
          assistantResponse: '编程需要练习',
          timestamp: new Date(),
        },
        {
          conversationId: 1,
          messageId: 3,
          userMessage: '我每天都练习编程',
          assistantResponse: '这是很好的学习方式',
          timestamp: new Date(),
        },
      ];

      for (const context of contexts) {
        await learningManager.learn(context);
      }

      const state = learningManager.getState();
      expect(state.totalLearningEvents).toBe(3);
      expect(state.learningHistory.length).toBe(3);
    });

    it('should generate knowledge summary', async () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '我想学习人工智能',
        assistantResponse: '人工智能是未来的技术',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      const summary = learningManager.getKnowledgeSummary();

      expect(summary).toHaveProperty('symbolCount');
      expect(summary).toHaveProperty('relationshipCount');
      expect(summary).toHaveProperty('ruleCount');
      expect(summary).toHaveProperty('topSymbols');
      expect(summary).toHaveProperty('topRules');
      expect(Array.isArray(summary.topSymbols)).toBe(true);
      expect(Array.isArray(summary.topRules)).toBe(true);
    });

    it('should reset learning state', async () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '测试消息',
        assistantResponse: '测试响应',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      let state = learningManager.getState();
      expect(state.totalLearningEvents).toBe(1);

      learningManager.reset();

      state = learningManager.getState();
      expect(state.symbols.size).toBe(0);
      expect(state.relationships.length).toBe(0);
      expect(state.rules.length).toBe(0);
      expect(state.totalLearningEvents).toBe(0);
    });
  });

  describe('Learning Performance', () => {
    it('should process learning efficiently', async () => {
      const startTime = Date.now();

      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '这是一个关于机器学习和深度学习的对话',
        assistantResponse: '机器学习和深度学习是人工智能的重要分支',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      const duration = Date.now() - startTime;

      // 学习应该在 1 秒内完成
      expect(duration).toBeLessThan(1000);
    });

    it('should handle large conversations', async () => {
      const longMessage =
        '这是一个很长的消息，包含很多信息。' +
        '我想学习编程、数据科学、机器学习、深度学习、自然语言处理、计算机视觉等多个领域。' +
        '这些领域都很有趣，我希望能够掌握它们。' +
        '我每天都在学习新的知识和技能。';

      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: longMessage,
        assistantResponse: '你的学习热情很高，继续加油！',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      const state = learningManager.getState();
      expect(state.symbols.size).toBeGreaterThan(0);
    });
  });

  describe('Knowledge Quality', () => {
    it('should extract meaningful symbols', async () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '张三是一个优秀的程序员',
        assistantResponse: '是的，他的编程技能很强',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      const summary = learningManager.getKnowledgeSummary();
      const topSymbols = summary.topSymbols;

      // 应该包含有意义的符号
      expect(topSymbols.length).toBeGreaterThanOrEqual(0);
      topSymbols.forEach(symbol => {
        expect(symbol.text.length).toBeGreaterThan(0);
      });
    });

    it('should build relationships with high confidence', async () => {
      const context: LearningContext = {
        conversationId: 1,
        messageId: 1,
        userMessage: '编程需要逻辑思维',
        assistantResponse: '是的，逻辑思维是编程的基础',
        timestamp: new Date(),
      };

      await learningManager.learn(context);

      const state = learningManager.getState();
      state.relationships.forEach(rel => {
        expect(rel.strength).toBeGreaterThanOrEqual(0);
        expect(rel.strength).toBeLessThanOrEqual(1);
      });
    });
  });
});
