---
title: 测试异步组件时使用 flushPromises
impact: HIGH
impactDescription: 如果不等待异步操作，测试会在组件完成渲染前断言，从而产生假阴性
type: gotcha
tags: [vue3, testing, async, defineAsyncComponent, flushPromises, vitest]
---

# 测试异步组件时使用 flushPromises

**影响：HIGH** - 测试通过 `defineAsyncComponent` 创建的异步组件时，必须使用 `await flushPromises()`，确保组件加载完成后再进行断言。Vue 的更新是异步的，因此如果测试没有处理这一点，就会在组件尚未渲染完成前执行断言。

## 任务检查清单

- [ ] 在异步组件测试函数中使用 `async/await`
- [ ] 挂载异步组件后调用 `await flushPromises()`
- [ ] 在 `flushPromises()` 之前先断言，以测试加载态
- [ ] 在 `defineAsyncComponent` 中使用 rejected promise 测试错误态
- [ ] 对 `trigger()` 使用 `await`，因为它会返回 Promise

**错误示例：**

```javascript
import { mount } from '@vue/test-utils'
import { defineAsyncComponent } from 'vue'

const AsyncWidget = defineAsyncComponent(() => import('./Widget.vue'))

test('renders async component', () => {
  const wrapper = mount(AsyncWidget)

  // 失败：组件此时还没有加载完成
  expect(wrapper.text()).toContain('Widget Content')
})
```

**正确示例：**

```javascript
import { mount, flushPromises } from '@vue/test-utils'
import { defineAsyncComponent, nextTick } from 'vue'

const AsyncWidget = defineAsyncComponent(() => import('./Widget.vue'))

test('renders async component', async () => {
  const wrapper = mount(AsyncWidget)

  // 等待异步组件加载完成
  await flushPromises()

  expect(wrapper.text()).toContain('Widget Content')
})

test('shows loading state initially', async () => {
  const AsyncWithLoading = defineAsyncComponent({
    loader: () => import('./Widget.vue'),
    loadingComponent: { template: '<div>Loading...</div>' },
    delay: 0,
  })

  const wrapper = mount(AsyncWithLoading)

  // 立即检查加载态
  expect(wrapper.text()).toContain('Loading...')

  // 等待组件加载完成
  await flushPromises()

  // 检查最终状态
  expect(wrapper.text()).toContain('Widget Content')
})
```

## 配合 Suspense 测试

```javascript
import { mount, flushPromises } from '@vue/test-utils'
import { Suspense, defineAsyncComponent, h } from 'vue'

const AsyncWidget = defineAsyncComponent(() => import('./Widget.vue'))

test('renders async component with Suspense', async () => {
  const wrapper = mount({
    components: { AsyncWidget },
    template: `
      <Suspense>
        <AsyncWidget />
        <template #fallback>
          <div>Loading...</div>
        </template>
      </Suspense>
    `,
  })

  // 初始时显示 fallback
  expect(wrapper.text()).toContain('Loading...')

  // 等待异步解析完成
  await flushPromises()

  // 现在显示真实内容
  expect(wrapper.text()).toContain('Widget Content')
})
```

## 测试错误状态

```javascript
import { mount, flushPromises } from '@vue/test-utils'
import { defineAsyncComponent } from 'vue'

test('shows error component on load failure', async () => {
  const AsyncWithError = defineAsyncComponent({
    loader: () => Promise.reject(new Error('Failed to load')),
    errorComponent: { template: '<div>Error loading component</div>' },
  })

  const wrapper = mount(AsyncWithError)

  await flushPromises()

  expect(wrapper.text()).toContain('Error loading component')
})
```

## 工具速查

| 工具                             | 用途                         |
| -------------------------------- | ---------------------------- |
| `await flushPromises()`          | 解析所有待处理的 promise     |
| `await nextTick()`               | 等待 Vue 下一轮 DOM 更新周期 |
| `await wrapper.trigger('click')` | 触发事件并等待更新           |

## 动态导入处理

**注意：** 动态导入（`import('./File.vue')`）在测试环境里，可能需要 `flushPromises()` 之外的额外处理。像 Vitest 这样的测试运行器处理模块解析的方式与运行时 bundler 不同，这会让动态导入出现时序问题。如果仅靠 `flushPromises()` 还无法解析组件，可以考虑：

- mock 动态导入，让它同步返回组件
- 连续多次调用 `await flushPromises()`
- 使用 `waitFor()` 或重试类工具包裹断言
- 配置测试运行器的模块解析设置

```javascript
// 如果单独使用 flushPromises() 不够，可以 mock 导入
vi.mock('./Widget.vue', () => ({
  default: { template: '<div>Widget Content</div>' },
}))

// 或者针对嵌套异步操作多次 flush
await flushPromises()
await flushPromises()
```

## 参考资料

- [Vue Test Utils - Asynchronous Behavior](https://test-utils.vuejs.org/guide/advanced/async-suspense)
- [Vue.js Async Components Documentation](https://vuejs.org/guide/components/async)
