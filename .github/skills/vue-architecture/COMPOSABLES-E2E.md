# 端到端示例

下面的示例不再使用传统路由页语境，而是直接贴近当前仓库的三类真实模式：

1. 宿主型功能目录
2. 轻量叶子组件
3. DOM 较重组件的渐进式拆分

## 示例 1：`Layout/` 作为宿主型功能目录

`Layout/` 更像一个 VitePress 宿主功能，而不是常规内容页。它接入主题插槽、路由、data loader、本地 bridge，并编排多个子区域。

```text
vitepress/components/Layout/
  Layout.vue                     ← 宿主组件
  AboutModal.vue                 ← 局部弹窗
  AboutPanel.vue                 ← 弹窗内容区
  CustomSidebar.vue              ← 侧边栏内容区
  SidebarNavBefore.vue           ← 侧边栏工具条
  DocBeforeControls.vue          ← 文档顶部控制区
  composables/
    useRedirect.ts               ← 404 / redirect 边界
    useNoteConfig.ts             ← 编辑草稿同步
    useNoteValidation.ts         ← 标题校验规则
    useNoteSave.ts               ← 保存副作用
    useVSCodeIntegration.ts      ← 本地 VS Code / 文件系统 bridge
```

职责分配：

- `Layout.vue` 负责拿 `useData()`、`useRoute()`、data loader 和共享状态
- `useRedirect`、`useNoteSave` 这类 composable 只封装单一逻辑域
- `AboutModal.vue`、`SidebarNavBefore.vue` 等子组件只表达局部 UI 和事件意图

示意代码：

```vue
<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { computed, readonly, ref } from 'vue'

// @ts-expect-error - VitePress data loader
import { data as allNotesConfig } from '../notesConfig.data'

const route = useRoute()
const { page } = useData()

const modalOpen = ref(false)
const sidebarAboutNoteId = ref<string | null>(null)
const draftTitle = ref('')
const draftDescription = ref('')

const currentNoteId = computed(() => resolveNoteId(page.value.relativePath))
const activeNoteId = computed(
  () => sidebarAboutNoteId.value || currentNoteId.value,
)

const redirect = useRedirect({
  allNotesConfig,
  currentPath: computed(() => route.path),
})

const noteDraft = useNoteConfig({
  activeNoteId,
  draftDescription,
  draftTitle,
  modalOpen,
})

const noteValidation = useNoteValidation({
  draftTitle: readonly(draftTitle),
})

const noteSave = useNoteSave({
  activeNoteId,
  draftDescription: readonly(draftDescription),
  draftTitle: readonly(draftTitle),
  validateTitle: noteValidation.validateTitle,
})

function openSidebarNoteAbout(noteId: string) {
  sidebarAboutNoteId.value = noteId
  modalOpen.value = true
}

async function saveNoteConfig() {
  if (!noteDraft.hasChanges.value) return
  await noteSave.save()
  noteDraft.markSaved()
}
</script>
```

这个结构的关键点：

- `openSidebarNoteAbout`、`saveNoteConfig` 这类跨多个逻辑域的方法仍然留在宿主组件
- `draftTitle` / `draftDescription` 被多个逻辑单元共享，因此由宿主组件持有
- composable 负责单域逻辑，不互相依赖

## 示例 2：`Tooltip/` 作为轻量叶子组件

`Tooltip/Tooltip.vue` 只有单一职责：悬停时显示提示文字。它不需要宿主组件、feature 目录拆分或 composable。

```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  text: string
}>()

const showTooltip = ref(false)
</script>

<template>
  <span
    class="tooltip-wrapper"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <slot />
    <span v-if="showTooltip" class="tooltip">{{ text }}</span>
  </span>
</template>
```

判断依据：

- 单一局部状态
- 无共享状态
- 无跨区域编排
- 无复用压力驱动的逻辑拆分

所以保持单文件就是最优解。

## 示例 3：DOM 较重组件的渐进式拆分路径

像 `Mermaid/Mermaid.vue`、`ContentCollapse.vue`、`SidebarResizeHandle.vue` 这类组件，常见问题不是“有没有 composable”，而是 DOM 边界会不会失控。

推荐的演进顺序：

1. 先把纯计算和纯解析抽成普通函数或 `core/` 模块
2. 再把依赖 lifecycle 的 DOM 副作用包成边界 composable
3. 只有当同一目录内真的出现多块响应式逻辑时，才继续拆更多 composable

示意结构：

```text
vitepress/components/Mermaid/
  Mermaid.vue
  core/
    viewport.ts               ← 纯缩放计算、尺寸约束
    fullscreen.ts             ← 纯状态切换辅助
  composables/
    useMermaidViewport.ts     ← onMounted / onBeforeUnmount / watch 边界
```

对应判断：

- 缩放比例、边界计算、SVG 尺寸约束 → `core/`
- 挂载事件监听、同步 DOM、处理全屏生命周期 → composable 或宿主组件内的边界逻辑
- 工具栏按钮、错误态、加载态渲染 → SFC 模板层

## 反例对照

下面几种拆法不适合当前仓库：

- 把每个组件都改造成 `index.vue + composables/` 的统一目录模板
- 把所有 `window` / `document` 操作强行抽成 composable，即使它只在一个小组件里出现一次
- 让 `Layout` 下的私有 composable 被其他功能目录直接复用
- 用传统路由页思维要求所有共享状态都围绕单一路由入口建模

## 简短结论

- 当前仓库更适合“宿主组件 + 功能目录 + 叶子组件 + 根层支撑模块”的模型
- `Layout/` 是宿主型目录，`Tooltip/` 是叶子组件，`Mermaid/` 这类 DOM 重组件适合渐进拆分
- composable 只在它确实提升可读性和边界清晰度时引入
