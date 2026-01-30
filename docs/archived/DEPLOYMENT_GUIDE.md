# Nova-Mind 部署指南

**版本**：1.0  
**最后更新**：2026年1月21日

---

## 目录

1. [系统要求](#系统要求)
2. [环境配置](#环境配置)
3. [本地开发](#本地开发)
4. [生产部署](#生产部署)
5. [数据库迁移](#数据库迁移)
6. [监控和告警](#监控和告警)
7. [故障排除](#故障排除)
8. [备份和恢复](#备份和恢复)

---

## 系统要求

### 硬件要求

| 资源 | 开发环境 | 生产环境 |
|------|---------|---------|
| CPU | 2+ 核心 | 4+ 核心 |
| 内存 | 4GB | 8GB+ |
| 存储 | 10GB | 50GB+ |
| 网络 | 1Mbps | 10Mbps+ |

### 软件要求

- **Node.js**：v22.13.0 或更高
- **npm/pnpm**：v10.15.1 或更高
- **MySQL**：8.0 或更高（或 TiDB）
- **Redis**（可选）：用于分布式缓存

### 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 环境配置

### 1. 克隆项目

```bash
git clone https://github.com/your-org/nova_mind_chat.git
cd nova_mind_chat
```

### 2. 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 3. 环境变量配置

创建 `.env.local` 文件：

```bash
# 数据库
DATABASE_URL=mysql://user:password@localhost:3306/nova_mind_chat

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_chars

# LLM 配置
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key

# 前端配置
VITE_APP_TITLE=Nova-Mind
VITE_APP_LOGO=https://your-cdn.com/logo.png

# S3 存储
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=nova-mind-storage

# 可选：Redis
REDIS_URL=redis://localhost:6379

# 可选：监控
SENTRY_DSN=https://your-sentry-dsn
```

### 4. 验证环境

```bash
# 检查 Node.js 版本
node --version

# 检查 npm/pnpm 版本
pnpm --version

# 检查数据库连接
pnpm db:check
```

---

## 本地开发

### 启动开发服务器

```bash
# 启动前端和后端
pnpm dev

# 前端单独启动（端口 5173）
pnpm dev:client

# 后端单独启动（端口 3000）
pnpm dev:server
```

### 数据库初始化

```bash
# 生成迁移文件
pnpm db:generate

# 执行迁移
pnpm db:push

# 查看数据库状态
pnpm db:studio
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test monitoring

# 生成覆盖率报告
pnpm test:coverage
```

### 构建

```bash
# 构建前端
pnpm build:client

# 构建后端
pnpm build:server

# 完整构建
pnpm build
```

---

## 生产部署

### 1. 构建应用

```bash
# 清理旧构建
pnpm clean

# 完整构建
pnpm build

# 验证构建
ls -la dist/
```

### 2. 使用 Docker 部署

#### Dockerfile

```dockerfile
FROM node:22-alpine

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY pnpm-lock.yaml ./

# 安装依赖
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "start"]
```

#### 构建和运行 Docker 镜像

```bash
# 构建镜像
docker build -t nova-mind:latest .

# 运行容器
docker run -d \
  --name nova-mind \
  -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@db:3306/nova_mind \
  -e JWT_SECRET=your_secret \
  nova-mind:latest

# 查看日志
docker logs -f nova-mind
```

### 3. 使用 Docker Compose 部署

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: mysql://nova:password@db:3306/nova_mind_chat
      JWT_SECRET: ${JWT_SECRET}
      VITE_APP_ID: ${VITE_APP_ID}
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: nova_mind_chat
      MYSQL_USER: nova
      MYSQL_PASSWORD: password
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  db_data:
```

启动：
```bash
docker-compose up -d
```

### 4. 使用 PM2 部署

#### ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'nova-mind',
      script: './dist/server/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
```

启动：
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 监控应用
pm2 monit

# 查看日志
pm2 logs nova-mind
```

### 5. Nginx 反向代理配置

```nginx
upstream nova_mind {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name nova-mind.example.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nova-mind.example.com;

    # SSL 证书
    ssl_certificate /etc/ssl/certs/nova-mind.crt;
    ssl_certificate_key /etc/ssl/private/nova-mind.key;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # 反向代理
    location / {
        proxy_pass http://nova_mind;
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

---

## 数据库迁移

### 创建迁移

```bash
# 修改 schema.ts 后
pnpm db:generate

# 查看生成的迁移文件
ls drizzle/migrations/
```

### 执行迁移

```bash
# 开发环境
pnpm db:push

# 生产环境（先备份）
pnpm db:backup
pnpm db:migrate:prod
```

### 回滚迁移

```bash
# 查看迁移历史
pnpm db:history

# 回滚到特定版本
pnpm db:rollback --version=0001
```

---

## 监控和告警

### 内存监控

访问 `/api/health/memory` 获取内存诊断报告：

```bash
curl http://localhost:3000/api/health/memory
```

### 认知循环监控

访问 `/api/health/cognition` 获取后台循环状态：

```bash
curl http://localhost:3000/api/health/cognition
```

### 自适应间隔监控

访问 `/api/debug/adaptive-interval` 获取自适应间隔信息：

```bash
curl http://localhost:3000/api/debug/adaptive-interval
```

### 设置告警

编辑 `server/services/monitoringSystem.ts`：

```typescript
// 内存告警阈值
const MEMORY_ALERT_THRESHOLD = 0.85; // 85%

// 成本告警阈值
const COST_ALERT_THRESHOLD = 0.9; // 90% 预算
```

---

## 故障排除

### 常见问题

#### 1. 数据库连接错误

**症状**：`Error: connect ECONNREFUSED 127.0.0.1:3306`

**解决方案**：
```bash
# 检查 MySQL 是否运行
systemctl status mysql

# 启动 MySQL
systemctl start mysql

# 验证连接字符串
echo $DATABASE_URL
```

#### 2. 内存使用率过高（> 90%）

**症状**：应用变慢或崩溃

**解决方案**：
```bash
# 检查内存使用
curl http://localhost:3000/api/health/memory

# 重启应用
pm2 restart nova-mind

# 或使用 Docker
docker restart nova-mind
```

#### 3. LLM API 调用失败

**症状**：`Error: LLM API request failed`

**解决方案**：
```bash
# 检查 API 密钥
echo $BUILT_IN_FORGE_API_KEY

# 检查 API 端点
curl $BUILT_IN_FORGE_API_URL/health

# 查看日志
tail -f logs/error.log
```

#### 4. OAuth 登录失败

**症状**：`Error: OAuth callback failed`

**解决方案**：
```bash
# 验证 OAuth 配置
echo $VITE_APP_ID
echo $OAUTH_SERVER_URL

# 检查回调 URL 是否正确配置
# 应该是 https://your-domain.com/api/oauth/callback
```

### 日志位置

- **应用日志**：`logs/out.log`
- **错误日志**：`logs/error.log`
- **系统日志**：`/var/log/syslog`（Linux）

### 性能优化

```bash
# 启用 Redis 缓存
REDIS_URL=redis://localhost:6379 pnpm start

# 调整 Node.js 堆大小
NODE_OPTIONS="--max-old-space-size=4096" pnpm start

# 启用集群模式
pnpm start:cluster
```

---

## 备份和恢复

### 数据库备份

```bash
# 手动备份
mysqldump -u nova -p nova_mind_chat > backup_$(date +%Y%m%d_%H%M%S).sql

# 自动备份（每天 2 点）
0 2 * * * mysqldump -u nova -p nova_mind_chat > /backups/nova_mind_$(date +\%Y\%m\%d).sql
```

### 恢复数据库

```bash
# 从备份恢复
mysql -u nova -p nova_mind_chat < backup_20260121_000000.sql

# 验证恢复
mysql -u nova -p -e "SELECT COUNT(*) FROM nova_mind_chat.users;"
```

### 应用备份

```bash
# 备份应用数据
tar -czf nova_mind_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  .

# 恢复应用
tar -xzf nova_mind_backup_20260121.tar.gz
```

---

## 性能基准

### 预期性能指标

| 指标 | 目标 | 当前 |
|------|------|------|
| 平均响应时间 | < 200ms | 150-300ms |
| 内存使用率 | < 80% | 70-85% |
| 缓存命中率 | > 70% | 60-70% |
| 可用性 | > 99.5% | 99.8% |

### 压力测试

```bash
# 使用 Apache Bench
ab -n 1000 -c 100 http://localhost:3000/

# 使用 wrk
wrk -t12 -c400 -d30s http://localhost:3000/
```

---

## 安全检查清单

- [ ] 更改所有默认密码
- [ ] 配置 SSL/TLS 证书
- [ ] 启用防火墙
- [ ] 配置 CORS
- [ ] 启用 HTTPS
- [ ] 设置速率限制
- [ ] 启用审计日志
- [ ] 定期备份
- [ ] 更新依赖包
- [ ] 运行安全扫描

---

## 支持

如有部署问题，请：

1. 查看日志文件
2. 检查系统要求
3. 查看故障排除部分
4. 联系技术支持

---

**最后更新**：2026年1月21日
