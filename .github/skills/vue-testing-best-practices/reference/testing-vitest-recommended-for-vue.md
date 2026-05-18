---
title: Vue 3 测试优先使用 Vitest，Vue 团队推荐
impact: MEDIUM
impactDescription: 在 Vite 项目中使用 Jest 或其他运行器需要复杂配置，并会拖慢测试速度
type: best-practice
tags: [vue3, testing, vitest, vite, configuration, setup]
---

# Vue 3 测试优先使用 Vitest，Vue 团队推荐

**影响：MEDIUM** - Vitest 由 Vue/Vite 团队成员创建和维护，并与 Vite 共享同一套配置与转换流水线。在基于 Vite 的项目中使用 Jest 或其他测试运行器，需要额外配置，并且可能带来更慢的执行速度和兼容性问题。

新的 Vue 3 项目应优先使用 Vitest。只有在迁移现有测试体系时，才考虑继续使用 Jest。

## 任务检查清单

- [ ] 安装 Vue 测试所需的 Vitest 及相关依赖
- [ ] 在 vite.config.js 或 vitest.config.js 中配置 vitest
- [ ] 配置合适的测试环境（happy-dom 或 jsdom）
- [ ] 在 package.json 中添加测试脚本
- [ ] 如果希望测试语法更简洁，可配置 globals
- [ ] 使用 @vue/test-utils 挂载组件

## 快速开始

```bash
# 安装所需依赖
npm install -D vitest @vue/test-utils happy-dom
# 或使用 jsdom
npm install -D vitest @vue/test-utils jsdom
```

**vite.config.js：**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    // 启用全局测试 API（describe、it、expect）
    globals: true,
    // happy-dom 更快（或用 'jsdom' 获得更高兼容性）
    environment: 'happy-dom',
    // 可选：用于全局配置的 setup 文件
    setupFiles: ['./src/test/setup.js'],
  },
})
```

**package.json：**

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**tsconfig.json（如果使用 TypeScript）：**

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## 测试文件示例

```javascript
// src/components/Counter.test.js
import { describe, it, expect, beforeEach } from 'vitest' // 使用 globals: true 时可省略
import { mount } from '@vue/test-utils'
import Counter from './Counter.vue'

describe('Counter', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(Counter)
  })

  it('renders initial count', () => {
    expect(wrapper.find('[data-testid="count"]').text()).toBe('0')
  })

  it('increments when button clicked', async () => {
    await wrapper.find('[data-testid="increment"]').trigger('click')
    expect(wrapper.find('[data-testid="count"]').text()).toBe('1')
  })
})
```

## Vitest 与 Jest 对比

| 特性         | Vitest               | Jest           |
| ------------ | -------------------- | -------------- |
| Vite 集成    | 原生支持             | 需要额外配置   |
| 速度         | 很快（原生 ESM）     | 在 Vite 下较慢 |
| Watch Mode   | 很强                 | 不错           |
| Vue SFC 支持 | 配合 Vite 可直接工作 | 需要 vue-jest  |
| 配置共享     | 与 vite.config 共用  | 独立配置       |
| API          | 兼容 Jest            | 标准           |

## 配合 Testing Library 使用

```bash
npm install -D @testing-library/vue @testing-library/jest-dom
```

```javascript
// src/test/setup.js
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
```

```javascript
// Component.test.js
import { render, screen, fireEvent } from '@testing-library/vue'
import UserCard from './UserCard.vue'

test('displays user name', () => {
  render(UserCard, {
    props: { name: 'John Doe' },
  })

  expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

## 高级配置

```javascript
// vitest.config.js（如果更喜欢单独文件）
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'test'],
    },
    // 有助于调试
    reporters: ['verbose'],
    // 在 CI 中串行运行测试
    poolOptions: {
      threads: {
        singleThread: process.env.CI === 'true',
      },
    },
  },
})
```

## 常见模式

### 模拟模块

```javascript
import { vi } from 'vitest'

vi.mock('@/api/users', () => ({
  fetchUser: vi.fn().mockResolvedValue({ name: 'John' }),
}))
```

### 配合假定时器测试

```javascript
import { vi, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('debounced search', async () => {
  const wrapper = mount(SearchBox)
  await wrapper.find('input').setValue('vue')

  vi.advanceTimersByTime(300)
  await flushPromises()

  expect(wrapper.emitted('search')).toBeTruthy()
})
```

## 参考资料

- [Vitest Documentation](https://vitest.dev/)
- [Vue.js Testing Guide](https://vuejs.org/guide/scaling-up/testing)
- [Vue Test Utils](https://test-utils.vuejs.org/)
