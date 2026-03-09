# 贡献指南

感谢您对 Nova-Mind 项目的兴趣！本指南将帮助您了解如何贡献代码和改进项目。

## 行为准则

我们致力于为所有贡献者提供一个开放、包容的社区。请遵守以下原则：

- 尊重所有贡献者
- 接受建设性批评
- 专注于对项目最有利的讨论
- 对其他社区成员表示同情

## 如何贡献

### 报告 Bug

发现 Bug？请通过以下步骤报告：

1. **检查 Issue** - 确保 Bug 还未被报告
2. **创建 Issue** - 使用 "Bug Report" 模板
3. **提供详情** - 包含：
   - 清晰的 Bug 描述
   - 复现步骤
   - 预期行为
   - 实际行为
   - 环境信息（OS、Node 版本等）
   - 错误日志或截图

### 建议功能

有好的想法？请通过以下步骤提议：

1. **检查讨论** - 确保想法还未被提议
2. **创建讨论** - 在 GitHub Discussions 中描述您的想法
3. **收集反馈** - 与社区讨论和完善想法
4. **提交 Issue** - 如果获得支持，创建功能请求 Issue

### 提交代码

#### 准备工作

```bash
# 1. Fork 仓库
# 在 GitHub 上点击 Fork 按钮

# 2. 克隆您的 Fork
git clone https://github.com/your-username/nova_mind_chat.git
cd nova_mind_chat

# 3. 添加上游仓库
git remote add upstream https://github.com/original-owner/nova_mind_chat.git

# 4. 安装依赖
pnpm install
```

#### 创建特性分支

```bash
# 更新主分支
git fetch upstream
git checkout main
git merge upstream/main

# 创建特性分支
git checkout -b feature/your-feature-name
```

#### 开发

```bash
# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 运行 linter
pnpm lint

# 格式化代码
pnpm format
```

#### 提交更改

遵循 Conventional Commits 规范：

```bash
git add .
git commit -m "feat: 添加新功能的简短描述"
```

**提交类型：**
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档更新
- `style` - 代码格式（不改变功能）
- `refactor` - 代码重构
- `test` - 添加或修改测试
- `chore` - 构建、依赖等杂务
- `perf` - 性能改进

**示例：**
```bash
git commit -m "feat: 实现邮件聊天功能

- 添加 EmailChatManager 类
- 支持多轮对话
- 集成到后台循环"
```

#### 推送和创建 Pull Request

```bash
# 推送到您的 Fork
git push origin feature/your-feature-name

# 在 GitHub 上创建 Pull Request
```

**Pull Request 检查清单：**

- [ ] 分支已更新至最新的 `main`
- [ ] 代码遵循项目规范
- [ ] 添加或更新了相关测试
- [ ] 更新了相关文档
- [ ] 提交信息清晰且遵循规范
- [ ] 没有合并冲突

## 代码规范

### TypeScript

```typescript
// ✅ 好的实践
interface User {
  id: number;
  name: string;
  email: string;
}

async function getUserById(id: number): Promise<User | null> {
  // 实现
}

// ❌ 避免
function getUser(id) {
  // 实现
}
```

### 命名规范

- **文件** - kebab-case: `email-sender.ts`
- **类** - PascalCase: `EmailSender`
- **函数/变量** - camelCase: `getUserById`
- **常量** - UPPER_SNAKE_CASE: `MAX_RETRIES`
- **接口** - PascalCase 前缀 I: `IEmailSender`

### 注释

```typescript
/**
 * 从 URL 学习内容
 * @param url - 要学习的 URL
 * @param category - 内容分类（可选）
 * @returns 学习结果
 * @throws 如果 URL 无效或网络错误
 */
async function learnFromUrl(
  url: string,
  category?: string
): Promise<LearningResult> {
  // 实现
}
```

### 测试

```typescript
import { describe, it, expect } from 'vitest';

describe('EmailSender', () => {
  it('should send email successfully', async () => {
    const sender = new EmailSender();
    const result = await sender.send({
      to: 'test@example.com',
      subject: 'Test',
      body: 'Test body'
    });
    
    expect(result.success).toBe(true);
  });

  it('should handle invalid email', async () => {
    const sender = new EmailSender();
    
    await expect(
      sender.send({
        to: 'invalid-email',
        subject: 'Test',
        body: 'Test body'
      })
    ).rejects.toThrow('Invalid email');
  });
});
```

## 测试

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定文件的测试
pnpm test -- email.test.ts

# 运行测试并生成覆盖率报告
pnpm test -- --coverage
```

### 测试覆盖率要求

- 新功能必须有相应的测试
- 测试覆盖率应 >= 80%
- 关键路径必须有集成测试

## 文档

### 更新文档

- 在 `docs/` 目录下更新相关文档
- 使用 Markdown 格式
- 包含代码示例和说明

### 文档结构

```
docs/
├── architecture/      # 架构设计
├── assessments/       # 项目评估
├── guides/           # 使用指南
├── api/              # API 文档
└── roadmaps/         # 功能路线图
```

## 审查流程

1. **自动检查** - CI 运行测试和 linter
2. **代码审查** - 维护者审查代码
3. **修改建议** - 如需修改，维护者会提供反馈
4. **合并** - 通过审查后合并到主分支

## 开发环境设置

### 推荐工具

- **编辑器** - VS Code
- **扩展** - ESLint、Prettier、TypeScript Vue Plugin

### VS Code 设置

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## 常见问题

### 如何运行特定的测试？

```bash
pnpm test -- email.test.ts
```

### 如何调试代码？

```bash
# 使用 VS Code 调试器
# 在 .vscode/launch.json 中配置

# 或使用 Node 调试
node --inspect-brk ./node_modules/.bin/vitest
```

### 如何处理合并冲突？

```bash
# 更新主分支
git fetch upstream
git merge upstream/main

# 解决冲突后
git add .
git commit -m "chore: resolve merge conflicts"
git push origin feature/your-feature-name
```

## 获取帮助

- 📖 查看 [README](README.md)
- 📚 查看 [文档](docs/)
- 💬 在 [GitHub Discussions](https://github.com/your-username/nova_mind_chat/discussions) 提问
- 🐛 查看 [Issues](https://github.com/your-username/nova_mind_chat/issues)

## 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

---

感谢您的贡献！ 🎉
