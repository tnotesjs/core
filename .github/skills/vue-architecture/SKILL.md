---
name: vue-architecture
description: 'VitePress 组件架构设计规范。覆盖 vitepress/components 下的宿主组件、功能目录、composable 拆分、DOM 副作用边界与数据流设计。当用户讨论 Layout、Settings、Markdown 嵌入组件如何组织，或 composable 怎么拆时使用。'
argument-hint: '描述组件目录、功能职责、当前遇到的问题'
user-invocable: true
disable-model-invocation: false
---

# Vue / VitePress 组件架构规范

## 适用范围

适用于 `vitepress/components/**` 及其紧邻的支撑文件（如 `*.data.ts`、`constants.ts`、`utils.ts`）的组件设计讨论。

当前仓库不是传统的路由页面应用，而是围绕以下几类入口组织：

- VitePress 主题插槽和布局扩展
- Markdown 中直接使用的嵌入式组件
- 依赖 data loader、路由、浏览器 API 的知识库增强能力

## 组件类型

| 类型 | 职责 | 典型例子 |
| ---- | ---- | -------- |
| 宿主组件 | 挂在 VitePress 插槽或功能目录入口，负责状态声明、环境接线、数据流编排、生命周期管理 | `Layout/Layout.vue`、`Settings/SettingsDialog.vue` |
| 功能目录 | 围绕一个能力组织目录，包含一个明确入口 SFC，以及按需拆出的 `components/`、`composables/`、`core/` | `Layout/`、`Settings/` |
| 叶子组件 | 单一展示或单一交互组件，通常可保持单文件或极小目录，不强制引入 composable | `Tooltip/Tooltip.vue`、`BilibiliOutsidePlayer/BilibiliOutsidePlayer.vue` |
| 支撑模块 | 多个功能目录共享的只读数据、常量或工具，不属于某个 UI 层级 | `notesConfig.data.ts`、`sidebar.data.ts`、`constants.ts`、`utils.ts` |

## 推荐目录结构

```text
vitepress/components/{Feature}/
  {Feature}.vue              ← 功能入口，不强制使用 index.vue
  components/                ← 私有子组件
  composables/               ← 依赖 Vue 响应式的功能内逻辑
  core/                      ← 独立于 Vue 的纯逻辑、DOM 算法、解析器
```

补充约束：

- 目录下必须有一个“显式入口”，但入口文件名应贴合仓库现状，不强制统一成 `index.vue`
- `*.data.ts` 只在它明显只服务单一功能目录时才局部放置；若被多个目录依赖，应提升到 `vitepress/components/` 根层
- 跨功能复用的逻辑不要藏在某个功能目录内部，应提升为根层共享模块

## 目录归属判定

| 内容 | 优先归属 | 判定标准 |
| ---- | -------- | -------- |
| 功能入口 SFC | `{Feature}/{Feature}.vue` | 需要接 VitePress 插槽、route、data loader、localStorage、window/document |
| 功能内 composable | `{Feature}/composables/` | 依赖 `ref`、`computed`、`watch` 等 Vue 响应式 API |
| 私有子组件 | `{Feature}/components/` 或同目录下具名 SFC | 只服务当前功能目录的单一 UI 区域 |
| 纯逻辑/DOM 算法 | `{Feature}/core/` 或同目录纯函数文件 | 不依赖 Vue，可被测试或独立复用 |
| 共享 data loader / 常量 / 工具 | `vitepress/components/*.data.ts`、`constants.ts`、`utils.ts` 或新增清晰命名的根层模块 | 被多个功能目录消费，或属于 VitePress 运行时基础设施 |

## 设计原则

### 1. 宿主组件是“多关注点功能”的架构中心

当一个功能同时涉及多块 UI、多个副作用域，或既要读 VitePress 环境又要编排多个逻辑单元时，入口 SFC 应承担以下职责：

- 声明跨子组件或跨 composable 的共享状态
- 接入 `useData()`、`useRoute()`、data loader、`localStorage`、`window` / `document`
- 编排 composable 和子组件之间的数据流
- 管理初始化、清理和插槽接线

### 2. 不是每个组件都要拆 composable

如果组件只是：

- 一段简单渲染
- 少量局部状态
- 单一副作用
- 不需要在同目录内复用的逻辑

优先保持单文件组件，不要为了“看起来规范”强拆 composable。

### 3. composable 只封装“功能内响应式逻辑”

composable 适合承载以下内容：

- 宿主组件中能明显独立出来的一块响应式状态机
- 与某个功能目录强相关的派生状态、watch、原子方法
- 需要和宿主组件通过显式参数协作的逻辑单元

composable 不应默认假设“页面级上下文”；它服务的是功能目录或宿主组件，而不是 `src/views` 页面。

### 4. 子组件只负责一个清晰的 UI 区域或交互面

子组件的主要职责是：

- 渲染一块局部 UI
- 接收 props 或 inject 后展示数据
- 通过事件向上表达用户意图

涉及多个子区域、多个 composable、多个环境输入的编排逻辑，应回到宿主组件。

### 5. DOM 与浏览器 API 属于边界层

`querySelector`、`MutationObserver`、`ResizeObserver`、`window`、`document`、`localStorage` 这类命令式能力，应尽量放在：

- 宿主组件
- 专门的边界 composable
- `core/` / 纯函数辅助模块

不要把同一类 DOM 细节散落到多个兄弟子组件里。

### 6. 跨功能复用优先提升，而不是横向借用

如果某段逻辑被多个功能目录使用：

- 共享 UI → 提升为根层独立组件目录
- 共享常量 / 工具 → 提升到根层模块
- 共享 data loader 输入 → 提升到根层 `*.data.ts`

不要让 `Layout/composables/*` 之类的私有模块被其他功能目录直接依赖。

## 子组件拆分信号

出现以下任一信号时，应考虑把宿主组件中的片段拆为子组件：

1. 对应一个独立插槽区域、面板或工具条
2. 有自己的局部状态或完整交互链路
3. 需要单独命名才能让宿主组件继续可读
4. 模板已经混合“结构、事件、业务判断”，导致宿主组件只剩下堆叠细节

拆分目标不是“把文件拆小”，而是让宿主组件只保留编排和边界接线。

---

## 架构导航

### Composable 架构规范

当需要了解以下内容时，请读取 [COMPOSABLES-ARCHITECTURE.md](./COMPOSABLES-ARCHITECTURE.md)：

- 何时该拆 composable，何时不该拆
- 宿主组件与 composable 的状态边界
- data loader、VitePress API、DOM 副作用如何落位
- composable 的参数、返回值和编排边界
- 扁平化功能目录的拆分方式

### 端到端示例

当需要参考具体落地模式时，请读取 [COMPOSABLES-E2E.md](./COMPOSABLES-E2E.md)：

- `Layout/` 这种宿主型功能目录的组织方式
- 轻量叶子组件为何不必强拆
- DOM 较重的组件如何逐步抽出边界逻辑
