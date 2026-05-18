---
title: 用 createTestingPinia 和 setActivePinia 配置 Pinia 测试
impact: HIGH
impactDescription: 缺少 Pinia 配置会导致 “injection Symbol(pinia) not found” 报错并让测试失败
type: gotcha
tags: [vue3, testing, pinia, vitest, store, mocking, createTestingPinia]
---

# 用 createTestingPinia 和 setActivePinia 配置 Pinia 测试

**影响：HIGH** - 如果测试依赖 Pinia store 的组件或 composable 时没有正确配置 Pinia，就会出现 “[Vue warn]: injection Symbol(pinia) not found” 报错。测试会失败，或者行为异常。

组件测试应使用 `@pinia/testing` 提供的 `createTestingPinia`，直接测试 store 单元时应使用 `setActivePinia(createPinia())`。

## 任务检查清单

- [ ] 将 `@pinia/testing` 安装为开发依赖
- [ ] 在组件测试中通过 `global.plugins` 使用 `createTestingPinia`
- [ ] 在 store 单元测试的 `beforeEach` 中使用 `setActivePinia(createPinia())`
- [ ] 当 Vitest 没有使用 `globals: true` 时，配置 `createSpy: vi.fn`
- [ ] 在每个测试内部初始化 store，保证状态全新
- [ ] 需要真实执行 action 时，使用 `stubActions: false`

**错误示例：**

```javascript
import { mount } from '@vue/test-utils'
import UserProfile from './UserProfile.vue'

// 错误：缺少 Pinia，会导致注入报错
test('displays user name', () => {
  const wrapper = mount(UserProfile) // 错误：injection "Symbol(pinia)" not found
  expect(wrapper.text()).toContain('John')
})
```

```javascript
import { useUserStore } from '@/stores/user'

// 错误：没有激活 Pinia 实例
test('user store actions', () => {
  const store = useUserStore() // 错误：no active Pinia
  store.login('john', 'password')
})
```

**正确示例 - 组件测试：**

```javascript
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { vi } from 'vitest'
import UserProfile from './UserProfile.vue'
import { useUserStore } from '@/stores/user'

// 正确：提供带 stub action 的测试 Pinia
test('displays user name', () => {
  const wrapper = mount(UserProfile, {
    global: {
      plugins: [
        createTestingPinia({
          createSpy: vi.fn, // 未使用 globals: true 时必需
          initialState: {
            user: { name: 'John', email: 'john@example.com' },
          },
        }),
      ],
    },
  })

  expect(wrapper.text()).toContain('John')
})

// 正确：测试被 stub 的 action（默认行为）
test('calls logout action', async () => {
  const wrapper = mount(UserProfile, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
  })

  // 必须在用 createTestingPinia 挂载之后再获取 store
  const store = useUserStore()

  await wrapper.find('[data-testid="logout"]').trigger('click')

  // Action 已被 stub，并包装为 spy
  expect(store.logout).toHaveBeenCalled()
})
```

**正确示例 - Store 单元测试：**

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'

describe('User Store', () => {
  beforeEach(() => {
    // 为每个测试创建全新的 Pinia 实例
    setActivePinia(createPinia())
  })

  it('initializes with empty user', () => {
    const store = useUserStore()
    expect(store.user).toBeNull()
    expect(store.isLoggedIn).toBe(false)
  })

  it('updates user on login', async () => {
    const store = useUserStore()

    // 真实 action 会执行，而不是被 stub
    await store.login('john', 'password')

    expect(store.user).toEqual({ name: 'John' })
    expect(store.isLoggedIn).toBe(true)
  })

  it('clears user on logout', () => {
    const store = useUserStore()
    store.user = { name: 'John' } // 设置初始状态

    store.logout()

    expect(store.user).toBeNull()
  })
})
```

## 测试真实 Action 与 Stubbed Action

```javascript
import { createTestingPinia } from '@pinia/testing'

// Stubbed action（默认）- 用于隔离测试
const wrapper = mount(Component, {
  global: {
    plugins: [
      createTestingPinia({
        createSpy: vi.fn,
        // stubActions: true（默认）- action 会被 mock
      }),
    ],
  },
})

// 真实 action - 用于集成测试
const wrapper = mount(Component, {
  global: {
    plugins: [
      createTestingPinia({
        createSpy: vi.fn,
        stubActions: false, // action 正常执行
      }),
    ],
  },
})
```

## 模拟指定 Action 的实现

```javascript
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { vi } from 'vitest'
import { useCartStore } from '@/stores/cart'

test('handles checkout failure', async () => {
  const wrapper = mount(Checkout, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
    },
  })

  const cartStore = useCartStore()

  // mock 指定 action 的行为
  cartStore.checkout.mockRejectedValue(new Error('Payment failed'))

  await wrapper.find('[data-testid="checkout"]').trigger('click')
  await flushPromises()

  expect(wrapper.find('.error').text()).toContain('Payment failed')
})
```

## 使用 vi.spyOn 监听 Action

```javascript
import { setActivePinia, createPinia } from 'pinia'
import { vi } from 'vitest'
import { useUserStore } from '@/stores/user'

test('tracks action calls', async () => {
  setActivePinia(createPinia())
  const store = useUserStore()

  const loginSpy = vi.spyOn(store, 'login')
  loginSpy.mockResolvedValue({ success: true })

  await store.login('john', 'password')

  expect(loginSpy).toHaveBeenCalledWith('john', 'password')
})
```

## 测试 Store 的 $subscribe

```javascript
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'

test('subscription triggers on state change', () => {
  setActivePinia(createPinia())
  const store = useUserStore()

  const callback = vi.fn()
  store.$subscribe(callback)

  store.user = { name: 'John' }

  expect(callback).toHaveBeenCalled()
})
```

## 参考资料

- [Pinia Testing Guide](https://pinia.vuejs.org/cookbook/testing.html)
- [@pinia/testing Package](https://www.npmjs.com/package/@pinia/testing)
- [Vue Test Utils - Plugins](https://test-utils.vuejs.org/guide/advanced/plugins.html)
