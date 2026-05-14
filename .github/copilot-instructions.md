# @tnotesjs/core 开发规范

## 指令分层

- 通用协作规则：见 [instructions/common/workflow.instructions.md](./instructions/common/workflow.instructions.md)
- 通用前端规则：见 [instructions/common/frontend.instructions.md](./instructions/common/frontend.instructions.md)
- 项目私有规则：见 [instructions/private/core.instructions.md](./instructions/private/core.instructions.md)
- 定制文件治理规则：见 [instructions/private/governance.instructions.md](./instructions/private/governance.instructions.md)
- Vitest 默认规则：见 [instructions/private/vitest.instructions.md](./instructions/private/vitest.instructions.md)
- pnpm 默认规则：见 [instructions/private/pnpm.instructions.md](./instructions/private/pnpm.instructions.md)
- VitePress 运行时默认规则：见 [instructions/private/vitepress-runtime.instructions.md](./instructions/private/vitepress-runtime.instructions.md)
- VitePress 组件默认规则：见 [instructions/private/vue-architecture.instructions.md](./instructions/private/vue-architecture.instructions.md)

## 项目知识入口

- 领域词汇表：见 [../CONTEXT.md](../CONTEXT.md)
- 架构决策记录：见 [../docs/adr/](../docs/adr/)
- pnpm 包管理 skill：见 [skills/pnpm/SKILL.md](./skills/pnpm/SKILL.md)
- Vitest 工具 skill：见 [skills/vitest/SKILL.md](./skills/vitest/SKILL.md)
- VitePress 运行时扩展 skill：见 [skills/vitepress-runtime/SKILL.md](./skills/vitepress-runtime/SKILL.md)
- VitePress 组件架构设计 skill：见 [skills/vue-architecture/SKILL.md](./skills/vue-architecture/SKILL.md)

注意：链接文档适合承载详细说明，但不能假设代理一定会沿链接自动递归读取。真正必须命中的规则，应该直接写在本文件或对应的 .instructions.md 中。

## 指令、Skill 演进协议

当出现以下信号时，提醒用户当前的指令或 skill 可能需要修订：

1. 用户明确反对某条要求
2. 用户的需求超出 skill 覆盖范围
3. 用户反复用同一模式违反同一条非底线规则：同一类代码出现 2 次以上违反同一条规则，且用户未表示反对

响应方式：指出当前规则的冲突或覆盖缺口，询问是否需要修订指令或 skill；如果修订，将新规则写入对应的 `.github/instructions/**/*.instructions.md` 或 `.github/skills/**/*.md`。

## 常用验证命令

- `pnpm exec vue-tsc -p tsconfig.build.json --noEmit`
- `pnpm lint`
