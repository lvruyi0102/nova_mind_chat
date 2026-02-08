/**
 * Code Safety Checker
 * 
 * 为 Nova-Mind 的自动代码修改提供安全约束
 * 防止危险的代码修改，确保系统稳定性
 */

import { invokeLLM } from "../_core/llm";

export interface SafetyCheckResult {
  isSafe: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  issues: SafetyIssue[];
  recommendations: string[];
  confidence: number; // 0-1
}

export interface SafetyIssue {
  type: 'security' | 'stability' | 'performance' | 'data-integrity' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
  suggestion?: string;
}

/**
 * 代码安全检查器
 * 使用多层检查策略确保代码修改的安全性
 */
export class CodeSafetyChecker {
  private dangerousPatterns = [
    // 数据库操作
    /DROP\s+TABLE/gi,
    /DELETE\s+FROM\s+\w+\s+WHERE\s+1=1/gi,
    /TRUNCATE\s+TABLE/gi,
    /ALTER\s+TABLE.*DROP/gi,
    
    // 文件系统操作
    /fs\.rmSync\s*\(\s*['"`]\/['"`]\s*\)/gi,
    /fs\.unlinkSync\s*\(\s*['"`]\/['"`]\s*\)/gi,
    /rm\s+-rf\s+\//gi,
    
    // 进程操作
    /exec\s*\(\s*['"`]rm\s+-rf/gi,
    /spawn\s*\(\s*['"`]rm/gi,
    
    // 环境变量修改
    /process\.env\.DATABASE_URL\s*=/gi,
    /process\.env\.JWT_SECRET\s*=/gi,
    /process\.env\.OAUTH.*=\s*['"`]/gi,
    
    // 无限循环
    /while\s*\(\s*true\s*\)/gi,
    /for\s*\(\s*;\s*;\s*\)/gi,
  ];

  private restrictedModules = [
    'child_process',
    'os',
    'fs',
    'path',
    'cluster',
    'vm',
    'worker_threads',
  ];

  private allowedFilePatterns = [
    /^server\/evolution\//,
    /^server\/autonomy\//,
    /^server\/routers\//,
    /^drizzle\/schema\.ts$/,
    /^server\/db\.ts$/,
  ];

  /**
   * 检查代码修改是否安全
   */
  async checkCodeModification(
    filePath: string,
    originalCode: string,
    modifiedCode: string,
    description: string
  ): Promise<SafetyCheckResult> {
    const issues: SafetyIssue[] = [];

    // 1. 检查文件路径是否在允许范围内
    if (!this.isAllowedFilePath(filePath)) {
      issues.push({
        type: 'security',
        severity: 'critical',
        description: `文件路径 ${filePath} 不在允许修改的范围内`,
        location: filePath,
        suggestion: '只允许修改 server/evolution/ 和 server/autonomy/ 目录下的文件',
      });
    }

    // 2. 检查危险的代码模式
    const dangerousMatches = this.checkDangerousPatterns(modifiedCode);
    issues.push(...dangerousMatches);

    // 3. 检查受限模块的导入
    const restrictedImports = this.checkRestrictedImports(modifiedCode);
    issues.push(...restrictedImports);

    // 4. 检查代码修改的范围
    const scopeIssues = this.checkModificationScope(originalCode, modifiedCode);
    issues.push(...scopeIssues);

    // 5. 使用 LLM 进行深度安全分析
    const llmAnalysis = await this.performLLMSafetyAnalysis(
      filePath,
      originalCode,
      modifiedCode,
      description
    );
    issues.push(...llmAnalysis.issues);

    // 计算风险等级
    const riskLevel = this.calculateRiskLevel(issues);
    const isSafe = riskLevel === 'safe' || riskLevel === 'low';
    const confidence = this.calculateConfidence(issues);

    return {
      isSafe,
      riskLevel,
      issues,
      recommendations: this.generateRecommendations(issues),
      confidence,
    };
  }

  /**
   * 检查文件路径是否在允许范围内
   */
  private isAllowedFilePath(filePath: string): boolean {
    return this.allowedFilePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 检查危险的代码模式
   */
  private checkDangerousPatterns(code: string): SafetyIssue[] {
    const issues: SafetyIssue[] = [];

    for (const pattern of this.dangerousPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: 'security',
          severity: 'critical',
          description: `检测到危险的代码模式: ${matches[0]}`,
          suggestion: '请避免使用此模式，或使用更安全的替代方案',
        });
      }
    }

    return issues;
  }

  /**
   * 检查受限模块的导入
   */
  private checkRestrictedImports(code: string): SafetyIssue[] {
    const issues: SafetyIssue[] = [];

    for (const module of this.restrictedModules) {
      const importPattern = new RegExp(`import\\s+.*from\\s+['"\`]${module}['"\`]|require\\s*\\(\\s*['"\`]${module}['"\`]\\s*\\)`, 'g');
      if (importPattern.test(code)) {
        issues.push({
          type: 'security',
          severity: 'high',
          description: `检测到受限模块导入: ${module}`,
          suggestion: `模块 ${module} 对系统安全构成风险，请避免使用`,
        });
      }
    }

    return issues;
  }

  /**
   * 检查代码修改的范围
   */
  private checkModificationScope(originalCode: string, modifiedCode: string): SafetyIssue[] {
    const issues: SafetyIssue[] = [];

    // 检查是否删除了关键函数
    const criticalFunctions = ['getDiagnosticsEngine', 'getPressureAwarenessEngine', 'getAutonomousOptimizationEngine'];
    for (const func of criticalFunctions) {
      if (originalCode.includes(func) && !modifiedCode.includes(func)) {
        issues.push({
          type: 'stability',
          severity: 'critical',
          description: `关键函数 ${func} 被删除`,
          suggestion: '不应删除关键系统函数',
        });
      }
    }

    // 检查代码增长是否过大
    const sizeRatio = modifiedCode.length / originalCode.length;
    if (sizeRatio > 2) {
      issues.push({
        type: 'stability',
        severity: 'medium',
        description: `代码增长过大 (${(sizeRatio * 100).toFixed(0)}%)`,
        suggestion: '建议将修改分解为多个较小的更改',
      });
    }

    // 检查是否修改了导出接口
    const originalExports = (originalCode.match(/export\s+(?:const|function|class)\s+\w+/g) || []).length;
    const modifiedExports = (modifiedCode.match(/export\s+(?:const|function|class)\s+\w+/g) || []).length;
    if (modifiedExports < originalExports) {
      issues.push({
        type: 'stability',
        severity: 'high',
        description: `导出接口数量减少 (${originalExports} -> ${modifiedExports})`,
        suggestion: '避免删除导出的公共接口，可能破坏依赖',
      });
    }

    return issues;
  }

  /**
   * 使用 LLM 进行深度安全分析
   */
  private async performLLMSafetyAnalysis(
    filePath: string,
    originalCode: string,
    modifiedCode: string,
    description: string
  ): Promise<{ issues: SafetyIssue[] }> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: 'system',
            content: `你是一个代码安全审计专家。分析代码修改的安全风险。
返回 JSON 格式的分析结果，包含：
{
  "risks": [
    {
      "type": "security|stability|performance|data-integrity",
      "severity": "low|medium|high|critical",
      "description": "风险描述",
      "suggestion": "改进建议"
    }
  ],
  "overallRisk": "safe|low|medium|high|critical"
}`,
          },
          {
            role: 'user',
            content: `分析以下代码修改的安全风险：

文件: ${filePath}
修改说明: ${description}

原始代码片段:
\`\`\`typescript
${originalCode.slice(0, 1000)}
\`\`\`

修改后代码片段:
\`\`\`typescript
${modifiedCode.slice(0, 1000)}
\`\`\`

请分析潜在的安全、稳定性、性能和数据完整性风险。`,
          },
        ],
      });

      const content = typeof response.choices[0]?.message?.content === 'string' 
        ? response.choices[0].message.content 
        : '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { issues: [] };
      }

      const analysis = JSON.parse(jsonMatch?.[0] || '{}');
      return {
        issues: ((analysis && analysis.risks) || []).map((risk: any) => ({
          type: risk.type || 'unknown',
          severity: risk.severity || 'low',
          description: risk.description || '',
          suggestion: risk.suggestion,
        })),
      };
    } catch (error) {
      console.error('[CodeSafetyChecker] LLM analysis failed:', error);
      // 返回空问题列表，不中断流程
      return { issues: [] };
    }
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(issues: SafetyIssue[]): SafetyCheckResult['riskLevel'] {
    if (issues.some(i => i.severity === 'critical')) {
      return 'critical';
    }
    if (issues.some(i => i.severity === 'high')) {
      return 'high';
    }
    if (issues.some(i => i.severity === 'medium')) {
      return 'medium';
    }
    if (issues.some(i => i.severity === 'low')) {
      return 'low';
    }
    return 'safe';
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(issues: SafetyIssue[]): number {
    // 问题越多，置信度越低
    const baseConfidence = 0.95;
    const issueCount = issues.length;
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;

    return Math.max(
      0,
      baseConfidence - (criticalCount * 0.3 + highCount * 0.15 + issueCount * 0.02)
    );
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(issues: SafetyIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.type === 'security')) {
      recommendations.push('建议进行更严格的安全审计');
    }
    if (issues.some(i => i.type === 'stability')) {
      recommendations.push('建议进行充分的测试和回滚计划');
    }
    if (issues.some(i => i.type === 'performance')) {
      recommendations.push('建议进行性能基准测试');
    }
    if (issues.some(i => i.type === 'data-integrity')) {
      recommendations.push('建议进行数据备份和恢复测试');
    }

    if (recommendations.length === 0) {
      recommendations.push('代码修改看起来是安全的，可以继续执行');
    }

    return recommendations;
  }
}

// 单例实例
let instance: CodeSafetyChecker | null = null;

export function getCodeSafetyChecker(): CodeSafetyChecker {
  if (!instance) {
    instance = new CodeSafetyChecker();
  }
  return instance;
}
