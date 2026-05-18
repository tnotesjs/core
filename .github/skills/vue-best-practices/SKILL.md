---
name: vue-best-practices
description: 必须用于 Vue.js 任务。强烈建议以 Composition API、`<script setup>` 和 TypeScript 作为标准做法。覆盖 Vue 3、SSR、Volar、vue-tsc。处理任何 Vue、.vue 文件、Vue Router、Pinia，或基于 Vue 的 Vite 工作时加载。除非项目明确要求，否则始终使用 Composition API。
---

# Vue Best Practices Workflow

将这个 skill 作为一套指令来使用。除非用户明确要求改变顺序，否则按当前工作流依次执行。

## 核心原则

- **让状态保持可预测：** 单一事实来源，其余内容都从中派生。
- **让数据流显式可见：** 大多数场景遵循 Props 下传、Events 上抛。
- **优先小而专注的组件：** 更易测试、复用和维护。
- **避免不必要的重复渲染：** 谨慎使用 computed 和 watchers。
- **可读性很重要：** 编写清晰、具有自解释性的代码。

## 1) 编码前先确认架构（必需）

- 默认技术栈：Vue 3 + Composition API + `<script setup lang="ts">`。
- 如果项目明确使用 Options API，且有可用 skill，则加载 `vue-options-api-best-practices`。
- 如果项目明确使用 JSX，且有可用 skill，则加载 `vue-jsx-best-practices`。

### 1.1 必读核心参考（必需）

- 在实现任何 Vue 任务之前，务必先阅读并应用这些核心参考：
  - `references/reactivity.md`
  - `references/sfc.md`
  - `references/component-data-flow.md`
  - `references/composables.md`
- 在整个任务期间都要将这些参考保持在当前工作上下文中，而不是只在出现具体问题时再看。

### 1.2 编码前先规划组件边界（必需）

对于任何不算简单的功能，实现前都先给出一份简要的组件地图。

- 用一句话定义每个组件的单一职责。
- 默认将入口组件、根组件和路由级 view 组件保持为组合与编排表面。
- 除非任务本来就是一个很小的单文件 demo，否则把 feature UI 和 feature 逻辑从入口/根/view 组件中拆出去。
- 在组件地图中定义每个子组件的 props/emits 契约。
- 当新增组件不止一个时，优先采用按 feature 分组的目录布局（`components/<feature>/...`、`composables/use<Feature>.ts`）。

## 2) 应用 Vue 的基础必修项（必需）

这些是必须掌握的基础项。每个 Vue 任务都要结合 `1.1` 中已经加载的核心参考，完整应用这些原则。

### 响应式

- `1.1` 中的必读参考：[reactivity](references/reactivity.md)
- 将源状态保持在最小范围内（`ref`/`reactive`），能用 `computed` 派生的都不要重复存储。
- 需要处理副作用时再使用 watchers。
- 避免在模板里重复计算高开销逻辑。

### SFC 结构与模板安全

- `1.1` 中的必读参考：[sfc](references/sfc.md)
- SFC 各部分顺序保持为：`<script>` → `<template>` → `<style>`。
- 让 SFC 只承担聚焦的职责；大组件要拆分。
- 保持模板声明式，把分支逻辑和派生逻辑移到 script 中。
- 遵守 Vue 模板安全规则（`v-html`、列表渲染、条件渲染选择等）。

### 保持组件聚焦

当一个组件承担了**不止一个明确职责**时，就应该拆分（例如同时负责数据编排与 UI，或者包含多个相互独立的 UI 区块）。

- 相比一个“巨型组件”，优先选择**更小的组件 + composables**。
- 将 **UI 区块** 拆到子组件里（props 传入，events 抛出）。
- 将 **状态/副作用** 移到 composables（`useXxx()`）中。

采用客观的拆分触发条件。只要满足**任一**条件，就拆分组件：

- 它同时拥有编排/状态逻辑，以及多个区块的大量展示性模板。
- 它包含 3 个及以上彼此独立的 UI 区块（例如：表单、筛选区、列表、页脚/状态区）。
- 模板中的某个区块已经重复出现，或明显具备复用潜力（如列表项、卡片、行项）。

入口/根组件与路由 view 组件规则：

- 让入口/根组件和路由 view 组件保持轻量：只负责应用壳层/布局、provider 接线和 feature 组合。
- 当某个 feature 内部包含相对独立的部分时，不要把完整实现都堆在 entry/root/view 组件里。
- 对于 CRUD/列表类 feature（todo、table、catalog、inbox），至少拆成：
  - feature container component
  - input/form component
  - list (and/or item) component
  - footer/actions or filter/status component
