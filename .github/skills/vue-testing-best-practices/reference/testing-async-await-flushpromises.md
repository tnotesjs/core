---
title: 使用 nextTick 和 flushPromises 正确处理异步更新
impact: HIGH
impactDescription: 如果异步 DOM 更新或 API 调用在断言执行后才完成，就会出现竞态条件和不稳定测试
type: gotcha
tags: [vue3, testing, async, flushPromises, nextTick, vitest, vue-test-utils, race-condition]
---

# 使用 nextTick 和 flushPromises 正确处理异步更新

**影响：HIGH** - Vue 会异步更新 DOM。如果没有正确等待这些更新，测试就可能对过时的 DOM 状态执行断言，导致间歇性失败和假阴性。

对 `trigger` 和 `setValue` 使用 `await`，对响应式更新使用 `nextTick`，对 API 调用等外部异步操作使用 `flushPromises`。

## 任务检查清单

- [ ] 始终等待 `trigger()` 和 `setValue()` 调用完成
- [ ] 在以编程方式修改响应式状态后使用 `await nextTick()`
- [ ] 对外部异步操作（API 调用、定时器）使用 `await flushPromises()`
- [ ] 不要串联多个 `nextTick` 调用，改用 `flushPromises`
- [ ] 轮询式断言可以考虑使用 testing-library 的 `waitFor`

**错误示例：**

```javascript
import { mount } from '@vue/test-utils'
import SearchComponent from './SearchComponent.vue'

// 错误：没有 await trigger，断言会在 DOM 更新前执行
test('search filters results', () => {
  const wrapper = mount(SearchComponent)

  wrapper.find('input').setValue('vue') // 缺少 await！
  wrapper.find('button').trigger('click') // 缺少 await！

  // 这个断言很可能失败，因为 DOM 还没有更新
  expect(wrapper.findAll('.result').length).toBe(3)
})

// 错误：用 nextTick 等待 API 调用
test('loads data from API', async () => {
  const wrapper = mount(DataLoader)

  await nextTick() // 这不会等待 API 调用完成！

  // 断言会在 fetch 完成前执行
  expect(wrapper.find('.data').text()).toBe('Loaded data')
})
```

**正确示例：**

```javascript
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import SearchComponent from './SearchComponent.vue'
import DataLoader from './DataLoader.vue'

// 正确：等待 trigger 和 setValue
test('search filters results', async () => {
  const wrapper = mount(SearchComponent)

  await wrapper.find('input').setValue('vue')
  await wrapper.find('button').trigger('click')

  expect(wrapper.findAll('.result').length).toBe(3)
})

// 正确：对 API 调用使用 flushPromises
test('loads data from API', async () => {
  const wrapper = mount(DataLoader)

  // 等待所有待处理 promise 完成
  await flushPromises()

  expect(wrapper.find('.data').text()).toBe('Loaded data')
})
```

## 何时使用哪种方法

### `await trigger()` / `await setValue()` - 用户交互

```javascript
// 这些方法内部会返回 nextTick
await wrapper.find('button').trigger('click')
await wrapper.find('input').setValue('new value')
await wrapper.find('form').trigger('submit')
```

### `await nextTick()` - 编程式响应式更新

```javascript
import { nextTick } from 'vue'

test('reflects programmatic state changes', async () => {
  const wrapper = mount(Counter)

  // 直接修改状态（测试暴露内部实现时）
  wrapper.vm.count = 5

  await nextTick() // 等待 Vue 更新 DOM

  expect(wrapper.find('.count').text()).toBe('5')
})
```

### `await flushPromises()` - 外部异步操作

```javascript
import { flushPromises } from '@vue/test-utils'

test('displays fetched data', async () => {
  const wrapper = mount(UserProfile, {
    props: { userId: 1 },
  })

  // 等待组件中的 API 调用完成
  await flushPromises()

  expect(wrapper.find('.username').text()).toBe('John')
})

// 有时链式异步操作需要多次 flushPromises
test('processes data after fetch', async () => {
  const wrapper = mount(DataProcessor)

  await flushPromises() // 等待 fetch
  await flushPromises() // 等待 fetch 触发的后续处理

  expect(wrapper.find('.processed').exists()).toBe(true)
})
```

## 常见模式：组合使用这些方法

```javascript
test('submits form and shows success', async () => {
  const wrapper = mount(ContactForm)

  // 填表（每一步交互都等待完成）
  await wrapper.find('#name').setValue('John')
  await wrapper.find('#email').setValue('john@example.com')

  // 提交表单
  await wrapper.find('form').trigger('submit')

  // 等待 API 提交完成
  await flushPromises()

  // 断言成功状态
  expect(wrapper.find('.success-message').exists()).toBe(true)
})
```

## 配合 MSW 或 Mock API 测试

```javascript
import { flushPromises } from '@vue/test-utils'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/user', (req, res, ctx) => {
    return res(ctx.json({ name: 'John' }))
  }),
)

test('displays user data', async () => {
  const wrapper = mount(UserCard)

  // MSW 可能需要多次 flushPromises
  await flushPromises()
  await flushPromises()

  expect(wrapper.find('.name').text()).toBe('John')
})
```

## 参考资料

- [Vue Test Utils - Asynchronous Behavior](https://test-utils.vuejs.org/guide/advanced/async-suspense)
- [Vue.js Testing Guide](https://vuejs.org/guide/scaling-up/testing)
