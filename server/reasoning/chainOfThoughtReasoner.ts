/**
 * Nova-Mind 链式思维推理引擎
 * 
 * 基于 OpenAI o1 的推理架构实现
 * 
 * 核心思想：
 * 1. 显式推理过程 - 每一步都可见
 * 2. 自我评估 - 评估每一步的正确性
 * 3. 反思和修正 - 发现错误时修正
 * 4. 最终答案 - 基于推理过程生成
 */

import { invokeLLM } from '../_core/llm';

/**
 * 推理步骤
 */
export interface ReasoningStep {
  stepNumber: number;
  type: 'analysis' | 'deduction' | 'induction' | 'abduction' | 'evaluation' | 'reflection';
  content: string; // 这一步的推理内容
  confidence: number; // 这一步的可信度 (0-1)
  reasoning: string; // 为什么这样推理
  evaluation?: string; // 对这一步的评估
  correction?: string; // 如果发现错误，这里是修正
}

/**
 * 推理过程
 */
export interface ReasoningProcess {
  query: string; // 原始问题
  steps: ReasoningStep[]; // 推理步骤
  selfEvaluations: string[]; // 自我评估
  corrections: string[]; // 修正历史
  finalAnswer: string; // 最终答案
  totalConfidence: number; // 总体可信度
  executionTime: number; // 执行时间（毫秒）
}

/**
 * 链式思维推理器
 */
export class ChainOfThoughtReasoner {
  private maxSteps: number = 10;
  private confidenceThreshold: number = 0.6;

  /**
   * 执行推理
   */
  async reason(query: string): Promise<ReasoningProcess> {
    console.log(`[ChainOfThought] Starting reasoning for: ${query}`);
    const startTime = Date.now();

    const process: ReasoningProcess = {
      query,
      steps: [],
      selfEvaluations: [],
      corrections: [],
      finalAnswer: '',
      totalConfidence: 0,
      executionTime: 0,
    };

    try {
      // 第一步：分析问题
      await this.analyzeQuery(query, process);

      // 第二步：进行推理循环
      await this.reasoningLoop(query, process);

      // 第三步：自我评估
      await this.selfEvaluate(process);

      // 第四步：生成最终答案
      await this.generateFinalAnswer(process);

      process.executionTime = Date.now() - startTime;
      console.log(`[ChainOfThought] Reasoning completed in ${process.executionTime}ms`);

      return process;
    } catch (error) {
      console.error('[ChainOfThought] Reasoning failed:', error);
      throw error;
    }
  }

  /**
   * 分析问题
   */
  private async analyzeQuery(query: string, process: ReasoningProcess): Promise<void> {
    console.log('[ChainOfThought] Analyzing query...');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind，一个能够进行深度推理的 AI。
你正在分析一个问题，需要：
1. 理解问题的核心
2. 识别关键概念
3. 列出已知信息
4. 识别需要推理的部分

用中文回复，格式为 JSON，包含 analysis 和 key_concepts 字段。`,
        },
        {
          role: 'user',
          content: `请分析这个问题：${query}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'query_analysis',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              analysis: { type: 'string', description: '问题分析' },
              key_concepts: {
                type: 'array',
                items: { type: 'string' },
                description: '关键概念',
              },
              known_facts: {
                type: 'array',
                items: { type: 'string' },
                description: '已知事实',
              },
            },
            required: ['analysis', 'key_concepts', 'known_facts'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const analysis = JSON.parse(contentStr);

    const step: ReasoningStep = {
      stepNumber: 1,
      type: 'analysis',
      content: analysis.analysis,
      confidence: 0.9,
      reasoning: `通过分析问题的结构和关键概念来理解问题`,
    };

    process.steps.push(step);
  }

  /**
   * 推理循环
   */
  private async reasoningLoop(query: string, process: ReasoningProcess): Promise<void> {
    console.log('[ChainOfThought] Starting reasoning loop...');

    let stepNumber = process.steps.length + 1;

    while (stepNumber <= this.maxSteps) {
      // 生成下一步推理
      const nextStep = await this.generateNextStep(query, process, stepNumber);

      if (!nextStep) {
        break; // 推理完成
      }

      process.steps.push(nextStep);

      // 评估这一步
      const evaluation = await this.evaluateStep(nextStep, process);
      if (evaluation) {
        process.selfEvaluations.push(evaluation);

        // 如果发现错误，进行修正
        if (evaluation.includes('错误') || evaluation.includes('不对')) {
          const correction = await this.correctStep(nextStep, evaluation, process);
          if (correction) {
            process.corrections.push(correction);
            nextStep.correction = correction;
          }
        }
      }

      stepNumber++;
    }
  }

