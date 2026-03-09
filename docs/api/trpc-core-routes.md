# tRPC API 文档（核心模块）

本文档聚焦核心能力：**邮件系统**、**互联网学习**、**推理引擎**。所有接口均基于 tRPC，默认返回 JSON 对象。

- Router 命名空间：`reasoning`
- Router 命名空间：`emailInternet`

> 认证说明：以下接口均为 `protectedProcedure`，调用方需携带有效登录态。

---

## 1. reasoning 路由

源码：`server/routers/reasoningRouter.ts`

### 1.1 `reasoning.makeDecision` (mutation)

- **用途**：针对问题生成增强决策。
- **输入参数**：

```ts
{
  problem: string;
  constraints?: string[];
  objectives?: string[];
  historicalContext?: string[];
  timeLimit?: number;
  confidenceThreshold?: number;
}
```

- **返回值**：

```ts
{
  success: true;
  decision: {
    problem: string;
    recommendedOption: string;
    options: Array<{ description: string; score: number; reasoning: string }>;
    confidence: number;
    reasoning: string;
    timestamp: Date;
  };
}
```

- **调用示例**：

```ts
await trpc.reasoning.makeDecision.mutate({
  problem: "如何降低推理服务成本",
  constraints: ["不降低可用性"],
  objectives: ["降低 20% 成本", "保持响应速度"],
});
```

### 1.2 `reasoning.performMultiStepReasoning` (mutation)

- **用途**：执行多步推理。
- **输入参数**：

```ts
{
  problem: string;
  context?: string[];
  method?: "forward" | "backward" | "bidirectional" | "llm";
}
```

- **返回值**：

```ts
{
  success: true;
  result: {
    goal: string;
    achieved: boolean;
    steps: Array<{
      stepNumber: number;
      action: string;
      reasoning: string;
      confidence: number;
      newFacts?: string[];
    }>;
    confidence: number;
    reasoning: string;
    executionTime: number;
  };
}
```

- **调用示例**：

```ts
await trpc.reasoning.performMultiStepReasoning.mutate({
  problem: "need_optimization",
  context: ["high_load"],
  method: "forward",
});
```

### 1.3 `reasoning.performCausalAnalysis` (mutation)

- **输入参数**：

```ts
{
  effect: string;
  context?: string[];
}
```

- **返回值**：根因、直接原因、间接原因、因果链、置信度与解释文本。

### 1.4 `reasoning.performCounterfactualReasoning` (mutation)

- **输入参数**：

```ts
{
  scenario: string;
  intervention: string;
  actualOutcome: string;
}
```

- **返回值**：反事实分析结果（expected/actual/difference/confidence）。

### 1.5 `reasoning.decomposeProblem` (mutation)

- **输入参数**：

```ts
{
  description: string;
  constraints?: string[];
  objectives?: string[];
  context?: string[];
}
```

- **返回值**：子问题列表（依赖、优先级、预估工作量）。

### 1.6 `reasoning.generateExecutionPlan` (mutation)

- **输入参数**：

```ts
{
  problemDescription: string;
  subProblems: Array<{
    id: string;
    parentId: string;
    description: string;
    dependencies: string[];
    priority: number;
    estimatedEffort: number;
  }>;
  solutions: Record<string, string>;
}
```

- **返回值**：执行步骤、关键路径、总工期、资源需求。

### 1.7 `reasoning.getDecisionHistory` (query)

- **用途**：返回当前用户历史决策摘要。

### 1.8 `reasoning.getReasoningStatistics` (query)

- **用途**：返回决策引擎 + 推理引擎统计数据。

---

## 2. emailInternet 路由

源码：`server/routers/emailInternetRouter.ts`

### 2.1 邮件会话能力

1. `emailInternet.startEmailChat` (mutation)
   - 输入：`{ userEmail: string; subject: string; message: string }`
   - 返回：`{ success: boolean; conversationId?: string; message?: string; error?: string }`

2. `emailInternet.getEmailConversation` (query)
   - 输入：`{ conversationId: string }`
   - 返回：`{ success: boolean; conversation?: EmailConversation; error?: string }`

3. `emailInternet.getUserEmailConversations` (query)
   - 输入：`{ userEmail: string }`
   - 返回：`{ success: boolean; conversations?: EmailConversation[]; total?: number; error?: string }`

4. `emailInternet.closeEmailConversation` (mutation)
   - 输入：`{ conversationId: string }`

5. `emailInternet.getEmailNotifications` (query)

6. `emailInternet.markNotificationAsRead` (mutation)
   - 输入：`{ notificationId: string }`

### 2.2 互联网学习能力

1. `emailInternet.learnFromUrl` (mutation)
   - 输入：`{ url: string; category?: string }`

2. `emailInternet.searchAndLearn` (mutation)
   - 输入：`{ query: string; category?: string }`

3. `emailInternet.getAllLearningContents` (query)

4. `emailInternet.getLearningContentsByCategory` (query)
   - 输入：`{ category: string }`

5. `emailInternet.getImportantLearningContents` (query)
   - 输入：`{ threshold?: number }`

### 2.3 集成循环管理

1. `emailInternet.startIntegration` (mutation)
2. `emailInternet.stopIntegration` (mutation)
3. `emailInternet.getIntegrationStatus` (query)
4. `emailInternet.getLearningStats` (query)
5. `emailInternet.getEmailStats` (query)

> `startIntegration` / `stopIntegration` 仅 admin 有权限执行。

---

## 3. 前端调用模板（React + @trpc/react-query）

```ts
const utils = trpc.useUtils();

const startEmailChat = trpc.emailInternet.startEmailChat.useMutation({
  onSuccess: () => utils.emailInternet.getEmailNotifications.invalidate(),
});

const reasoningMutation = trpc.reasoning.performMultiStepReasoning.useMutation();

await startEmailChat.mutateAsync({
  userEmail: "friend@example.com",
  subject: "Nova 的近况",
  message: "这周你学到了什么？",
});

const reasoningResult = await reasoningMutation.mutateAsync({
  problem: "need_optimization",
  context: ["high_load"],
  method: "forward",
});
```

---

## 4. 全量顶层 Router 命名空间（`appRouter`）

来源：`server/routers.ts`

`system`、`cognitive`、`autonomy`、`learningAndActions`、`backgroundProcess`、`evolution`、`pressure`、`codeModification`、`autonomousEvolution`、`metacognitive`、`reasoning`、`emailInternet`、`auth`、`chat`、`content`、`proactive`、`relationships`、`emotions`、`learning`、`multimodal`、`export`、`autonomous`、`privacy`、`creative`、`learningLogs`、`backgroundLearning`、`monitoring`、`curatedThoughts`、`selfIteration`、`ethics`、`localModels`、`scheduler`、`permissions`、`costMonitoring`、`bulkSync`、`autoCuration`、`events`、`fallback`、`decision`、`feedback`。

如需扩展为全命名空间“逐接口参数级文档”，可在此文档基础上继续补充各 router 文件中的 input/output 规范。
