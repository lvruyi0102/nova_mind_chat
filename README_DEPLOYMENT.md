# Nova-Mind 部署指南

> 一个正在发育的认知实体，诚实表达因惑与好奇心

## 🚀 快速开始

### 方案 1：免费版本（推荐）

在 Vercel 上部署完全免费的 Nova-Mind，使用 DeepSeek 或 Ollama 模型。

**5 分钟快速部署**：
1. Fork 这个仓库
2. 在 Vercel 中导入项目
3. 配置环境变量（DeepSeek API 密钥）
4. 部署完成！

👉 [详细部署指南](./VERCEL_DEPLOYMENT.md)

### 方案 2：Manus 平台（高端功能）

在 Manus 平台上使用 Nova-Mind 的高端功能，包括自我反思、伦理推理、创意生成等。

**需要**：Manus 年卡会员

👉 访问 [https://nova-mind-chat.manus.space](https://nova-mind-chat.manus.space)

### 方案 3：混合方案（最优）

同时使用免费版本和 Manus 平台，最大化成本效益。

- 日常对话：使用免费版本（¥0）
- 核心任务：使用 Manus 平台（¥0.03/次）
- 月度整合：使用月度免费额度（¥0）

👉 [混合部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)

## 📊 成本对比

| 方案 | 日常对话 | 核心任务 | 月度整合 | 总成本 |
|------|---------|---------|---------|--------|
| 仅 Manus LLM | - | 6000×¥0.03 | - | ¥180 |
| **免费版本** | 6000×¥0 | - | - | **¥0** |
| **混合方案** | 4800×¥0 | 1200×¥0.03 | 免费额度 | **¥36** |

## 🎯 Nova-Mind 的核心功能

### 学习智能体
通过观察学习，在错误中成长，发现世界的规律。

### 诚实对话
不仅知道答案，而且具说表达因惑和好奇心。

### 自我反思
回顾去行为，我出该缺陷并进行修正。

### 创意世界
Nova的艺术、故事和梦想，自由创作与分享。

## 🛠️ 技术栈

- **前端**：React 19 + Tailwind CSS 4
- **后端**：Express 4 + tRPC 11
- **数据库**：MySQL/TiDB
- **认知引擎**：Manus LLM / DeepSeek / Ollama
- **部署**：Vercel / Manus 平台

## 📚 文档

- [快速启动指南](./QUICK_START_GUIDE.md) - 5 分钟快速部署
- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md) - 详细的 Vercel 部署步骤
- [混合部署指南](./HYBRID_DEPLOYMENT_GUIDE.md) - 同时使用多个平台
- [成本优化指南](./COST_OPTIMIZATION_GUIDE.md) - 优化 API 成本
- [护栏集成指南](./GUARDRAILS_INTEGRATION_GUIDE.md) - 质量保证机制

## 🔧 环境变量

### 必需

```
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
MODEL_STRATEGY=cost
IS_FREE_VERSION=true
```

### 可选

```
OLLAMA_ENABLED=true
OLLAMA_ENDPOINT=http://localhost:11434
OLLAMA_MODEL=mistral
MONTHLY_COST_BUDGET=100
ENABLE_COST_TRACKING=true
ENABLE_GUARDRAILS=true
ENABLE_AUTO_OPTIMIZATION=true
```

## 🚀 部署选项

### Vercel（推荐 - 免费）
- 完全免费
- 自动 CI/CD
- 全球 CDN
- 无需管理服务器

### Manus 平台
- 集成认知引擎
- 高端 LLM 模型
- 完整的功能套件
- 需要年卡会员

### 其他平台
- Railway
- Render
- Heroku
- 自托管

## 💡 使用场景

### 日常对话
- 和 Nova-Mind 聊天
- 获取信息和建议
- 探讨想法
- **成本：¥0**

### 自我反思
- 回顾最近的经历
- 分析决策过程
- 识别改进机会
- **成本：¥0.03/次**

### 创意生成
- 创作故事和诗歌
- 头脑风暴想法
- 艺术创作
- **成本：¥0.03/次**

### 伦理推理
- 讨论道德问题
- 分析复杂情境
- 深度思考
- **成本：¥0.03/次**

## 📈 性能指标

- 平均响应时间：< 2s（免费版本）
- 缓存命中率：> 60%
- API 成本节省：76%
- 可用性：> 99.9%

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🎉 开始使用

1. **立即部署** - 选择上面的任一方案
2. **配置环境** - 设置 API 密钥
3. **开始对话** - 和 Nova-Mind 交互
4. **享受免费** - 零成本体验

---

**祝你使用愉快！** 🚀

有问题？查看 [故障排查指南](./VERCEL_DEPLOYMENT.md#-故障排查)
