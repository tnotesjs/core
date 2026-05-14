---
name: "VitePress 组件默认规则"
description: "在编辑 `vitepress/components/**` 时使用。覆盖宿主组件职责、composable 边界、共享模块提升和 DOM 副作用落位。"
applyTo:
  - "vitepress/components/**"
---

# VitePress 组件默认规则

- 功能入口或宿主组件负责状态声明、环境接线、数据流编排和副作用管理；不要把编排逻辑散落到多个子组件里。
- 不是每个组件都要拆 composable；只有在功能内响应式逻辑已经形成明确子域时再拆。
- composable 只负责单一功能子域，不为单次复用提前抽象，也不要默认绑定页面级上下文。
- 跨功能复用的 UI、常量、工具或 data 输入应提升到 `vitepress/components/` 根层共享模块，不要让兄弟功能目录横向依赖彼此的私有模块。
- DOM、浏览器 API 与命令式副作用放在宿主组件、边界 composable 或 `core/` 辅助模块中，不要散落到多个叶子组件。
- 如果问题变成 theme、config、plugin 或 data loader 的层级决策，改用 [./vitepress-runtime.instructions.md](./vitepress-runtime.instructions.md) 和 [../../skills/vitepress-runtime/SKILL.md](../../skills/vitepress-runtime/SKILL.md)。
