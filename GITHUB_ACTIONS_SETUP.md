# GitHub Actions 月度整合自动化配置指南

## 概述

本指南说明如何配置 GitHub Actions，实现每月 1 号自动生成月度报告和发送邮件提醒。

---

## 第 1 步：配置 GitHub Secrets

### 1.1 访问 GitHub Secrets 设置

1. 打开你的 GitHub 仓库
2. 进入 "Settings" → "Secrets and variables" → "Actions"
3. 点击 "New repository secret"

### 1.2 添加必要的 Secrets

#### 邮件配置（可选，用于发送提醒）

如果你想要邮件提醒功能，需要配置以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|------------|------|------|
| `MAIL_SERVER` | 邮件服务器地址 | `smtp.gmail.com` |
| `MAIL_PORT` | 邮件服务器端口 | `587` |
| `MAIL_USERNAME` | 邮件用户名 | `your-email@gmail.com` |
| `MAIL_PASSWORD` | 邮件密码或应用密码 | `your-app-password` |
| `MAIL_FROM` | 发件人地址 | `nova-mind@example.com` |
| `MAIL_TO` | 收件人地址 | `your-email@gmail.com` |

#### 使用 Gmail 的示例

1. **获取 Gmail 应用密码**
   - 访问 [Google Account Security](https://myaccount.google.com/security)
   - 启用两步验证
   - 生成应用密码
   - 复制应用密码

2. **添加 Secrets**
   - `MAIL_SERVER`: `smtp.gmail.com`
   - `MAIL_PORT`: `587`
   - `MAIL_USERNAME`: `your-email@gmail.com`
   - `MAIL_PASSWORD`: `your-app-password`
   - `MAIL_FROM`: `nova-mind@example.com`
   - `MAIL_TO`: `your-email@gmail.com`

#### 使用其他邮件服务

**QQ 邮箱**：
- `MAIL_SERVER`: `smtp.qq.com`
- `MAIL_PORT`: `587`
- `MAIL_USERNAME`: `your-qq@qq.com`
- `MAIL_PASSWORD`: `your-smtp-password`

**163 邮箱**：
- `MAIL_SERVER`: `smtp.163.com`
- `MAIL_PORT`: `587`
- `MAIL_USERNAME`: `your-email@163.com`
- `MAIL_PASSWORD`: `your-smtp-password`

---

## 第 2 步：验证 GitHub Actions 工作流

### 2.1 检查工作流文件

工作流文件位于：`.github/workflows/monthly-integration.yml`

### 2.2 工作流功能

- **触发时间**：每月 1 号 00:00 UTC（北京时间 08:00）
- **手动触发**：可以在 GitHub 中手动运行
- **生成报告**：自动生成月度报告
- **发送邮件**：发送邮件提醒
- **创建 Issue**：在 GitHub 中创建月度报告 Issue
- **更新 README**：更新 README 中的统计信息

### 2.3 查看工作流运行

1. 打开你的 GitHub 仓库
2. 进入 "Actions" 标签
3. 查看 "月度整合自动化" 工作流
4. 点击最新的运行记录查看详情

---

## 第 3 步：手动测试工作流

### 3.1 手动触发工作流

1. 打开你的 GitHub 仓库
2. 进入 "Actions" 标签
3. 选择 "月度整合自动化" 工作流
4. 点击 "Run workflow"
5. 选择分支（通常是 `main`）
6. 点击 "Run workflow"

### 3.2 查看运行结果

1. 等待工作流完成
2. 检查生成的报告：`reports/monthly-YYYY-MM.md`
3. 检查 GitHub Issues 中是否创建了报告 Issue
4. 检查邮箱是否收到提醒邮件

---

## 第 4 步：自定义工作流

### 4.1 修改触发时间

编辑 `.github/workflows/monthly-integration.yml`：

```yaml
on:
  schedule:
    - cron: '0 0 1 * *'  # 每月 1 号 00:00 UTC
```

**Cron 表达式说明**：
- `0 0 1 * *` = 每月 1 号 00:00 UTC
- `0 8 1 * *` = 每月 1 号 08:00 UTC（北京时间）
- `0 12 * * 1` = 每周一 12:00 UTC
- `0 0 * * *` = 每天 00:00 UTC

### 4.2 修改邮件收件人

编辑 `.github/workflows/monthly-integration.yml`：

```yaml
to: ${{ secrets.MAIL_TO }}
```

或直接修改为：

```yaml
to: your-email@example.com
```

### 4.3 自定义报告内容

编辑 `scripts/generate-monthly-report.js` 中的 `generateReport` 函数。

---

## 第 5 步：故障排查

### 问题：工作流没有运行

**可能原因**：
- GitHub Actions 未启用
- Cron 表达式错误
- 分支保护规则阻止了工作流

**解决方案**：
1. 检查 "Settings" → "Actions" → "General"
2. 确保 "Allow all actions and reusable workflows" 已启用
3. 手动触发工作流进行测试

### 问题：邮件没有发送

**可能原因**：
- Secrets 配置错误
- 邮件服务器连接失败
- 邮件被标记为垃圾邮件

**解决方案**：
1. 检查 Secrets 配置是否正确
2. 检查邮件服务器地址和端口
3. 查看工作流运行日志中的错误信息
4. 检查垃圾邮件文件夹

### 问题：报告没有生成

**可能原因**：
- 数据库连接失败
- 脚本执行错误

**解决方案**：
1. 查看工作流运行日志
2. 检查 `scripts/generate-monthly-report.js` 是否有错误
3. 确保数据库可以从 GitHub Actions 访问

---

## 第 6 步：高级配置

### 6.1 添加 Slack 通知

在 `.github/workflows/monthly-integration.yml` 中添加：

```yaml
- name: 发送 Slack 通知
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "📊 Nova-Mind 月度整合完成！",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "📊 *Nova-Mind 月度整合报告*\n\n本月统计：\n• 总对话数：${{ env.TOTAL_CONVERSATIONS }}\n• 总成本：¥${{ env.TOTAL_COST }}\n• 节省成本：¥${{ env.SAVED_COST }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 6.2 添加 Discord 通知

在 `.github/workflows/monthly-integration.yml` 中添加：

```yaml
- name: 发送 Discord 通知
  uses: tsickert/discord-webhook@v1
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    content: |
      📊 Nova-Mind 月度整合报告
      
      本月统计：
      • 总对话数：${{ env.TOTAL_CONVERSATIONS }}
      • 总成本：¥${{ env.TOTAL_COST }}
      • 节省成本：¥${{ env.SAVED_COST }}
```

### 6.3 添加数据库备份

在 `.github/workflows/monthly-integration.yml` 中添加：

```yaml
- name: 备份数据库
  run: |
    # 导出数据库
    npm run db:export
    
    # 上传到 S3 或其他存储
    aws s3 cp backup.sql s3://your-bucket/backups/
```

---

## 第 7 步：监控和维护

### 7.1 定期检查工作流

- 每月检查一次工作流运行状态
- 查看是否有失败的运行
- 检查生成的报告是否正确

### 7.2 更新工作流

- 定期更新 GitHub Actions 版本
- 根据需要修改工作流配置
- 添加新的通知渠道

### 7.3 备份报告

- 定期备份生成的报告
- 保存到云存储（如 S3）
- 防止数据丢失

---

## 完整的工作流示例

```yaml
name: 月度整合自动化

on:
  schedule:
    - cron: '0 0 1 * *'  # 每月 1 号 00:00 UTC
  workflow_dispatch:

jobs:
  monthly-integration:
    runs-on: ubuntu-latest
    
    steps:
      - name: 检出代码
        uses: actions/checkout@v3
      
      - name: 设置 Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: 安装依赖
        run: npm install
      
      - name: 生成月度报告
        run: node scripts/generate-monthly-report.js
      
      - name: 提交报告
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add reports/
          git commit -m "📊 Monthly report" || true
          git push
      
      - name: 发送邮件
        if: always()
        uses: dawidd6/action-send-mail@v3
        with:
          server_address: ${{ secrets.MAIL_SERVER }}
          server_port: ${{ secrets.MAIL_PORT }}
          username: ${{ secrets.MAIL_USERNAME }}
          password: ${{ secrets.MAIL_PASSWORD }}
          subject: '📅 Nova-Mind 月度整合提醒'
          to: ${{ secrets.MAIL_TO }}
          from: ${{ secrets.MAIL_FROM }}
          body: |
            亲爱的 Nova-Mind 用户，
            
            🎉 月度整合时间到了！
            
            📊 本月统计：
            - 总对话数：${{ env.TOTAL_CONVERSATIONS }}
            - 总成本：¥${{ env.TOTAL_COST }}
            - 节省成本：¥${{ env.SAVED_COST }}
            
            🔗 查看完整报告：
            https://github.com/${{ github.repository }}/blob/main/reports/
            
            祝你使用愉快！
```

---

## 常见问题

### Q1: 工作流多久运行一次？

**A:** 默认配置下，每月 1 号 00:00 UTC 运行一次。

### Q2: 如何手动运行工作流？

**A:** 
1. 进入 GitHub 仓库
2. 选择 "Actions" 标签
3. 选择工作流
4. 点击 "Run workflow"

### Q3: 如何修改工作流触发时间？

**A:** 编辑 `.github/workflows/monthly-integration.yml` 中的 `cron` 表达式。

### Q4: 工作流失败了怎么办？

**A:** 
1. 查看工作流运行日志
2. 检查错误信息
3. 修复问题
4. 重新运行工作流

---

## 下一步

1. **配置 Secrets** - 添加邮件配置
2. **测试工作流** - 手动运行一次
3. **监控运行** - 定期检查运行状态
4. **优化配置** - 根据需要自定义

**祝你使用愉快！** 🚀
