# Nova-Mind 成本优化实现指南

## 概述

本指南说明如何使用 Nova-Mind 的成本优化系统来降低 API 调用成本和数据库查询成本。通过智能缓存、批量调用和成本追踪，预计可以将成本降低 **60%**。

## 核心组件

### 1. 缓存管理器 (cacheManager.ts)

**功能**：多层缓存系统，支持 LLM 响应缓存、数据库查询缓存等

**使用示例**：

```typescript
import { 
  getCacheManager, 
  LLMResponseCache, 
  DatabaseQueryCache 
} from "@/services/cacheManager";

// LLM 响应缓存
const llmCache = new LLMResponseCache();
const cached = llmCache.getResponse(prompt);
if (!cached) {
  const response = await invokeLLM({ messages: [...] });
  llmCache.cacheResponse(prompt, response, 24); // 24小时TTL
}

// 数据库查询缓存
const queryCache = new DatabaseQueryCache();
const result = queryCache.getResult("user_profile", userId);
if (!result) {
  const data = await db.query(...);
  queryCache.cacheResult("user_profile", data, 1); // 1小时TTL
}
```

**缓存 TTL 建议**：
- LLM 响应：24 小时
- 用户档案：1 小时
- 概念图：6 小时
- 关系数据：12 小时
- 创意内容：24 小时

### 2. LLM 优化器 (llmOptimizer.ts)

**功能**：优化 LLM 调用，支持缓存、批量调用、智能降级

**使用示例**：

```typescript
import { getLLMOptimizer } from "@/services/llmOptimizer";

const optimizer = getLLMOptimizer();

// 单个调用（带缓存）
const response = await optimizer.callWithCache(prompt, {
  useCache: true,
  cacheTTLHours: 24
});

// 批量调用（降低成本）
const results = await optimizer.batchCall([
  { prompt: "Generate thought 1" },
  { prompt: "Generate thought 2" },
  { prompt: "Generate thought 3" }
]);

// 智能降级（失败时返回默认响应）
const response = await optimizer.callWithFallback(prompt, {
  priority: "normal",
  fallbackResponse: "Default response"
});

// 获取优化指标
const metrics = optimizer.getMetrics();
console.log(`缓存命中率: ${optimizer.getCacheHitRate()}%`);
console.log(`成本节省: ${optimizer.getCostSavingsRate()}%`);
```

### 3. 数据库查询优化器 (queryOptimizer.ts)

**功能**：优化数据库查询，支持查询缓存和批量操作

**使用示例**：

```typescript
import { getQueryOptimizer } from "@/services/queryOptimizer";

const optimizer = getQueryOptimizer();

// 缓存查询结果
const result = await optimizer.getCachedResult(
  "user_profile:123",
  async () => {
    return await db.select().from(users).where(eq(users.id, 123));
  },
  1 // 1小时缓存
);

// 批量查询（并行执行）
const results = await optimizer.batchQuery([
  {
    name: "user_profile",
    executor: () => db.select().from(users).where(eq(users.id, userId)),
    cacheTTL: 1
  },
  {
    name: "concepts",
    executor: () => db.select().from(concepts).where(eq(concepts.userId, userId)),
    cacheTTL: 6
  }
]);

// 获取优化指标
const metrics = optimizer.getMetrics();
console.log(`缓存命中率: ${optimizer.getCacheHitRate()}%`);
console.log(`查询节省: ${optimizer.getQuerySavings()}`);
```

### 4. 成本追踪器 (costTracker.ts)

**功能**：记录所有 API 调用和数据库查询的成本

**使用示例**：

```typescript
import { getCostTracker } from "@/services/costTracker";

const tracker = getCostTracker();

// 记录 LLM 调用
tracker.recordLLMCall("chat", 0.03, { 
  messageLength: 100,
  responseLength: 200 
});

// 记录数据库查询
tracker.recordDatabaseQuery("user_profile", 0.0001);

// 记录缓存命中
tracker.recordCacheHit("llm_response", 0.03);

// 获取统计信息
const stats = tracker.getStats();
console.log(`总成本: ¥${stats.totalCost}`);
console.log(`预测月成本: ¥${tracker.predictMonthlyCost()}`);

// 获取缓存效率
const efficiency = tracker.getCacheEfficiency();
console.log(`缓存命中率: ${efficiency.hitRate}%`);
console.log(`成本降低: ${efficiency.costReduction}%`);

// 生成报告
const report = tracker.generateReport();
console.log(report);
```

### 5. 优化的后台认知循环 (optimizedBackgroundCognition.ts)

**功能**：集成所有优化策略的后台认知循环

**使用示例**：

