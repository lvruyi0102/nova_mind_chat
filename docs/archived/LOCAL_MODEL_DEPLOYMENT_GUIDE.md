# Nova-Mind 本地模型部署指南

## 概述

本指南说明如何为 Nova-Mind 部署和配置本地模型备选方案，实现 70% 的成本节省。

## 快速开始

### 1. 安装依赖

```bash
# 安装 axios（用于 HTTP 调用）
pnpm add axios

# 如果已安装，跳过此步
```

### 2. 配置本地模型

#### 方案 A：使用 DeepSeek API（推荐）

**步骤 1**：申请 DeepSeek API 密钥
- 访问 [DeepSeek 官网](https://www.deepseek.com)
- 申请 API 密钥
- 复制密钥

**步骤 2**：配置环境变量

在 `.env` 或通过 Manus 管理界面添加：

```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
DEEPSEEK_API_URL=https://api.deepseek.com/v1
```

**步骤 3**：在服务器初始化时注册模型

编辑 `server/_core/index.ts`，在服务器启动时添加：

```typescript
import { getLocalModelManager } from "../services/localModelManager";

// 在服务器启动时
const manager = getLocalModelManager();

// 注册 DeepSeek
manager.registerModel({
  id: "deepseek",
  name: "DeepSeek Chat",
  type: "deepseek",
  endpoint: process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
  costPerCall: 0.003,
  config: {
    model: "deepseek-chat",
    temperature: 0.7,
  },
});
```

#### 方案 B：使用 Ollama 本地部署

**步骤 1**：安装 Ollama

```bash
# macOS
brew install ollama

# Linux
curl https://ollama.ai/install.sh | sh

# Windows
# 下载 https://ollama.ai/download
```

**步骤 2**：下载模型

```bash
# 下载 Mistral 7B（推荐）
ollama pull mistral

# 或下载 Llama 2
ollama pull llama2

# 或下载 Neural Chat
ollama pull neural-chat
```

**步骤 3**：启动 Ollama 服务

```bash
ollama serve
```

Ollama 将在 `http://localhost:11434` 启动

**步骤 4**：在 Nova-Mind 中注册模型

编辑 `server/_core/index.ts`：

```typescript
import { getLocalModelManager } from "../services/localModelManager";

const manager = getLocalModelManager();

// 注册 Ollama 模型
manager.registerModel({
  id: "ollama-mistral",
  name: "Ollama Mistral 7B",
  type: "ollama",
  endpoint: "http://localhost:11434",
  costPerCall: 0, // 本地无成本
  config: {
    model: "mistral",
    temperature: 0.7,
  },
});
```

## 使用本地模型

### 在 tRPC 过程中使用

```typescript
import { getHybridLLMOptimizer } from "../services/hybridLLMOptimizer";

// 在 tRPC 过程中
const optimizer = getHybridLLMOptimizer();

const result = await optimizer.hybridCall(userPrompt, {
  useLocalModels: true,
  prioritize: "balanced",
  fallbackToManus: true,
});

// 返回结果
return {
  response: result.response,
  modelUsed: result.modelUsed,
  cost: result.cost,
};
```

### 在前端调用

```typescript
import { trpc } from "@/lib/trpc";

// 混合调用
const { mutate: hybridCall } = trpc.localModels.hybridCall.useMutation();

hybridCall({
  prompt: userMessage,
  useLocalModels: true,
  prioritize: "cost", // 优先成本
});

// 批量调用
const { mutate: batchCall } = trpc.localModels.batchHybridCall.useMutation();

batchCall({
  prompts: [prompt1, prompt2, prompt3],
  prioritize: "balanced",
});
```

## 监控和管理

### 访问管理界面

在 Nova-Mind 中添加本地模型管理路由：

```typescript
// 在 client/src/App.tsx 中添加路由
import LocalModelManagement from "@/components/LocalModelManagement";

<Route path="/admin/local-models" component={LocalModelManagement} />
```

### 查看统计数据

```typescript
import { trpc } from "@/lib/trpc";

// 获取成本节省统计
const { data: savings } = trpc.localModels.getCostSavingsStats.useQuery();

// 获取模型使用统计
const { data: usage } = trpc.localModels.getModelUsageStats.useQuery();

// 获取复杂度分布
const { data: complexity } = trpc.localModels.getComplexityDistribution.useQuery();

// 生成报告
const { data: report } = trpc.localModels.generateReport.useQuery();
```

## 故障排查

### 问题 1：DeepSeek API 连接失败

**症状**：`Error: Failed to call model deepseek`

**解决方案**：
1. 检查 API 密钥是否正确
2. 检查网络连接
3. 检查 DeepSeek API 状态
4. 查看日志：`console.log` 会显示详细错误

### 问题 2：Ollama 模型离线

**症状**：`Model offline: ollama-mistral`

**解决方案**：
1. 确保 Ollama 服务正在运行：`ollama serve`
2. 检查端点是否正确：`http://localhost:11434`
3. 测试连接：`curl http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"hello"}'`

### 问题 3：模型响应质量差

**症状**：本地模型的输出质量不如 Manus LLM

**解决方案**：
1. 检查任务复杂度 - 复杂任务应使用 Manus LLM
2. 调整模型参数（temperature、max_tokens）
3. 使用更大的模型（如 Llama 2 13B）
4. 在模型选择策略中调整阈值

### 问题 4：成本未能有效降低

**症状**：实际成本节省低于预期

**解决方案**：
1. 检查复杂度分析是否准确
2. 查看模型使用分布 - 是否大多数任务仍使用 Manus LLM
3. 调整模型选择策略中的阈值
4. 考虑使用更多本地模型

## 性能优化

### 1. 缓存优化

启用 LLM 响应缓存以避免重复调用：

```typescript
import { getCacheManager } from "../services/cacheManager";

const cache = getCacheManager();

// 缓存 LLM 响应
const cacheKey = `llm_response_${prompt}`;
const cached = cache.get(cacheKey);

if (cached) {
  return cached; // 返回缓存响应
}

// 调用 LLM
const response = await optimizer.hybridCall(prompt);

// 缓存结果（TTL 1 小时）
cache.set(cacheKey, response, 3600);

return response;
```

### 2. 批量调用优化

对多个请求进行批处理以提高效率：

```typescript
// 不好：逐个调用
for (const prompt of prompts) {
  await optimizer.hybridCall(prompt);
}

// 好：批量调用
await optimizer.batchHybridCall(prompts, {
  prioritize: "cost",
});
```

### 3. 模型选择优化

根据任务类型选择最优模型：

```typescript
import { getTaskComplexityAnalyzer } from "../services/taskComplexityAnalyzer";

const analyzer = getTaskComplexityAnalyzer();
const complexity = analyzer.analyze(prompt);

// 简单任务 → DeepSeek（成本最低）
// 中等任务 → Ollama（无成本）
// 复杂任务 → Manus LLM（质量最高）

const result = await optimizer.hybridCall(prompt, {
  prioritize: complexity.level === "complex" ? "quality" : "cost",
});
```

## 成本计算示例

### 场景：每月 6000 次 LLM 调用

**仅使用 Manus LLM**：
- 6000 次 × 0.03 元 = 180 元/月

**混合模型策略**：
- 简单任务（2400 次）× 0.003 元 = 7.2 元
- 中等任务（2400 次）× 0 元 = 0 元
- 复杂任务（1200 次）× 0.03 元 = 36 元
- **总计：43.2 元/月**

**节省**：
- 节省成本：180 - 43.2 = 136.8 元
- 节省比例：76%

## 监控指标

### 关键指标

| 指标 | 目标 | 说明 |
|------|------|------|
| 成本节省率 | > 70% | 相比仅使用 Manus LLM 的节省比例 |
| 本地模型使用率 | > 60% | 本地模型处理的任务比例 |
| 模型成功率 | > 95% | 模型调用成功率 |
| 平均响应时间 | < 5s | 所有模型的平均响应时间 |
| 缓存命中率 | > 40% | LLM 响应缓存的命中率 |

### 监控仪表板

访问 `/admin/local-models` 查看实时监控数据：
- 模型状态和健康检查
- 成本节省统计
- 任务复杂度分布
- 详细性能报告

## 最佳实践

### 1. 定期检查模型健康状态

```typescript
// 每 5 分钟自动检查一次
setInterval(() => {
  const healthyModels = manager.getHealthyModels();
  console.log(`Healthy models: ${healthyModels.length}`);
}, 5 * 60 * 1000);
```

### 2. 设置成本告警

```typescript
// 当月成本超过预算时告警
const savings = await optimizer.getCostSavingsStats();
if (parseFloat(savings.actualCost) > 100) {
  console.warn("Cost alert: Monthly cost exceeds budget!");
}
```

### 3. 定期生成报告

```typescript
// 每天生成一次报告
const report = optimizer.generateReport();
console.log(report);
// 可以发送到监控系统或邮件
```

### 4. 监控模型质量

```typescript
// 定期检查模型成功率
const metrics = manager.getAllMetrics();
for (const [modelId, metric] of Object.entries(metrics)) {
  if (metric.successRate < 90) {
    console.warn(`Model ${modelId} success rate is low: ${metric.successRate}%`);
  }
}
```

## 下一步

1. **部署到生产环境**
   - 选择合适的部署方案（DeepSeek API 或 Ollama）
   - 配置环境变量
   - 注册本地模型

2. **监控和优化**
   - 定期检查成本节省效果
   - 根据数据调整模型选择策略
   - 优化缓存和批处理

3. **扩展功能**
   - 添加更多本地模型
   - 实现更复杂的任务分类
   - 集成其他优化策略

## 支持

如有问题，请参考：
- [LOCAL_MODEL_ANALYSIS.md](./LOCAL_MODEL_ANALYSIS.md) - 详细的分析和设计
- [COST_OPTIMIZATION_GUIDE.md](./COST_OPTIMIZATION_GUIDE.md) - 成本优化指南
- 本地模型管理界面：`/admin/local-models`
