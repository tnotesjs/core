# demos - 变量字典序优先规则

## demos.1 - Composable 函数参数 options 成员排序

```typescript
interface ClassManagementOptions {
  // config
  defaultClassKeys: readonly string[]
  taskId: Readonly<number>

  // states
  activeCamera: Ref<string | null>
  categoryKeyIdMap: Ref<CategoryKeyIdMap>
  classes: Ref<ClassItem[]>
  isLoading: Ref<boolean>
  loadingText: Ref<string>
  previewImages: Ref<ClassifierPreviewMap>
}
```

## demos.2 - Composable 函数内部排序

函数体按以下顺序排列：

```typescript
export const useXxx = (opts: XxxOptions) => {
  // 1. options 选项解构（config -> states，组内字典序）
  const {
    // config
    configA,
    configB,

    // states
    stateA,
    stateB
  } = opts

  // 2. 外部 composable 调用
  const { ... } = useOtherComposable()

  // 3. exported states
  const isReady = ref(false)

  // 4. internal states（_ 前缀，字典序）
  const _currentKey = ref('')

  // 5. exported computed
  const allImages = computed(...)
  const totalCount = computed(...)

  // 6. internal computed（_ 前缀，字典序）
  const _orderedKeys = computed(...)

  // 5. exported methods（字典序）
  const start = () => { ... }
  const stop = () => { ... }

  // 6. internal methods（_ 前缀，字典序）
  const _cleanup = () => { ... }
  const _loadData = async () => { ... }

  // 7. lifecycle hooks
  onMounted(() => { ... })
  onUnmounted(() => { ... })

  // 8. return（states -> methods，组内字典序）
  return {
    // states
    isReady: shallowReadonly(isReady),
    totalCount: shallowReadonly(totalCount),

    // methods
    start,
    stop,
  }
}
```

> 上述 1-8 注释仅作为示例说明各部分的排序关系，实际代码中不需要保留。

## demos.3 - Vue SFC `<script setup lang="ts">` 排序

按以下顺序排列，每个段落用注释标记：

```typescript
// 1. 非响应式数据
// ，比如：路由参数、常量配置（字典序）

// 2. 响应式状态
// ref、computed 声明（exported -> internal，组内字典序）

// 3. composables 调用与解构
// 按 composable 名字典序排列

// 4. methods
// 公开方法在前，私有方法（_ 前缀）在后，组内字典序

// 5. lifecycle hooks
// onMounted、onUnmounted 等（按生命周期执行顺序排列）
```
