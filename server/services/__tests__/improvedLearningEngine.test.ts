import { describe, it, expect } from 'vitest';
import { getImprovedLearningEngine } from '../improvedLearningEngine';

describe('ImprovedLearningEngine', () => {
  const engine = getImprovedLearningEngine();

  describe('关键词提取 (TextRank)', () => {
    it('应该能够从文本中提取关键词', () => {
      const text = 'Machine learning is a subset of artificial intelligence. Machine learning algorithms learn from data.';
      const keywords = engine.extractKeywords(text, 5);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords[0]).toHaveProperty('word');
      expect(keywords[0]).toHaveProperty('score');
      expect(keywords[0]).toHaveProperty('frequency');
    });

    it('应该按分数排序关键词', () => {
      const text = 'data data data science science machine learning';
      const keywords = engine.extractKeywords(text, 10);

      for (let i = 0; i < keywords.length - 1; i++) {
        expect(keywords[i].score).toBeGreaterThanOrEqual(keywords[i + 1].score);
      }
    });

    it('应该过滤停用词', () => {
      const text = 'the quick brown fox jumps over the lazy dog';
      const keywords = engine.extractKeywords(text, 10);

      const stopWords = ['the', 'over', 'a', 'and'];
      keywords.forEach(kw => {
        expect(stopWords).not.toContain(kw.word);
      });
    });

    it('应该支持中文关键词提取', () => {
      const text = '机器学习是人工智能的重要分支。机器学习算法从数据中学习。';
      const keywords = engine.extractKeywords(text, 5);

      expect(keywords.length).toBeGreaterThan(0);
    });
  });

  describe('概念提取', () => {
    it('应该能够从对话中提取概念', () => {
      const messages = [
        { role: 'user', content: '什么是递归算法？' },
        { role: 'assistant', content: '递归是一种编程技术，函数调用自己来解决子问题。' },
      ];

      const concepts = engine.extractConcepts(messages, 10);
      expect(concepts.length).toBeGreaterThan(0);
      expect(concepts[0]).toHaveProperty('name');
      expect(concepts[0]).toHaveProperty('frequency');
      expect(concepts[0]).toHaveProperty('importance');
    });
  });

  describe('概念合并', () => {
    it('应该能够合并相似概念', () => {
      const concepts = [
        { name: 'machine learning', frequency: 5, importance: 0.8, firstMentioned: new Date() },
        { name: 'machine learn', frequency: 3, importance: 0.7, firstMentioned: new Date() },
        { name: 'deep learning', frequency: 4, importance: 0.9, firstMentioned: new Date() },
      ];

      const merged = engine.mergeConcepts(concepts, 0.7);
      expect(merged.length).toBeLessThanOrEqual(concepts.length);
    });

    it('应该保留合并后的频率总和', () => {
      const concepts = [
        { name: 'AI', frequency: 5, importance: 0.8, firstMentioned: new Date() },
        { name: 'AI', frequency: 3, importance: 0.7, firstMentioned: new Date() },
      ];

      const merged = engine.mergeConcepts(concepts, 0.95);
      const totalFreq = merged.reduce((sum, c) => sum + c.frequency, 0);
      expect(totalFreq).toBe(8);
    });
  });

  describe('关系识别', () => {
    it('应该能够识别概念之间的关系', () => {
      const concepts = [
        { name: 'machine learning', frequency: 5, importance: 0.8, firstMentioned: new Date() },
        { name: 'deep learning', frequency: 4, importance: 0.9, firstMentioned: new Date() },
        { name: 'neural networks', frequency: 3, importance: 0.7, firstMentioned: new Date() },
      ];

      const relations = engine.identifyRelations(concepts);
      expect(relations.length).toBeGreaterThan(0);
      expect(relations[0]).toHaveProperty('source');
      expect(relations[0]).toHaveProperty('target');
      expect(relations[0]).toHaveProperty('strength');
      expect(relations[0]).toHaveProperty('type');
    });
  });

  describe('主题识别', () => {
    it('应该能够识别主题', () => {
      const keywords = [
        { word: 'machine', score: 100, frequency: 10 },
        { word: 'learning', score: 95, frequency: 9 },
        { word: 'algorithm', score: 85, frequency: 8 },
        { word: 'data', score: 80, frequency: 7 },
      ];

      const topics = engine.identifyTopics(keywords, 3);
      expect(topics.length).toBeGreaterThan(0);
      expect(Array.isArray(topics[0])).toBe(true);
    });
  });

  describe('质量评估', () => {
    it('应该能够评估学习质量', () => {
      const messages = [
        { role: 'user', content: '什么是递归？' },
        { role: 'assistant', content: '递归是函数调用自己的技术。' },
      ];

      const concepts = [
        { name: 'recursion', frequency: 2, importance: 0.8, firstMentioned: new Date() },
      ];

      const quality = engine.evaluateQuality(messages, concepts, 1);
      expect(quality).toHaveProperty('depth');
      expect(quality).toHaveProperty('novelty');
      expect(quality).toHaveProperty('value');
      expect(['shallow', 'medium', 'deep']).toContain(quality.depth);
      expect(quality.novelty).toBeGreaterThanOrEqual(0);
      expect(quality.novelty).toBeLessThanOrEqual(1);
    });

    it('应该根据消息数量判断深度', () => {
      const deepMessages = Array(30)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
        }));

      const concepts = Array(15)
        .fill(null)
        .map((_, i) => ({
          name: `concept${i}`,
          frequency: 1,
          importance: 0.5,
          firstMentioned: new Date(),
        }));

      const quality = engine.evaluateQuality(deepMessages, concepts, 10);
      expect(quality.depth).toBe('deep');
    });
  });

  describe('洞察生成', () => {
    it('应该能够生成学习洞察', () => {
      const keywords = [
        { word: 'machine', score: 100, frequency: 10 },
        { word: 'learning', score: 95, frequency: 9 },
      ];

      const concepts = [
        { name: 'ML', frequency: 5, importance: 0.8, firstMentioned: new Date() },
      ];

      const topics = [['machine', 'learning']];

      const insights = engine.generateInsights(keywords, concepts, topics);
      expect(insights).toHaveProperty('mainInsight');
      expect(insights).toHaveProperty('secondaryInsights');
      expect(typeof insights.mainInsight).toBe('string');
      expect(Array.isArray(insights.secondaryInsights)).toBe(true);
    });
  });
});
