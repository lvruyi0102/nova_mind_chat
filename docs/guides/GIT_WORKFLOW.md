# Git 工作流指南

## 概述

本指南说明 Nova-Mind 项目的 Git 工作流和提交规范。

## 分支策略

### 主分支

- **main** - 生产分支，始终保持稳定
  - 只接受来自 `develop` 的 Pull Request
  - 每个 PR 必须经过代码审查
  - 自动运行测试和 linter

- **develop** - 开发分支，集成新功能
  - 从 `main` 创建
  - 接受来自特性分支的 PR
  - 定期合并到 `main`

### 特性分支

- **feature/*** - 新功能分支
  - 从 `develop` 创建
  - 命名示例：`feature/email-chat`
  - 完成后创建 PR 到 `develop`

- **fix/*** - Bug 修复分支
  - 从 `develop` 创建
  - 命名示例：`fix/memory-leak`
  - 完成后创建 PR 到 `develop`

- **docs/*** - 文档更新分支
  - 从 `develop` 创建
  - 命名示例：`docs/api-reference`
  - 完成后创建 PR 到 `develop`

## 提交规范

### Conventional Commits

使用 Conventional Commits 格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（Type）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(email): 实现邮件聊天` |
| `fix` | Bug 修复 | `fix(memory): 修复内存泄漏` |
| `docs` | 文档更新 | `docs(readme): 更新安装步骤` |
| `style` | 代码格式 | `style: 调整缩进` |
| `refactor` | 代码重构 | `refactor(cognition): 优化认知循环` |
| `test` | 测试相关 | `test(email): 添加邮件测试` |
| `chore` | 杂务 | `chore(deps): 升级依赖` |
| `perf` | 性能改进 | `perf(db): 优化查询性能` |

### 范围（Scope）

可选，表示影响的模块：

- `email` - 邮件系统
- `internet` - 互联网学习
- `cognition` - 认知系统
- `evolution` - 自主进化
- `reasoning` - 推理引擎
- `learning` - 学习系统
- `db` - 数据库
- `ui` - 前端界面
- `api` - API 接口

### 主题（Subject）

- 使用命令式语气（"add"而不是"added"）
- 不以大写字母开头
- 不以句号结尾
- 不超过 50 字符

### 正文（Body）

- 可选，说明更改的原因和方式
- 每行不超过 72 字符
- 用空行分隔主题和正文

### 页脚（Footer）

- 可选，关闭相关 Issue
- 格式：`Closes #123` 或 `Fixes #123`

## 提交示例

### 简单提交

```bash
git commit -m "feat(email): 实现邮件聊天功能"
```

### 详细提交

```bash
git commit -m "feat(reasoning): 实现多步推理引擎

- 添加前向链式推理
- 添加后向链式推理
- 添加双向推理
- 支持推理路径可视化

Closes #42"
```

## 工作流步骤

### 1. 创建特性分支

```bash
# 更新 develop 分支
git fetch origin
git checkout develop
git pull origin develop

# 创建特性分支
git checkout -b feature/your-feature-name
```

### 2. 开发和提交

```bash
# 进行开发...

# 查看更改
git status
git diff

# 暂存更改
git add .

# 提交更改
git commit

# 提交时会自动打开编辑器，使用 .gitmessage 模板
```

### 3. 推送和创建 PR

```bash
# 推送到远程
git push origin feature/your-feature-name

# 在 GitHub 上创建 Pull Request
# 1. 访问 https://github.com/your-username/nova_mind_chat
# 2. 点击 "Compare & pull request"
# 3. 填写 PR 描述
# 4. 点击 "Create pull request"
```

### 4. 代码审查和合并

- 等待维护者审查
- 根据反馈进行修改
- 通过审查后自动合并

## 常用命令

### 查看提交历史

```bash
# 查看简洁的提交历史
git log --oneline

# 查看详细的提交历史
git log --pretty=format:"%h - %an, %ar : %s"

# 查看特定文件的提交历史
git log -- path/to/file
```

### 修改最后一次提交

```bash
# 修改提交信息
git commit --amend

# 添加遗漏的文件
git add forgotten_file
git commit --amend --no-edit
```

### 撤销提交

```bash
# 撤销最后一次提交，保留更改
git reset --soft HEAD~1

# 撤销最后一次提交，丢弃更改
git reset --hard HEAD~1
```

### 查看和处理冲突

```bash
# 查看冲突
git diff

# 解决冲突后
git add .
git commit -m "chore: resolve merge conflicts"
```

## 最佳实践

### ✅ 好的实践

- 频繁提交（每个逻辑单元一次提交）
- 清晰的提交信息
- 一次提交只做一件事
- 在推送前运行测试
- 保持分支与 develop 同步

### ❌ 避免

- 大量文件的单次提交
- 模糊的提交信息（如"fix bug"）
- 在 main 分支上直接提交
- 推送未测试的代码
- 提交敏感信息（密钥、密码）

## 问题排查

### 如何撤销已推送的提交？

```bash
# 创建一个新提交来撤销更改
git revert <commit-hash>

# 或者（如果还未被他人拉取）
git reset --hard <commit-hash>
git push origin branch-name --force
```

### 如何合并多个提交？

```bash
# 交互式 rebase
git rebase -i HEAD~3  # 合并最后 3 个提交
```

### 如何从一个分支拉取特定提交？

```bash
# Cherry-pick
git cherry-pick <commit-hash>
```

## 相关文件

- `.gitmessage` - 提交消息模板
- `.gitignore` - 忽略文件列表
- `CONTRIBUTING.md` - 贡献指南

## 更多信息

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git 文档](https://git-scm.com/doc)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
