---
title: 测试时把异步 setup 组件包在 Suspense 里
impact: HIGH
impactDescription: 带 async setup() 的组件如果在测试中没有 Suspense 包装器，将无法渲染并产生难懂的错误
type: gotcha
tags: [vue3, testing, suspense, async-setup, vue-test-utils, vitest]
---

# 测试时把异步 setup 组件包在 Suspense 里

**影响：HIGH** - 使用 `async setup()` 的组件需要 `<Suspense>` 包装器才能正常工作。如果测试时没有用 Suspense 包裹，组件将根本不会渲染，最终导致测试失败和难以理解的错误。

可以创建一个带 Suspense 的测试包装组件，或者使用 `mountSuspense` 辅助函数来测试异步组件。

## 任务检查清单

- [ ] 识别带异步 setup 的组件（`<script setup>` 中使用 `await`，或显式使用 `async setup()`）
- [ ] 为测试创建一个带 `<Suspense>` 的包装组件
- [ ] 挂载后使用 `flushPromises()` 等待异步解析完成
- [ ] 通过 `findComponent()` 获取真实组件并进行断言
- [ ] 谨慎使用 `@testing-library/vue`（它对 Suspense 支持存在问题）

**错误示例：**

```javascript
import { mount } from '@vue/test-utils'
import AsyncUserProfile from './AsyncUserProfile.vue'

// 错误：异步组件没有 Suspense 包装器
test('displays user data', async () => {
  // 这里不会渲染，Vue 期望 async setup 被 Suspense 包裹
  const wrapper = mount(AsyncUserProfile, {
    props: { userId: 1 },
  })

  await flushPromises()

  // 这里会失败，因为组件根本没有渲染
  expect(wrapper.find('.username').text()).toBe('John')
})
```

**正确示例 - 手写包装组件：**

```javascript
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, Suspense } from 'vue'
import AsyncUserProfile from './AsyncUserProfile.vue'

test('displays user data', async () => {
  // 创建带 Suspense 的包装组件
  const TestWrapper = defineComponent({
    components: { AsyncUserProfile },
    template: `
      <Suspense>
        <AsyncUserProfile :user-id="1" />
        <template #fallback>Loading...</template>
      </Suspense>
    `,
  })

  const wrapper = mount(TestWrapper)

  // 初始时显示 fallback
  expect(wrapper.text()).toContain('Loading...')

  // 等待异步 setup 完成
  await flushPromises()

  // 找到真实组件做进一步断言
  const profile = wrapper.findComponent(AsyncUserProfile)
  expect(profile.find('.username').text()).toBe('John')
})
```

**正确示例 - 可复用的辅助函数：**

```javascript
// test-utils.js
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, Suspense, h } from 'vue'

export async function mountSuspense(component, options = {}) {
  const { props, slots, ...mountOptions } = options

  const wrapper = mount(
    defineComponent({
      render() {
        return h(Suspense, null, {
          default: () => h(component, props, slots),
          fallback: () => h('div', 'Loading...'),
        })
      },
    }),
    mountOptions,
  )

  // 等待异步组件解析完成
  await flushPromises()

  return {
    wrapper,
    // 方便直接访问真实组件
    component: wrapper.findComponent(component),
  }
}
```

```javascript
// AsyncUserProfile.test.js
import { mountSuspense } from './test-utils'
import AsyncUserProfile from './AsyncUserProfile.vue'

test('displays user data', async () => {
  const { component } = await mountSuspense(AsyncUserProfile, {
    props: { userId: 1 },
    global: {
      stubs: {
        // 需要时可以 stub 子组件
      },
    },
  })

  expect(component.find('.username').text()).toBe('John')
})

test('handles errors gracefully', async () => {
  const { component } = await mountSuspense(AsyncUserProfile, {
    props: { userId: 'invalid' },
  })

  expect(component.find('.error').exists()).toBe(true)
})
```

## 配合 onErrorCaptured 测试

```javascript
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, Suspense, h, ref, onErrorCaptured } from 'vue'
import AsyncComponent from './AsyncComponent.vue'

test('catches async errors', async () => {
  const capturedError = ref(null)

  const TestWrapper = defineComponent({
    setup() {
      onErrorCaptured((error) => {
        capturedError.value = error
        return true // 阻止错误继续向外传播
      })
      return { capturedError }
    },
    render() {
      return h(Suspense, null, {
        default: () => h(AsyncComponent, { shouldFail: true }),
        fallback: () => h('div', 'Loading...'),
      })
    },
  })

  const wrapper = mount(TestWrapper)
  await flushPromises()

  expect(capturedError.value).toBeTruthy()
  expect(capturedError.value.message).toContain('Failed to load')
})
```

## 配合 Nuxt 的 mountSuspended 使用

```javascript
// 如果使用 Nuxt，可以直接用内建的 mountSuspended 辅助函数
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AsyncPage from './AsyncPage.vue'

test('renders async page', async () => {
  const wrapper = await mountSuspended(AsyncPage, {
    props: { id: 1 },
  })

  expect(wrapper.find('h1').text()).toBe('Page Title')
})
```

## 重要注意事项

### @testing-library/vue 的限制

```javascript
// 注意：@testing-library/vue 对 Suspense 支持有问题
// 异步组件更建议使用 @vue/test-utils

// 如果必须使用 Testing Library，可以手写包装组件：
import { render, waitFor } from '@testing-library/vue'

test('async component with testing library', async () => {
  const TestWrapper = {
    template: `
      <Suspense>
        <AsyncComponent />
      </Suspense>
    `,
    components: { AsyncComponent },
  }

  const { getByText } = render(TestWrapper)

  await waitFor(() => {
    expect(getByText('Loaded content')).toBeInTheDocument()
  })
})
```

### 访问组件实例

```javascript
test('access vm on async component', async () => {
  const { wrapper, component } = await mountSuspense(AsyncComponent)

  // wrapper.vm 是 Suspense 包装层，不太有用
  // 应使用 component.vm 访问真实异步组件
  expect(component.vm.someData).toBe('value')
})
```

## 参考资料

- [Vue Test Utils - Async Suspense](https://test-utils.vuejs.org/guide/advanced/async-suspense)
- [Vue.js Suspense Documentation](https://vuejs.org/guide/built-ins/suspense.html)
- [Testing Library Vue Suspense Issue](https://github.com/testing-library/vue-testing-library/issues/230)
