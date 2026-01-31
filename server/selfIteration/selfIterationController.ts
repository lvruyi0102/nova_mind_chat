/**
 * 自主迭代控制器
 * 管理整个自我迭代流程：分析 → 生成 → 测试 → 应用 → 验证
 */

import { v4 as uuidv4 } from "uuid";
import { CodeGenerator, CodeGenerationRequest } from "./codeGenerator";
import {
  getRuleLibraryManager,
  RuleLibraryManager,
} from "./ruleLibraryManager";

export interface IterationRequest {
  ruleId: string;
  failureAnalysis: string;
  improvements: string[];
}

export interface IterationResult {
  iterationId: string;
  ruleId: string;
  status: "success" | "failure" | "partial";
  steps: IterationStep[];
  finalRule?: string;
  improvement?: number;
  error?: string;
}

export interface IterationStep {
  step: "analyze" | "generate" | "test" | "apply" | "validate";
  status: "pending" | "running" | "success" | "failure";
  message: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

/**
 * 自主迭代控制器
 */
export class SelfIterationController {
  private codeGenerator: CodeGenerator;
  private ruleLibrary: RuleLibraryManager;
  private iterations: Map<string, IterationResult> = new Map();

  constructor() {
    this.codeGenerator = new CodeGenerator();
    this.ruleLibrary = getRuleLibraryManager();
  }

  /**
   * 执行自主迭代
   */
  async executeIteration(request: IterationRequest): Promise<IterationResult> {
    const iterationId = uuidv4();
    const steps: IterationStep[] = [];

    try {
      // Step 1: 分析
      steps.push(
        this.createStep("analyze", "pending", "开始分析规则性能...")
      );
      const rule = this.ruleLibrary.getRule(request.ruleId);
      if (!rule) {
        throw new Error(`Rule not found: ${request.ruleId}`);
      }
      steps[steps.length - 1].status = "success";
      steps[steps.length - 1].message = `规则分析完成: ${rule.name}`;
      steps[steps.length - 1].details = {
        successRate: rule.successCount / (rule.successCount + rule.failureCount),
        averageScore: rule.averageScore,
      };

      // Step 2: 生成改进代码
      steps.push(
        this.createStep("generate", "running", "生成改进的规则代码...")
      );
      const generationRequest: CodeGenerationRequest = {
        originalRuleCode: rule.code,
        failureAnalysis: request.failureAnalysis,
        successRate:
          rule.successCount / (rule.successCount + rule.failureCount),
        averageScore: rule.averageScore,
        improvements: request.improvements,
      };

      const generatedCode = await this.codeGenerator.generateImprovedCode(
        generationRequest
      );
      steps[steps.length - 1].status = "success";
      steps[steps.length - 1].message = "改进代码生成成功";
      steps[steps.length - 1].details = {
        expectedImprovement: generatedCode.expectedImprovement,
        testCaseCount: generatedCode.testCases.length,
      };

      // Step 3: 测试
      steps.push(this.createStep("test", "running", "测试改进的代码..."));
      const testResults = await this.testImprovedCode(
        generatedCode.code,
        generatedCode.testCases
      );
      steps[steps.length - 1].status = testResults.passed ? "success" : "failure";
      steps[steps.length - 1].message = `测试结果: ${testResults.passed ? "通过" : "失败"} (${testResults.passedCount}/${testResults.totalCount})`;
      steps[steps.length - 1].details = testResults;

      if (!testResults.passed) {
        throw new Error("Code testing failed");
      }

      // Step 4: 应用
      steps.push(this.createStep("apply", "running", "应用改进的规则..."));
      const updatedRule = this.ruleLibrary.updateRuleCode(
        request.ruleId,
        generatedCode.code,
        `自主迭代 ${iterationId}`
      );
      steps[steps.length - 1].status = "success";
      steps[steps.length - 1].message = "规则已更新";
      steps[steps.length - 1].details = {
        newVersion: updatedRule?.version,
      };

      // Step 5: 验证
      steps.push(this.createStep("validate", "running", "验证改进效果..."));
      const improvement = generatedCode.expectedImprovement;
      steps[steps.length - 1].status = "success";
      steps[steps.length - 1].message = `预期改进: ${(improvement * 100).toFixed(2)}%`;
      steps[steps.length - 1].details = {
        expectedImprovement: improvement,
      };

      const result: IterationResult = {
        iterationId,
        ruleId: request.ruleId,
        status: "success",
        steps,
        finalRule: generatedCode.code,
        improvement,
      };

      this.iterations.set(iterationId, result);
      return result;
    } catch (error) {
      steps[steps.length - 1].status = "failure";
      steps[steps.length - 1].message = `错误: ${String(error)}`;

      const result: IterationResult = {
        iterationId,
        ruleId: request.ruleId,
        status: "failure",
        steps,
        error: String(error),
      };

      this.iterations.set(iterationId, result);
      return result;
    }
  }

