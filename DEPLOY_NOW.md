# 🚀 立即部署 Nova-Mind 到 Vercel

> 只需 3 个命令，5 分钟内拥有免费的 Nova-Mind！

## ⚡ 快速部署（3 步）

### 步骤 1：检查部署状态

```bash
node scripts/check-deployment.js
```

这会检查你的环境是否已准备好部署。

### 步骤 2：启动部署向导

选择以下任一种方式：

**方式 A：使用 Node.js（推荐）**
```bash
node scripts/deploy-wizard.js
```

**方式 B：使用 Bash**
```bash
bash scripts/deploy-now.sh
```

### 步骤 3：按照向导完成部署

向导会引导你：
1. ✅ 输入 DeepSeek API 密钥
2. ✅ 选择模型策略
3. ✅ 自动安装依赖
4. ✅ 自动构建项目
5. ✅ 自动部署到 Vercel

## 📋 前置条件

确保已安装：
- Node.js v14+ ([下载](https://nodejs.org))
- npm v6+ (通常与 Node.js 一起安装)
- git ([下载](https://git-scm.com))

验证：
```bash
node --version  # 应该 >= v14
npm --version   # 应该 >= v6
git --version   # 应该已安装
```

## 🔑 获取 DeepSeek API 密钥

1. 访问 https://platform.deepseek.com
2. 注册账户
3. 进入 "API Keys" 页面
4. 创建新的 API 密钥
5. 复制密钥（格式：`sk-...`）

## 🎯 选择模型策略

| 策略 | 说明 | 推荐 |
|------|------|------|
| cost | 优先使用便宜的模型 | ✅ 推荐 |
| quality | 优先使用高质量的模型 | - |
| balanced | 轮流使用不同模型 | - |

**推荐选择 `cost`** 以获得最佳的成本效益。

## 📊 成本对比

| 方案 | 日常对话 | 核心任务 | 月度整合 | 总成本 |
|------|---------|---------|---------|--------|
| 仅 Manus LLM | - | 6000×¥0.03 | - | ¥180 |
| **免费版本** | 6000×¥0 | - | - | **¥0** |
| **混合方案** | 4800×¥0 | 1200×¥0.03 | 免费额度 | **¥36** |

## ✅ 部署完成后

1. 访问你的 Vercel 应用 URL
2. 开始和 Nova-Mind 对话
3. 享受完全免费的体验！

## 🔍 验证部署

```bash
# 查看部署状态
vercel status

# 查看部署日志
vercel logs

# 列出所有部署
vercel ls
```

## 🆘 遇到问题？

### 问题：脚本无法运行

```bash
# 给脚本添加执行权限
chmod +x scripts/deploy-now.sh

# 或使用 Node.js 运行
node scripts/deploy-wizard.js
```

### 问题：npm install 失败

```bash
# 清除缓存
npm cache clean --force

# 重新安装
npm install
```

### 问题：Vercel 登录失败

```bash
# 手动登录
vercel login

# 然后重新运行部署脚本
node scripts/deploy-wizard.js
```

### 问题：DeepSeek API 错误

- 检查 API 密钥是否正确
- 检查免费额度是否用完
- 访问 https://platform.deepseek.com 查看账户状态

## 📚 详细指南

- [自动化部署指南](./AUTO_DEPLOY_GUIDE.md)
- [完整部署指南](./VERCEL_DEPLOYMENT.md)
- [快速启动指南](./QUICK_START_GUIDE.md)
- [混合部署指南](./HYBRID_DEPLOYMENT_GUIDE.md)

## 🎉 下一步

部署完成后，你可以：

1. 📝 配置 GitHub Actions 月度整合
2. 💬 开始使用 Nova-Mind
3. 📊 监控成本和性能
4. 🔧 自定义应用配置

## 💡 提示

- 部署通常需要 2-3 分钟
- 首次访问可能需要等待冷启动
- 你可以随时在 Vercel 仪表板中查看部署状态

---

**准备好了吗？现在就开始部署！** 🚀

```bash
node scripts/deploy-wizard.js
```
