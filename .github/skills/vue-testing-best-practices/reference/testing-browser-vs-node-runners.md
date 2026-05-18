---
title: 样式和 DOM 事件测试应选择浏览器运行器
impact: MEDIUM
impactDescription: 基于 Node 的运行器无法测试真实 CSS 行为、原生 DOM 事件、cookie 或计算样式
type: capability
tags: [vue3, testing, component-testing, vitest, browser, jsdom]
---

# 样式和 DOM 事件测试应选择浏览器运行器

**影响：MEDIUM** - 基于 Node 的测试运行器（Vitest 搭配 jsdom 或 happy-dom）只能模拟 DOM，无法测试真实 CSS 渲染、浏览器原生事件、cookie、计算样式或跨浏览器行为。当这些能力很重要时，应使用基于浏览器的运行器。

大多数组件测试仍应使用 Vitest（速度快），但在测试依赖视觉表现或真实 DOM 的特性时，应使用 Vitest Browser Mode。

## 任务检查清单

- [ ] 逻辑为主的组件测试使用 Vitest（node）
- [ ] 样式相关测试使用 Vitest Browser Mode
- [ ] 原生事件（focus、drag、resize）使用 Vitest Browser Mode
- [ ] cookie 和 CSS 计算样式测试使用 Vitest Browser Mode
- [ ] 接受更慢的执行速度，以换取浏览器级准确性

## 何时使用哪种方案

### 基于 Node 的运行器（Vitest + happy-dom/jsdom）

最适合：

- 纯逻辑测试
- 状态管理
- 事件派发
- Props 和 slots 行为
- 大多数组件交互
- 追求速度的 CI/CD 流水线

```javascript
// vitest.config.js
export default defineConfig({
  test: {
    environment: 'happy-dom', // 或 'jsdom'
  },
})
```

```javascript
// 快但能力有限，不过对大多数测试已经足够
test('button emits click event', async () => {
  const wrapper = mount(Button)
  await wrapper.trigger('click')
  expect(wrapper.emitted('click')).toBeTruthy()
})
```

### Vitest 浏览器模式

适用于：

- CSS 计算样式校验
- CSS 过渡和动画
- 真实的 focus/blur 行为
- 拖拽
- cookie 操作
- 依赖视口的行为
- 跨浏览器验证

## Vitest 浏览器模式配置

```bash
npm install -D @vitest/browser playwright
```

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
    },
  },
})
```

```javascript
// Button.browser.test.js
import { render } from 'vitest-browser-vue'
import Button from './Button.vue'

test('has correct hover styling', async () => {
  const { getByRole } = render(Button, { props: { label: 'Click me' } })

  const button = getByRole('button')

  // 检查初始样式
  await expect.element(button).toHaveStyle({
    backgroundColor: 'rgb(59, 130, 246)', // 蓝色
  })
})

test('maintains focus after click', async () => {
  const { getByRole } = render(Button)

  const button = getByRole('button')
  await button.click()

  await expect.element(button).toHaveFocus()
})
```

## 示例：每种运行器能测什么、不能测什么

### 样式 - 需要浏览器

```javascript
// Node 运行器：不能校验真实 CSS
test('danger button has red background', () => {
  const wrapper = mount(Button, { props: { variant: 'danger' } })
  // 这里只能检查 class 是否存在，不能验证真实颜色
  expect(wrapper.classes()).toContain('bg-red-500')
})

// Vitest Browser Mode：可以校验计算样式
test('danger button renders red', async () => {
  const { getByRole } = render(Button, { props: { variant: 'danger' } })
  await expect.element(getByRole('button')).toHaveStyle({
    backgroundColor: 'rgb(239, 68, 68)',
  })
})
```

### CSS 计算样式 - 需要浏览器

```javascript
// Node 运行器：拿不到真实计算样式
test('button has correct padding', () => {
  const wrapper = mount(Button)
  // 在 jsdom 中，getComputedStyle 会返回空值或默认值
  const style = window.getComputedStyle(wrapper.element)
  // style.padding 会是空字符串，而不是真实计算结果
})

// Vitest Browser Mode：真实的计算样式
test('button has correct padding', async () => {
  const { getByRole } = render(Button)
  const button = getByRole('button')

  await expect.element(button).toHaveStyle({
    padding: '12px 24px',
  })
})
```

### 原生事件 - 需要浏览器

```javascript
// Node 运行器：只有合成事件
test('handles drag and drop', async () => {
  const wrapper = mount(DraggableList)
  // trigger('dragstart') 是合成事件，行为可能不符合预期
  await wrapper.find('.item').trigger('dragstart')
})

// Vitest Browser Mode：通过 userEvent 使用真实原生事件
import { userEvent } from '@vitest/browser/context'

test('reorders items on drag', async () => {
  const { getByTestId } = render(DraggableList)

  const item = getByTestId('item-1')
  const target = getByTestId('item-3')

  await userEvent.dragAndDrop(item, target)

  // 断言重排结果
})
```

## 推荐测试策略

```javascript
// vitest.config.js - 分离测试配置

export default defineConfig({
  test: {
    // 默认：Node 环境，优先保证速度
    environment: 'happy-dom',

    // 浏览器测试放在独立目录
    include: ['src/**/*.test.{js,ts}'],
  },
})

// 单独运行浏览器测试
// npx vitest --browser.enabled
```

### 目录结构

```
tests/
├── unit/              # 快速的 Node 测试
│   ├── Button.test.js
│   └── useCounter.test.js
├── component/         # 较慢的浏览器测试
│   ├── Button.browser.test.js
│   └── DragDrop.browser.test.js
└── e2e/               # 完整 E2E 测试（Playwright）
    └── user-flow.spec.ts
```

## 参考资料

- [Vue.js Testing - Component Testing](https://vuejs.org/guide/scaling-up/testing#component-testing)
- [Vitest Browser Mode](https://vitest.dev/guide/browser.html)
