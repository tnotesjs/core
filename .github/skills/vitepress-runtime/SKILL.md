---
name: vitepress-runtime
description: 'VitePress 运行时扩展规范。适用于当前仓库这类封装或扩展 VitePress 的工具项目：当用户讨论 defineConfig 工厂、transformPageData、theme 入口、enhanceApp、Layout 插槽、*.data.ts、SSR 边界，或 `PluginOption`、`configureServer`、`handleHotUpdate`、`optimizeDeps`、`resolve.dedupe` 这类 VitePress 内的 Vite 表面时使用。'
argument-hint: '描述你要处理的 VitePress config、嵌套 vite 配置、theme、plugins、*.data.ts 或 SSR 问题'
user-invocable: true
disable-model-invocation: false
---

# VitePress 运行时扩展规范

## 适用范围

适用于以下表面及其相互接线：

- `vitepress/config/**`
- `vitepress/theme/**`
- `vitepress/plugins/**`
- `vitepress/components/*.data.ts`
- `vitepress/config/**` 中嵌套的 `vite.*` 配置
- VitePress 运行时相关的 SSR / 浏览器边界处理

当前仓库不是普通的 VitePress 站点内容仓库，而是一个基于 VitePress 的知识库管理工具。这里真正需要被规范的是“如何封装和扩展 VitePress 运行时”，而不是“如何写 Markdown 页面”。

## 何时使用

- 需要新增或修改 `defineConfig()` 工厂函数
- 需要调整主题入口、`extends: DefaultTheme`、`Layout`、`enhanceApp`
- 需要注册全局组件，或向默认主题插槽注入能力
- 需要新增、修改、排查 `*.data.ts` data loader
- 需要调整 `transformPageData`、`optimizeDeps`、`resolve.dedupe`、`define` 这类嵌套 `vite` 配置
- 需要编写或维护 `PluginOption`、`configureServer`、`handleHotUpdate` 一类插件逻辑
- 需要处理 VitePress 组件中的 SSR 兼容问题
- 需要把某个能力放到 VitePress plugin、theme、config 或组件之间的正确层级

## 何时不要使用

- 讨论 `vitepress/components/**` 内部的组件目录组织、子组件拆分、composable 拆分
  这类问题使用 [../vue-architecture/SKILL.md](../vue-architecture/SKILL.md)
- 讨论 Markdown 内容写法、代码块样式、部署 recipes、多语言站点运营
- 讨论 CLI、services、utils、config 契约等非 VitePress 运行时问题
- 单纯因为看到 `vite` 字样就想套用通用 Vite 站点或 Vite 8 迁移手册

## 当前仓库里的 VitePress 运行时表面

当前仓库最关键的运行时表面如下：

- 配置工厂：对外暴露 `defineNotesConfig()`，把默认站点配置、Vite 配置、插件注入、页面数据处理统一封装在一起
- 主题入口：对外暴露 `defineNotesTheme()`，负责扩展默认主题、注册全局组件、挂接运行时监听
- 主题组件：以源码形式发布给宿主仓库的 VitePress 处理
- data loader：通过 `*.data.ts` 在构建期读取本地文件，并把结果序列化到客户端
- SSR 边界：组件和主题代码会同时经历服务端预渲染与客户端激活

这份 skill 只服务这些表面，不延伸到普通站点作者工作流。

## 核心原则

### 1. 配置工厂是公共运行时边界

`vitepress/config/**` 不只是内部实现，它还是宿主仓库的消费入口。新增能力时优先考虑：

- 宿主仓库是否需要改代码适配
- 是否应该通过 typed overrides 暴露扩展点
- 是否会改变对外默认行为

优先在配置工厂中做“稳定的默认值 + 明确的覆盖点”，不要把宿主差异写成隐式分支。

### 2. 主题入口负责运行时编排，不负责细节堆叠

`vitepress/theme/index.ts` 是主题级装配点，适合放：

- `extends: DefaultTheme`
- `Layout` 入口
- `enhanceApp` 中的全局组件注册
- 运行时监听、provide / inject 根级接线

不适合把复杂的 DOM 细节或某个组件内部状态机堆在这里。主题入口负责装配，不负责吞掉所有实现细节。

### 3. 优先扩展默认主题，再考虑完全替换

如果目标只是：

- 在既有插槽前后插入 UI
- 注册全局组件供 Markdown 或主题使用
- 调整样式变量或增加少量运行时能力

优先使用 `extends: DefaultTheme` 和 `Layout` 插槽扩展。

只有当默认主题的结构已经不够承载目标能力时，才考虑更重的自定义布局或更深层替换。

### 4. plugin 属于 config 层，不属于 theme 或组件层

凡是以下能力，应优先考虑放在 `vitepress/config/**` 或 `vitepress/plugins/**`：

