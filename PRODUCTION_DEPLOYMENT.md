# Nova-Mind 生产环境部署指南（完全免费版）

## 概述

本指南说明如何将 Nova-Mind 部署到生产环境（novamindchat.com），使用 Ollama 本地模型实现完全免费的 AI 聊天功能，**无需任何 API Key 或信用卡，不再扣费**。

## 🎯 部署目标

- ✅ 访问地址：https://novamindchat.com
- ✅ 模型：Orca-Mini（2.0 GB）
- ✅ 成本：¥0/月（完全免费）
- ✅ 隐私：所有数据本地处理
- ✅ 可用性：100%（无网络依赖）

## 📋 前置条件

在生产服务器上需要：

- Ubuntu 20.04+ 或其他 Linux 发行版
- 至少 8 GB RAM（推荐 16 GB）
- 至少 50 GB 存储空间
- Node.js 18+
- pnpm 包管理器
- Git

## 🚀 部署步骤

### 第 1 步：在生产服务器上安装 Ollama

```bash
# SSH 连接到生产服务器
ssh user@novamindchat.com

# 安装 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 启动 Ollama 服务
systemctl start ollama
systemctl enable ollama

# 验证安装
ollama --version
```

### 第 2 步：拉取模型

```bash
# 拉取 Orca-Mini 模型（2.0 GB）
ollama pull orca-mini

# 验证模型已下载
ollama list
```

### 第 3 步：克隆项目

```bash
# 克隆 Nova-Mind 项目
git clone https://github.com/lvruyi0102/nova_mind_chat.git
cd nova_mind_chat

# 安装依赖
pnpm install
```

### 第 4 步：配置环境变量

创建 `.env.production` 文件：

```bash
cat > .env.production << 'EOF'
# ===== Ollama 本地模型配置（完全免费）=====
OLLAMA_ENABLED=true
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=orca-mini

# ===== 禁用 Manus LLM（不扣费）=====
MANUS_LLM_ENABLED=false
BUILT_IN_FORGE_API_KEY=disabled

# ===== 应用配置 =====
NODE_ENV=production
LOG_LEVEL=info
PORT=3000

# ===== 数据库配置 =====
DATABASE_URL=your_database_url_here

# ===== 其他配置 =====
MODEL_STRATEGY=ollama_only
ENABLE_AUTO_OPTIMIZATION=false
MONTHLY_COST_BUDGET=0
ENABLE_COST_TRACKING=true
EOF
```

### 第 5 步：构建应用

```bash
# 构建生产版本
pnpm build

# 验证构建成功
ls -la dist/
```

### 第 6 步：启动应用

#### 方式 1：使用 PM2（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start "pnpm start" --name nova-mind

# 设置开机自启
pm2 startup
pm2 save

# 查看应用状态
pm2 status
pm2 logs nova-mind
```

#### 方式 2：使用 systemd

创建 `/etc/systemd/system/nova-mind.service`：

```ini
[Unit]
Description=Nova-Mind Chat Application
After=network.target ollama.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/nova_mind_chat
ExecStart=/home/ubuntu/.local/share/pnpm/pnpm start
Restart=always
RestartSec=10
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl start nova-mind
sudo systemctl enable nova-mind
sudo systemctl status nova-mind
```

### 第 7 步：配置 Nginx 反向代理

创建 `/etc/nginx/sites-available/novamindchat.com`：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name novamindchat.com www.novamindchat.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name novamindchat.com www.novamindchat.com;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/novamindchat.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/novamindchat.com/privkey.pem;

    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 日志
    access_log /var/log/nginx/novamindchat.access.log;
    error_log /var/log/nginx/novamindchat.error.log;

    # 反向代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/novamindchat.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 第 8 步：配置 SSL 证书

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot certonly --nginx -d novamindchat.com -d www.novamindchat.com

# 自动续期
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 第 9 步：验证部署

```bash
# 检查 Ollama 服务
systemctl status ollama

# 检查应用状态
pm2 status
# 或
systemctl status nova-mind

# 检查日志
pm2 logs nova-mind
# 或
journalctl -u nova-mind -f

# 测试 API
curl https://novamindchat.com/api/health
```

## 📊 监控和维护

### 监控 Ollama 服务

```bash
# 检查 Ollama 状态
systemctl status ollama

# 查看 Ollama 日志
journalctl -u ollama -f

# 检查模型
ollama list

# 检查内存使用
free -h
```

### 监控应用

```bash
# 查看应用日志
pm2 logs nova-mind

# 查看应用状态
pm2 status

# 重启应用
pm2 restart nova-mind

# 停止应用
pm2 stop nova-mind
```

### 定期维护

```bash
# 每周更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 定期备份数据库
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

# 定期检查磁盘空间
df -h
```

## 🔧 故障排查

### 问题：Ollama 服务无法启动

```bash
# 检查日志
journalctl -u ollama -n 50

# 重启服务
systemctl restart ollama

# 检查端口
netstat -tuln | grep 11434
```

### 问题：应用无法连接 Ollama

```bash
# 检查 Ollama 是否在运行
curl http://localhost:11434/api/tags

# 检查防火墙
sudo ufw status
sudo ufw allow 11434/tcp

# 检查应用日志
pm2 logs nova-mind
```

### 问题：内存不足

```bash
# 检查内存使用
free -h

# 检查进程
ps aux --sort=-%mem | head -10

# 如果 Ollama 占用过多，可以调整模型或增加 RAM
```

## 📈 性能优化

### 1. 启用 HTTP/2

已在 Nginx 配置中启用。

### 2. 启用 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json;
gzip_min_length 1000;
```

### 3. 启用缓存

已在 Nginx 配置中为静态文件启用 1 年缓存。

### 4. 使用 CDN

建议使用 Cloudflare 或其他 CDN 加速静态资源。

## 💰 成本对比

| 方案 | 月度成本 | 质量 | 隐私 | 可用性 |
|------|---------|------|------|--------|
| **Ollama 本地** | ¥0 | ⭐⭐⭐ | ✅ 完全本地 | 100% |
| Manus LLM | ¥180 | ⭐⭐⭐⭐⭐ | ❌ 云端 | 99.9% |
| DeepSeek API | ¥36 | ⭐⭐⭐⭐ | ⚠️ 云端 | 99% |

## 🎉 部署完成

恭喜！Nova-Mind 现已在 https://novamindchat.com 上运行，使用完全免费的 Ollama 本地模型。

- ✅ 用户可以访问 https://novamindchat.com 进行免费聊天
- ✅ 所有数据在本地处理，完全隐私
- ✅ 无需任何 API Key 或信用卡
- ✅ 月度成本：¥0

## 📞 获取帮助

如有问题，请：

1. 查看应用日志：`pm2 logs nova-mind`
2. 查看 Ollama 日志：`journalctl -u ollama -f`
3. 检查 Nginx 日志：`tail -f /var/log/nginx/novamindchat.error.log`
4. 查阅 Ollama 官方文档：https://ollama.ai