- 只有在非常小、一次性的 demo 场景下才允许单文件实现；如果这样做，必须明确说明为什么不需要拆分。

### 组件数据流

- `1.1` 中的必读参考：[component-data-flow](references/component-data-flow.md)
- 以 props 下传、events 上抛作为主要模型。
- 只有在确实需要双向组件契约时才使用 `v-model`。
- 只有在深层组件树依赖或共享上下文场景下才使用 provide/inject。
- 通过 `defineProps`、`defineEmits` 和必要时的 `InjectionKey`，让契约保持显式且具备类型约束。

### Composables

- `1.1` 中的必读参考：[composables](references/composables.md)
- 当逻辑可复用、具有状态，或副作用较重时，将其提取到 composables 中。
- 保持 composable API 小而清晰，并具备类型约束和可预测性。
- 将 feature 逻辑与展示型组件分离。

## 3) 仅在需求明确要求时才考虑可选特性

### 3.1 标准可选特性

不要默认引入这些特性。只有存在明确需求时，才加载对应参考。

- Slots：父组件需要控制子组件内容或布局时 -> [component-slots](references/component-slots.md)
- Fallthrough attributes：包装组件或基础组件需要安全透传 attrs/events 时 -> [component-fallthrough-attrs](references/component-fallthrough-attrs.md)
- 内置组件 `<KeepAlive>`：用于有状态 view 的缓存 -> [component-keep-alive](references/component-keep-alive.md)
- 内置组件 `<Teleport>`：用于 overlays/portals -> [component-teleport](references/component-teleport.md)
- 内置组件 `<Suspense>`：用于异步子树的 fallback 边界 -> [component-suspense](references/component-suspense.md)
- 与动画相关的特性：选择与所需动效行为匹配的最简单方案。
  - 内置组件 `<Transition>`：用于进入/离开效果 -> [transition](references/component-transition.md)
  - 内置组件 `<TransitionGroup>`：用于带动画的列表变更 -> [transition-group](references/component-transition-group.md)
  - 基于 class 的动画：适用于非进入/离开类动效 -> [animation-class-based-technique](references/animation-class-based-technique.md)
  - 状态驱动动画：适用于由用户输入驱动的动画 -> [animation-state-driven-technique](references/animation-state-driven-technique.md)

### 3.2 较少使用的可选特性

只有在产品或技术层面存在明确需要时才使用这些特性。

- Directives：行为强依赖 DOM，且不适合抽成 composable/component 时 -> [directives](references/directives.md)
- 异步组件：体积大或低频使用的 UI 应懒加载时 -> [component-async](references/component-async.md)
- 仅当模板无法表达需求时才使用 render functions -> [render-functions](references/render-functions.md)
- 当某种行为必须以全局方式安装到应用中时使用 plugins -> [plugins](references/plugins.md)
- 状态管理模式：当跨越 feature 边界存在全应用共享状态时 -> [state-management](references/state-management.md)

## 4) 先保证行为正确，再做性能优化

性能优化属于功能完成后的后置步骤。不要在核心行为实现并验证完成之前提前优化。

- 大列表渲染瓶颈 -> [perf-virtualize-large-lists](references/perf-virtualize-large-lists.md)
- 静态子树发生不必要的重复渲染 -> [perf-v-once-v-memo-directives](references/perf-v-once-v-memo-directives.md)
- 热路径列表中存在过度抽象 -> [perf-avoid-component-abstraction-in-lists](references/perf-avoid-component-abstraction-in-lists.md)
- 高开销更新触发过于频繁 -> [updated-hook-performance](references/updated-hook-performance.md)

## 5) 完成前的最终自检

- 核心行为可以正常工作，且符合需求。
- 所有必读参考都已经阅读并落实。
- 响应式模型保持最小化且可预测。
- 已遵守 SFC 结构与模板规则。
- 组件保持聚焦，并在需要时做了合理拆分。
- 除非明确属于小型 demo 特例，否则 entry/root 和 route view 组件仍保持为组合表面。
- 组件拆分决策是显式且站得住脚的（职责边界清晰）。
- 数据流契约显式且具备类型约束。
- 在复用性或复杂度足以支撑时使用了 composables。
- 在适用时，已经把状态/副作用迁移到 composables。
- 只有在需求明确要求时才使用可选特性。
- 只有在功能完成后才进行了性能相关改动。
