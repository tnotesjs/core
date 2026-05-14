---
name: "定制文件治理规则"
description: "在创建、重命名或重组 .github 下的 Copilot 定制文件时使用。覆盖总入口与细分规则的分层、目录命名、可移植性，以及何时使用 copilot-instructions.md、*.instructions.md 与 skill。"
applyTo:
  - ".github/copilot-instructions.md"
  - ".github/instructions/**"
---

# 定制文件治理规则

- 项目级总入口只保留一个：`.github/copilot-instructions.md`。
- 总入口只放所有任务都成立的硬规则和导航，不堆长篇背景说明。
- 细分规则统一放在 `.github/instructions/` 下，允许按 `common/`、`private/` 等子目录继续分层；VS Code 会递归扫描这些子目录。
- `common/` 放可跨项目复制的规则；`private/` 放当前仓库独有规则。
- 目录承担 scope，文件名只保留 topic，统一使用 `<topic>.instructions.md`。
- 通用规则不要写死项目名、目录名或当前仓库特例；私有规则不要重复通用规则已覆盖的内容。
- 如果某份知识本质上是“默认要遵守的行为”，优先写成真正的 `.instructions.md`；如果本质上是“按需加载的一套流程或能力”，优先保留为 skill。
- 如果某类规则只对部分目录或部分文件生效，继续拆分单一职责 instruction 文件，不要继续堆回总入口。
- 当前仓库的分层基线以 `common/workflow`、`common/frontend`、`private/core`、`private/governance` 为底座；测试、包管理、VitePress 运行时和组件架构等领域默认规则按需继续下沉到 `private/`。
