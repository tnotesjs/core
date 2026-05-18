---
title: Teleport 内容需要特殊测试方式
impact: MEDIUM
impactDescription: Vue Test Utils 无法通过标准的 wrapper.find() 方法找到被 Teleport 传送的内容
type: gotcha
tags: [vue3, teleport, testing, vue-test-utils]
---

# Teleport 内容需要特殊测试方式

**影响：MEDIUM** - Vue Test Utils 会把查询范围限定在已挂载组件内。Teleport 内容渲染在组件 DOM 树之外，因此 `wrapper.find()` 无法定位它。这会导致测试失败并带来困惑。

## 任务检查清单

- [ ] 在单元测试中 stub Teleport，让内容保留在组件树内
- [ ] 对真实 Teleport 的集成测试使用 `document.body` 查询
- [ ] 对被传送的组件，考虑使用 `getComponent()` 替代 DOM 查询

**问题示例 - 常规测试会失败：**

```vue
<!-- Modal.vue -->
<template>
  <button @click="open = true">Open</button>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal"
      data-testid="modal"
    >
      <input
        type="text"
        data-testid="modal-input"
      />
    </div>
  </Teleport>
</template>
```

```ts
// Modal.spec.ts - 错误示例
import { mount } from '@vue/test-utils'
import Modal from './Modal.vue'

test('modal input exists', async () => {
  const wrapper = mount(Modal)
  await wrapper.find('button').trigger('click')

  // 失败：Teleport 内容不在 wrapper 的 DOM 树里
  expect(wrapper.find('[data-testid="modal-input"]').exists()).toBe(true)
})
```

**方案 1 - Stub Teleport：**

```ts
import { mount } from '@vue/test-utils'
import Modal from './Modal.vue'

test('modal input exists', async () => {
  const wrapper = mount(Modal, {
    global: {
      stubs: {
        // stub teleport，让内容原地渲染
        Teleport: true,
      },
    },
  })

  await wrapper.find('button').trigger('click')

  // 生效：内容渲染在 wrapper 内部
  expect(wrapper.find('[data-testid="modal-input"]').exists()).toBe(true)
})
```

**方案 2 - 查询 document.body：**

```ts
import { mount } from '@vue/test-utils'
import Modal from './Modal.vue'

test('modal renders to body', async () => {
  const wrapper = mount(Modal, {
    attachTo: document.body, // Teleport 生效所必需
  })

  await wrapper.find('button').trigger('click')

  // 查询真实 DOM
  const modal = document.querySelector('[data-testid="modal"]')
  expect(modal).toBeTruthy()

  const input = document.querySelector('[data-testid="modal-input"]')
  expect(input).toBeTruthy()

  // 清理
  wrapper.unmount()
})
```

**方案 3 - 自定义可访问内容的 Teleport Stub：**

```ts
import { mount, config } from '@vue/test-utils'
import { h, Teleport } from 'vue'
import Modal from './Modal.vue'

// 自定义 stub，以可测试的方式渲染内容
const TeleportStub = {
  setup(props, { slots }) {
    return () => h('div', { class: 'teleport-stub' }, slots.default?.())
  },
}

test('modal with custom stub', async () => {
  const wrapper = mount(Modal, {
    global: {
      stubs: {
        Teleport: TeleportStub,
      },
    },
  })

  await wrapper.find('button').trigger('click')

  // 内容位于 .teleport-stub 内部
  expect(wrapper.find('.teleport-stub [data-testid="modal-input"]').exists()).toBe(true)
})
```

## 测试 Vue Final Modal 和其他 UI 库

像 Vue Final Modal 这样的库会在内部使用 Teleport，因此也会触发测试失败：

```ts
// 问题：Vue Final Modal 会 Teleport 到 body
import { VueFinalModal } from 'vue-final-modal'

test('modal content', async () => {
  const wrapper = mount(MyComponent, {
    global: {
      stubs: {
        // stub 模态框组件，避免 teleport 问题
        VueFinalModal: true,
      },
    },
  })
})
```

## 端到端测试（Cypress、Playwright）

E2E 测试查询的是真实 DOM，因此 Teleport 会自然生效：

```ts
// Cypress
it('opens modal', () => {
  cy.visit('/page-with-modal')
  cy.get('button').click()

  // 生效：Cypress 查询真实 DOM
  cy.get('[data-testid="modal"]').should('be.visible')
})
```

## 参考资料

- [Vue Test Utils - Teleport](https://test-utils.vuejs.org/guide/advanced/teleport)
- [Vue Test Utils - Stubs](https://test-utils.vuejs.org/guide/advanced/stubs-shallow-mount)
