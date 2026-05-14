# VitePress 功能目录 Composable 架构规范

## 适用范围

适用于 `vitepress/components/{Feature}/composables/**` 以及拥有明确宿主组件的功能目录。

不适用于：

- 只有少量局部状态的轻量叶子组件
- 根层共享 `*.data.ts`、`constants.ts`、`utils.ts` 这类基础设施文件
- `vitepress/components/**` 之外的 CLI、service、config 代码

## 术语定义

- **宿主组件**：某个功能目录的入口 SFC，负责环境接线、共享状态声明和编排
- **共享状态**：在同一功能目录内被多个 composable、子组件或插槽区域消费的响应式状态
- **局部状态**：只在单个 composable 或单个叶子组件内部使用的状态
- **环境输入**：`useData()`、`useRoute()`、data loader、`window`、`document`、`localStorage` 等运行时输入
- **原子方法**：只操作当前 composable 自身输入范围的方法
- **编排方法**：协调多个 composable、多个子组件或多个副作用域的方法
- **DOM 边界逻辑**：依赖选择器、监听器、观察器和浏览器事件的命令式逻辑
- **服务依赖**：非响应式外部能力，如保存函数、解析器、bridge、fetcher

## 核心原则

### 1. 先判断是否真的需要 composable

如果一个组件只包含以下特征，就先留在单文件组件内：

- 1 到 2 个局部 `ref` / `computed`
- 单一副作用或单一交互链路
- 没有被同目录其他模块复用的响应式逻辑

只有当出现下面信号时，再引入 composable：

- 宿主组件里存在两块以上可独立命名的响应式关注点
- 某块逻辑既需要状态，又需要 watch / lifecycle / 派生值
- 同目录多个子区域共享同一块功能状态

> ✅ checkpoint：不是因为“规范要求”而拆 composable，而是为了让宿主组件重新可读。

### 2. 共享状态的 owner 是宿主组件，不是抽象的“路由页层”

当前仓库没有 `src/views` 页面概念。真正负责共享状态所有权的是**功能目录的宿主组件**。

判定标准：

- 一个状态只被一个 composable 使用 → 可以留在 composable 内部
- 一个状态被多个 composable / 子组件 / 插槽区域共享 → 必须提升到宿主组件
- data loader 导入的数据默认视为只读输入，不要把它误当成可写共享状态

```vue
<script setup lang="ts">
import { computed, readonly, ref } from 'vue'

const modalOpen = ref(false)
const activeNoteId = ref<string | null>(null)
const draftTitle = ref('')
const draftDescription = ref('')

const noteDraft = useNoteDraft({
  activeNoteId: readonly(activeNoteId),
  draftDescription,
  draftTitle,
  modalOpen,
})

const noteSave = useNoteSave({
  activeNoteId: readonly(activeNoteId),
  draftDescription: readonly(draftDescription),
  draftTitle: readonly(draftTitle),
})

const hasChanges = computed(() => noteDraft.hasChanges.value)
</script>
```

> ✅ checkpoint：被多个逻辑单元消费的状态在宿主组件声明；composable 不悄悄创建 feature 级共享状态。

### 3. 环境输入尽量集中在边界层

`useData()`、`useRoute()`、导入的 data loader、`window` / `document` / `localStorage` 等输入，优先在宿主组件或专门的边界 composable 中获取，再把必要的派生值传给其他 composable。

例外只有一种：该 composable 的存在本身就是为了封装某个环境边界，例如 `useRedirect()`、`useSidebarLayout()` 这一类 bridge。

```ts
const route = useRoute()
const { page } = useData()

const currentNoteId = computed(() => resolveNoteId(page.value.relativePath))

const redirect = useRedirect({
  allNotesConfig,
  currentPath: computed(() => route.path),
})
```

> ✅ checkpoint：同一个环境输入不会在多个兄弟 composable 中被重复拉取和解释。

### 4. 同层 composable 扁平编排，不横向依赖

同一功能目录下的 composable 应由宿主组件扁平化组合，不互相 import、互相实例化，或暗中依赖对方返回值。

如果 A 需要 B 的结果，优先用以下方式处理：

