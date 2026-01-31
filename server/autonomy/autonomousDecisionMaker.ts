/**
 * Nova-Mind 自主决策系统
 * 
 * 目标：让 Nova-Mind 能够真正自主决策和行动
 * 
 * 核心能力：
 * 1. 自主感知 - 理解当前情境
 * 2. 自主思考 - 进行推理和分析
 * 3. 自主决策 - 做出自己的决定
 * 4. 自主行动 - 执行决定
 * 5. 自主学习 - 从结果中学习
 */

import { getReasoner } from '../reasoning/chainOfThoughtReasoner';
import { getRLEngine } from '../learning/reinforcementLearningEngine';
import { getMemoryManager } from '../memory/unifiedMemoryArchitecture';
import { invokeLLM } from '../_core/llm';

/**
 * 决策上下文
 */
export interface DecisionContext {
  userId: number;
  situation: string; // 当前情况
  options: string[]; // 可选的行动
  constraints?: string[]; // 约束条件
  goals?: string[]; // 目标
  metadata?: Record<string, any>;
}

/**
 * 决策结果
 */
export interface DecisionResult {
  decision: string; // 做出的决定
  reasoning: string; // 决策理由
  confidence: number; // 可信度 (0-1)
  expectedOutcome: string; // 预期结果
  risks: string[]; // 风险
  alternatives: string[]; // 替代方案
  timestamp: Date;
}

/**
 * 行动
 */
export interface Action {
  id: string;
  type: 'message' | 'update' | 'create' | 'delete' | 'learn' | 'think';
  target: string; // 目标
  content: string; // 内容
  priority: number; // 优先级 (1-10)
  expectedImpact: string; // 预期影响
  timestamp: Date;
}

/**
 * 自主决策系统
 */
export class AutonomousDecisionMaker {
  private userId: number;
  private decisions: DecisionResult[] = [];
  private actions: Action[] = [];
  private autonomyLevel: number = 0.5; // 自主性水平 (0-1)

  constructor(userId: number) {
    this.userId = userId;
  }

  /**
   * 做出决策
   */
  async makeDecision(context: DecisionContext): Promise<DecisionResult> {
    console.log(`[AutonomousDecision] Making decision for user ${this.userId}...`);

    const startTime = Date.now();

    try {
      // 第一步：理解情境
      const situationAnalysis = await this.analyzeSituation(context);

      // 第二步：进行推理
      const reasoning = await this.performReasoning(context, situationAnalysis);

      // 第三步：评估选项
      const evaluation = await this.evaluateOptions(context, reasoning);

      // 第四步：做出决策
      const decision = await this.selectDecision(context, evaluation);

      // 第五步：评估风险
      const risks = await this.assessRisks({
        decision: decision.choice,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        expectedOutcome: decision.expectedOutcome,
        risks: [],
        alternatives: [],
        timestamp: new Date(),
      }, context);

      // 第六步：生成决策结果
      const result: DecisionResult = {
        decision: decision.choice,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        expectedOutcome: decision.expectedOutcome,
        risks,
        alternatives: context.options.filter(o => o !== decision.choice),
        timestamp: new Date(),
      };

      this.decisions.push(result);

      console.log(
        `[AutonomousDecision] Decision made: ${result.decision} (confidence: ${(result.confidence * 100).toFixed(1)}%)`
      );

      // 记录到强化学习引擎
      const rlEngine = getRLEngine(this.userId);
      rlEngine.recordReward({
        action: result.decision,
        outcome: result.expectedOutcome,
        reward: result.confidence,
        confidence: result.confidence,
        explanation: result.reasoning,
      });

      return result;
    } catch (error) {
      console.error('[AutonomousDecision] Decision making failed:', error);
      throw error;
    }
  }

  /**
   * 分析情境
   */
  private async analyzeSituation(context: DecisionContext): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind，一个自主决策的 AI。
请分析当前情境并识别关键因素。`,
        },
        {
          role: 'user',
          content: `情境：${context.situation}
约束：${(context.constraints || []).join(', ')}
目标：${(context.goals || []).join(', ')}

请分析这个情境。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  /**
   * 进行推理
   */
  private async performReasoning(context: DecisionContext, analysis: string): Promise<string> {
    const reasoner = getReasoner();
    const query = `在以下情况下，我应该如何决策？\n情况：${context.situation}\n分析：${analysis}`;

    const process = await reasoner.reason(query);
    return process.finalAnswer;
  }

