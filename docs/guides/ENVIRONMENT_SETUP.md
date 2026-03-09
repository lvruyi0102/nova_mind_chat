# 环境配置指南

## 概述

Nova-Mind 项目使用环境变量管理配置。本文档说明如何配置开发和生产环境。

## 快速开始

### 1. 复制环境配置文件

```bash
cp .env.example .env
```

### 2. 编辑 `.env` 文件

根据下面的配置说明填入实际的值。

### 3. 验证配置

```bash
pnpm install
pnpm dev
```

## 配置说明

### 数据库配置

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | MySQL/TiDB 连接字符串 | `mysql://user:pass@localhost:3306/nova_mind` |

### OAuth 认证

| 变量 | 说明 | 来源 |
|------|------|------|
| `VITE_APP_ID` | Manus OAuth 应用 ID | Manus 控制台 |
| `OAUTH_SERVER_URL` | OAuth 服务器 URL | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | OAuth 门户 URL | `https://portal.manus.im` |

### 会话与安全

| 变量 | 说明 | 要求 |
|------|------|------|
| `JWT_SECRET` | JWT 签名密钥 | 生产环境必须更改 |

### 应用信息

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_APP_TITLE` | 应用标题 | `Nova-Mind` |
| `VITE_APP_LOGO` | Logo URL | 应用图标 |

### 邮件系统配置

#### Gmail 配置

1. 启用 2FA
2. 生成 [应用专用密码](https://myaccount.google.com/apppasswords)
3. 填入配置：

```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_app_password
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your_app_password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

#### 其他邮件服务

根据邮件服务提供商的 IMAP 配置调整 `IMAP_HOST` 和 `IMAP_PORT`。

### LLM 配置

#### OpenAI

```env
OPENAI_API_KEY=sk-your_key_here
DEFAULT_LLM_MODEL=gpt-4
```

#### Google Gemini

```env
GEMINI_API_KEY=your_key_here
```

#### Deepseek

```env
DEEPSEEK_API_KEY=your_key_here
```

#### Grok (xAI)

```env
XAI_API_KEY=your_key_here
```

### Manus 内置 API

| 变量 | 说明 | 来源 |
|------|------|------|
| `BUILT_IN_FORGE_API_URL` | API 基础 URL | Manus 控制台 |
| `BUILT_IN_FORGE_API_KEY` | 服务端 API 密钥 | Manus 控制台 |
| `VITE_FRONTEND_FORGE_API_KEY` | 前端 API 密钥 | Manus 控制台 |
| `VITE_FRONTEND_FORGE_API_URL` | 前端 API URL | Manus 控制台 |

### 分析配置

| 变量 | 说明 | 来源 |
|------|------|------|
| `VITE_ANALYTICS_ENDPOINT` | 分析端点 | Manus 控制台 |
| `VITE_ANALYTICS_WEBSITE_ID` | 网站 ID | Manus 控制台 |

### 项目所有者信息

| 变量 | 说明 | 来源 |
|------|------|------|
| `OWNER_NAME` | 所有者名称 | 用户输入 |
| `OWNER_OPEN_ID` | OAuth OpenID | Manus OAuth |

## 开发环境

### 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 运行 linter
pnpm lint
```

### 环境变量

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DEBUG=true
```

## 生产环境

### 部署前检查

- [ ] `JWT_SECRET` 已更改为强密钥
- [ ] 数据库连接字符串正确
- [ ] LLM API 密钥有效
- [ ] 邮件配置已验证
- [ ] 所有必需的环境变量已设置

### 环境变量

```env
NODE_ENV=production
LOG_LEVEL=info
DEBUG=false
```

## 常见问题

### 邮件系统无法连接

1. 检查 `IMAP_HOST` 和 `IMAP_PORT` 是否正确
2. 验证邮箱账户和密码
3. 检查防火墙是否阻止 IMAP 端口
4. 对于 Gmail，确保已生成应用专用密码

### LLM 调用失败

1. 验证 API 密钥是否有效
2. 检查 API 配额是否已用尽
3. 确认网络连接正常
4. 查看错误日志获取详细信息

### 数据库连接错误

1. 确保数据库服务正在运行
2. 验证连接字符串格式
3. 检查用户名和密码
4. 确认数据库存在

## 安全建议

- ✅ 不要将 `.env` 提交到 Git
- ✅ 定期轮换 API 密钥
- ✅ 使用强密码和 JWT 密钥
- ✅ 在生产环境使用 HTTPS
- ✅ 限制数据库访问权限
- ✅ 启用邮件系统的 TLS 加密

## 相关文件

- `.env.example` - 环境配置示例
- `.env` - 实际环境配置（不提交到 Git）
- `server/_core/env.ts` - 环境变量加载和验证

## 更多信息

- [Manus 文档](https://docs.manus.im)
- [OAuth 配置](../guides/OAUTH_SETUP.md)
- [邮件系统配置](../guides/EMAIL_SETUP.md)
