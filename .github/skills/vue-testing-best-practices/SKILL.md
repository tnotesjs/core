---
name: vue-testing-best-practices
description: 用于 Vue.js 测试。覆盖 Vitest、Vue Test Utils、组件测试、mock、测试模式，以及 Playwright 端到端测试。
---

Vue.js 测试最佳实践、常见模式与典型陷阱。

### 测试

- 为 Vue 3 项目搭建测试基础设施 -> 见 [testing-vitest-recommended-for-vue](reference/testing-vitest-recommended-for-vue.md)
- 重构组件内部实现时测试持续崩坏 -> 见 [testing-component-blackbox-approach](reference/testing-component-blackbox-approach.md)
- 测试因竞态条件而间歇性失败 -> 见 [testing-async-await-flushpromises](reference/testing-async-await-flushpromises.md)
- 使用生命周期钩子或 inject 的 composable 难以测试 -> 见 [testing-composables-helper-wrapper](reference/testing-composables-helper-wrapper.md)
- 测试中出现 “injection Symbol(pinia) not found” 错误 -> 见 [testing-pinia-store-setup](reference/testing-pinia-store-setup.md)
- 带 async setup 的组件在测试中无法渲染 -> 见 [testing-suspense-async-components](reference/testing-suspense-async-components.md)
- 功能已经损坏，但快照测试依然通过 -> 见 [testing-no-snapshot-only](reference/testing-no-snapshot-only.md)
- 为 Vue 应用选择端到端测试框架 -> 见 [testing-e2e-playwright-recommended](reference/testing-e2e-playwright-recommended.md)
- 测试需要验证计算后的样式或真实 DOM 事件 -> 见 [testing-browser-vs-node-runners](reference/testing-browser-vs-node-runners.md)
- 测试由 defineAsyncComponent 创建的组件失败 -> 见 [async-component-testing](reference/async-component-testing.md)
- Teleport 出去的弹窗内容无法在 wrapper 查询中找到 -> 见 [teleport-testing-complexity](reference/teleport-testing-complexity.md)

## 参考资料

- [Vue.js 测试指南](https://vuejs.org/guide/scaling-up/testing)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
