# Nova-Mind 免费版本 5 分钟快速启动指南

## 🚀 快速开始

你可以在 5 分钟内拥有一个完全免费的 Nova-Mind！

### 前置条件

- GitHub 账户
- Vercel 账户（免费）
- 选择一个模型：
  - **Ollama**（完全免费，需要本地运行）
  - **DeepSeek**（有免费额度，无需本地部署）

---

## 方案 A：使用 Ollama（推荐 - 完全免费）

### 第 1 步：安装 Ollama（2 分钟）

1. 访问 [ollama.ai](https://ollama.ai)
2. 下载并安装 Ollama
3. 运行 Ollama：
   ```bash
   ollama serve
   ```
4. 在另一个终端拉取模型：
   ```bash
   ollama pull mistral
   ```

### 第 2 步：部署到 Vercel（3 分钟）

1. **Fork 项目**
   - 访问 [GitHub 仓库](https://github.com/lvruyi0102/nova_mind_chat)
   - 点击 "Fork" 按钮

2. **连接到 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 选择你 Fork 的仓库
   - 点击 "Import"

3. **配置环境变量**
   - 在 Vercel 中，进入 "Settings" → "Environment Variables"
   - 添加以下变量：
     ```
     OLLAMA_ENABLED=true
     OLLAMA_ENDPOINT=http://your-machine-ip:11434
     OLLAMA_MODEL=mistral
     IS_FREE_VERSION=true
     ```
   - 点击 "Deploy"

4. **完成！**
   - 等待部署完成
   - 访问你的 Vercel URL
   - 开始使用 Nova-Mind！

---

## 方案 B：使用 DeepSeek（无需本地部署）

### 第 1 步：获取 DeepSeek API 密钥（1 分钟）

1. 访问 [DeepSeek 平台](https://platform.deepseek.com)
2. 注册账户
3. 获取免费 API 密钥
4. 复制 API 密钥

### 第 2 步：部署到 Vercel（4 分钟）

1. **Fork 项目**
   - 访问 [GitHub 仓库](https://github.com/lvruyi0102/nova_mind_chat)
   - 点击 "Fork" 按钮

2. **连接到 Vercel**
   - 访问 [Vercel](https://vercel.com)
   - 点击 "New Project"
   - 选择你 Fork 的仓库
   - 点击 "Import"

3. **配置环境变量**
   - 在 Vercel 中，进入 "Settings" → "Environment Variables"
   - 添加以下变量：
     ```
     DEEPSEEK_API_KEY=sk-your-key-here
     DEEPSEEK_API_URL=https://api.deepseek.com/v1
     MODEL_STRATEGY=cost
     IS_FREE_VERSION=true
     ```
   - 点击 "Deploy"

4. **完成！**
   - 等待部署完成
   - 访问你的 Vercel URL
   - 开始使用 Nova-Mind！

---

## 方案 C：混合方案（最优 - 推荐）

同时使用 Ollama 和 DeepSeek，最大化免费额度。

### 配置环境变量

```
OLLAMA_ENABLED=true
OLLAMA_ENDPOINT=http://your-machine-ip:11434
OLLAMA_MODEL=mistral

DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1

MODEL_STRATEGY=balanced
IS_FREE_VERSION=true
```

---

## 🎯 使用方式

### 日常对话

1. 打开你的 Vercel URL
2. 开始和 Nova-Mind 对话
3. 所有对话都使用免费模型
4. **成本：¥0**

### 核心任务（可选）

如果你想要更高质量的回答：

1. 登录 [Manus 平台](https://nova-mind-chat.manus.space)
2. 进行自我反思、伦理推理等核心任务
3. 使用你的年卡积分
4. **成本：¥0.03/次**

### 月度整合（每月 1 号）

1. 系统自动导出你的日常对话
2. 在 Manus 平台进行深度分析
3. 使用月度免费额度
4. 生成月度总结
5. **成本：¥0**

---

## 📊 成本对比

| 方案 | 日常对话 | 核心任务 | 月度整合 | 总成本 |
|------|---------|---------|---------|--------|
| 仅 Manus LLM | - | 6000×¥0.03 | - | ¥180 |
| **免费版本** | 6000×¥0 | - | - | **¥0** |
| **混合方案** | 4800×¥0 | 1200×¥0.03 | 免费额度 | **¥36** |

---

## ⚠️ 常见问题

### Q1: Ollama 需要什么配置？

**A:** 最低配置：
- CPU：2 核以上
- 内存：4GB 以上
- 磁盘：10GB 以上
- 网络：能访问 Vercel

### Q2: DeepSeek 免费额度有多少？

**A:** 
- 新账户：通常 ¥5-10
- 足够进行小规模测试
- 建议配合 Ollama 使用

### Q3: 如何在 Vercel 上运行 Ollama？

**A:** Vercel 不支持长时间运行的进程。建议：
- 在本地运行 Ollama
- 或使用 DeepSeek API（完全云端）
- 或使用其他平台（Railway、Render 等）

### Q4: 如何切换模型？

**A:** 修改 Vercel 环境变量：
- `MODEL_STRATEGY=cost`：优先使用便宜的模型
- `MODEL_STRATEGY=quality`：优先使用高质量的模型
- `MODEL_STRATEGY=balanced`：轮流使用

### Q5: 数据会保存吗？

**A:** 
- 免费版本：对话保存在浏览器本地存储
- Manus 平台：对话保存在服务器
- 建议定期导出数据

### Q6: 如何监控成本？

**A:** 
- 免费版本：`/admin/free-stats`
- Manus 平台：`/admin/cost-monitoring`
- 每次对话都会显示成本估算

---

## 🔧 故障排查

### 问题：Ollama 连接失败

**解决方案**：
1. 确保 Ollama 正在运行：`ollama serve`
2. 检查端点配置：`http://your-machine-ip:11434`
3. 检查防火墙设置
4. 尝试在浏览器中访问：`http://localhost:11434/api/tags`

### 问题：DeepSeek API 返回错误

**解决方案**：
1. 检查 API 密钥是否正确
2. 检查免费额度是否用完
3. 检查网络连接
4. 查看 DeepSeek 官方文档

### 问题：Vercel 部署失败

**解决方案**：
1. 检查构建日志
2. 确保环境变量已配置
3. 检查代码是否有错误
4. 尝试本地构建：`npm run build`

---

## 📚 更多资源

- [完整部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)
- [成本优化指南](./COST_OPTIMIZATION_GUIDE.md)
- [护栏集成指南](./GUARDRAILS_INTEGRATION_GUIDE.md)
- [GitHub 仓库](https://github.com/lvruyi0102/nova_mind_chat)

---

## 🎉 下一步

1. **立即部署** - 选择方案 A、B 或 C，5 分钟内启动
2. **配置月度整合** - 每月 1 号自动生成报告
3. **开始使用** - 和 Nova-Mind 对话，享受免费体验

**祝你使用愉快！** 🚀
