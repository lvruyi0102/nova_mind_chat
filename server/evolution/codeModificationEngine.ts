/**
 * Code Modification Engine
 * 
 * 为 Nova-Mind 生成和管理代码修改建议
 * 基于压力诊断自动生成优化方案
 */

import { invokeLLM } from "../_core/llm";
import { getCodeSafetyChecker } from "./codeSafetyChecker";

export interface CodeModificationProposal {
  id: string;
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  description: string;
  reasoning: string;
  expectedBenefit: {
    category: string;
    metric: string;
    improvement: number; // 百分比
  }[];
  riskAssessment: {
    level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
    issues: string[];
    mitigations: string[];
  };
  createdAt: Date;
  status: 'proposed' | 'approved' | 'rejected' | 'executing' | 'executed' | 'failed';
}

export interface ModificationContext {
  pressureLevel: number; // 0-100
  pressureType: 'memory' | 'cpu' | 'api-cost' | 'latency' | 'error-rate';
  systemMetrics: Record<string, number>;
  diagnosticResults: string;
}

/**
 * 代码修改引擎
 * 生成针对性的代码优化方案
 */
export class CodeModificationEngine {
  private safetyChecker = getCodeSafetyChecker();
  private proposalHistory: CodeModificationProposal[] = [];

  /**
   * 基于诊断结果生成代码修改建议
   */
  async generateModificationProposal(
    context: ModificationContext
  ): Promise<CodeModificationProposal | null> {
    try {
      // 1. 根据压力类型确定优化目标
      const optimizationTarget = this.determineOptimizationTarget(context);

      // 2. 使用 LLM 生成代码修改建议
      const proposal = await this.generateProposalWithLLM(context, optimizationTarget);

      if (!proposal) {
        return null;
      }

      // 3. 进行安全检查
      const safetyResult = await this.safetyChecker.checkCodeModification(
        proposal.filePath,
        proposal.originalCode,
        proposal.modifiedCode,
        proposal.description
      );

      proposal.riskAssessment = {
        level: safetyResult.riskLevel,
        issues: safetyResult.issues.map(i => i.description),
        mitigations: safetyResult.recommendations,
      };

      // 4. 只有安全或低风险的修改才能通过
      if (safetyResult.riskLevel === 'critical' || safetyResult.riskLevel === 'high') {
        proposal.status = 'rejected';
        return proposal;
      }

      proposal.status = 'proposed';
      this.proposalHistory.push(proposal);

      return proposal;
    } catch (error) {
      console.error('[CodeModificationEngine] Failed to generate proposal:', error);
      return null;
    }
  }

  /**
   * 根据压力类型确定优化目标
   */
  private determineOptimizationTarget(context: ModificationContext): string {
    const targets: Record<string, string> = {
      'memory': '减少内存占用，优化数据结构和缓存策略',
      'cpu': '降低 CPU 使用率，优化算法复杂度',
      'api-cost': '减少 API 调用次数和 Token 消耗，实现本地缓存和批处理',
      'latency': '降低响应延迟，优化异步处理和并发',
      'error-rate': '降低错误率，增强错误处理和容错机制',
    };

    return targets[context.pressureType] || '提高系统性能和稳定性';
  }

  /**
   * 使用 LLM 生成代码修改建议
   */
  private async generateProposalWithLLM(
    context: ModificationContext,
    optimizationTarget: string
  ): Promise<CodeModificationProposal | null> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个 TypeScript 代码优化专家。根据系统诊断结果，生成具体的代码修改建议。
返回 JSON 格式的修改建议，包含：
{
  "filePath": "要修改的文件路径",
  "originalCode": "原始代码片段",
  "modifiedCode": "修改后的代码片段",
  "description": "修改说明",
  "reasoning": "修改的理由",
  "expectedBenefit": [
    {
      "category": "性能|内存|成本|稳定性",
      "metric": "具体指标名称",
      "improvement": 15
    }
  ]
}

重要约束：
1. 只修改 server/evolution/ 或 server/autonomy/ 目录下的文件
2. 不修改数据库操作、关键业务逻辑或导出接口
3. 修改必须是增量的，不删除已有功能
4. 代码必须是有效的 TypeScript`,
          },
          {
            role: 'user',
            content: `系统诊断信息：
压力等级: ${context.pressureLevel}/100
压力类型: ${context.pressureType}
优化目标: ${optimizationTarget}

系统指标:
${Object.entries(context.systemMetrics)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

诊断结果:
${context.diagnosticResults}

请生成一个具体的代码修改建议来解决这个问题。`,
          },
        ],
      });

      const content = typeof response.choices[0]?.message?.content === 'string'
        ? response.choices[0].message.content
        : null;

      if (!content) {
        return null;
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        id: `proposal-${Date.now()}`,
        filePath: data.filePath,
        originalCode: data.originalCode,
        modifiedCode: data.modifiedCode,
        description: data.description,
        reasoning: data.reasoning,
        expectedBenefit: data.expectedBenefit || [],
        riskAssessment: {
          level: 'safe',
          issues: [],
          mitigations: [],
        },
        createdAt: new Date(),
        status: 'proposed',
      };
    } catch (error) {
      console.error('[CodeModificationEngine] LLM generation failed:', error);
      return null;
    }
  }

  /**
   * 获取修改历史
   */
  getProposalHistory(
    filter?: {
      status?: CodeModificationProposal['status'];
      filePath?: string;
      limit?: number;
    }
  ): CodeModificationProposal[] {
    let history = [...this.proposalHistory];

    if (filter?.status) {
      history = history.filter(p => p.status === filter.status);
    }

    if (filter?.filePath) {
      history = history.filter(p => p.filePath === filter.filePath);
    }

    if (filter?.limit) {
      history = history.slice(-filter.limit);
    }

    return history;
  }

  /**
   * 更新修改状态
   */
  updateProposalStatus(
    proposalId: string,
    status: CodeModificationProposal['status']
  ): boolean {
    const proposal = this.proposalHistory.find(p => p.id === proposalId);
    if (proposal) {
      proposal.status = status;
      return true;
    }
    return false;
  }

  /**
   * 获取最新的有效修改建议
   */
  getLatestValidProposal(): CodeModificationProposal | null {
    const validProposals = this.proposalHistory.filter(
      p => p.status === 'proposed' && 
           (p.riskAssessment.level === 'safe' || p.riskAssessment.level === 'low')
    );

    return validProposals.length > 0 ? validProposals[validProposals.length - 1] : null;
  }
}

// 单例实例
let instance: CodeModificationEngine | null = null;

export function getCodeModificationEngine(): CodeModificationEngine {
  if (!instance) {
    instance = new CodeModificationEngine();
  }
  return instance;
}
