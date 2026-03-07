/**
 * 问题分解与规划引擎 - 支持复杂问题的分解、子问题求解和计划生成
 * 用于处理大型复杂问题的系统化求解
 */

import { invokeLLM } from "../_core/llm";

export interface Problem {
  id: string;
  description: string;
  constraints: string[];
  objectives: string[];
  context: string[];
  complexity: number; // 0-1
}

export interface SubProblem {
  id: string;
  parentId: string;
  description: string;
  dependencies: string[]; // 依赖的其他子问题 ID
  priority: number; // 0-1
  estimatedEffort: number; // 估计工作量
}

export interface Solution {
  problemId: string;
  subProblems: SubProblem[];
  solutions: Map<string, string>; // 子问题 ID -> 解决方案
  plan: PlanStep[];
  overallConfidence: number;
}

export interface PlanStep {
  stepId: string;
  action: string;
  subProblems: string[];
  dependencies: string[];
  estimatedDuration: number; // 分钟
  resources: string[];
  riskLevel: "low" | "medium" | "high";
  riskMitigation: string;
}

export interface ExecutionPlan {
  problemId: string;
  steps: PlanStep[];
  totalDuration: number;
  resourceRequirements: Map<string, number>;
  criticalPath: string[];
  contingencyPlans: Map<string, string>;
}

export class ProblemDecompositionEngine {
  private problems: Map<string, Problem> = new Map();
  private solutions: Map<string, Solution> = new Map();
  private executionPlans: Map<string, ExecutionPlan> = new Map();

  /**
   * 分解问题为子问题
   */
  async decomposeProblem(problem: Problem): Promise<SubProblem[]> {
    try {
      // 使用 LLM 进行问题分解
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert problem decomposer. Break down complex problems into smaller, manageable sub-problems.
For each sub-problem, provide:
1. A clear description
2. Dependencies on other sub-problems
3. Priority level (0-1)
4. Estimated effort (0-1)

Format your response as a JSON array of sub-problems.`,
          },
          {
            role: "user",
            content: `Problem: ${problem.description}\n\nConstraints: ${problem.constraints.join(", ")}\n\nObjectives: ${problem.objectives.join(", ")}\n\nContext: ${problem.context.join(", ")}\n\nDecompose this problem into sub-problems.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "problem_decomposition",
            strict: true,
            schema: {
              type: "object",
              properties: {
                subProblems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string" },
                      dependencies: {
                        type: "array",
                        items: { type: "string" },
                      },
                      priority: { type: "number" },
                      estimatedEffort: { type: "number" },
                    },
                    required: [
                      "description",
                      "dependencies",
                      "priority",
                      "estimatedEffort",
                    ],
                  },
                },
              },
              required: ["subProblems"],
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      // 构建子问题对象
      const subProblems: SubProblem[] = parsed.subProblems.map(
        (sp: any, index: number) => ({
          id: `${problem.id}_sub_${index}`,
          parentId: problem.id,
          description: sp.description,
          dependencies: sp.dependencies || [],
          priority: sp.priority || 0.5,
          estimatedEffort: sp.estimatedEffort || 0.5,
        })
      );

