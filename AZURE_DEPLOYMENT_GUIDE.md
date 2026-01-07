# Nova-Mind Azure 部署指南

本指南帮助您为 Azure 应用服务配置所有必需的环境变量，完成首次生产环境部署。

## 📋 必需的环境变量清单

### 核心配置变量

| 环境变量 | 说明 | 示例值 | 来源 |
|---------|------|-------|------|
| `NODE_ENV` | 运行环境 | `production` | 固定值 |
| `PORT` | 应用监听端口 | `3000` | Azure 自动设置 |
| `DATABASE_URL` | 数据库连接字符串 | `mysql://user:pass@host:3306/nova_mind` | Manus 平台提供 |
| `JWT_SECRET` | 会话 Cookie 签名密钥 | `your-secret-key-min-32-chars` | Manus 平台提供 |

### OAuth 认证变量

| 环境变量 | 说明 | 示例值 | 来源 |
|---------|------|-------|------|
| `VITE_APP_ID` | Manus OAuth 应用 ID | `your-app-id` | Manus 平台提供 |
| `OAUTH_SERVER_URL` | Manus OAuth 服务器地址 | `https://api.manus.im` | Manus 平台提供 |
| `OWNER_OPEN_ID` | 项目所有者的 OpenID | `your-owner-open-id` | Manus 平台提供 |

### Manus 内置 API 变量

| 环境变量 | 说明 | 示例值 | 来源 |
|---------|------|-------|------|
| `BUILT_IN_FORGE_API_URL` | Manus 内置 API 地址 | `https://forge.manus.im` | Manus 平台提供 |
| `BUILT_IN_FORGE_API_KEY` | Manus 内置 API 密钥 | `your-forge-api-key` | Manus 平台提供 |

### 前端特定变量（自动注入）

| 环境变量 | 说明 | 来源 |
|---------|------|------|
| `VITE_OAUTH_PORTAL_URL` | OAuth 登录门户 URL | Manus 平台自动提供 |
| `VITE_FRONTEND_FORGE_API_URL` | 前端 API URL | Manus 平台自动提供 |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端 API 密钥 | Manus 平台自动提供 |
| `VITE_APP_TITLE` | 应用标题 | Manus 平台自动提供 |
| `VITE_APP_LOGO` | 应用 Logo URL | Manus 平台自动提供 |
| `VITE_ANALYTICS_ENDPOINT` | 分析服务端点 | Manus 平台自动提供 |
| `VITE_ANALYTICS_WEBSITE_ID` | 分析网站 ID | Manus 平台自动提供 |

---

## 🔧 Azure 配置步骤

### 步骤 1：获取所有环境变量值

在 Manus 平台的项目设置中，找到以下信息：

1. 打开 Manus 项目管理面板
2. 进入 **Settings → Secrets** 
3. 复制以下变量的值：
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `VITE_APP_ID`
   - `OAUTH_SERVER_URL`
   - `OWNER_OPEN_ID`
   - `BUILT_IN_FORGE_API_URL`
   - `BUILT_IN_FORGE_API_KEY`

### 步骤 2：在 Azure 中配置应用设置

#### 方法 A：使用 Azure 门户 UI

