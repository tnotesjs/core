---
name: "pnpm 默认规则"
description: "在修改 `package.json`、`pnpm-workspace.yaml` 或 `pnpm-lock.yaml` 时使用。覆盖依赖分类、锁文件维护、脚本优先和 overrides/patches 的使用边界。"
applyTo:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
---

# pnpm 默认规则

- 当前仓库包管理器固定为 pnpm；已有任务优先走 `package.json` 里的脚本入口。
- 依赖分类先看运行时边界：发布包运行时依赖进 `dependencies`，只在开发、测试、构建阶段使用的进 `devDependencies`，宿主仓库应提供的能力进 `peerDependencies`。
- `vite`、`vitepress`、`vue` 必须保持在 `peerDependencies`，不要为了本地便利挪进 `dependencies`。
- `pnpm-lock.yaml` 只由 pnpm 命令维护，不手工改写。
- `pnpm-workspace.yaml` 保持最小；没有明确收益时，不主动引入 catalogs、hooks 等额外机制，`overrides` 与 `patches` 只作为最后手段。
- 如果问题进入 pnpm 命令差异、workspace / link 异常或 overrides / patches 取舍，使用 [../../skills/pnpm/SKILL.md](../../skills/pnpm/SKILL.md)。
