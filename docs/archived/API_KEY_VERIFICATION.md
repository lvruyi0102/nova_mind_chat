# Manus API Key 验证和成本优化指南

## 快速诊断

如果您在 Manus 网站配置了 API Key 但对话成本仍然很高，请按以下步骤诊断：

### 第 1 步：验证 API Key 配置

```bash
# 检查环境变量
cd /home/ubuntu/nova_mind_chat

# 查看 Manus API 配置
grep -E "BUILT_IN_FORGE|VITE_FRONTEND_FORGE" .env

# 预期输出：
# BUILT_IN_FORGE_API_KEY=sk_xxx...
# BUILT_IN_FORGE_API_URL=https://api.manus.im
# VITE_FRONTEND_FORGE_API_KEY=pk_xxx...
```

### 第 2 步：测试 API 连接

```bash
# 测试 API 连接
curl -X GET https://api.manus.im/health \
  -H "Authorization: Bearer $BUILT_IN_FORGE_API_KEY"

# 预期响应：200 OK
```

### 第 3 步：检查 LLM 调用成本

```bash
# 访问成本监控仪表板
# http://localhost:3000/admin/cost-budget

# 或查看成本日志
cd /home/ubuntu/nova_mind_chat
tail -100 server/logs/cost-tracking.log 2>/dev/null || echo "日志文件不存在"
```

### 第 4 步：查看最近的 LLM 调用

```bash
# 查看数据库中的成本记录
sqlite3 /home/ubuntu/nova_mind_chat/data.db \
  "SELECT * FROM costTracking ORDER BY timestamp DESC LIMIT 20;"
```

## 成本优化方案

### 方案 1：启用本地模型（推荐）

**优点**：
- 大幅降低成本（节省 50-80%）
- 支持离线使用
- 隐私更好

**缺点**：
- 需要本地部署
- 质量可能略低

**实施步骤**：

#### 步骤 A：安装 Ollama（推荐）

```bash
# 安装 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 启动 Ollama 服务
ollama serve &

# 拉取模型（在另一个终端）
ollama pull mistral
# 或
ollama pull neural-chat
```

#### 步骤 B：配置应用

编辑 `.env` 文件：

```env
# 启用 Ollama
OLLAMA_ENABLED=true
OLLAMA_API_URL=http://localhost:11434

# 选择优化策略
MODEL_STRATEGY=balanced  # cost | quality | speed | balanced | aggressive

# 启用自动优化
ENABLE_AUTO_OPTIMIZATION=true
MONTHLY_COST_BUDGET=100
```

#### 步骤 C：重启应用

```bash
pnpm dev
```

### 方案 2：使用 DeepSeek API（低成本）

**优点**：
- 成本低（¥0.003/次）
- 无需本地部署
- 质量接近 GPT-3.5

**缺点**：
- 需要网络连接
- 有 API 限制

**实施步骤**：

#### 步骤 A：获取 DeepSeek API Key

1. 访问 https://platform.deepseek.com/
2. 注册账户
3. 创建 API Key
4. 复制 API Key

#### 步骤 B：配置应用

编辑 `.env` 文件：

```env
# DeepSeek 配置
DEEPSEEK_API_KEY=sk_xxx...
DEEPSEEK_ENABLED=true
DEEPSEEK_API_URL=https://api.deepseek.com/v1

# 优化策略
MODEL_STRATEGY=balanced
```

#### 步骤 C：重启应用

```bash
pnpm dev
```

### 方案 3：混合方案（最优）

同时使用 Manus LLM、DeepSeek 和 Ollama：

```env
# Manus LLM（核心任务）
BUILT_IN_FORGE_API_KEY=sk_xxx...
BUILT_IN_FORGE_API_URL=https://api.manus.im

# DeepSeek（辅助任务）
DEEPSEEK_API_KEY=sk_xxx...
DEEPSEEK_ENABLED=true

# Ollama（结构化任务）
OLLAMA_ENABLED=true
OLLAMA_API_URL=http://localhost:11434

# 优化策略
MODEL_STRATEGY=balanced
ENABLE_AUTO_OPTIMIZATION=true
MONTHLY_COST_BUDGET=100
```

## 成本对比

| 方案 | 核心任务 | 辅助任务 | 结构化任务 | 月度成本 | 节省 |
|------|---------|---------|----------|--------|------|
| 仅 Manus | 100% | - | - | ¥180 | - |
| 混合（推荐） | 50% | 30% | 20% | ¥95 | 47% |
| 激进优化 | 20% | 30% | 50% | ¥36 | 80% |
| 完全免费 | - | - | 100% | ¥0 | 100% |

## 监控和调试

### 查看实时成本

```bash
# 访问成本监控仪表板
# http://localhost:3000/admin/cost-budget

# 或通过 API 查询
curl http://localhost:3000/api/trpc/costMonitoring.getStats
```

### 查看 LLM 调用日志

```bash
# 查看最近的 LLM 调用
curl http://localhost:3000/api/trpc/costMonitoring.getRecentCalls?limit=20

# 查看模型使用分布
curl http://localhost:3000/api/trpc/costMonitoring.getModelUsageDistribution
```

### 生成成本报告

```bash
# 生成月度成本报告
curl http://localhost:3000/api/trpc/costMonitoring.generateReport
```

## 常见问题

### Q: 为什么成本仍然很高？

**A:** 可能原因和解决方案：

1. **后台认知循环频率过高**
   - 当前：每 15 分钟运行一次
   - 解决：增加到 30 分钟或 1 小时
   - 预期节省：30-50%

2. **缓存未启用**
   - 检查：`ENABLE_CACHE=true`
   - 预期节省：20-30%

3. **本地模型未配置**
   - 解决：配置 Ollama 或 DeepSeek
   - 预期节省：50-80%

4. **任务分类不准确**
   - 检查：`enhancedTaskClassifier.ts`
   - 预期节省：10-20%

### Q: 使用本地模型会影响质量吗？

**A:** 
- **Ollama Mistral**：质量接近 GPT-3.5，适合大多数任务
- **DeepSeek**：质量接近 GPT-3.5，成本更低
- **Manus LLM**：质量最高，用于核心任务

系统会自动为不同任务选择最优模型。

### Q: 如何确保核心任务使用 Manus LLM？

**A:** 系统有护栏机制，确保以下任务始终使用 Manus LLM：
- 自我反思
- 伦理推理
- 创意生成
- 关系学习

您可以在 `guardedHybridLLMOptimizer.ts` 中查看详细配置。

### Q: 如何手动调整优化策略？

**A:** 
```bash
# 切换到成本优先策略
curl -X POST http://localhost:3000/api/trpc/costMonitoring.adjustStrategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "aggressive"}'

# 切换到质量优先策略
curl -X POST http://localhost:3000/api/trpc/costMonitoring.adjustStrategy \
  -H "Content-Type: application/json" \
  -d '{"strategy": "quality"}'
```

## 下一步

1. **选择优化方案** - 根据您的需求选择合适的方案
2. **配置环境变量** - 按照上述步骤配置
3. **重启应用** - 应用新配置
4. **监控成本** - 访问成本监控仪表板查看效果
5. **调整参数** - 根据实际情况微调参数

## 需要帮助？

如果您需要进一步的帮助，请提供以下信息：

1. 当前的 API Key 配置（已配置哪些服务）
2. 对话频率（每天多少次对话）
3. 可接受的成本范围
4. 对质量的要求

我会根据您的具体情况提供定制化的优化方案。
