---
name: pinia
description: Pinia 官方 Vue 状态管理库，类型安全且可扩展。定义 store、处理 state/getters/actions，或在 Vue 应用中实现 store 模式时使用。
---

# Pinia

Pinia 是 Vue 官方状态管理库，设计目标是直观且类型安全。它同时支持 Options API 和 Composition API 风格，并提供一流的 TypeScript 支持与 devtools 集成。

> 该 skill 基于 Pinia v3.0.4，生成时间为 2026-01-28。

## 核心参考

| 主题  | 说明                                                    | 参考                                     |
| ----- | ------------------------------------------------------- | ---------------------------------------- |
| Store | 定义 store、state、getters、actions、storeToRefs 与订阅 | [core-stores](references/core-stores.md) |

## 功能

### 可扩展性

| 主题 | 说明                                 | 参考                                               |
| ---- | ------------------------------------ | -------------------------------------------------- |
| 插件 | 通过自定义属性、状态和行为扩展 store | [features-plugins](references/features-plugins.md) |

### 可组合性

| 主题       | 说明                                         | 参考                                                                 |
| ---------- | -------------------------------------------- | -------------------------------------------------------------------- |
| 组合式函数 | 在 store 内使用 Vue composables（如 VueUse） | [features-composables](references/features-composables.md)           |
| Store 组合 | store 之间的通信，以及如何避免循环依赖       | [features-composing-stores](references/features-composing-stores.md) |

## 最佳实践

| 主题       | 说明                                         | 参考                                                                               |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| 测试       | 使用 @pinia/testing 做单元测试、mock 与 stub | [best-practices-testing](references/best-practices-testing.md)                     |
| 组件外使用 | 在导航守卫、插件、middleware 中使用 store    | [best-practices-outside-component](references/best-practices-outside-component.md) |

## 进阶

| 主题 | 说明                               | 参考                                         |
| ---- | ---------------------------------- | -------------------------------------------- |
| SSR  | 服务端渲染与状态注水               | [advanced-ssr](references/advanced-ssr.md)   |
| Nuxt | Nuxt 集成、自动导入与 SSR 最佳实践 | [advanced-nuxt](references/advanced-nuxt.md) |
| HMR  | 开发期热模块替换                   | [advanced-hmr](references/advanced-hmr.md)   |

## 关键建议

- **复杂逻辑、composables 和 watchers 优先使用 Setup Stores**
- **解构 state/getters 时使用 `storeToRefs()`**，以保留响应性
- **Actions 可以直接解构**，因为它们已绑定到 store
- **在函数内部调用 store**，不要放在模块作用域，SSR 场景尤其如此
- **为每个 store 添加 HMR 支持**，以获得更好的开发体验
- **组件测试优先使用 `@pinia/testing`**，以便对 store 做 mock
