---
title: 用黑盒方式测试组件，关注行为而不是实现
impact: HIGH
impactDescription: 感知实现细节的测试会变得脆弱，重构时很容易断裂，带来很高的维护负担
type: best-practice
tags: [vue3, testing, component-testing, vitest, vue-test-utils, blackbox]
---

# 用黑盒方式测试组件，关注行为而不是实现

**影响：HIGH** - 依赖实现细节（内部状态、私有方法、组件结构）的测试，即使功能仍然正确，也会在重构时失效。这会带来假阴性和很高的测试维护成本。

遵循 Kent C. Dodds 的测试理念：“你的测试越接近软件的真实使用方式，它们能提供的信心就越高。”

## 任务检查清单

- [ ] 测试组件做了什么，而不是它如何实现
- [ ] 按用户可见属性查询元素（文本、role、testid）
- [ ] 模拟用户交互（点击、输入），不要直接调用方法
- [ ] 对渲染结果、派发事件和可见状态变化做断言
- [ ] 避免访问组件内部状态或私有方法
- [ ] 对没有语义含义的元素使用 data-testid 属性

**错误示例：**

```javascript
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

// 错误：测试实现细节
test('counter increments', async () => {
  const wrapper = mount(Counter)

  // 直接访问内部状态
  expect(wrapper.vm.count).toBe(0)

  // 调用内部方法，而不是模拟用户操作
  wrapper.vm.increment()

  // 检查内部状态，而不是可见输出
  expect(wrapper.vm.count).toBe(1)
})

// 错误：测试组件结构
test('has increment button', () => {
  const wrapper = mount(Counter)

  // 测试实现细节，如果 button 改成 a 标签怎么办？
  expect(wrapper.find('button').exists()).toBe(true)
})
```

**正确示例：**

```javascript
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

// 正确：像用户一样测试行为
test('counter displays updated value after clicking increment', async () => {
  const wrapper = mount(Counter, {
    props: { max: 10 },
  })

  // 断言初始可见状态
  expect(wrapper.find('[data-testid="counter-value"]').text()).toContain('0')

  // 模拟用户操作
  await wrapper.find('[data-testid="increment-button"]').trigger('click')

  // 断言可见结果
  expect(wrapper.find('[data-testid="counter-value"]').text()).toContain('1')
})

// 正确：测试派发事件（公共 API）
test('emits change event with new value when incremented', async () => {
  const wrapper = mount(Counter)

  await wrapper.find('[data-testid="increment-button"]').trigger('click')

  expect(wrapper.emitted('change')).toHaveLength(1)
  expect(wrapper.emitted('change')[0]).toEqual([1])
})
```

## 使用 @testing-library/vue 提升黑盒测试质量

```javascript
import { render, screen, fireEvent } from '@testing-library/vue'
import Counter from './Counter.vue'

// Testing Library 鼓励可访问、以用户为中心的查询方式
test('increments counter on button click', async () => {
  render(Counter)

  // 按 role 查询，贴近屏幕阅读器看到的内容
  const button = screen.getByRole('button', { name: /increment/i })
  const display = screen.getByText('0')

  await fireEvent.click(button)

  expect(screen.getByText('1')).toBeInTheDocument()
})
```

## 应该测什么，不应该测什么

### 应该测试（公共接口）

```javascript
// Props 会影响渲染输出
test('shows title from props', () => {
  const wrapper = mount(Card, {
    props: { title: 'Hello World' },
  })
  expect(wrapper.text()).toContain('Hello World')
})

// Slots 是否正确渲染
test('renders slot content', () => {
  const wrapper = mount(Card, {
    slots: { default: '<p>Slot content</p>' },
  })
  expect(wrapper.text()).toContain('Slot content')
})

// 派发事件
test('emits close event when X clicked', async () => {
  const wrapper = mount(Modal)
  await wrapper.find('[data-testid="close-button"]').trigger('click')
  expect(wrapper.emitted('close')).toBeTruthy()
})
```

### 不要测试（实现细节）

```javascript
// 不要测试内部 computed 属性
// 不要测试内部方法
// 不要测试 component options/setup 的内部实现
// 不要测试特定子组件是否被渲染（除非这点至关重要）
// 不要只依赖 snapshot 测试判断正确性
```

## 参考资料

- [Vue.js Testing Guide](https://vuejs.org/guide/scaling-up/testing)
- [Vue Test Utils - Testing Philosophy](https://test-utils.vuejs.org/guide/)
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles)