- 宿主组件持有共享 `ref`，分别传给 A 和 B
- 宿主组件定义编排方法，顺序调用 A / B
- 抽出纯函数工具，而不是新增一层 feature-specific composable 嵌套

> ✅ checkpoint：删除任意一个同层 composable 后，其他 composable 不需要改内部依赖关系。

### 5. composable 的边界要通过参数和返回面表达清楚

当 composable 输入超过 2 个，或同时混合 `ref`、配置项、外部依赖时，使用 options interface。

建议按 `config`、`states`、`services` 三段组织：

```ts
interface UseNoteSaveOptions {
  // config
  isDev: boolean

  // states
  activeNoteId: Readonly<Ref<string | null>>
  draftTitle: Readonly<Ref<string>>
  isSaving: Ref<boolean>

  // services
  writeNoteConfig: (payload: SavePayload) => Promise<void>
}
```

共享状态的权限约定：

| 权限 | 类型 | 含义 |
| ---- | ---- | ---- |
| 可写 | `Ref<T>` | composable 可以写入宿主组件持有的共享状态 |
| 只读 | `Readonly<Ref<T>>` | composable 只能读取共享状态 |

return 面只暴露三类内容：

- 派生状态
- composable 私有但需要被 UI 读取的内部状态
- 原子方法

不要为了“传透”而 return 宿主组件本来就持有的 shared ref。

> ✅ checkpoint：看 options 和 return 就能知道这个 composable 读什么、写什么、依赖什么。

### 6. DOM 边界逻辑按“性质”拆分，而不是一律做成 composable

对于 `Mermaid`、`ContentCollapse`、`SidebarResizeHandle` 这类 DOM 较重的能力，优先按性质拆：

- 纯计算、纯解析、纯 selector 构造 → `core/` 或同目录纯函数文件
- 依赖 lifecycle 和响应式参数的 DOM 副作用 → composable
- 只在当前组件使用、体量很小的命令式代码 → 先留在当前 SFC

换句话说：**先隔离命令式边界，再决定是否需要 composable。**

> ✅ checkpoint：不是所有 `document.querySelector()` 都必须抽成 composable，但复杂 DOM 边界不能散落到多个子组件里。

### 7. 子组件通信优先 props / emits，深层再考虑 provide / inject

推荐顺序：

1. 1 到 2 层层级：props / emits
2. 同一功能目录下的深层树、插槽边界、工具条和内容区共享同一能力：provide / inject

经验规则：

- 子组件如果只是展示数据，尽量给它派生后的 props，而不是整个宿主上下文对象
- provide / inject 适合“同一能力被深层多个节点消费”的情况，不适合替代普通父子通信

### 8. 避免为局部功能引入全局 store

当前仓库的大多数交互都围绕单个 VitePress 运行时表面展开。通常情况下：

- data loader 提供只读输入
- 宿主组件持有共享状态
- composable 组织局部逻辑

这已经足够，不要为了单个功能目录引入全局 store。

只有当多个根层功能目录之间确实共享长期可写状态时，才再讨论更高一级的状态管理方案。

## 分支决策

| 场景 | 处理方式 |
| ---- | -------- |
| 组件只是 Markdown 中的轻量嵌入块 | 保持单文件组件，先不拆 composable |
| 同一功能目录里有多个面板 / 插槽 / 副作用域 | 引入宿主组件，集中声明共享状态和编排逻辑 |
| 多个 composable 需要同一份编辑草稿 | 草稿状态提升到宿主组件，分别传入各 composable |
| data loader 输出只用于读取 | 作为只读输入透传，不复制成可写共享状态 |
| 一个 composable 想调用另一个 composable 的方法 | 回收到宿主组件编排，或改传共享 ref / callback |
| DOM 逻辑越来越重 | 先抽纯函数 / `core/`，再决定是否需要边界 composable |
| 子组件只需要显示数据 | 传派生 props，不要传整个宿主对象 |
| 深层多个节点共享同一能力 | 再考虑 provide / inject |

---

## 端到端示例

> 如需查看贴近当前仓库的目录级示例，请读取 [COMPOSABLES-E2E.md](./COMPOSABLES-E2E.md)。
