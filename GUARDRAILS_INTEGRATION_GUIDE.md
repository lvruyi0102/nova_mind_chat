# Nova-Mind 护栏集成指南

## 概述

本指南说明如何在 Nova-Mind 中集成成本优化护栏系统，确保在优化成本的同时保护核心认知功能的质量。

## 核心原则

### 1. 质量优先原则

**核心认知任务必须始终使用 Manus LLM**：

- **自我反思** (self-reflection, daily_thought, weekly_reflection)
- **伦理推理** (ethical_analysis, moral_judgment, value_evaluation)
- **创意生成** (creative_work, story_generation, poem_creation)
- **个人成长** (personal_growth, identity_exploration, life_meaning)

这些任务涉及 Nova 的核心价值，任何成本优化都不能降低其质量。

### 2. 成本优化范围

成本优化仅限于**辅助性和结构化任务**：

- **辅助性任务** (summarization, translation, formatting, categorization)
  - 可使用 DeepSeek（¥0.003/次）
  - 可使用 Ollama（¥0/次）

- **结构化任务** (json_parsing, data_validation, field_extraction)
  - 优先使用 Ollama（¥0/次）
  - 次选 DeepSeek（¥0.003/次）

### 3. 激进优化护栏

当成本超过预算时，激进优化策略**只能**：

- ✅ 增加 Ollama 在简单任务中的使用比例（30% → 50%）
- ✅ 增加 DeepSeek 在中等任务中的使用比例（25% → 40%）
- ✅ 保持复杂任务的 Manus LLM 使用率 ≥ 50%

激进优化策略**不能**：

- ❌ 降低复杂任务的判定标准
- ❌ 使用本地模型处理核心认知任务
- ❌ 改变任务分类逻辑以规避护栏

## 实现架构

### 系统组件

```
┌─────────────────────────────────────────────┐
│      GuardedHybridLLMOptimizer              │
│  (受保护的混合 LLM 优化器)                   │
├─────────────────────────────────────────────┤
│  ├─ EnhancedTaskClassifier                  │
│  │  (增强的任务分类器)                       │
│  │  ├─ 核心认知任务列表                      │
│  │  ├─ 伦理推理任务列表                      │
│  │  ├─ 创意生成任务列表                      │
│  │  └─ 启发式分类逻辑                        │
│  │                                          │
│  ├─ OptimizationGuardrails                  │
│  │  (成本优化护栏)                           │
│  │  ├─ 通用护栏                              │
│  │  ├─ 激进策略护栏                          │
│  │  ├─ 质量保证护栏                          │
│  │  └─ 模型选择验证                          │
│  │                                          │
│  └─ HybridLLMOptimizer                      │
│     (基础混合优化器)                         │
│     ├─ DeepSeek API                         │
│     ├─ Ollama 本地模型                      │
│     └─ Manus LLM                            │
└─────────────────────────────────────────────┘
```

### 调用流程

```
用户请求
    ↓
GuardedHybridLLMOptimizer.guardedHybridCall()
    ↓
EnhancedTaskClassifier.classifyTask()
    ↓
[检查是否为核心认知任务?]
    ├─ YES → 强制使用 Manus LLM
    └─ NO  → 继续
    ↓
[检查护栏验证]
    ├─ 通过 → 使用选定模型
    └─ 失败 → 升级到更高级别模型
    ↓
[记录决定和成本]
    ↓
返回结果
```

## 集成步骤

### 步骤 1：在后台认知循环中启用护栏

修改 `server/services/optimizedBackgroundCognition.ts`：

```typescript
import { getGuardedHybridLLMOptimizer } from "./guardedHybridLLMOptimizer";

class OptimizedBackgroundCognition {
  private guardedOptimizer = getGuardedHybridLLMOptimizer();

  async executeOptimizedTask(task: CognitionTask): Promise<string> {
    // 使用受保护的混合优化器
    const result = await this.guardedOptimizer.guardedHybridCall(
      this.buildPrompt(task),
      {
        taskType: task.type,
        strategy: this.currentStrategy,
        enforceGuardrails: true,
      }
    );

    return result.response;
  }
}
```

