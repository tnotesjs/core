---
title: 避免只写 Snapshot 测试，它们不能证明正确性
impact: MEDIUM
impactDescription: Snapshot 测试只能验证结构，不能验证功能，容易带来虚假的信心和脆弱测试
type: best-practice
tags: [vue3, testing, snapshot, vitest, vue-test-utils, anti-pattern]
---

# 避免只写 Snapshot 测试，它们不能证明正确性

**影响：MEDIUM** - Snapshot 测试只能验证 HTML 结构没有变化，不能验证组件是否真正工作正常。只依赖 snapshot 会带来虚假的信心，并让测试在任何重构时都可能断裂，即使功能并未受损。

应当节制使用 snapshot，把它用于回归检测。更优先的是测试组件行为的断言。

## 任务检查清单

- [ ] 不要把 snapshot 当成组件行为的唯一断言
- [ ] 对稳定 UI 组件，可将 snapshot 用于回归检测
- [ ] 始终把 snapshot 和行为断言配对使用
- [ ] 保持 snapshot 小而聚焦（避免整个组件的完整快照）
- [ ] 仔细审查 snapshot diff，不要盲目更新
- [ ] 对小而关键的结构可考虑内联 snapshot

**错误示例：**

```javascript
import { mount } from '@vue/test-utils'
import UserCard from './UserCard.vue'

// 错误：只做 snapshot 的测试无法证明功能正确
test('UserCard renders correctly', () => {
  const wrapper = mount(UserCard, {
    props: { user: { name: 'John', email: 'john@example.com' } },
  })

  expect(wrapper.html()).toMatchSnapshot()
})

// 即使出现以下问题，这个测试也可能通过：
// - 邮箱不可点击
// - 头像没有加载
// - 用户交互完全失效
// - 可访问性被破坏
```

**正确示例：**

```javascript
import { mount } from '@vue/test-utils'
import UserCard from './UserCard.vue'

// 正确：测试真实行为
test('UserCard displays user information', () => {
  const wrapper = mount(UserCard, {
    props: { user: { name: 'John', email: 'john@example.com' } },
  })

  expect(wrapper.find('[data-testid="user-name"]').text()).toBe('John')
  expect(wrapper.find('[data-testid="user-email"]').text()).toBe('john@example.com')
})

test('UserCard email link is clickable', async () => {
  const wrapper = mount(UserCard, {
    props: { user: { name: 'John', email: 'john@example.com' } },
  })

  const emailLink = wrapper.find('a[href^="mailto:"]')
  expect(emailLink.exists()).toBe(true)
  expect(emailLink.attributes('href')).toBe('mailto:john@example.com')
})

test('UserCard emits select event when clicked', async () => {
  const wrapper = mount(UserCard, {
    props: { user: { id: 1, name: 'John' } },
  })

  await wrapper.trigger('click')

  expect(wrapper.emitted('select')).toBeTruthy()
  expect(wrapper.emitted('select')[0]).toEqual([{ id: 1, name: 'John' }])
})
```

## 快照何时有用

### 对稳定组件做回归检测

```javascript
// 可接受：snapshot 作为附加检查，而不是唯一检查
test('ErrorBoundary renders error message', () => {
  const wrapper = mount(ErrorBoundary, {
    props: { error: new Error('Something went wrong') },
  })

  // 主要断言：验证行为
  expect(wrapper.find('.error-title').text()).toBe('Error')
  expect(wrapper.find('.error-message').text()).toContain('Something went wrong')

  // 次要 snapshot：捕获意外的结构变化
  expect(wrapper.find('.error-container').html()).toMatchSnapshot()
})
```

### 小结构使用内联 Snapshot

```javascript
// 可接受：对小而关键的结构使用内联 snapshot
test('generates correct list markup', () => {
  const wrapper = mount(ListItem, { props: { item: 'Test' } })

  expect(wrapper.html()).toMatchInlineSnapshot(`
    "<li class="list-item">Test</li>"
  `)
})
```

### 复杂 SVG 或图标输出

```javascript
// 可接受：对复杂生成内容使用 snapshot
test('renders correct chart SVG', () => {
  const wrapper = mount(PieChart, {
    props: { data: [30, 40, 30] },
  })

  // 验证关键行为
  expect(wrapper.findAll('path').length).toBe(3)

  // 对完整 SVG 结构做 snapshot
  expect(wrapper.find('svg').html()).toMatchSnapshot()
})
```

## 比 Snapshot 更好的替代方案

### 测试具体元素

```javascript
// 不要对整个组件做 snapshot
test('renders product with all required fields', () => {
  const wrapper = mount(ProductCard, {
    props: { product: { name: 'Widget', price: 9.99, inStock: true } },
  })

  expect(wrapper.find('.product-name').text()).toBe('Widget')
  expect(wrapper.find('.product-price').text()).toContain('9.99')
  expect(wrapper.find('.in-stock-badge').exists()).toBe(true)
})
```

### 测试样式类

```javascript
test('applies danger styling for errors', () => {
  const wrapper = mount(Alert, {
    props: { type: 'error', message: 'Failed!' },
  })

  expect(wrapper.classes()).toContain('alert-danger')
  expect(wrapper.find('.alert-icon').classes()).toContain('icon-error')
})
```

### 使用 Testing Library 查询

```javascript
import { render, screen } from '@testing-library/vue'

test('form has accessible labels', () => {
  render(LoginForm)

  // Testing Library 查询同时验证可访问性
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
})
```

## 快照反模式

```javascript
// 反模式：巨大的组件 snapshot
test('page renders', () => {
  const wrapper = mount(EntirePageComponent)
  expect(wrapper.html()).toMatchSnapshot() // 500+ 行 HTML
})

// 反模式：包含动态内容的 snapshot
test('shows current date', () => {
  const wrapper = mount(DateDisplay)
  expect(wrapper.html()).toMatchSnapshot() // 每天都会失败！
})

// 反模式：每个测试后都做 snapshot
test('button works', async () => {
  const wrapper = mount(Counter)
  await wrapper.find('button').trigger('click')
  expect(wrapper.html()).toMatchSnapshot() // 多余
})
```

## 参考资料

- [Vue.js Testing Guide - What Not to Test](https://vuejs.org/guide/scaling-up/testing)
- [Effective Snapshot Testing](https://kentcdodds.com/blog/effective-snapshot-testing)
- [Vitest Snapshot Testing](https://vitest.dev/guide/snapshot.html)
