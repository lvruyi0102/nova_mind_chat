/**
 * 决策引擎集成模块
 * 
 * 连接学习系统和决策系统：
 * 1. 从学习循环中加载符号、关系、规则
 * 2. 构建决策推理引擎
 * 3. 执行决策推理
 * 4. 保存决策结果
 */

import { getDb } from '../db';
import { getDecisionEngine, DecisionContext, Decision } from './decisionEngine';
import { LearningCycleManager } from '../learning/learningCycle';
import { eq } from 'drizzle-orm';
import { autonomousDecisions } from '../../drizzle/schema';

/**
 * 决策集成管理器
 */
export class DecisionIntegrationManager {
  private learningManager: LearningCycleManager;
  private decisionEngine = getDecisionEngine();

  constructor() {
    this.learningManager = new LearningCycleManager();
  }

  /**
   * 执行完整的决策流程
   * 1. 加载学到的符号、关系、规则
   * 2. 构建推理引擎
   * 3. 执行推理
   * 4. 保存决策结果
   */
  async executeDecisionFlow(context: DecisionContext): Promise<Decision> {
    try {
      // 1. 加载学到的符号、关系、规则
      const summary = this.learningManager.getKnowledgeSummary();
      const symbols = summary.topSymbols;
      const relationships = this.learningManager.getState().relationships;
      const rules = summary.topRules;

      // 2. 重置决策引擎
      this.decisionEngine.reset();

      // 3. 加载符号作为事实
      for (const symbol of symbols) {
        this.decisionEngine.addFact(
          symbol.text,
          symbol.frequency,
          Math.min(symbol.confidence, 1.0),
          'learned'
        );
      }

      // 4. 加载规则
      for (const rule of rules) {
        const conditionTexts = rule.condition.map(s => s.text);
        const conclusionText = rule.consequence.length > 0 ? rule.consequence[0].text : '';
        this.decisionEngine.addRule({
          id: `rule_${rule.id}`,
          conditions: conditionTexts,
          conclusion: conclusionText,
          confidence: Math.min(rule.confidence, 1.0),
          weight: 1.0,
          frequency: rule.frequency || 0,
        });
      }

      // 5. 执行决策推理
      const decision = await this.decisionEngine.makeDecision(context);

      // 6. 保存决策结果
      await this.saveDecision(context.userId, decision);

      return decision;
    } catch (error) {
      console.error('[DecisionIntegration] Error executing decision flow:', error);
      throw error;
    }
  }

  /**
   * 保存决策结果
   */
  private async saveDecision(userId: number, decision: Decision): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      await db.insert(autonomousDecisions).values({
        decisionType: decision.action,
        action: decision.action,
        context: JSON.stringify(decision.reasoning),
        reasoning: decision.explanation,
      });
    } catch (error) {
      console.error('[DecisionIntegration] Error saving decision:', error);
    }
  }

  /**
   * 获取决策引擎状态
   */
  getEngineState() {
    return this.decisionEngine.getState();
  }

  /**
   * 获取所有事实
   */
  getAllFacts() {
    return this.decisionEngine.getAllFacts();
  }

  /**
   * 获取推理日志
   */
  getReasoningLogs() {
    return this.decisionEngine.getReasoningLogs();
  }
}

/**
 * 全局决策集成管理器实例
 */
let globalDecisionIntegration: DecisionIntegrationManager | null = null;

/**
 * 获取或创建全局决策集成管理器
 */
export function getDecisionIntegration(): DecisionIntegrationManager {
  if (!globalDecisionIntegration) {
    globalDecisionIntegration = new DecisionIntegrationManager();
  }
  return globalDecisionIntegration;
}

export default DecisionIntegrationManager;
