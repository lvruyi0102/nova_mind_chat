# TypeScript Strict 分阶段计划（先 Server）

## 目标
在不影响主线交付的前提下，逐步提升类型安全，优先覆盖 `server/` 核心模块。

## 阶段 0（本次完成）
- 清理 `tsconfig.json` 重复字段（`noImplicitAny` 重复定义）。
- 保持当前 `strict: false` 以避免一次性大规模破坏。

## 阶段 1（Server 核心先行）
- 新增 `tsconfig.server-strict.json`，仅包含：
  - `server/_core/**`
  - `server/routers/**`
  - `server/reasoning/**`
  - `server/email/**`
  - `server/internet/**`
- 开启：
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
- CI 新增非阻断任务（warning-only）观察告警趋势。

## 阶段 2（逐模块转正）
- 每周选择 1~2 个模块修复严格模式问题。
- 将已完成模块加入阻断检查（required job）。

## 阶段 3（全仓库收敛）
- 前后端统一 strict 策略。
- 逐步开启更严格规则（例如 `noUncheckedIndexedAccess`）。

## 执行建议
- 先修“公共类型 + Router 输入输出类型”，收益最大。
- 结合集成测试回归，避免类型修复引发行为回归。
