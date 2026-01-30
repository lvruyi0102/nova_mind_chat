# Nova-Mind Azure 部署前检查清单

使用此清单确保您的应用已为生产环境部署做好准备。

## ✅ 代码准备

- [ ] 所有代码已提交到 GitHub
- [ ] 没有敏感信息（密钥、密码）硬编码在代码中
- [ ] 所有环境变量都通过 `process.env` 访问
- [ ] `.gitignore` 包含 `.env` 和 `node_modules`
- [ ] `package.json` 中的依赖版本已锁定
- [ ] 构建脚本正常工作：`pnpm build`
- [ ] 没有 TypeScript 编译错误（或已记录已知错误）
- [ ] 测试通过：`pnpm test`（如果有）

## ✅ Azure 准备

- [ ] Azure 订阅已激活
- [ ] 资源组已创建
- [ ] App Service 已创建（建议使用 B1 或更高 SKU）
- [ ] App Service Plan 已配置
- [ ] 数据库服务已创建并可访问
- [ ] 应用已配置为 Node.js 18.x 或更高版本

## ✅ 环境变量配置

### 必需的环境变量

- [ ] `NODE_ENV` = `production`
- [ ] `DATABASE_URL` - 已验证连接字符串格式
- [ ] `JWT_SECRET` - 安全的随机字符串（最少 32 字符）
- [ ] `VITE_APP_ID` - 从 Manus 平台获取
- [ ] `OAUTH_SERVER_URL` - 通常是 `https://api.manus.im`
- [ ] `OWNER_OPEN_ID` - 从 Manus 平台获取
- [ ] `BUILT_IN_FORGE_API_URL` - 从 Manus 平台获取
- [ ] `BUILT_IN_FORGE_API_KEY` - 从 Manus 平台获取

### 验证环境变量

- [ ] 所有环境变量已在 Azure App Service 中配置
- [ ] 敏感信息已使用 Azure Key Vault（推荐）
- [ ] 环境变量值已验证（无拼写错误）
- [ ] 数据库连接已测试

## ✅ GitHub Actions 配置

- [ ] `.github/workflows/azure-webapps-node.yml` 已存在
- [ ] 发布配置文件已下载并保存为 GitHub Secret
- [ ] `AZURE_WEBAPP_PUBLISH_PROFILE` Secret 已添加到 GitHub
- [ ] 工作流文件中的应用名称正确
- [ ] 工作流文件中的资源组名称正确

## ✅ 数据库准备

- [ ] 数据库已创建
- [ ] 数据库用户已创建并授予适当权限
- [ ] 数据库连接字符串正确
- [ ] 防火墙规则允许 Azure App Service 连接
- [ ] 数据库迁移已运行：`pnpm db:push`
- [ ] 初始数据已导入（如需要）

## ✅ 安全检查

- [ ] HTTPS 已启用
- [ ] 自定义域已配置（如需要）
- [ ] SSL 证书已安装
- [ ] CORS 设置正确
- [ ] 敏感端点已保护（需要认证）
- [ ] 速率限制已配置
- [ ] 日志记录已启用

## ✅ 监控和日志

- [ ] Application Insights 已配置
- [ ] 应用日志已启用
- [ ] Web 服务器日志已启用
- [ ] 错误监控已设置
- [ ] 性能监控已设置
- [ ] 告警已配置

## ✅ 性能优化

- [ ] 静态资源已压缩
- [ ] 缓存策略已配置
- [ ] CDN 已启用（可选）
- [ ] 数据库查询已优化
- [ ] 连接池已配置

## ✅ 备份和恢复

- [ ] 数据库备份已配置
- [ ] 备份频率已设置（建议每日）
- [ ] 备份保留策略已设置
- [ ] 恢复流程已测试
- [ ] 灾难恢复计划已制定

## ✅ 最终验证

- [ ] 本地环境测试通过
- [ ] 所有依赖已安装
- [ ] 构建成功
- [ ] 应用在本地启动正常
- [ ] 所有功能已测试
- [ ] 没有控制台错误

## 🚀 部署步骤

### 第一次部署

1. 运行 Azure 配置脚本：
   ```bash
   ./scripts/azure-setup.sh
   ```

2. 推送代码到 GitHub main 分支：
   ```bash
   git push origin main
   ```

3. 监控 GitHub Actions 工作流进度

4. 部署完成后，访问应用 URL 验证

### 后续部署

只需推送代码到 main 分支，GitHub Actions 会自动部署。

## 📊 部署后检查

- [ ] 应用已启动
- [ ] 应用 URL 可访问
- [ ] OAuth 登录正常
- [ ] 数据库连接正常
- [ ] 所有功能正常工作
- [ ] 没有错误日志
- [ ] 性能指标正常

## 🆘 故障排查

如果部署失败，检查以下内容：

1. **查看 GitHub Actions 日志**
   - 进入 GitHub 仓库 → Actions
   - 查看失败的工作流日志

2. **查看 Azure 应用日志**
   ```bash
   az webapp log tail --resource-group YOUR_RESOURCE_GROUP --name YOUR_APP_NAME
   ```

3. **检查应用设置**
   ```bash
   az webapp config appsettings list --resource-group YOUR_RESOURCE_GROUP --name YOUR_APP_NAME
   ```

4. **重启应用**
   ```bash
   az webapp restart --resource-group YOUR_RESOURCE_GROUP --name YOUR_APP_NAME
   ```

## 📞 获取帮助

- **Manus 平台支持**：https://help.manus.im
- **Azure 文档**：https://docs.microsoft.com/azure/
- **GitHub 支持**：https://support.github.com

---

**检查清单版本**：1.0  
**最后更新**：2026-01-04  
**Nova-Mind 版本**：v0.1-alpha
