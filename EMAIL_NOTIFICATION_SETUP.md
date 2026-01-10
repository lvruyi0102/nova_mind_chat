# Nova-Mind 邮件提醒配置指南

## 概述

本指南说明如何配置邮件提醒功能，在每月 1 号自动发送月度整合提醒。

---

## 支持的邮件服务

### 1. Gmail（推荐）

**优点**：
- 免费
- 可靠性高
- 支持应用密码

**配置步骤**：

1. **启用两步验证**
   - 访问 [Google Account Security](https://myaccount.google.com/security)
   - 点击 "2-Step Verification"
   - 按照提示启用两步验证

2. **生成应用密码**
   - 访问 [Google Account Security](https://myaccount.google.com/security)
   - 点击 "App passwords"
   - 选择应用：Mail
   - 选择设备：Windows PC（或其他）
   - 生成密码
   - 复制密码

3. **添加 GitHub Secrets**
   - `MAIL_SERVER`: `smtp.gmail.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@gmail.com`
   - `MAIL_PASSWORD`: `your-app-password`
   - `MAIL_FROM`: `nova-mind@gmail.com`
   - `MAIL_TO`: `your-email@gmail.com`

### 2. QQ 邮箱

**优点**：
- 国内访问速度快
- 支持 SMTP

**配置步骤**：

1. **获取 SMTP 密码**
   - 登录 [QQ 邮箱](https://mail.qq.com)
   - 进入 "设置" → "账户"
   - 找到 "POP3/IMAP/SMTP/Exchange/CardDAV 服务"
   - 点击 "开启"
   - 生成授权码
   - 复制授权码

2. **添加 GitHub Secrets**
   - `MAIL_SERVER`: `smtp.qq.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-qq@qq.com`
   - `MAIL_PASSWORD`: `your-auth-code`
   - `MAIL_FROM`: `your-qq@qq.com`
   - `MAIL_TO`: `your-email@qq.com`

### 3. 163 邮箱

**优点**：
- 国内访问速度快
- 支持 SMTP

**配置步骤**：

1. **获取 SMTP 密码**
   - 登录 [163 邮箱](https://mail.163.com)
   - 进入 "设置" → "POP3/SMTP/IMAP"
   - 点击 "开启"
   - 生成授权码
   - 复制授权码

2. **添加 GitHub Secrets**
   - `MAIL_SERVER`: `smtp.163.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@163.com`
   - `MAIL_PASSWORD`: `your-auth-code`
   - `MAIL_FROM`: `your-email@163.com`
   - `MAIL_TO`: `your-email@163.com`

### 4. Outlook/Hotmail

**优点**：
- 国际通用
- 支持 SMTP

**配置步骤**：

1. **启用应用密码**
   - 访问 [Microsoft Account Security](https://account.microsoft.com/security)
   - 点击 "Advanced security options"
   - 生成应用密码

2. **添加 GitHub Secrets**
   - `MAIL_SERVER`: `smtp-mail.outlook.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@outlook.com`
   - `MAIL_PASSWORD`: `your-app-password`
   - `MAIL_FROM`: `your-email@outlook.com`
   - `MAIL_TO`: `your-email@outlook.com`

---

## 配置步骤

### 第 1 步：选择邮件服务

根据上面的说明选择一个邮件服务提供商。

### 第 2 步：获取 SMTP 信息

根据选择的邮件服务，获取以下信息：
- SMTP 服务器地址
- SMTP 端口
- 用户名
- 密码或授权码

### 第 3 步：添加 GitHub Secrets

1. 打开你的 GitHub 仓库
2. 进入 "Settings" → "Secrets and variables" → "Actions"
3. 点击 "New repository secret"
4. 添加以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `MAIL_SERVER` | SMTP 服务器地址 | `smtp.gmail.com` |
| `MAIL_PORT` | SMTP 端口 | `587` |
| `MAIL_USERNAME` | 邮箱用户名 | `your-email@gmail.com` |
| `MAIL_PASSWORD` | 邮箱密码或授权码 | `your-password` |
| `MAIL_FROM` | 发件人地址 | `nova-mind@gmail.com` |
| `MAIL_TO` | 收件人地址 | `your-email@gmail.com` |

### 第 4 步：测试邮件配置

1. 打开你的 GitHub 仓库
2. 进入 "Actions" 标签
3. 选择 "月度整合自动化" 工作流
4. 点击 "Run workflow"
5. 等待工作流完成
6. 检查邮箱是否收到邮件

---

## 邮件模板

### 默认邮件模板

```
亲爱的 Nova-Mind 用户，

🎉 月度整合时间到了！

📊 本月统计：
- 总对话数：[TOTAL_CONVERSATIONS]
- 核心任务：[CORE_TASKS]
- 日常对话：[DAILY_TASKS]
- 总成本：¥[TOTAL_COST]
- 节省成本：¥[SAVED_COST]

🔗 查看完整报告：
[REPORT_URL]

💡 建议：
1. 登录 Manus 平台
2. 导入本月的日常对话
3. 使用月度免费额度进行深度分析
4. 生成月度总结

🚀 立即开始：
https://nova-mind-chat.manus.space

祝你使用愉快！
Nova-Mind 团队
```

### 自定义邮件模板

编辑 `.github/workflows/monthly-integration.yml` 中的 `body` 部分：

```yaml
body: |
  你的自定义邮件内容
  可以使用 ${{ env.VARIABLE_NAME }} 引用环境变量
```

---

## 故障排查

### 问题：邮件没有发送

**可能原因**：
- Secrets 配置错误
- SMTP 服务器地址或端口错误
- 用户名或密码错误
- 防火墙阻止了 SMTP 连接

**解决方案**：
1. 检查 Secrets 配置是否正确
2. 验证 SMTP 服务器地址和端口
3. 测试用户名和密码
4. 查看工作流运行日志中的错误信息

### 问题：邮件被标记为垃圾邮件

**可能原因**：
- 发件人地址不匹配
- 邮件内容包含可疑内容
- SPF/DKIM 验证失败

**解决方案**：
1. 确保 `MAIL_FROM` 与 `MAIL_USERNAME` 一致
2. 检查邮件内容
3. 配置 SPF 和 DKIM 记录

### 问题：连接超时

**可能原因**：
- SMTP 服务器地址错误
- 端口号错误
- 网络连接问题

**解决方案**：
1. 验证 SMTP 服务器地址
2. 检查端口号（通常是 587 或 465）
3. 检查网络连接

---

## 高级配置

### 1. 多个收件人

修改 `.github/workflows/monthly-integration.yml`：

```yaml
to: |
  user1@example.com
  user2@example.com
  user3@example.com
```

### 2. 添加附件

修改 `.github/workflows/monthly-integration.yml`：

```yaml
attachments: reports/monthly-*.md
```

### 3. HTML 格式邮件

修改 `.github/workflows/monthly-integration.yml`：

```yaml
body: |
  <html>
    <body>
      <h1>Nova-Mind 月度整合报告</h1>
      <p>本月统计：</p>
      <ul>
        <li>总对话数：${{ env.TOTAL_CONVERSATIONS }}</li>
        <li>总成本：¥${{ env.TOTAL_COST }}</li>
      </ul>
    </body>
  </html>
```

---

## 常见问题

### Q1: 如何修改邮件发送时间？

**A:** 编辑 `.github/workflows/monthly-integration.yml` 中的 `cron` 表达式。

### Q2: 如何发送给多个收件人？

**A:** 在 `MAIL_TO` Secret 中使用分号或逗号分隔多个邮箱地址。

### Q3: 邮件多久发送一次？

**A:** 默认配置下，每月 1 号发送一次。

### Q4: 如何禁用邮件提醒？

**A:** 在 `.github/workflows/monthly-integration.yml` 中注释掉邮件发送步骤。

### Q5: 如何测试邮件配置？

**A:** 手动运行工作流进行测试。

---

## 下一步

1. **选择邮件服务** - 根据你的需求选择一个邮件服务
2. **配置 Secrets** - 添加邮件配置到 GitHub Secrets
3. **测试邮件** - 手动运行工作流进行测试
4. **自定义模板** - 根据需要自定义邮件模板

**祝你使用愉快！** 🚀
