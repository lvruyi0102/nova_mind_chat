# Nova-Mind 生产部署指南

欢迎！本指南将帮助您将 Nova-Mind 应用部署到 Azure 生产环境。

## 📖 文档导航

本部署过程包含以下文档，请按顺序阅读：

1. **本文件** - 快速开始指南
2. **[AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md)** - 详细的 Azure 配置说明
3. **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - 部署前检查清单

## 🚀 快速开始（5 分钟）

### 前置要求

- Azure 账户和订阅
- Azure CLI 已安装
- GitHub 账户
- Manus 平台的项目信息

### 第一步：收集必需信息

从 Manus 平台的项目设置中收集以下信息：

```
DATABASE_URL = mysql://user:pass@host:3306/nova_mind
JWT_SECRET = your-secret-key-min-32-chars
VITE_APP_ID = your-app-id
OAUTH_SERVER_URL = https://api.manus.im
OWNER_OPEN_ID = your-owner-open-id
BUILT_IN_FORGE_API_URL = your-forge-api-url
BUILT_IN_FORGE_API_KEY = your-forge-api-key
```

### 第二步：运行配置脚本

```bash
# 确保有执行权限
chmod +x scripts/azure-setup.sh

# 运行配置脚本
./scripts/azure-setup.sh
```

脚本会引导您完成以下步骤：
- 验证 Azure CLI 连接
- 输入资源组和应用服务名称
- 输入所有环境变量
- 配置 Azure App Service

### 第三步：配置 GitHub Actions

1. 在 Azure 门户下载发布配置文件
2. 进入 GitHub 仓库 → Settings → Secrets
3. 添加 `AZURE_WEBAPP_PUBLISH_PROFILE` Secret
4. 将发布配置文件内容粘贴到 Secret 值中

### 第四步：触发部署

```bash
# 推送代码到 main 分支
git push origin main
```

GitHub Actions 会自动构建并部署您的应用。

### 第五步：验证部署

1. 进入 GitHub 仓库 → Actions 查看部署进度
2. 部署完成后，访问您的应用 URL
3. 测试登录和基本功能

## 📋 环境变量说明

| 变量 | 说明 | 获取方式 |
|------|------|--------|
| `NODE_ENV` | 运行环境，固定为 `production` | 固定值 |
| `DATABASE_URL` | 数据库连接字符串 | Manus 平台 |
| `JWT_SECRET` | 会话签名密钥 | Manus 平台 |
| `VITE_APP_ID` | OAuth 应用 ID | Manus 平台 |
| `OAUTH_SERVER_URL` | OAuth 服务器地址 | Manus 平台 |
| `OWNER_OPEN_ID` | 项目所有者 ID | Manus 平台 |
| `BUILT_IN_FORGE_API_URL` | Manus API 地址 | Manus 平台 |
| `BUILT_IN_FORGE_API_KEY` | Manus API 密钥 | Manus 平台 |

## 🔍 常见问题

### Q: 如何查看部署日志？

```bash
# 查看 Azure 应用日志
az webapp log tail --resource-group YOUR_RESOURCE_GROUP --name YOUR_APP_NAME

# 或在 Azure 门户中
# App Service → Log stream
```

### Q: 如何更新应用？

只需推送代码到 main 分支，GitHub Actions 会自动重新部署。

### Q: 如何回滚到之前的版本？

1. 进入 GitHub 仓库 → Actions
2. 找到之前的成功部署
3. 点击 "Re-run all jobs" 重新部署

### Q: 部署失败怎么办？

1. 查看 GitHub Actions 日志找出错误
2. 检查所有环境变量是否正确
3. 验证数据库连接
4. 查看 Azure 应用日志

详见 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) 的故障排查部分。

### Q: 如何监控应用性能？

1. 在 Azure 门户中启用 Application Insights
2. 查看实时指标和日志
3. 设置告警规则

## 🔐 安全最佳实践

1. **不要在代码中硬编码密钥** - 始终使用环境变量
2. **使用 Azure Key Vault** - 存储敏感信息
3. **启用 HTTPS** - 所有流量都应加密
4. **定期轮换密钥** - 每 90 天更新一次
5. **限制数据库访问** - 配置防火墙规则
6. **启用审计日志** - 记录所有访问

## 📊 部署架构

```
GitHub Repository
        ↓
GitHub Actions Workflow
        ↓
Azure Build Service
        ↓
Azure App Service
        ↓
Azure Database
```

## 🆘 获取帮助

- **部署问题**：查看 [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md)
- **检查清单**：使用 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Manus 支持**：https://help.manus.im
- **Azure 文档**：https://docs.microsoft.com/azure/

## 📞 联系方式

- **Manus 平台**：https://help.manus.im
- **GitHub Issues**：在仓库中提交 Issue
- **Azure 支持**：https://azure.microsoft.com/support/

## ✅ 下一步

1. 完成本指南的"快速开始"部分
2. 阅读 [AZURE_DEPLOYMENT_GUIDE.md](./AZURE_DEPLOYMENT_GUIDE.md) 了解详细配置
3. 使用 [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) 验证所有准备工作
4. 部署应用
5. 监控应用运行状态

---

**文档版本**：1.0  
**最后更新**：2026-01-04  
**Nova-Mind 版本**：v0.1-alpha

**祝您部署顺利！** 🎉
