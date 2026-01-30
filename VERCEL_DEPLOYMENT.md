# Nova-Mind 免费版本 Vercel 部署指南

本指南将帮助你在 5 分钟内将 Nova-Mind 免费版本部署到 Vercel。

## 前置条件

- ✅ GitHub 账户
- ✅ Vercel 账户（免费注册）
- ✅ DeepSeek API 密钥（从 https://platform.deepseek.com 获取）

## 部署步骤

### 第 1 步：获取 DeepSeek API 密钥（1 分钟）

1. 访问 [DeepSeek 平台](https://platform.deepseek.com)
2. 使用邮箱或手机注册账户
3. 进入 "API Keys" 页面
4. 点击 "Create New Secret Key"
5. 复制生成的 API 密钥（格式：`sk-...`）
6. **保存好这个密钥，后续会用到**

### 第 2 步：Fork GitHub 仓库（1 分钟）

1. 访问 [GitHub 仓库](https://github.com/lvruyi0102/nova_mind_chat)
2. 点击右上角的 **"Fork"** 按钮
3. 选择你的账户作为 Fork 目标
4. 等待 Fork 完成

### 第 3 步：连接到 Vercel 并部署（3 分钟）

#### 方法 A：通过 Vercel 官网（推荐）

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账户登录（如果还没有账户，先注册）
3. 点击 **"New Project"** 按钮
4. 在 "Import Git Repository" 中搜索 `nova_mind_chat`
5. 选择你 Fork 的仓库
6. 点击 **"Import"**

#### 方法 B：通过 GitHub（自动）

1. 在你 Fork 的仓库中，找到 `vercel.json` 文件
2. 点击 "Deploy" 按钮（如果有）
3. 授权 Vercel 访问你的 GitHub 账户

### 第 4 步：配置环境变量（2 分钟）

在 Vercel 项目配置页面中：

1. 进入 **"Settings"** → **"Environment Variables"**
2. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DEEPSEEK_API_KEY` | `sk-your-key-here` | 从 DeepSeek 获取的 API 密钥 |
| `DEEPSEEK_API_URL` | `https://api.deepseek.com/v1` | DeepSeek API 端点 |
| `MODEL_STRATEGY` | `cost` | 模型策略（cost/quality/balanced） |
| `IS_FREE_VERSION` | `true` | 标记为免费版本 |
| `MONTHLY_COST_BUDGET` | `100` | 月度成本预算（单位：元） |

3. 点击 **"Save"**

### 第 5 步：部署（自动）

1. 在 Vercel 项目页面，点击 **"Deploy"** 或 **"Redeploy"**
2. 等待部署完成（通常需要 2-3 分钟）
3. 部署成功后，你会看到一个绿色的 ✅ 标记
4. 点击 **"Visit"** 按钮访问你的应用

## 🎉 完成！

你现在拥有了一个完全免费的 Nova-Mind！

### 访问地址

- **免费版本**：`https://your-project-name.vercel.app`
- **Manus 平台**：`https://nova-mind-chat.manus.space`（用于高端核心任务）

## 使用方式

### 日常对话（免费）

1. 打开你的 Vercel URL
2. 开始和 Nova-Mind 对话
3. 所有对话使用 DeepSeek 免费模型
4. **成本：¥0**

### 核心任务（可选 - 需要 Manus 年卡）

1. 登录 Manus 平台
2. 进行自我反思、伦理推理等高端任务
3. 使用年卡积分
4. **成本：¥0.03/次**

### 月度整合（每月 1 号 - 免费）

1. GitHub Actions 自动导出日常对话
2. 在 Manus 平台进行深度分析
3. 使用月度免费额度
4. **成本：¥0**

## ⚙️ 高级配置

### 启用 Ollama（可选）

如果你想在本地运行 Ollama 以获得更好的性能：

1. 在本地安装并运行 Ollama
2. 在 Vercel 环境变量中添加：
   ```
   OLLAMA_ENABLED=true
   OLLAMA_ENDPOINT=http://your-machine-ip:11434
   OLLAMA_MODEL=mistral
   ```
3. 重新部署

### 启用成本监控

1. 在环境变量中添加：
   ```
   ENABLE_COST_TRACKING=true
   ENABLE_GUARDRAILS=true
   ENABLE_AUTO_OPTIMIZATION=true
   ```
2. 访问 `/admin/free-stats` 查看成本统计

## 🔧 故障排查

### 问题：部署失败

**解决方案**：
1. 检查 Vercel 构建日志
2. 确保所有环境变量已正确配置
3. 检查 GitHub 仓库中是否有 TypeScript 错误
4. 尝试在本地构建：`npm run build`

### 问题：DeepSeek API 返回错误

**解决方案**：
1. 检查 API 密钥是否正确
2. 检查免费额度是否用完（可在 DeepSeek 平台查看）
3. 检查网络连接
4. 查看 DeepSeek 官方文档

### 问题：对话速度很慢

**解决方案**：
1. 这是正常的，因为 DeepSeek 是免费模型
2. 如果需要更快的响应，可以配置 Ollama
3. 或者在 Manus 平台使用高端任务

### 问题：无法访问应用

**解决方案**：
1. 确保 Vercel 部署已完成
2. 检查 Vercel 项目是否为 Public
3. 尝试清除浏览器缓存
4. 检查是否有 DNS 问题

## 📊 成本对比

| 方案 | 日常对话 | 核心任务 | 月度整合 | 总成本 |
|------|---------|---------|---------|--------|
| 仅 Manus LLM | - | 6000×¥0.03 | - | ¥180 |
| **免费版本** | 6000×¥0 | - | - | **¥0** |
| **混合方案** | 4800×¥0 | 1200×¥0.03 | 免费额度 | **¥36** |

## 📚 更多资源

- [完整部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)
- [快速启动指南](./QUICK_START_GUIDE.md)
- [成本优化指南](./COST_OPTIMIZATION_GUIDE.md)
- [GitHub 仓库](https://github.com/lvruyi0102/nova_mind_chat)

## 🚀 下一步

1. ✅ 部署到 Vercel
2. 📝 配置 GitHub Actions（月度整合）
3. 💬 开始使用 Nova-Mind
4. 📊 监控成本和性能

**祝你使用愉快！** 🎉