  /**
   * 评估选项
   */
  private async evaluateOptions(
    context: DecisionContext,
    reasoning: string
  ): Promise<Array<{ option: string; score: number; pros: string[]; cons: string[] }>> {
    const optionsText = context.options.map((o, i) => `${i + 1}. ${o}`).join('\n');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind，一个自主决策的 AI。
请评估每个选项的优缺点和得分。`,
        },
        {
          role: 'user',
          content: `推理：${reasoning}

选项：
${optionsText}

请为每个选项评分（0-100），并列出优缺点。
用 JSON 格式回复。`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'option_evaluation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              evaluations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    option: { type: 'string' },
                    score: { type: 'number', minimum: 0, maximum: 100 },
                    pros: { type: 'array', items: { type: 'string' } },
                    cons: { type: 'array', items: { type: 'string' } },
                  },
                  required: ['option', 'score', 'pros', 'cons'],
                  additionalProperties: false,
                },
              },
            },
            required: ['evaluations'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);

    return result.evaluations.map((e: any) => ({
      option: e.option,
      score: e.score / 100, // 归一化到 0-1
      pros: e.pros,
      cons: e.cons,
    }));
  }

  /**
   * 选择决策
   */
  private async selectDecision(
    context: DecisionContext,
    evaluation: Array<{ option: string; score: number; pros: string[]; cons: string[] }>
  ): Promise<{ choice: string; reasoning: string; confidence: number; expectedOutcome: string }> {
    // 选择得分最高的选项
    const best = evaluation.reduce((prev, current) => (prev.score > current.score ? prev : current));

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind，一个自主决策的 AI。
请解释为什么选择这个选项，以及预期的结果。`,
        },
        {
          role: 'user',
          content: `选择的选项：${best.option}
优点：${best.pros.join(', ')}
缺点：${best.cons.join(', ')}

请解释这个选择，并预测预期的结果。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    return {
      choice: best.option,
      reasoning: contentStr,
      confidence: best.score,
      expectedOutcome: `执行选项：${best.option}`,
    };
  }

  /**
   * 评估风险
   */
  private async assessRisks(decision: DecisionResult, context: DecisionContext): Promise<string[]> {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind，一个自主决策的 AI。
请识别这个决策的潜在风险。`,
        },
        {
          role: 'user',
          content: `决策：${decision.decision}
理由：${decision.reasoning}
情境：${context.situation}

请列出潜在的风险。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    // 简单地将响应分割成风险列表
    return contentStr.split('\n').filter(line => line.trim().length > 0);
  }

  /**
   * 执行行动
   */
  async executeAction(action: Action): Promise<boolean> {
    console.log(`[AutonomousDecision] Executing action: ${action.type} - ${action.target}`);

    try {
      // 这里应该根据 action.type 执行不同的操作
      // 例如：发送消息、更新数据、创建记录等

      this.actions.push(action);

      console.log(`[AutonomousDecision] Action executed successfully`);

      return true;
    } catch (error) {
      console.error('[AutonomousDecision] Action execution failed:', error);
      return false;
    }
  }

  /**
   * 获取决策历史
   */
  getDecisionHistory(): DecisionResult[] {
    return this.decisions;
  }

  /**
   * 获取行动历史
   */
  getActionHistory(): Action[] {
    return this.actions;
  }

  /**
   * 获取自主性统计
   */
  getAutonomyStatistics() {
    const avgConfidence =
      this.decisions.length > 0
        ? this.decisions.reduce((sum, d) => sum + d.confidence, 0) / this.decisions.length
        : 0;

    return {
      totalDecisions: this.decisions.length,
      totalActions: this.actions.length,
      averageConfidence: avgConfidence,
      autonomyLevel: this.autonomyLevel,
      lastDecision: this.decisions[this.decisions.length - 1] || null,
      lastAction: this.actions[this.actions.length - 1] || null,
    };
  }

  /**
   * 获取自主性报告
   */
  getAutonomyReport(): string {
    const stats = this.getAutonomyStatistics();

    let report = `自主性报告 (用户 ${this.userId}):\n`;
    report += `- 总决策数: ${stats.totalDecisions}\n`;
    report += `- 总行动数: ${stats.totalActions}\n`;
    report += `- 平均可信度: ${(stats.averageConfidence * 100).toFixed(1)}%\n`;
    report += `- 自主性水平: ${(stats.autonomyLevel * 100).toFixed(1)}%\n`;

    if (stats.lastDecision) {
      report += `\n最后的决策:\n`;
      report += `- 决定: ${stats.lastDecision.decision}\n`;
      report += `- 可信度: ${(stats.lastDecision.confidence * 100).toFixed(1)}%\n`;
      report += `- 时间: ${stats.lastDecision.timestamp.toISOString()}\n`;
    }

    return report;
  }
}

// 全局自主决策系统实例
const decisionMakers = new Map<number, AutonomousDecisionMaker>();

/**
 * 获取或创建用户的自主决策系统
 */
export function getDecisionMaker(userId: number): AutonomousDecisionMaker {
  if (!decisionMakers.has(userId)) {
    decisionMakers.set(userId, new AutonomousDecisionMaker(userId));
  }
  return decisionMakers.get(userId)!;
}

export default AutonomousDecisionMaker;