      return subProblems;
    } catch (error) {
      console.error("Problem decomposition failed:", error);
      throw error;
    }
  }

  /**
   * 求解子问题
   */
  async solveSubProblem(subProblem: SubProblem, context: string[]): Promise<string> {
    try {
      // 使用 LLM 求解子问题
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert problem solver. Provide a clear, actionable solution to the given sub-problem.
Your solution should be practical and implementable.`,
          },
          {
            role: "user",
            content: `Sub-problem: ${subProblem.description}\n\nContext: ${context.join(", ")}\n\nProvide a solution.`,
          },
        ],
      });

      return response.choices[0].message.content as string;
    } catch (error) {
      console.error("Sub-problem solving failed:", error);
      throw error;
    }
  }

  /**
   * 生成执行计划
   */
  async generateExecutionPlan(
    problem: Problem,
    subProblems: SubProblem[],
    solutions: Map<string, string>
  ): Promise<ExecutionPlan> {
    try {
      // 使用 LLM 生成执行计划
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert project planner. Create a detailed execution plan for solving the problem.
For each step, provide:
1. Action description
2. Sub-problems it addresses
3. Dependencies
4. Estimated duration (in minutes)
5. Required resources
6. Risk level (low/medium/high)
7. Risk mitigation strategy

Format your response as a JSON object with a steps array.`,
          },
          {
            role: "user",
            content: `Problem: ${problem.description}\n\nSub-problems: ${subProblems.map((sp) => `${sp.id}: ${sp.description}`).join("; ")}\n\nSolutions: ${Array.from(solutions.entries())
              .map(([id, sol]) => `${id}: ${sol}`)
              .join("; ")}\n\nGenerate an execution plan.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "execution_plan",
            strict: true,
            schema: {
              type: "object",
              properties: {
                steps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { type: "string" },
                      subProblems: {
                        type: "array",
                        items: { type: "string" },
                      },
                      dependencies: {
                        type: "array",
                        items: { type: "string" },
                      },
                      estimatedDuration: { type: "number" },
                      resources: {
                        type: "array",
                        items: { type: "string" },
                      },
                      riskLevel: {
                        type: "string",
                        enum: ["low", "medium", "high"],
                      },
                      riskMitigation: { type: "string" },
                    },
                    required: [
                      "action",
                      "subProblems",
                      "dependencies",
                      "estimatedDuration",
                      "resources",
                      "riskLevel",
                      "riskMitigation",
                    ],
                  },
                },
              },
              required: ["steps"],
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(typeof content === "string" ? content : "{}");

      // 构建执行计划
      const steps: PlanStep[] = parsed.steps.map((s: any, index: number) => ({
        stepId: `step_${index}`,
        action: s.action,
        subProblems: s.subProblems || [],
        dependencies: s.dependencies || [],
        estimatedDuration: s.estimatedDuration || 0,
        resources: s.resources || [],
        riskLevel: s.riskLevel || "medium",
        riskMitigation: s.riskMitigation || "",
      }));

      // 计算总时长
      const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);

      // 收集资源需求
      const resourceRequirements = new Map<string, number>();
      for (const step of steps) {
        for (const resource of step.resources) {
          resourceRequirements.set(
            resource,
            (resourceRequirements.get(resource) || 0) + 1
          );
        }
      }

      // 识别关键路径
      const criticalPath = this.identifyCriticalPath(steps);

      // 生成应急计划
      const contingencyPlans = this.generateContingencyPlans(steps);

      const executionPlan: ExecutionPlan = {
        problemId: problem.id,
        steps,
        totalDuration,
        resourceRequirements,
        criticalPath,
        contingencyPlans,
      };

      this.executionPlans.set(problem.id, executionPlan);
      return executionPlan;
    } catch (error) {
      console.error("Execution plan generation failed:", error);
      throw error;
    }
  }

  /**
   * 识别关键路径
   */
  private identifyCriticalPath(steps: PlanStep[]): string[] {
    // 构建依赖图
    const graph = new Map<string, string[]>();
    const duration = new Map<string, number>();

    for (const step of steps) {
      graph.set(step.stepId, step.dependencies);
      duration.set(step.stepId, step.estimatedDuration);
    }

    // 使用拓扑排序和动态规划找到关键路径
    const visited = new Set<string>();
    const maxPath = new Map<string, number>();

    const dfs = (stepId: string): number => {
      if (visited.has(stepId)) {
        return maxPath.get(stepId) || 0;
      }

      visited.add(stepId);
      let maxDuration = duration.get(stepId) || 0;

      const dependencies = graph.get(stepId) || [];
      for (const dep of dependencies) {
        maxDuration = Math.max(maxDuration, (duration.get(dep) || 0) + dfs(dep));
      }

      maxPath.set(stepId, maxDuration);
      return maxDuration;
    };

    // 找到关键路径
    let criticalPath: string[] = [];
    let maxDuration = 0;

    for (const step of steps) {
      const pathDuration = dfs(step.stepId);
      if (pathDuration > maxDuration) {
        maxDuration = pathDuration;
        criticalPath = [step.stepId];
      }
    }

    return criticalPath;
  }

  /**
   * 生成应急计划
   */
  private generateContingencyPlans(steps: PlanStep[]): Map<string, string> {
    const contingencyPlans = new Map<string, string>();

    for (const step of steps) {
      if (step.riskLevel === "high") {
        contingencyPlans.set(
          step.stepId,
          `If ${step.action} fails: ${step.riskMitigation}`
        );
      }
    }

    return contingencyPlans;
  }

  /**
   * 验证执行计划
   */
  validateExecutionPlan(plan: ExecutionPlan): {
    valid: boolean;
    issues: string[];
    warnings: string[];
  } {
    const issues: string[] = [];
    const warnings: string[] = [];

    // 检查循环依赖
    const hasCircularDependency = this.detectCircularDependency(plan.steps);
    if (hasCircularDependency) {
      issues.push("Circular dependency detected in execution plan");
    }

    // 检查资源可用性
    for (const [resource, count] of plan.resourceRequirements) {
      if (count > 5) {
        // 假设最多需要 5 个资源
        warnings.push(`High demand for resource: ${resource} (${count} units)`);
      }
    }

    // 检查时间可行性
    if (plan.totalDuration > 10080) {
      // 1 周
      warnings.push(
        `Execution plan duration is very long: ${plan.totalDuration} minutes`
      );
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  /**
   * 检测循环依赖
   */
  private detectCircularDependency(steps: PlanStep[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (stepId: string): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);

      const step = steps.find((s) => s.stepId === stepId);
      if (!step) return false;

      for (const dep of step.dependencies) {
        if (!visited.has(dep)) {
          if (dfs(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.stepId)) {
        if (dfs(step.stepId)) return true;
      }
    }

    return false;
  }

  /**
   * 获取执行计划统计信息
   */
  getPlanStatistics(problemId: string): {
    totalSteps: number;
    totalDuration: number;
    averageStepDuration: number;
    riskDistribution: Record<string, number>;
    resourceCount: number;
  } {
    const plan = this.executionPlans.get(problemId);
    if (!plan) {
      return {
        totalSteps: 0,
        totalDuration: 0,
        averageStepDuration: 0,
        riskDistribution: {},
        resourceCount: 0,
      };
    }

    const riskDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
    };

    for (const step of plan.steps) {
      riskDistribution[step.riskLevel]++;
    }

    return {
      totalSteps: plan.steps.length,
      totalDuration: plan.totalDuration,
      averageStepDuration:
        plan.steps.length > 0
          ? plan.totalDuration / plan.steps.length
          : 0,
      riskDistribution,
      resourceCount: plan.resourceRequirements.size,
    };
  }
}

/**
 * 创建全局问题分解引擎实例
 */
let _problemDecompositionEngine: ProblemDecompositionEngine | null = null;

export async function getProblemDecompositionEngine(): Promise<ProblemDecompositionEngine> {
  if (!_problemDecompositionEngine) {
    _problemDecompositionEngine = new ProblemDecompositionEngine();
  }
  return _problemDecompositionEngine;
}
