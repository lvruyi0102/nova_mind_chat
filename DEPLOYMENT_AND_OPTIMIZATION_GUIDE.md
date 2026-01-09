# Nova-Mind 部署和优化完整指南

## 概述

本指南涵盖 Nova-Mind 的完整部署流程，包括本地模型配置、成本预算管理、自动优化策略和成本告警系统。

## 快速开始（5 分钟）

### 1. 基础部署（无本地模型）

如果你只想快速部署而不配置本地模型：

```bash
# 部署应用
npm run build
npm run start

# 应用将使用默认的 Manus LLM
# 成本预算将设置为 ¥100/月
```

### 2. 启用 DeepSeek（推荐，10 分钟）

**步骤 1**：获取 DeepSeek API 密钥

- 访问 [DeepSeek 官网](https://www.deepseek.com)
- 申请 API 密钥
- 复制密钥

**步骤 2**：配置环境变量

在 Manus 管理界面或本地 `.env` 文件中添加：

```bash
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
MONTHLY_COST_BUDGET=100
MODEL_STRATEGY=balanced
ENABLE_AUTO_OPTIMIZATION=true
ENABLE_COST_ALERTS=true
```

**步骤 3**：重启服务器

```bash
npm run dev
```

服务器启动时会自动加载 DeepSeek 模型。

### 3. 启用 Ollama（完全免费，15 分钟）

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
```

**步骤 3**：启动 Ollama 服务

```bash
ollama serve
```

Ollama 将在 `http://localhost:11434` 启动

**步骤 4**：配置环境变量

```bash
OLLAMA_ENABLED=true
OLLAMA_ENDPOINT=http://localhost:11434
MONTHLY_COST_BUDGET=100
MODEL_STRATEGY=balanced
```

**步骤 5**：重启 Nova-Mind 服务器

```bash
npm run dev
```

## 完整部署指南

### 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Nova-Mind 应用                        │
├─────────────────────────────────────────────────────────┤
│                 后台认知循环                              │
│  (优化的后台任务处理)                                    │
├─────────────────────────────────────────────────────────┤
│              混合 LLM 优化器                             │
│  (自动选择最优模型)                                      │
├──────────────┬──────────────┬──────────────┐             │
│  DeepSeek    │   Ollama     │  Manus LLM   │             │
│  (¥0.003/次) │  (¥0/次)     │  (¥0.03/次)  │             │
└──────────────┴──────────────┴──────────────┘             │
                                                            │
┌─────────────────────────────────────────────────────────┐
│              成本管理系统                                 │
├─────────────────────────────────────────────────────────┤
│  成本追踪 → 预算管理 → 自动优化 → 成本告警              │
└─────────────────────────────────────────────────────────┘
```

### 环境变量配置

#### 必需变量

```bash
# 数据库连接
DATABASE_URL=mysql://user:password@host:3306/nova_mind

# JWT 密钥
JWT_SECRET=your-secret-key

# OAuth 配置（由 Manus 自动注入）
VITE_APP_ID=xxx
OAUTH_SERVER_URL=https://api.manus.im
```

#### 本地模型配置

```bash
# DeepSeek 配置
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# Ollama 配置
OLLAMA_ENABLED=true
OLLAMA_ENDPOINT=http://localhost:11434
```

#### 成本预算配置

```bash
# 月度预算（元）
MONTHLY_COST_BUDGET=100

# 告警阈值（百分比）
ALERT_THRESHOLD=80

# 严重阈值（百分比）
CRITICAL_THRESHOLD=95

# 启用成本告警
ENABLE_COST_ALERTS=true
```

#### 优化策略配置

```bash
# 默认策略：cost | quality | speed | balanced | aggressive
MODEL_STRATEGY=balanced

# 启用自动优化
ENABLE_AUTO_OPTIMIZATION=true
```

### 部署步骤

#### 步骤 1：准备环境

```bash
# 克隆或更新代码
git clone <repo-url>
cd nova_mind_chat

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

#### 步骤 2：配置环境变量

在 Manus 管理界面的 Settings → Secrets 中添加上述环境变量，或在本地 `.env` 文件中配置。

#### 步骤 3：初始化数据库

```bash
# 运行数据库迁移
pnpm db:push

# 可选：运行初始化脚本
node server/scripts/initializeModels.mjs
```

#### 步骤 4：启动服务

```bash
# 开发环境
pnpm dev

# 生产环境
pnpm start
```

#### 步骤 5：验证部署

访问应用首页，检查：

1. 应用是否正常加载
2. 后台任务是否正常运行
3. 成本监控仪表板是否显示数据

## 成本预算管理

### 预算状态监控

访问 `/admin/cost-budget` 查看实时预算状态：

```
当前月份: 2024-01
月度预算: ¥100.00
当前成本: ¥23.45
使用比例: 23.5%
剩余预算: ¥76.55
预测月度成本: ¥42.30
状态: ✅ 正常
```

### 告警机制

**警告告警**（使用比例 ≥ 80%）：
- 发送通知给项目所有者
- 建议检查本地模型状态
- 建议提高本地模型使用比例

**严重告警**（使用比例 ≥ 95%）：
- 立即发送严重告警
- 建议启用激进优化策略
- 建议临时降低 LLM 调用频率

### 更新预算配置

通过 API 更新预算配置：

```typescript
import { trpc } from "@/lib/trpc";

const { mutate: updateConfig } = trpc.costBudget.updateBudgetConfig.useMutation();

updateConfig({
  monthlyBudget: 150,
  alertThreshold: 75,
  criticalThreshold: 90,
  enableAlerts: true,
});
```

## 自动优化策略

### 可用策略

| 策略 | 本地模型 | DeepSeek | Ollama | Manus | 用途 |
|------|--------|----------|--------|-------|------|
| cost | 80% | 50% | 30% | 20% | 最大化成本节省 |
| quality | 30% | 20% | 10% | 70% | 优先保证质量 |
| speed | 60% | 30% | 30% | 40% | 平衡响应速度 |
| balanced | 50% | 25% | 25% | 50% | 平衡各方面 |
| aggressive | 90% | 60% | 30% | 10% | 激进降低成本 |

### 自动策略调整

系统会根据预算状态自动调整策略：

- **正常**（< 50%）→ quality 策略
- **正常**（50-80%）→ balanced 策略
- **警告**（80-95%）→ cost 策略
- **严重**（≥ 95%）→ aggressive 策略

### 手动设置策略

```typescript
import { trpc } from "@/lib/trpc";

const { mutate: setStrategy } = trpc.costBudget.setOptimizationStrategy.useMutation();

setStrategy({ strategy: "cost" });
```

## 监控和报告

### 成本监控仪表板

访问 `/admin/local-models` 查看：

- 模型状态和健康检查
- 成本节省统计
- 任务复杂度分布
- 详细性能报告

### 生成报告

通过 API 生成完整报告：

```typescript
import { trpc } from "@/lib/trpc";

// 获取预算报告
const { data: budgetReport } = trpc.costBudget.generateBudgetReport.useQuery();

// 获取优化报告
const { data: optimizationReport } = trpc.costBudget.generateOptimizationReport.useQuery();

// 获取完整报告
const { data: completeReport } = trpc.costBudget.getCompleteReport.useQuery();
```

## 故障排查

### 问题 1：DeepSeek 连接失败

**症状**：`Error: Failed to call model deepseek`

**解决方案**：
1. 检查 API 密钥是否正确
2. 检查网络连接
3. 检查 DeepSeek API 状态
4. 查看日志获取详细错误信息

### 问题 2：Ollama 模型离线

**症状**：`Model offline: ollama-mistral`

**解决方案**：
1. 确保 Ollama 服务正在运行：`ollama serve`
2. 检查端点是否正确：`http://localhost:11434`
3. 测试连接：`curl http://localhost:11434/api/generate -d '{"model":"mistral","prompt":"hello"}'`

### 问题 3：成本告警频繁

**症状**：频繁收到成本告警

**解决方案**：
1. 检查预算是否设置过低
2. 提高本地模型使用比例
3. 检查是否有异常的 LLM 调用
4. 调整告警阈值

### 问题 4：成本节省效果不明显

**症状**：实际成本节省低于预期

**解决方案**：
1. 检查本地模型是否正常运行
2. 查看模型使用分布
3. 调整模型选择策略中的阈值
4. 考虑使用更多本地模型

## 性能优化

### 1. 缓存优化

启用 LLM 响应缓存以避免重复调用：

```typescript
// 在后台认知循环中启用缓存
const result = await hybridOptimizer.hybridCall(prompt, {
  useCache: true,
  cacheTTL: 3600, // 1 小时
});
```

### 2. 批量处理

对多个请求进行批处理以提高效率：

```typescript
// 批量调用
const results = await hybridOptimizer.batchHybridCall(prompts, {
  prioritize: "cost",
});
```

### 3. 模型选择优化

根据任务类型选择最优模型：

```typescript
// 简单任务 → DeepSeek
// 中等任务 → Ollama
// 复杂任务 → Manus LLM
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

## 下一步

1. **部署到生产环境**
   - 配置环境变量
   - 注册本地模型
   - 启动应用

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
- [LOCAL_MODEL_DEPLOYMENT_GUIDE.md](./LOCAL_MODEL_DEPLOYMENT_GUIDE.md) - 本地模型部署指南
- [LOCAL_MODEL_ANALYSIS.md](./LOCAL_MODEL_ANALYSIS.md) - 详细的分析和设计
- [COST_OPTIMIZATION_GUIDE.md](./COST_OPTIMIZATION_GUIDE.md) - 成本优化指南
- 成本监控仪表板：`/admin/cost-budget`
- 本地模型管理界面：`/admin/local-models`