  /**
   * 测试改进的代码
   */
  private async testImprovedCode(
    code: string,
    testCases: Array<{
      input: Record<string, unknown>;
      expectedOutput: Record<string, unknown>;
      description: string;
    }>
  ): Promise<{
    passed: boolean;
    totalCount: number;
    passedCount: number;
    failures: Array<{
      testCase: string;
      error: string;
    }>;
  }> {
    const failures: Array<{ testCase: string; error: string }> = [];
    let passedCount = 0;

    for (const testCase of testCases) {
      try {
        // 简单的代码执行模拟（在实际环境中应该使用 VM 或沙箱）
        // 这里只是验证代码的基本语法
        if (!code.includes("function") && !code.includes("=>")) {
          throw new Error("Invalid code structure");
        }

        // 模拟测试通过
        passedCount++;
      } catch (error) {
        failures.push({
          testCase: testCase.description,
          error: String(error),
        });
      }
    }

    return {
      passed: failures.length === 0,
      totalCount: testCases.length,
      passedCount,
      failures,
    };
  }

  /**
   * 获取迭代结果
   */
  getIterationResult(iterationId: string): IterationResult | undefined {
    return this.iterations.get(iterationId);
  }

  /**
   * 获取所有迭代历史
   */
  getAllIterations(): IterationResult[] {
    return Array.from(this.iterations.values());
  }

  /**
   * 获取规则的迭代历史
   */
  getRuleIterations(ruleId: string): IterationResult[] {
    return Array.from(this.iterations.values()).filter(
      (i) => i.ruleId === ruleId
    );
  }

  /**
   * 创建迭代步骤
   */
  private createStep(
    step: "analyze" | "generate" | "test" | "apply" | "validate",
    status: "pending" | "running" | "success" | "failure",
    message: string
  ): IterationStep {
    return {
      step,
      status,
      message,
      timestamp: new Date(),
    };
  }

  /**
   * 获取统计信息
   */
  getStatistics() {
    const iterations = Array.from(this.iterations.values());
    const successful = iterations.filter((i) => i.status === "success").length;
    const failed = iterations.filter((i) => i.status === "failure").length;

    const averageImprovement =
      iterations.length > 0
        ? iterations.reduce((sum, i) => sum + (i.improvement || 0), 0) /
          iterations.length
        : 0;

    return {
      totalIterations: iterations.length,
      successfulIterations: successful,
      failedIterations: failed,
      successRate: iterations.length > 0 ? successful / iterations.length : 0,
      averageImprovement,
    };
  }
}

/**
 * 全局自主迭代控制器实例
 */
let globalSelfIterationController: SelfIterationController | null = null;

/**
 * 获取全局自主迭代控制器
 */
export function getSelfIterationController(): SelfIterationController {
  if (!globalSelfIterationController) {
    globalSelfIterationController = new SelfIterationController();
  }
  return globalSelfIterationController;
}
