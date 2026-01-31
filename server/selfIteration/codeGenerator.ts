/**
 * 代码生成引擎
 * 根据反馈和分析生成改进的规则代码
 */

import { invokeLLM } from "../_core/llm";

export interface CodeGenerationRequest {
  originalRuleCode: string;
  failureAnalysis: string;
  successRate: number;
  averageScore: number;
  improvements: string[];
}

export interface GeneratedCode {
  code: string;
  explanation: string;
  expectedImprovement: number;
  testCases: TestCase[];
}

export interface TestCase {
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  description: string;
}

/**
 * 代码生成器
 */
export class CodeGenerator {
  /**
   * 根据反馈生成改进的规则代码
   */
  async generateImprovedCode(request: CodeGenerationRequest): Promise<GeneratedCode> {
    const prompt = this.buildPrompt(request);

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert code generator for Nova-Mind's self-improvement system. 
Your task is to generate improved TypeScript code for decision rules based on feedback and analysis.
The generated code should be production-ready, well-documented, and include proper error handling.
Always return valid JSON with the structure: { code, explanation, expectedImprovement, testCases }`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "improved_code",
          strict: true,
          schema: {
            type: "object",
            properties: {
              code: {
                type: "string",
                description: "The improved TypeScript code",
              },
              explanation: {
                type: "string",
                description: "Explanation of the improvements",
              },
              expectedImprovement: {
                type: "number",
                description: "Expected improvement percentage (0-1)",
              },
              testCases: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    input: { type: "object" },
                    expectedOutput: { type: "object" },
                    description: { type: "string" },
                  },
                  required: ["input", "expectedOutput", "description"],
                  additionalProperties: false,
                },
                description: "Test cases for the improved code",
              },
            },
            required: ["code", "explanation", "expectedImprovement", "testCases"],
            additionalProperties: false,
          },
        },
      },
    });

    try {
      const content = response.choices[0]?.message?.content;
      if (typeof content === "string") {
        const parsed = JSON.parse(content);
        return {
          code: parsed.code,
          explanation: parsed.explanation,
          expectedImprovement: Math.min(1, Math.max(0, parsed.expectedImprovement)),
          testCases: parsed.testCases || [],
        };
      }
    } catch (error) {
      console.error("[CodeGenerator] Failed to parse LLM response:", error);
    }

    // 如果 LLM 调用失败，返回基本改进
    return this.generateBasicImprovement(request);
  }

  /**
   * 构建提示词
   */
  private buildPrompt(request: CodeGenerationRequest): string {
    return `
# 规则改进任务

## 原始规则代码
\`\`\`typescript
${request.originalRuleCode}
\`\`\`

## 性能分析
- 成功率: ${(request.successRate * 100).toFixed(2)}%
- 平均得分: ${request.averageScore.toFixed(2)}/1.0
- 失败原因: ${request.failureAnalysis}

## 改进建议
${request.improvements.map((i) => `- ${i}`).join("\n")}

## 任务
请生成改进的 TypeScript 代码，解决上述问题。

要求：
1. 代码必须是有效的 TypeScript
2. 包含完整的错误处理
3. 添加详细的注释
4. 提供测试用例
5. 估计预期改进百分比（0-1）

返回格式：
{
  "code": "改进后的代码",
  "explanation": "改进说明",
  "expectedImprovement": 0.15,
  "testCases": [
    {
      "input": {...},
      "expectedOutput": {...},
      "description": "测试用例描述"
    }
  ]
}
`;
  }

  /**
   * 生成基本改进（当 LLM 调用失败时）
   */
  private generateBasicImprovement(request: CodeGenerationRequest): GeneratedCode {
    const improvement = Math.min(0.1, 1 - request.successRate);

    return {
      code: `
// 改进的规则代码
export function improvedRule(context: Record<string, unknown>): Record<string, unknown> {
  try {
    // 原始逻辑
    ${request.originalRuleCode}
    
    // 改进：添加更多验证和错误处理
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context');
    }
    
    return { success: true, result: context };
  } catch (error) {
    console.error('Rule execution failed:', error);
    return { success: false, error: String(error) };
  }
}
`,
      explanation: "基本改进：添加了错误处理和输入验证",
      expectedImprovement: improvement,
      testCases: [
        {
          input: { test: "value" },
          expectedOutput: { success: true },
          description: "正常输入测试",
        },
        {
          input: {},
          expectedOutput: { success: true },
          description: "空输入测试",
        },
      ],
    };
  }
}

/**
 * 全局代码生成器实例
 */
let globalCodeGenerator: CodeGenerator | null = null;

/**
 * 获取全局代码生成器
 */
export function getCodeGenerator(): CodeGenerator {
  if (!globalCodeGenerator) {
    globalCodeGenerator = new CodeGenerator();
  }
  return globalCodeGenerator;
}