1. 登录 [Azure 门户](https://portal.azure.com)
2. 找到您的应用服务 (App Service)
3. 在左侧菜单中选择 **Configuration**
4. 点击 **+ New application setting** 添加每个环境变量
5. 输入变量名和值，点击 **OK**
6. 点击 **Save** 保存所有更改

#### 方法 B：使用 Azure CLI（推荐）

```bash
# 登录 Azure
az login

# 设置订阅
az account set --subscription "YOUR_SUBSCRIPTION_ID"

# 设置应用设置（批量）
az webapp config appsettings set \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_APP_NAME \
  --settings \
    NODE_ENV=production \
    DATABASE_URL="your-database-url" \
    JWT_SECRET="your-jwt-secret" \
    VITE_APP_ID="your-app-id" \
    OAUTH_SERVER_URL="https://api.manus.im" \
    OWNER_OPEN_ID="your-owner-open-id" \
    BUILT_IN_FORGE_API_URL="your-forge-api-url" \
    BUILT_IN_FORGE_API_KEY="your-forge-api-key"
```

### 步骤 3：验证配置

```bash
# 查看所有应用设置
az webapp config appsettings list \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_APP_NAME
```

---

## 🚀 部署流程

### 使用 GitHub Actions 自动部署

1. **准备发布配置文件**
   - 在 Azure 门户中下载您的应用服务的发布配置文件
   - 将其保存为 GitHub Secret `AZURE_WEBAPP_PUBLISH_PROFILE`

2. **配置 GitHub Secrets**
   - 进入 GitHub 仓库 → Settings → Secrets and variables → Actions
   - 添加 `AZURE_WEBAPP_PUBLISH_PROFILE` Secret

3. **触发自动部署**
   - 推送代码到 main 分支
   - GitHub Actions 工作流会自动构建并部署到 Azure

### 手动部署

```bash
# 使用 Azure CLI 部署
az webapp deployment source config-zip \
  --resource-group YOUR_RESOURCE_GROUP \
  --name YOUR_APP_NAME \
  --src path/to/your/app.zip
```

---

## ✅ 部署前检查清单

- [ ] 所有环境变量已在 Azure 中配置
- [ ] 数据库连接字符串正确且可访问
- [ ] JWT_SECRET 是安全的随机字符串（最少 32 字符）
- [ ] OAuth 配置与 Manus 平台一致
- [ ] 应用在本地开发环境中正常运行
- [ ] 所有依赖已安装（`pnpm install`）
- [ ] 构建成功（`pnpm build`）
- [ ] 没有 TypeScript 编译错误

---

## 🔍 常见问题排查

### 部署后应用无法启动

**症状**：Azure 应用服务显示"应用已停止"或返回 500 错误

**解决方案**：
1. 检查 Azure 应用服务日志：`az webapp log tail --resource-group YOUR_RESOURCE_GROUP --name YOUR_APP_NAME`
2. 确认所有环境变量已正确设置
3. 验证数据库连接字符串
4. 检查 Node.js 版本兼容性（建议 18.x 或更高）

### 数据库连接失败

**症状**：应用启动时出现"Cannot connect to database"错误

**解决方案**：
1. 检查 `DATABASE_URL` 格式是否正确
2. 确认数据库服务器允许来自 Azure 应用服务的连接
3. 验证数据库用户名和密码
4. 检查防火墙规则

### OAuth 登录失败

**症状**：用户无法通过 Manus OAuth 登录

**解决方案**：
1. 验证 `VITE_APP_ID` 和 `OAUTH_SERVER_URL` 正确
2. 确认 Azure 应用的公网 URL 已在 Manus 平台注册为回调 URL
3. 检查浏览器控制台是否有 CORS 错误

### 性能问题

**症状**：应用响应缓慢或经常超时

**解决方案**：
1. 升级 Azure 应用服务计划到更高的 SKU
2. 启用应用缓存
3. 优化数据库查询
4. 检查内存使用情况

---

## 📞 获取帮助

- **Manus 平台支持**：https://help.manus.im
- **Azure 文档**：https://docs.microsoft.com/azure/app-service/
- **GitHub Actions 文档**：https://docs.github.com/actions

---

## 🔐 安全建议

1. **不要在代码中硬编码敏感信息** - 始终使用环境变量
2. **定期轮换密钥** - 每 90 天更新一次 `JWT_SECRET` 和 API 密钥
3. **使用 HTTPS** - 确保所有通信都通过 HTTPS 加密
4. **限制数据库访问** - 配置防火墙规则只允许 Azure 应用服务访问
5. **启用应用日志** - 便于问题排查和安全审计

---

**最后更新**：2026-01-04  
**Nova-Mind 版本**：v0.1-alpha
