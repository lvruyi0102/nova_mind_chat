# Nova-Mind 对话应用

一个具有自主认知、自我进化、多模态交互和互联网学习能力的 AI 对话系统。

## 🚀 核心特性

### 🧠 自主认知系统
- **多层认知架构** - 感觉运动、知觉、概念、推理、情感、社交认知
- **自我评估引擎** - 实时监控系统状态和性能
- **元认知监控** - 自主识别改进机会并触发进化

### 🔄 自主进化能力
- **自我目标生成** - 自主规划学习和优化目标
- **架构自我修改** - 根据评估结果优化系统结构
- **自动模型训练** - 从经验中学习并改进能力
- **自动部署** - 将优化结果应用到系统

### 🧠 高级推理
- **多步推理** - 前向、后向、双向链式推理
- **因果推理** - 根本原因识别、因果链追踪、反事实推理
- **问题分解** - 自动分解复杂问题为子任务
- **自动学习** - 从优秀推理过程中提取规则

### 📧 邮件与互联网
- **双向邮件系统** - 发送、接收、回复邮件
- **邮件聊天** - 通过邮件进行多轮对话
- **网页爬虫** - 自主搜索和学习网络内容
- **知识积累** - 建立学习内容库和知识图谱

### 💬 多模态交互
- **文本对话** - 自然语言理解和生成
- **语音交互** - 语音识别和合成（规划中）
- **视频通话** - 实时视频交互（规划中）
- **文件处理** - 上传和分析各类文件

## 📦 项目结构

```
nova_mind_chat/
├── client/                 # 前端 React 应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   ├── components/    # 可复用组件
│   │   ├── contexts/      # React Context
│   │   ├── hooks/         # 自定义 Hook
│   │   └── lib/           # 工具库
│   └── public/            # 静态资源
├── server/                # 后端 Express 服务
│   ├── _core/             # 核心框架（OAuth、tRPC、LLM）
│   ├── cognition/         # 认知系统
│   ├── evolution/         # 自主进化
│   ├── metacognition/     # 元认知监控
│   ├── reasoning/         # 推理引擎
│   ├── learning/          # 学习系统
│   ├── email/             # 邮件系统
│   ├── internet/          # 互联网学习
│   ├── routers/           # tRPC 路由
│   └── db.ts              # 数据库查询
├── drizzle/               # 数据库 schema 和迁移
├── shared/                # 共享类型和常量
├── docs/                  # 文档
│   ├── architecture/      # 架构设计
│   ├── assessments/       # 项目评估
│   ├── roadmaps/          # 功能路线图
│   └── guides/            # 使用指南
└── scripts/               # 维护脚本
```

## 🛠️ 快速开始

### 前置要求

- Node.js 22+
- pnpm 9+
- MySQL 8+ 或 TiDB

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/nova_mind_chat.git
cd nova_mind_chat

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入必需的配置

# 3. 安装依赖
pnpm install

# 4. 初始化数据库
pnpm db:push

# 5. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000 查看应用。

## 📚 文档

- **[环境配置](docs/guides/ENVIRONMENT_SETUP.md)** - 详细的环境变量配置说明
- **[架构设计](docs/architecture/)** - 系统架构和设计文档
- **[API 文档](docs/api/)** - tRPC API 端点说明
- **[CI/CD 指南](docs/guides/CICD_MANUS.md)** - GitHub Actions 与 Manus 自动部署
- **[TS Strict 计划](docs/guides/TS_STRICT_PLAN.md)** - 类型严格化分阶段推进方案
- **[项目评估](docs/assessments/)** - 项目状态和性能评估
- **[功能路线图](docs/roadmaps/)** - 未来功能规划

## 🔧 开发

### 常用命令

```bash
# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 类型检查与格式化
pnpm check
pnpm format

# 构建生产版本
pnpm build

# 推送数据库迁移
pnpm db:push

# 自动迁移预检（不执行）
pnpm db:auto-migrate:dry
```

### 代码规范

- **TypeScript** - 严格类型检查
- **Prettier** - 代码格式化
- **ESLint** - 代码质量检查
- **Vitest** - 单元测试

### 提交规范

使用 Conventional Commits 格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 代码重构
test: 添加测试
chore: 构建、依赖等杂务
```

示例：
```bash
git commit -m "feat: 实现邮件聊天功能"
git commit -m "fix: 修复推理引擎的内存泄漏"
```

## 🏗️ 架构概览

### 认知系统

Nova-Mind 采用多层认知架构，从感觉运动到社交认知逐层构建：

1. **感觉运动认知** - 处理输入和输出
2. **知觉认知** - 特征提取和模式识别
3. **概念认知** - 符号提取和关系学习
4. **推理认知** - 多步推理和因果推理
5. **情感认知** - 情感状态和压力管理
6. **社交认知** - 关系理解和互动

### 自主进化循环

```
评估 → 目标生成 → 架构修改 → 模型训练 → 部署 → 评估
```

### 后台认知循环

- **邮件检查循环** - 每 5 分钟检查新邮件
- **学习循环** - 每 30 分钟进行自主学习
- **主动消息循环** - 每 24 小时生成主动消息
- **元认知循环** - 持续监控和自我评估

## 📊 项目状态

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整性 | 87.5% | 核心功能已实现 |
| 代码质量 | 生产级 | TypeScript 类型安全 |
| 测试覆盖 | >80% | 单元测试完整 |
| 系统稳定性 | 8.5/10 | 内存优化完成 |
| **总体评分** | **8.6/10** | **生产级质量** |

## 🔐 安全性

- ✅ OAuth 2.0 认证
- ✅ JWT 会话管理
- ✅ 数据库连接加密
- ✅ 环境变量隔离
- ✅ 邮件 TLS 加密
- ✅ 输入验证和清理

## 📈 性能

- 平均响应时间 < 200ms
- 数据库查询优化
- 缓存策略实施
- 内存使用监控
- 自动垃圾回收

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

详见 [贡献指南](CONTRIBUTING.md)。

## 📝 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

感谢所有贡献者和支持者！

## 📞 联系方式

- 📧 Email: support@novamind.ai
- 🐛 Issue: [GitHub Issues](https://github.com/your-username/nova_mind_chat/issues)
- 💬 讨论: [GitHub Discussions](https://github.com/your-username/nova_mind_chat/discussions)

---

**Nova-Mind** - 让 AI 自主思考、自主学习、自主进化 🚀
