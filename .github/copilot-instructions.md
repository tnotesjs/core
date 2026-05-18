# @tnotesjs/core 开发规范

## 通用指令清单

| 通用指令 | 描述 |
| --- | --- |
| [governance](./instructions/common/governance.instructions.md) | copilot 定制文件治理指令 |
| [workflow](./instructions/common/workflow.instructions.md) | 通用工作流指令 |

## 私有指令清单

| 私有指令 | 描述 |
| --- | --- |
| [core](./instructions/private/core.instructions.md) | @tnotesjs/core 私有规则指令 |
| [header-comments](./instructions/private/header-comments.instructions.md) | 文件头注释指令 |
| [import-order](./instructions/private/import-order.instructions.md) | import 排序指令 |
| [pnpm](./instructions/private/pnpm.instructions.md) | pnpm 依赖管理指令 |
| [private-number-name](./instructions/private/private-number-name.instructions.md) | 私有标识符命名指令 |
| [typescript](./instructions/private/typescript.instructions.md) | TypeScript 指令 |
| [variable-order](./instructions/private/variable-order.instructions.md) | 变量顺序指令 |

## 技能清单

| 技能 | 描述 |
| --- | --- |
| [diagnose](./skills/diagnose/SKILL.md) | 问题诊断技能 |
| [grill-me](./skills/grill-me/SKILL.md) | 需求追问技能 |
| [grill-with-docs](./skills/grill-with-docs/SKILL.md) | 文档化追问技能 |
| [handoff](./skills/handoff/SKILL.md) | 对话交接技能 |
| [improve-codebase-architecture](./skills/improve-codebase-architecture/SKILL.md) | 代码架构改进技能 |
| [pinia](./skills/pinia/SKILL.md) | Pinia 状态管理技能 |
| [pnpm](./skills/pnpm/SKILL.md) | pnpm 依赖管理技能 |
| [tdd](./skills/tdd/SKILL.md) | 测试驱动开发技能 |
| [vite](./skills/vite/SKILL.md) | Vite 构建工具技能 |
| [vitepress-runtime](./skills/vitepress-runtime/SKILL.md) | VitePress 运行时扩展技能 |
| [vitest](./skills/vitest/SKILL.md) | Vitest 测试框架技能 |
| [vue-best-practices](./skills/vue-best-practices/SKILL.md) | Vue 最佳实践技能 |
| [vue-testing-best-practices](./skills/vue-testing-best-practices/SKILL.md) | Vue 测试最佳实践技能 |
| [web-design-guidelines](./skills/web-design-guidelines/SKILL.md) | Web 界面设计技能 |
| [zoom-out](./skills/zoom-out/SKILL.md) | 模块地图技能 |

## 项目知识库

| domain 文档              | 描述         |
| ------------------------ | ------------ |
| [CONTEXT](../CONTEXT.md) | 领域词汇表   |
| [docs/adr](../docs/adr/) | 架构决策记录 |

## 演进协议

当出现以下信号时，提醒用户可能需要更新相关信息：

1. 发现项目当前的实现和知识库描述出现冲突 => 提醒用户更新项目知识库信息
2. 用户需求明确违反某条要求规则或者 skill 要求 => 提醒用户更新相关规则或 skill

响应方式：指出当前规则的冲突或覆盖缺口，给出更新建议，并询问是否需要更新相关文档。若用户确定修订，则将更新后的描述写入对应的项目知识库文件或 `.github/instructions/**/*.instructions.md` 或 `.github/skills/**/*.md` 中。
