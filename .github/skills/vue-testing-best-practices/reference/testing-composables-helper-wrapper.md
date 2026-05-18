---
title: 用宿主组件包装器测试复杂 Composable
impact: MEDIUM
impactDescription: 使用生命周期钩子或 provide/inject 的 composable，如果脱离组件上下文直接测试，会失败
type: capability
tags: [vue3, testing, composables, vitest, lifecycle-hooks, provide-inject]
---

# 用宿主组件包装器测试复杂 Composable

**影响：MEDIUM** - 使用 Vue 生命周期钩子（`onMounted`、`onUnmounted`）或依赖注入（`inject`）的 composable，需要组件上下文才能正常运行。直接测试它们会报错或产生错误行为。

只使用响应式 API 的简单 composable 可以直接测试。复杂 composable 则需要一个辅助函数来创建宿主组件上下文。

## 任务检查清单

- [ ] 识别 composable 是否使用了生命周期钩子或 inject
- [ ] 简单 composable（仅 refs、computed）直接测试
- [ ] 复杂 composable 使用 `withSetup` 辅助模式
- [ ] 每个测试结束后卸载测试 app，完成清理
- [ ] 使用 `app.provide()` mock 注入依赖

**简单 Composable - 直接测试：**

```javascript
// composables/useCounter.js
import { ref, computed } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  const doubled = computed(() => count.value * 2)
  const increment = () => count.value++

  return { count, doubled, increment }
}
```

```javascript
// useCounter.test.js
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

// 正确：简单 composable 可以直接测试
describe('useCounter', () => {
  it('initializes with default value', () => {
    const { count } = useCounter()
    expect(count.value).toBe(0)
  })

  it('increments count', () => {
    const { count, increment } = useCounter()
    increment()
    expect(count.value).toBe(1)
  })

  it('computes doubled value', () => {
    const { count, doubled, increment } = useCounter(5)
    expect(doubled.value).toBe(10)
    increment()
    expect(doubled.value).toBe(12)
  })
})
```

**复杂 Composable - 使用宿主包装器：**

```javascript
// composables/useFetch.js
import { ref, onMounted, onUnmounted, inject } from 'vue'

export function useFetch(url) {
  const data = ref(null)
  const error = ref(null)
  const loading = ref(true)
  let controller = null

  // 使用 inject，需要组件上下文
  const apiClient = inject('apiClient')

  // 使用生命周期钩子，需要组件上下文
  onMounted(async () => {
    controller = new AbortController()
    try {
      const response = await apiClient.get(url, { signal: controller.signal })
      data.value = response.data
    } catch (e) {
      if (e.name !== 'AbortError') error.value = e
    } finally {
      loading.value = false
    }
  })

  onUnmounted(() => {
    controller?.abort()
  })

  return { data, error, loading }
}
```

```javascript
// test-utils.js
import { createApp } from 'vue'

/**
 * 用于测试需要组件上下文的 composable 的辅助函数
 */
export function withSetup(composable) {
  let result

  const app = createApp({
    setup() {
      result = composable()
      // 返回一个渲染函数以抑制警告
      return () => {}
    },
  })

  app.mount(document.createElement('div'))

  return [result, app]
}
```

```javascript
// useFetch.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { withSetup } from './test-utils'
import { useFetch } from './useFetch'

describe('useFetch', () => {
  let app
  const mockApiClient = {
    get: vi.fn(),
  }

  afterEach(() => {
    // 重要：清理以触发 onUnmounted
    app?.unmount()
  })

  it('fetches data on mount', async () => {
    mockApiClient.get.mockResolvedValue({ data: { id: 1, name: 'Test' } })

    const [result, testApp] = withSetup(() => useFetch('/api/test'))
    app = testApp

    // 提供 mock 依赖
    app.provide('apiClient', mockApiClient)

    // 等待异步操作完成
    await flushPromises()

    expect(result.data.value).toEqual({ id: 1, name: 'Test' })
    expect(result.loading.value).toBe(false)
    expect(result.error.value).toBeNull()
  })

  it('handles errors', async () => {
    const testError = new Error('Network error')
    mockApiClient.get.mockRejectedValue(testError)

    const [result, testApp] = withSetup(() => useFetch('/api/test'))
    app = testApp
    app.provide('apiClient', mockApiClient)

    await flushPromises()

    expect(result.error.value).toBe(testError)
    expect(result.data.value).toBeNull()
  })
})
```

## 增强版 withSetup：支持 Provide

```javascript
// test-utils.js
export function withSetup(composable, options = {}) {
  let result

  const app = createApp({
    setup() {
      result = composable()
      return () => {}
    },
  })

  // 在挂载前应用全局 provide
  if (options.provide) {
    Object.entries(options.provide).forEach(([key, value]) => {
      app.provide(key, value)
    })
  }

  app.mount(document.createElement('div'))

  return [result, app]
}

// 用法
const [result, app] = withSetup(() => useMyComposable(), {
  provide: {
    apiClient: mockApiClient,
    currentUser: { id: 1, name: 'Test User' },
  },
})
```

## 使用 @vue/test-utils 的 mount 测试

```javascript
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useFetch } from './useFetch'

test('useFetch in component context', async () => {
  const TestComponent = defineComponent({
    setup() {
      const { data, loading } = useFetch('/api/users')
      return { data, loading }
    },
    template: '<div>{{ loading ? "Loading..." : data }}</div>',
  })

  const wrapper = mount(TestComponent, {
    global: {
      provide: {
        apiClient: mockApiClient,
      },
    },
  })

  await flushPromises()
  expect(wrapper.text()).toContain('Test data')
})
```

## 参考资料

- [Vue.js Testing Guide - Testing Composables](https://vuejs.org/guide/scaling-up/testing#testing-composables)
- [Vue Test Utils - Mounting Components](https://test-utils.vuejs.org/guide/)