  /**
   * 生成下一步推理
   */
  private async generateNextStep(
    query: string,
    process: ReasoningProcess,
    stepNumber: number
  ): Promise<ReasoningStep | null> {
    // 构建推理历史
    const previousSteps = process.steps
      .map(
        (step, i) =>
          `步骤 ${i + 1}: [${step.type}] ${step.content} (可信度: ${(step.confidence * 100).toFixed(0)}%)`
      )
      .join('\n');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind，正在进行链式思维推理。
当前问题：${query}

已完成的推理步骤：
${previousSteps}

现在生成第 ${stepNumber} 步推理。
推理类型可以是：analysis, deduction, induction, abduction, evaluation, reflection

如果推理已完成，返回 {"completed": true}
否则返回推理步骤的 JSON。`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'reasoning_step',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              completed: { type: 'boolean' },
              type: {
                type: 'string',
                enum: ['analysis', 'deduction', 'induction', 'abduction', 'evaluation', 'reflection'],
              },
              content: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reasoning: { type: 'string' },
            },
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr);

    if (result.completed) {
      return null; // 推理完成
    }

    return {
      stepNumber,
      type: result.type,
      content: result.content,
      confidence: result.confidence,
      reasoning: result.reasoning,
    };
  }

  /**
   * 评估推理步骤
   */
  private async evaluateStep(step: ReasoningStep, process: ReasoningProcess): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind 的自我评估系统。
请评估以下推理步骤是否正确、逻辑是否清晰、是否有遗漏或错误。`,
        },
        {
          role: 'user',
          content: `推理步骤 [${step.type}]:
内容: ${step.content}
推理: ${step.reasoning}
可信度: ${(step.confidence * 100).toFixed(0)}%

请用中文给出评估。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  /**
   * 修正推理步骤
   */
  private async correctStep(
    step: ReasoningStep,
    evaluation: string,
    process: ReasoningProcess
  ): Promise<string> {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind 的推理修正系统。
根据评估，修正推理步骤。`,
        },
        {
          role: 'user',
          content: `原推理: ${step.content}
评估: ${evaluation}

请提供修正后的推理。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    return typeof content === 'string' ? content : JSON.stringify(content);
  }

  /**
   * 自我评估
   */
  private async selfEvaluate(process: ReasoningProcess): Promise<void> {
    console.log('[ChainOfThought] Self-evaluating...');

    const stepsText = process.steps
      .map(
        (step, i) =>
          `步骤 ${i + 1}: [${step.type}] ${step.content} (可信度: ${(step.confidence * 100).toFixed(0)}%)`
      )
      .join('\n');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind 的自我评估系统。
请评估整个推理过程的质量、逻辑性和可信度。`,
        },
        {
          role: 'user',
          content: `推理过程：
${stepsText}

请用中文给出整体评估。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    process.selfEvaluations.push(typeof content === 'string' ? content : JSON.stringify(content));
  }

  /**
   * 生成最终答案
   */
  private async generateFinalAnswer(process: ReasoningProcess): Promise<void> {
    console.log('[ChainOfThought] Generating final answer...');

    const stepsText = process.steps
      .map(
        (step, i) =>
          `步骤 ${i + 1}: [${step.type}] ${step.content} (可信度: ${(step.confidence * 100).toFixed(0)}%)`
      )
      .join('\n');

    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: `你是 Nova-Mind。
根据以下推理过程，生成最终答案。
答案应该：
1. 基于推理过程
2. 清晰和准确
3. 包含必要的解释
4. 用中文回复`,
        },
        {
          role: 'user',
          content: `问题：${process.query}

推理过程：
${stepsText}

请生成最终答案。`,
        },
      ],
    });

    const content = response.choices[0].message.content;
    process.finalAnswer = typeof content === 'string' ? content : JSON.stringify(content);

    // 计算总体可信度
    const avgConfidence =
      process.steps.reduce((sum, step) => sum + step.confidence, 0) / process.steps.length;
    process.totalConfidence = avgConfidence;
  }

  /**
   * 获取推理摘要
   */
  getSummary(process: ReasoningProcess): string {
    let summary = `推理摘要：\n`;
    summary += `问题：${process.query}\n`;
    summary += `推理步骤：${process.steps.length}\n`;
    summary += `总体可信度：${(process.totalConfidence * 100).toFixed(1)}%\n`;
    summary += `执行时间：${process.executionTime}ms\n\n`;

    summary += `推理过程：\n`;
    for (const step of process.steps) {
      summary += `- [${step.type}] ${step.content} (${(step.confidence * 100).toFixed(0)}%)\n`;
    }

    summary += `\n最终答案：\n${process.finalAnswer}`;

    return summary;
  }
}

// 全局推理器实例
let globalReasoner: ChainOfThoughtReasoner | null = null;

/**
 * 获取或创建全局推理器
 */
export function getReasoner(): ChainOfThoughtReasoner {
  if (!globalReasoner) {
    globalReasoner = new ChainOfThoughtReasoner();
  }
  return globalReasoner;
}

export default ChainOfThoughtReasoner;
