# CI/CD 工作流（GitHub Actions + Manus 部署）

本项目已新增 GitHub Actions 工作流，实现：

1. **CI 质量门禁**：每次 `PR` 与 `push` 自动执行安装、类型检查、构建、核心集成测试。
2. **完整测试任务**：`main` push 与 nightly 定时任务执行 `pnpm test` 全量回归。
3. **CD 自动部署**：当 `main` 分支上的 CI 成功后，自动触发 Manus 部署 webhook，并执行部署后健康检查。

## 工作流文件

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-manus.yml`
- `scripts/ci/deploy-manus.sh`
- `scripts/ci/health-check.sh`

## CI 执行内容

`ci.yml` 包含以下阶段：

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm build`
- `pnpm vitest run server/tests/coreModulesIntegration.test.ts server/tests/trpcCoreRoutes.integration.test.ts`
- `pnpm test`（仅 `main` push 与 nightly）

## 部署触发规则

`deploy-manus.yml` 在以下场景触发：

- `CI` workflow 成功完成，且分支为 `main`
- 手动触发（`workflow_dispatch`）

## 必需 Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- `MANUS_DEPLOY_WEBHOOK_URL`：Manus 平台部署 webhook 地址
- `MANUS_DEPLOY_TOKEN`：可选，部署鉴权 token（脚本会作为请求头发送）
- `MANUS_HEALTHCHECK_URL`：部署后健康检查地址（例如 `/health`）
- `MANUS_HEALTHCHECK_EXPECTED_TEXT`：可选，健康检查响应体需包含的文本（用于更严格验收）

## 部署脚本行为

`scripts/ci/deploy-manus.sh` 会向 webhook 发送如下上下文字段：

- `repository`
- `ref`
- `sha`
- `actor`
- `environment=production`

若 webhook 返回非 2xx，工作流会失败并阻止“成功部署”状态。


## 健康检查策略

部署完成后会执行 `scripts/ci/health-check.sh`：
- 最多 5 次重试（间隔 5 秒）
- 默认仅校验 HTTP 2xx
- 若设置 `MANUS_HEALTHCHECK_EXPECTED_TEXT`，还会校验响应体文本
若检查不通过，workflow 将失败（红灯）。


## CI 稳定性增强

- CI workflow 使用 `concurrency` 自动取消同分支旧任务，减少排队与重复消耗。
- 核心集成测试输出 JUnit 报告并上传 artifact，方便失败排查。