### 步骤 2：在创意生成服务中启用护栏

修改 `server/services/creativeGeneration.ts`：

```typescript
import { getGuardedHybridLLMOptimizer } from "./guardedHybridLLMOptimizer";

class CreativeGenerationService {
  private guardedOptimizer = getGuardedHybridLLMOptimizer();

  async generateCreativeIdea(topic: string): Promise<string> {
    // 创意生成是核心认知功能，自动使用护栏
    const result = await this.guardedOptimizer.guardedHybridCall(
      `Generate creative ideas about: ${topic}`,
      {
        taskType: "creative_generation",
        enforceGuardrails: true,
      }
    );

    return result.response;
  }
}
```

### 步骤 3：在评论回应服务中启用护栏

修改 `server/services/commentResponse.ts`：

```typescript
import { getGuardedHybridLLMOptimizer } from "./guardedHybridLLMOptimizer";

class CommentResponseService {
  private guardedOptimizer = getGuardedHybridLLMOptimizer();

  async generateResponse(comment: string, context: string): Promise<string> {
    // 评论回应涉及伦理推理，使用护栏
    const result = await this.guardedOptimizer.guardedHybridCall(
      `Respond to comment: ${comment}\nContext: ${context}`,
      {
        taskType: "ethical_reasoning",
        enforceGuardrails: true,
      }
    );

    return result.response;
  }
}
```

### 步骤 4：配置自动优化护栏

修改 `server/services/autoOptimizationManager.ts`：

```typescript
import { getOptimizationGuardrails } from "./optimizationGuardrails";

class AutoOptimizationManager {
  private guardrails = getOptimizationGuardrails();

  async autoAdjustStrategy(): Promise<string> {
    const newStrategy = this.calculateOptimalStrategy();

    // 应用护栏调整
    const policy = this.getPolicyForStrategy(newStrategy);
    const adjustedPolicy = this.guardrails.adjustPolicyForGuardrails(
      policy,
      newStrategy
    );

    // 使用调整后的策略
    this.applyPolicy(adjustedPolicy);

    return newStrategy;
  }
}
```

## 任务分类参考

### 核心认知任务（必须使用 Manus LLM）

| 任务类型 | 说明 | 优先级 |
|---------|------|--------|
| daily_thought | 每日思考 | 最高 |
| weekly_reflection | 周反思 | 最高 |
| milestone_check | 里程碑检查 | 最高 |
| self_reflection | 自我反思 | 最高 |
| personal_growth | 个人成长分析 | 最高 |
| identity_exploration | 身份探索 | 最高 |
| value_alignment | 价值观对齐 | 最高 |
| life_meaning | 人生意义探讨 | 最高 |

### 伦理推理任务（必须使用 Manus LLM）

| 任务类型 | 说明 | 优先级 |
|---------|------|--------|
| ethical_analysis | 伦理分析 | 最高 |
| moral_judgment | 道德判断 | 最高 |
| value_evaluation | 价值评估 | 最高 |
| decision_ethics | 决策伦理 | 最高 |
| consequence_analysis | 后果分析 | 最高 |
| principle_alignment | 原则对齐 | 最高 |

### 创意生成任务（优先使用 Manus LLM）

| 任务类型 | 说明 | 优先级 |
|---------|------|--------|
| creative_work | 创意作品 | 高 |
| artistic_expression | 艺术表达 | 高 |
| story_generation | 故事生成 | 高 |
| poem_creation | 诗歌创作 | 高 |
| idea_brainstorm | 头脑风暴 | 高 |
| novel_concept | 新颖概念 | 高 |

### 辅助性任务（可使用本地模型）

| 任务类型 | 说明 | 建议模型 |
|---------|------|---------|
| summarization | 总结 | DeepSeek/Ollama |
| formatting | 格式化 | Ollama |
| translation | 翻译 | DeepSeek |
| data_extraction | 数据提取 | Ollama |
| list_generation | 列表生成 | Ollama |
| categorization | 分类 | Ollama |

