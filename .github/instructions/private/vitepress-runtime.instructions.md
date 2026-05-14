---
name: "VitePress 运行时默认规则"
description: "在编辑 vitepress/config、vitepress/configs、vitepress/theme、vitepress/plugins 或 `vitepress/components/*.data.ts` 时使用。覆盖层级归属、构建期 Node 边界和 SSR 安全边界。"
applyTo:
  - "vitepress/config/**"
  - "vitepress/configs/**"
  - "vitepress/theme/**"
  - "vitepress/plugins/**"
  - "vitepress/components/*.data.ts"
---

# VitePress 运行时默认规则

- 先判断问题属于 config、theme、plugin 还是 data loader，再决定修改落点；不要把不同层级的职责混在一起。
- `vitepress/config/**` 与 `vitepress/configs/**` 是公共运行时边界；新增默认能力时优先提供稳定默认值和显式 override 点。
- `PluginOption`、`configureServer`、`handleHotUpdate`、`optimizeDeps`、`resolve.dedupe` 这类 Vite / 构建期能力留在 config 或 plugins 层，不下沉到 theme 或组件层。
- `*.data.ts` 运行在构建期 Node 上下文，只返回小而稳定、可序列化的数据，不引入浏览器 API。
- 浏览器 API、DOM 与浏览器专属库必须放在生命周期、环境判断、`<ClientOnly>` 或动态导入之后，不能在模块顶层直接访问。
- 如果问题变成 `vitepress/components/**` 内部的目录划分、composable 拆分或 DOM 副作用落位，改用 [./vue-architecture.instructions.md](./vue-architecture.instructions.md) 和 [../../skills/vue-architecture/SKILL.md](../../skills/vue-architecture/SKILL.md)。
