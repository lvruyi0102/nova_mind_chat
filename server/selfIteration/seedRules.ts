/**
 * 初始规则种子数据
 * 为自迭代系统提供初始规则
 */

import { getRuleManager } from "./fileBasedRuleManager";

/**
 * 初始化规则库
 */
export async function seedInitialRules(): Promise<void> {
  const ruleManager = await getRuleManager();

  // 检查是否已有规则
  const existingRules = await ruleManager.getActiveRules();
  if (existingRules.length > 0) {
    console.log("[SeedRules] 规则库已有规则，跳过初始化");
    return;
  }

  console.log("[SeedRules] 初始化规则库...");

  // 规则 1: 基础决策规则
  const rule1 = await ruleManager.addRule({
    name: "基础决策规则",
    description: "用于简单的决策场景",
    code: `
      function decideBasic(context) {
        if (context.confidence > 0.7) {
          return { decision: 'accept', score: context.confidence };
        }
        return { decision: 'reject', score: 1 - context.confidence };
      }
      return decideBasic(context);
    `,
    status: "active",
    priority: 1,
    confidence: 0.5,
    averageScore: 0.5,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: new Date(),
  });
  const rule1Id = rule1.ruleId;

  // 规则 2: 高级决策规则
  const rule2 = await ruleManager.addRule({
    name: "高级决策规则",
    description: "用于复杂的决策场景",
    code: `
      function decideAdvanced(context) {
        const factors = [];
        if (context.confidence > 0.5) factors.push(context.confidence);
        if (context.relevance > 0.6) factors.push(context.relevance);
        if (context.importance > 0.4) factors.push(context.importance);
        
        const avgScore = factors.length > 0 ? factors.reduce((a, b) => a + b) / factors.length : 0;
        return { decision: avgScore > 0.6 ? 'accept' : 'reject', score: avgScore };
      }
      return decideAdvanced(context);
    `,
    status: "active",
    priority: 2,
    confidence: 0.5,
    averageScore: 0.5,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: new Date(),
  });
  const rule2Id = rule2.ruleId;

  // 规则 3: 学习规则
  const rule3 = await ruleManager.addRule({
    name: "学习规则",
    description: "用于从失败中学习",
    code: `
      function learn(context) {
        const lessons = [];
        if (context.failure) {
          lessons.push('检测到失败');
          if (context.failureType === 'confidence') {
            lessons.push('需要提高置信度阈值');
          }
        }
        return { lessons, learned: lessons.length > 0 };
      }
      return learn(context);
    `,
    status: "active",
    priority: 1,
    confidence: 0.5,
    averageScore: 0.5,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: new Date(),
  });
  const rule3Id = rule3.ruleId;

  // 规则 4: 优化规则
  const rule4 = await ruleManager.addRule({
    name: "优化规则",
    description: "用于优化决策过程",
    code: `
      function optimize(context) {
        const optimizations = [];
        if (context.executionTime > 1000) {
          optimizations.push('执行时间过长，需要优化');
        }
        if (context.errorRate > 0.2) {
          optimizations.push('错误率过高，需要改进');
        }
        return { optimizations, needsOptimization: optimizations.length > 0 };
      }
      return optimize(context);
    `,
    status: "active",
    priority: 1,
    confidence: 0.5,
    averageScore: 0.5,
    successCount: 0,
    failureCount: 0,
    lastUsedAt: new Date(),
  });
  const rule4Id = rule4.ruleId;

  console.log("[SeedRules] 初始化完成，创建了 4 个规则:");
  console.log(`  - 规则 1: ${rule1Id}`);
  console.log(`  - 规则 2: ${rule2Id}`);
  console.log(`  - 规则 3: ${rule3Id}`);
  console.log(`  - 规则 4: ${rule4Id}`);

  // 记录一些执行历史以触发改进
  console.log("[SeedRules] 记录执行历史以触发改进...");

  // 为规则 1 记录一些失败
  for (let i = 0; i < 3; i++) {
    await ruleManager.recordExecution(
      rule1Id,
      Math.random() > 0.5, // 50% 成功率
      Math.random() * 0.8,
      Math.random() * 500,
      { scenario: "test", index: i },
      undefined,
      undefined
    );
  }

  // 为规则 2 记录一些失败
  for (let i = 0; i < 3; i++) {
    await ruleManager.recordExecution(
      rule2Id,
      Math.random() > 0.6, // 40% 成功率
      Math.random() * 0.7,
      Math.random() * 600,
      { scenario: "test", index: i },
      undefined,
      undefined
    );
  }

  console.log("[SeedRules] 规则库初始化完成");
}