- 构建期或 dev server 期钩子
- Vite 层插件注入
- 页面数据转换
- 与文件系统、HMR、构建过程耦合的能力

不要把本该属于 config / plugin 的逻辑下沉到主题组件里。

当前仓库里出现的很多“Vite 问题”其实都属于这一层，例如：

- `PluginOption`
- `configureServer`
- HMR 事件桥接
- `optimizeDeps`
- `resolve.dedupe`

这些问题默认仍归本 skill，而不是单独拆给一个通用 Vite skill。

### 5. data loader 是构建期 Node 能力，不是浏览器能力

`*.data.ts` 的基本纪律：

- 运行在构建期 Node.js 上下文
- 可以读取本地文件、解析目录、监听文件变化
- 输出会被序列化进客户端包，因此返回值要尽量小、稳定、可序列化

不要在 `*.data.ts` 中引入浏览器 API，也不要把大体积、低筛选的数据整包塞进客户端。

### 6. SSR 边界必须显式处理

VitePress 会在构建阶段预渲染页面。任何浏览器专属能力都必须放在安全边界之后：

- 生命周期中访问 `window` / `document`
- `import.meta.env.SSR` 判断
- `<ClientOnly>`
- 动态导入浏览器专属库

不要在模块顶层直接访问 DOM 或浏览器对象。

### 7. 运行时 API 与组件架构要分层

如果问题是“这个能力应该放在 config、theme、plugin 还是 data loader”，使用本 skill。

如果问题是“某个组件目录怎么拆、composable 怎么分、DOM 副作用怎么落在组件内部”，使用 [../vue-architecture/SKILL.md](../vue-architecture/SKILL.md)。

### 8. 站点作者知识不是本 skill 的目标

下列内容即使存在于上游 VitePress 文档，也不应直接搬进这份 skill：

- Markdown 写作技巧
- 代码块展示样式
- 部署 recipes
- 多语言站点配置
- 面向普通站点维护者的主题配置菜单说明

这份 skill 的目标是帮助代理维护一个“基于 VitePress 的工具型核心仓库”。

### 9. 当前仓库暂不单独接入通用 Vite skill

原因有两个：

- 当前仓库里的 Vite 暴露面主要附着在 VitePress config 和 VitePress plugins 上，不是独立的通用 Vite 应用或独立 Vite 插件仓库
- 上游 `vite` skill 带有较多通用站点 / Vite 8 迁移语境，和当前仓库的真实使用面不完全一致

因此，当前仓库里的 Vite 相关问题默认先归到本 skill；只有将来出现独立的 `vite.config.ts`、更重的通用 Vite 插件开发或更广的 Vite 构建表面时，才再考虑单独拆 skill。

## 分支决策

| 场景 | 处理方式 |
| ---- | -------- |
| 需要为宿主仓库暴露新的 VitePress 默认配置 | 在 `vitepress/config/**` 中增加 typed API 或 override 点 |
| 需要在文档布局前后插入 UI | 优先扩展默认主题 `Layout` 插槽 |
| 需要让组件能在 Markdown 或主题里全局使用 | 在 `enhanceApp` 中注册全局组件 |
| 需要构建期读取本地文件并热更新 | 使用 `*.data.ts` 的 `watch` + `load` |
| 需要处理页面级原始 Markdown 或 build-time metadata | 优先考虑 `transformPageData` 或 data loader |
| 需要接入浏览器专属库 | 用生命周期、`ClientOnly` 或动态导入包住 |
| 需要在 dev/build 生命周期接线 | 放到 VitePress config / plugin 层，而不是组件层 |
| 需要调整组件目录、composable 边界 | 回到 `vue-architecture` skill |

## 阅读顺序

当问题落在当前仓库的 VitePress 运行时表面时，优先阅读：

1. `vitepress/config/index.ts`
2. `vitepress/theme/index.ts`
3. 相关 `vitepress/plugins/*.ts`
4. 相关 `vitepress/components/*.data.ts`

## 检查清单

在完成 VitePress 相关改动前，至少确认：

- 这次改动落在 config / theme / plugin / data loader 的正确层级
- 宿主仓库升级后是否仍能直接运行
- 是否引入了新的 SSR 风险
- 是否把浏览器能力错误地放进了构建期 Node 上下文
- 是否和 [../vue-architecture/SKILL.md](../vue-architecture/SKILL.md) 的职责边界发生重叠

## 参考映射

这份 skill 提炼自上游 VitePress 文档中的以下几块知识，但已经按当前仓库场景重新收窄：

- 主题接口与 `enhanceApp`
- 默认主题扩展与 Layout 插槽
- build-time data loading
- SSR 兼容边界

未纳入的部分不代表无用，只是它们更偏普通站点作者工作流，不适合作为当前仓库的默认 skill。