```typescript
import { getOptimizedBackgroundCognition } from "@/services/optimizedBackgroundCognition";

const cognition = getOptimizedBackgroundCognition();

// 执行单个优化任务
const result = await cognition.executeOptimizedTask({
  userId: 123,
  type: "daily_thought",
  priority: "normal"
});

// 执行批量任务（优化成本）
const results = await cognition.executeBatchTasks([
  { userId: 123, type: "daily_thought", priority: "high" },
  { userId: 123, type: "weekly_reflection", priority: "normal" },
  { userId: 123, type: "milestone_check", priority: "low" }
]);

// 获取优化的任务频率
const frequency = cognition.getOptimizedFrequency("daily_thought");
console.log(`优化后的任务频率: ${frequency}分钟`);

// 获取优化指标
const metrics = cognition.getOptimizationMetrics();
console.log(metrics);

// 生成优化报告
const report = cognition.generateOptimizationReport();
console.log(report);
```

## API 端点

### 成本监控 API (costMonitoring 路由)

```typescript
// 获取总成本统计
trpc.costMonitoring.getStats.useQuery()

// 获取每日成本汇总（最近30天）
trpc.costMonitoring.getDailySummaries.useQuery({ days: 30 })

// 获取最近N天的总成本
trpc.costMonitoring.getCostForLastDays.useQuery({ days: 30 })

// 获取缓存效率
trpc.costMonitoring.getCacheEfficiency.useQuery()

// 获取服务成本分布
trpc.costMonitoring.getServiceCostBreakdown.useQuery()

// 获取LLM优化指标
trpc.costMonitoring.getLLMMetrics.useQuery()

// 获取数据库查询优化指标
trpc.costMonitoring.getQueryMetrics.useQuery()

// 生成成本报告
trpc.costMonitoring.generateReport.useQuery()

// 预测月成本
trpc.costMonitoring.predictMonthlyCost.useQuery()

// 获取优化建议
trpc.costMonitoring.getOptimizationRecommendations.useQuery()

// 清除缓存
trpc.costMonitoring.clearCache.useMutation({
  type: "all" | "llm" | "query"
})

// 重置指标（仅管理员）
trpc.costMonitoring.resetMetrics.useMutation()
```

## 前端监控仪表板

使用 `CostMonitoringDashboard` 组件在前端显示成本监控信息：

```tsx
import { CostMonitoringDashboard } from "@/components/CostMonitoringDashboard";

export function CostPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">成本监控</h1>
      <CostMonitoringDashboard />
    </div>
  );
}
```

## 优化策略

### 1. 智能缓存策略

- **短期缓存**（1小时）：用户档案、最近查询结果
- **中期缓存**（6小时）：概念图、关系数据
- **长期缓存**（24小时）：LLM 响应、创意内容

### 2. 批量调用策略

- 合并多个 LLM 请求为一个调用
- 并行执行数据库查询
- 预期节省：20-30% 的 LLM 成本

### 3. 智能降级策略

- 高优先级任务：使用完整 LLM 调用
- 普通优先级任务：使用缓存，失败时返回降级响应
- 低优先级任务：优先使用缓存，不调用 LLM

### 4. 动态频率调整

根据预测月成本动态调整后台任务频率：
- 预测月成本 > 200 元：增加 50% 间隔
- 预测月成本 > 150 元：增加 20% 间隔
- 预测月成本 < 150 元：保持原频率

## 成本目标

| 指标 | 当前 | 目标 | 节省比例 |
|------|------|------|---------|
| 日均 LLM 成本 | 7.92 元 | 3.17 元 | 60% |
| 月均 LLM 成本 | 237 元 | 95 元 | 60% |
| 数据库查询 | 100% | 50% | 50% |
| 总体成本 | 100% | 40% | 60% |

## 监控和告警

系统会在以下情况生成告警：

1. **缓存命中率低于 30%** - 建议增加缓存 TTL
2. **LLM 成本占比超过 80%** - 建议使用批量调用
3. **成本呈上升趋势** - 检查后台任务频率
4. **预测月成本超过 200 元** - 自动降低任务频率

## 最佳实践

1. **定期检查成本报告** - 每周查看一次成本统计
2. **监控缓存效率** - 缓存命中率应保持在 40% 以上
3. **调整任务频率** - 根据成本趋势动态调整
4. **使用批量调用** - 对于多个相似任务，使用批量调用
5. **设置告警阈值** - 配置成本告警，及时发现问题

## 故障排查

### 缓存命中率低

**原因**：缓存 TTL 过短或缓存键生成不一致

**解决方案**：
- 增加缓存 TTL
- 检查缓存键生成逻辑
- 验证缓存命中条件

### 成本未降低

**原因**：优化策略未正确应用

**解决方案**：
- 检查是否启用了缓存
- 验证批量调用是否生效
- 查看成本追踪日志

### 任务执行失败

**原因**：降级响应不适合任务类型

**解决方案**：
- 自定义降级响应
- 增加重试次数
- 提高任务优先级

## 下一步

1. 集成到生产环境
2. 监控实际成本节省效果
3. 根据实际情况调整参数
4. 考虑使用本地模型（如 DeepSeek）作为备选方案
