# Nova-Mind 自动化部署指南

> 一键部署 Nova-Mind 免费版本到 Vercel，5 分钟内完成！

## 🚀 快速开始

### 方式 1：使用 Node.js 向导（推荐）

```bash
node scripts/deploy-wizard.js
```

这个交互式向导会：
1. ✅ 检查所有前置条件
2. ✅ 引导你配置 DeepSeek API 密钥
3. ✅ 帮你选择模型策略
4. ✅ 自动安装依赖
5. ✅ 自动构建项目
6. ✅ 自动部署到 Vercel

### 方式 2：使用 Bash 脚本

```bash
bash scripts/deploy-now.sh
```

这个脚本提供了相同的功能，但使用 Bash 实现。

## 📋 前置条件

在运行部署脚本之前，请确保已安装以下工具：

- **Node.js** (v14+) - [下载](https://nodejs.org)
- **npm** (v6+) - 通常与 Node.js 一起安装
- **git** - [下载](https://git-scm.com)

验证安装：
```bash
node --version
npm --version
git --version
```

## 🔑 获取 DeepSeek API 密钥

1. 访问 [DeepSeek 平台](https://platform.deepseek.com)
2. 使用邮箱或手机注册账户
3. 进入 "API Keys" 页面
4. 点击 "Create New Secret Key"
5. 复制生成的 API 密钥（格式：`sk-...`）

**重要**：保管好你的 API 密钥，不要分享给他人！

## 📊 部署选项

### 模型策略

部署时，你需要选择一个模型策略：

| 策略 | 说明 | 适用场景 |
|------|------|---------|
| **cost** | 优先使用便宜的模型 | 日常对话、信息查询 |
| **quality** | 优先使用高质量的模型 | 复杂任务、创意生成 |
| **balanced** | 轮流使用不同模型 | 平衡成本和质量 |

**推荐**：选择 `cost` 以获得最佳的成本效益。

## 🔍 部署检查

在部署之前，你可以运行检查脚本来验证所有配置：

```bash
node scripts/check-deployment.js
```

这个脚本会检查：
- ✅ 环境工具（Node.js, npm, git, Vercel CLI）
- ✅ 必要的文件
- ✅ 环境变量配置
- ✅ 项目构建状态
- ✅ Vercel 连接状态

## 📝 环境变量

部署脚本会自动创建 `.env.local` 文件，包含以下变量：

```env
# 必需
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
MODEL_STRATEGY=cost
IS_FREE_VERSION=true

# 可选
MONTHLY_COST_BUDGET=100
FREE_VERSION_DAILY_LIMIT=50
FREE_VERSION_MONTHLY_LIMIT=1000
ENABLE_COST_TRACKING=true
ENABLE_GUARDRAILS=true
ENABLE_AUTO_OPTIMIZATION=true
```

## 🎯 部署步骤详解

### 步骤 1：检查前置条件

脚本会验证你是否已安装所有必要的工具。

如果缺少任何工具，请先安装：
- Node.js: https://nodejs.org
- git: https://git-scm.com

### 步骤 2：配置 DeepSeek API

输入你从 DeepSeek 平台获取的 API 密钥。

**格式验证**：密钥应该以 `sk-` 开头。

### 步骤 3：选择模型策略

选择一个适合你的模型策略：
- `1` = cost（推荐）
- `2` = quality
- `3` = balanced

### 步骤 4：创建环境变量文件

脚本会自动创建 `.env.local` 文件，包含你的配置。

**注意**：`.env.local` 包含敏感信息，不要提交到 Git！

### 步骤 5：安装依赖

脚本会运行 `npm install` 来安装所有项目依赖。

这可能需要几分钟，请耐心等待。

### 步骤 6：构建项目

脚本会运行 `npm run build` 来构建项目。

构建输出会保存在 `dist` 目录中。

### 步骤 7：安装 Vercel CLI

脚本会全局安装 Vercel CLI（如果还没有安装）。

### 步骤 8：登录 Vercel

脚本会打开浏览器，引导你登录 Vercel 账户。

如果你还没有 Vercel 账户，可以在登录页面注册。

### 步骤 9：部署到 Vercel

脚本会自动部署你的应用到 Vercel 生产环境。

部署完成后，你会看到一个 URL，这就是你的 Nova-Mind 应用地址。

## ✅ 验证部署

部署完成后，你可以：

1. 访问部署的 URL
2. 查看应用是否正常运行
3. 测试和 Nova-Mind 的对话功能

## 🔧 故障排查

### 问题：脚本无法运行

**解决方案**：
```bash
# 确保脚本有执行权限
chmod +x scripts/deploy-now.sh

# 或者使用 Node.js 运行
node scripts/deploy-wizard.js
```

### 问题：npm install 失败

**解决方案**：
```bash
# 清除 npm 缓存
npm cache clean --force

# 重新安装
npm install
```

### 问题：Vercel 登录失败

**解决方案**：
```bash
# 使用 Vercel CLI 手动登录
vercel login

# 然后重新运行部署脚本
node scripts/deploy-wizard.js
```

### 问题：DeepSeek API 返回错误

**解决方案**：
1. 检查 API 密钥是否正确
2. 检查免费额度是否用完
3. 查看 [DeepSeek 文档](https://platform.deepseek.com/docs)

## 📚 更多资源

- [完整部署指南](./VERCEL_DEPLOYMENT.md)
- [快速启动指南](./QUICK_START_GUIDE.md)
- [混合部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)
- [成本优化指南](./COST_OPTIMIZATION_GUIDE.md)

## 🆘 需要帮助？

如果你遇到问题，可以：

1. 查看 [故障排查指南](./VERCEL_DEPLOYMENT.md#-故障排查)
2. 查看 [Vercel 文档](https://vercel.com/docs)
3. 查看 [DeepSeek 文档](https://platform.deepseek.com/docs)
4. 提交 Issue 到 [GitHub 仓库](https://github.com/lvruyi0102/nova_mind_chat)

## 🎉 下一步

部署完成后，你可以：

1. ✅ 访问你的 Nova-Mind 应用
2. 📝 配置 GitHub Actions 月度整合
3. 💬 开始和 Nova-Mind 对话
4. 📊 监控成本和性能

**祝你使用愉快！** 🚀
