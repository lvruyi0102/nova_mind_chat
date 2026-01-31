/**
 * 代码执行沙箱
 * 在隔离的环境中安全地执行和测试代码
 */

export interface TestCase {
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  description: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
}

export interface TestResult {
  testCase: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  error?: string;
  executionTime: number;
}

/**
 * 代码沙箱执行器
 * 使用 Function 构造函数在隔离的作用域中执行代码
 */
export class CodeSandbox {
  /**
   * 执行代码并返回结果
   */
  static async executeCode(
    code: string,
    input: Record<string, unknown>,
    timeout: number = 5000
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // 创建执行函数
      // 直接执行代码，而不是将其作为函数调用
      const fn = new Function(
        ...Object.keys(input),
        code
      );

      // 执行函数
      const result = await Promise.race([
        Promise.resolve(fn(...Object.values(input))),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("执行超时")), timeout)
        ),
      ]);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        output: result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `执行错误: ${String(error)}`,
        executionTime,
      };
    }
  }

  /**
   * 运行测试用例
   */
  static async runTests(
    code: string,
    testCases: TestCase[],
    timeout: number = 5000
  ): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];
    let passedTests = 0;

    for (const testCase of testCases) {
      const startTime = Date.now();

      try {
        // 执行代码
        const result = await this.executeCode(code, testCase.input, timeout);
        const executionTime = Date.now() - startTime;

        if (!result.success) {
          results.push({
            testCase: testCase.description,
            passed: false,
            expected: testCase.expectedOutput,
            actual: null,
            error: result.error,
            executionTime,
          });
          continue;
        }

        // 比较输出
        const passed = this.compareOutputs(
          result.output,
          testCase.expectedOutput
        );

        if (passed) {
          passedTests++;
        }

        results.push({
          testCase: testCase.description,
          passed,
          expected: testCase.expectedOutput,
          actual: result.output,
          executionTime,
        });
      } catch (error) {
        const executionTime = Date.now() - startTime;

        results.push({
          testCase: testCase.description,
          passed: false,
          expected: testCase.expectedOutput,
          actual: null,
          error: String(error),
          executionTime,
        });
      }
    }

    return {
      passed: passedTests === testCases.length,
      totalTests: testCases.length,
      passedTests,
      results,
    };
  }

  /**
   * 验证代码语法
   */
  static validateSyntax(code: string): { valid: boolean; error?: string } {
    try {
      new Function(code);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `语法错误: ${String(error)}`,
      };
    }
  }

  /**
   * 比较输出是否匹配
   */
  private static compareOutputs(
    actual: unknown,
    expected: unknown
  ): boolean {
    // 处理基本类型
    if (typeof actual !== typeof expected) {
      return false;
    }

    // 处理 null 和 undefined
    if (actual === null || actual === undefined) {
      return actual === expected;
    }

    // 处理对象
    if (typeof actual === "object" && typeof expected === "object") {
      // 处理数组
      if (Array.isArray(actual) && Array.isArray(expected)) {
        if (actual.length !== expected.length) {
          return false;
        }
        return actual.every((item, index) =>
          this.compareOutputs(item, expected[index])
        );
      }

      // 处理普通对象
      const actualKeys = Object.keys(actual as Record<string, unknown>);
      const expectedKeys = Object.keys(expected as Record<string, unknown>);

      if (actualKeys.length !== expectedKeys.length) {
        return false;
      }

      return actualKeys.every((key) =>
        this.compareOutputs(
          (actual as Record<string, unknown>)[key],
          (expected as Record<string, unknown>)[key]
        )
      );
    }

    // 处理基本类型
    return actual === expected;
  }

  /**
   * 性能测试 - 测量代码执行的平均时间
   */
  static async performanceBenchmark(
    code: string,
    input: Record<string, unknown>,
    iterations: number = 100,
    timeout: number = 5000
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.executeCode(code, input, timeout);
      if (result.success) {
        times.push(result.executionTime);
      }
    }

    if (times.length === 0) {
      return {
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        totalTime: 0,
      };
    }

    const totalTime = times.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
    };
  }

  /**
   * 验证代码的安全性
   */
  static validateCodeSafety(code: string): {
    safe: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // 检查危险的全局访问
    if (code.includes("global") || code.includes("process")) {
      warnings.push("代码访问了全局对象或进程");
    }

    // 检查文件系统访问
    if (code.includes("fs") || code.includes("require")) {
      warnings.push("代码可能访问文件系统");
    }

    // 检查网络访问
    if (code.includes("http") || code.includes("fetch")) {
      warnings.push("代码可能进行网络请求");
    }

    // 检查无限循环
    if (code.includes("while(true)") || code.includes("for(;;)")) {
      warnings.push("代码可能包含无限循环");
    }

    return {
      safe: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * 规则代码生成器
 */
export class RuleCodeGenerator {
  /**
   * 生成基础规则模板
   */
  static generateTemplate(
    ruleName: string,
    inputs: string[],
    description: string
  ): string {
    const inputParams = inputs.join(", ");
    const inputDocs = inputs.map((input) => `  * @param {unknown} ${input}`).join("\n");

    return `
/**
 * ${description}
 * 规则名称: ${ruleName}
 * 
${inputDocs}
 * @returns {unknown} 决策结果
 */
function ${ruleName}(${inputParams}) {
  // TODO: 实现规则逻辑
  
  // 示例：
  // if (condition) {
  //   return decision;
  // }
  
  return null;
}

// 导出规则结果
${ruleName}(${inputParams});
    `.trim();
  }

  /**
   * 生成测试用例模板
   */
  static generateTestTemplate(ruleName: string): TestCase[] {
    return [
      {
        input: {
          query: "测试查询",
          history: [],
          facts: {},
          goals: [],
        },
        expectedOutput: { result: "预期结果" },
        description: `${ruleName}_基础测试`,
      },
      {
        input: {
          query: "",
          history: [],
          facts: {},
          goals: [],
        },
        expectedOutput: { result: "预期结果" },
        description: `${ruleName}_边界测试`,
      },
    ];
  }
}

/**
 * 全局代码沙箱实例
 */
export const codeSandbox = new CodeSandbox();