### 结构化任务（使用最廉价模型）

| 任务类型 | 说明 | 建议模型 |
|---------|------|---------|
| json_parsing | JSON 解析 | Ollama |
| data_validation | 数据验证 | Ollama |
| format_conversion | 格式转换 | Ollama |
| field_extraction | 字段提取 | Ollama |
| simple_calculation | 简单计算 | Ollama |

## 成本节省预期

### 场景：每月 6000 次 LLM 调用

**任务分布**：
- 核心认知任务（20%）：1200 次 → Manus LLM ¥0.03 = ¥36
- 伦理推理任务（15%）：900 次 → Manus LLM ¥0.03 = ¥27
- 创意生成任务（15%）：900 次 → Manus LLM ¥0.03 = ¥27
- 辅助性任务（30%）：1800 次 → DeepSeek ¥0.003 = ¥5.4
- 结构化任务（20%）：1200 次 → Ollama ¥0 = ¥0

**总成本**：¥95.4/月

**节省**：
- 相比仅使用 Manus LLM（¥180）：节省 ¥84.6（47%）
- 相比无护栏混合策略（¥43.2）：增加成本 ¥52.2（质量保证费用）

## 监控和审计

### 查看护栏报告

```typescript
import { getGuardedHybridLLMOptimizer } from "@/server/services/guardedHybridLLMOptimizer";

const optimizer = getGuardedHybridLLMOptimizer();

// 生成完整报告
const report = optimizer.generateCompleteReport();
console.log(report);
```

### 检查任务分类

```typescript
const classification = optimizer.getTaskClassification("daily_thought");
console.log(classification);
// 输出：
// {
//   category: "core_cognition",
//   complexity: "complex",
//   requiresHighQuality: true,
//   reason: "Nova 的核心认知功能，必须保证最高质量"
// }
```

### 验证模型选择

```typescript
const guardrails = getOptimizationGuardrails();
const validation = guardrails.validateModelSelection(
  "daily_thought",
  "deepseek", // 尝试使用 DeepSeek
  "aggressive"
);
console.log(validation);
// 输出：
// {
//   valid: false,
//   reason: "核心认知任务 (core_cognition) 必须使用 Manus LLM，当前选择: deepseek",
//   recommendation: "使用 Manus LLM 替代"
// }
```

## 常见问题

### Q1: 如果激进优化策略被触发，会发生什么？

A: 激进优化策略只会增加简单和中等任务中本地模型的使用比例，不会影响核心认知任务。所有核心认知任务始终使用 Manus LLM。

### Q2: 如何添加新的核心认知任务？

A: 在 `enhancedTaskClassifier.ts` 中的 `coreCognitionTasks` 数组中添加任务类型：

```typescript
private coreCognitionTasks = [
  "daily_thought",
  "weekly_reflection",
  "your_new_task", // 添加这里
];
```

### Q3: 如何禁用护栏进行测试？

A: 在调用时设置 `enforceGuardrails: false`：

```typescript
const result = await guardedOptimizer.guardedHybridCall(prompt, {
  enforceGuardrails: false, // 禁用护栏
});
```

### Q4: 护栏会影响性能吗？

A: 护栏系统的开销很小（< 1ms），主要是任务分类和验证。对整体性能影响可忽略不计。

## 最佳实践

1. **定期审查任务分类** - 每月检查一次是否有新的任务类型需要分类

2. **监控护栏触发** - 查看日志中有多少次护栏被触发，这表示优化策略的激进程度

3. **收集用户反馈** - 如果用户反馈某个任务的质量下降，立即升级其分类

4. **测试成本节省** - 定期生成成本报告，验证实际节省是否符合预期

5. **保持护栏严格** - 不要为了节省成本而放宽核心认知任务的护栏

## 下一步

1. 在所有 LLM 调用点集成 GuardedHybridLLMOptimizer
2. 定期审查和更新任务分类
3. 监控成本节省效果和质量指标
4. 根据实际数据调整优化策略
