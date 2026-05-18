---
name: pnpm
description: 具备严格依赖解析的 Node.js 包管理器。运行 pnpm 专属命令、配置 workspace，或使用 catalogs、patches、overrides 管理依赖时使用。
---

pnpm 是一个速度快、节省磁盘空间的包管理器。它使用内容寻址存储，在同一台机器上的多个项目之间对包进行去重，从而显著节省磁盘空间。pnpm 默认执行严格的依赖解析，避免出现 phantom dependencies。pnpm 专属配置应优先写在 `pnpm-workspace.yaml` 中。

**重要：** 处理 pnpm 项目时，agent 应检查 `pnpm-workspace.yaml` 和 `.npmrc`，以了解 workspace 结构和配置。在 CI 环境中始终使用 `--frozen-lockfile`。

> 该 skill 基于 pnpm 10.x，生成时间为 2026-01-28。

## 核心

| 主题     | 说明                                                           | 参考                                             |
| -------- | -------------------------------------------------------------- | ------------------------------------------------ |
| CLI 命令 | install、add、remove、update、run、exec、dlx 与 workspace 命令 | [core-cli](references/core-cli.md)               |
| 配置     | pnpm-workspace.yaml、.npmrc 配置项，以及 package.json 字段     | [core-config](references/core-config.md)         |
| 工作区   | 带过滤能力的 monorepo 支持、workspace 协议与共享锁文件         | [core-workspaces](references/core-workspaces.md) |
| 存储     | 内容寻址存储、硬链接与磁盘效率                                 | [core-store](references/core-store.md)           |

## 功能

| 主题      | 说明                                    | 参考                                                   |
| --------- | --------------------------------------- | ------------------------------------------------------ |
| Catalogs  | 为 workspace 集中管理依赖版本           | [features-catalogs](references/features-catalogs.md)   |
| Overrides | 强制指定依赖版本，包括传递依赖          | [features-overrides](references/features-overrides.md) |
| Patches   | 通过自定义修复修改第三方包              | [features-patches](references/features-patches.md)     |
| Aliases   | 使用 npm: 协议以自定义名称安装包        | [features-aliases](references/features-aliases.md)     |
| Hooks     | 使用 .pnpmfile.cjs hooks 自定义解析过程 | [features-hooks](references/features-hooks.md)         |
| Peer 依赖 | 自动安装、严格模式与依赖规则            | [features-peer-deps](references/features-peer-deps.md) |

## 最佳实践

| 主题       | 说明                                               | 参考                                                                   |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| CI/CD 配置 | GitHub Actions、GitLab CI、Docker 与缓存策略       | [best-practices-ci](references/best-practices-ci.md)                   |
| 迁移       | 从 npm/Yarn 迁移、处理 phantom deps、monorepo 迁移 | [best-practices-migration](references/best-practices-migration.md)     |
| 性能       | 安装优化、store 缓存与 workspace 并行化            | [best-practices-performance](references/best-practices-performance.md) |
