---
name: vitest
description: 由 Vite 驱动的快速单元测试框架，提供兼容 Jest 的 API。编写测试、mock、配置覆盖率，或处理测试过滤与测试夹具时使用。
---

Vitest 是由 Vite 驱动的新一代测试框架。它开箱即用地提供兼容 Jest 的 API，并支持原生 ESM、TypeScript 和 JSX。Vitest 与你的 Vite 应用共享相同的配置、transformers、resolvers 和 plugins。

**关键特性：**

- Vite 原生：使用 Vite 的转换流水线，实现类似 HMR 的快速测试更新
- 兼容 Jest：可直接替换大多数 Jest 测试套件
- 智能 watch 模式：基于模块图仅重跑受影响的测试
- 原生支持 ESM、TypeScript 和 JSX，无需额外配置
- 多线程 workers，支持并行执行测试
- 内置基于 V8 或 Istanbul 的覆盖率能力
- 提供快照测试、mock 与 spy 工具

> 该 skill 基于 Vitest 3.x，生成时间为 2026-01-28。

## 核心

| 主题         | 说明                                                             | 参考                                         |
| ------------ | ---------------------------------------------------------------- | -------------------------------------------- |
| 配置         | Vitest 与 Vite 配置集成，以及 `defineConfig` 的用法              | [core-config](references/core-config.md)     |
| CLI          | 命令行接口、命令与参数                                           | [core-cli](references/core-cli.md)           |
| Test API     | `test`/`it` 函数，以及 `skip`、`only`、`concurrent` 等修饰符     | [core-test-api](references/core-test-api.md) |
| Describe API | 用于测试分组和嵌套套件的 `describe`/`suite`                      | [core-describe](references/core-describe.md) |
| Expect API   | 包含 `toBe`、`toEqual`、matchers 和非对称匹配器的断言            | [core-expect](references/core-expect.md)     |
| Hooks        | `beforeEach`、`afterEach`、`beforeAll`、`afterAll`、`aroundEach` | [core-hooks](references/core-hooks.md)       |

## 功能

| 主题       | 说明                                                   | 参考                                                       |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Mocking    | 使用 `vi` 工具 mock 函数、模块、定时器与日期           | [features-mocking](references/features-mocking.md)         |
| Snapshots  | 使用 `toMatchSnapshot` 和内联快照进行快照测试          | [features-snapshots](references/features-snapshots.md)     |
| Coverage   | 使用 V8 或 Istanbul provider 生成代码覆盖率            | [features-coverage](references/features-coverage.md)       |
| 测试上下文 | 测试夹具、`context.expect` 与 `test.extend` 自定义夹具 | [features-context](references/features-context.md)         |
| 并发       | 并发测试、并行执行与分片                               | [features-concurrency](references/features-concurrency.md) |
| 过滤       | 按名称、文件模式和标签过滤测试                         | [features-filtering](references/features-filtering.md)     |

## 进阶

| 主题     | 说明                                                      | 参考                                                         |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| vi 工具  | `vi` 助手：mock、`spyOn`、fake timers、hoisted、`waitFor` | [advanced-vi](references/advanced-vi.md)                     |
| 环境     | 测试环境：node、jsdom、happy-dom 与自定义环境             | [advanced-environments](references/advanced-environments.md) |
| 类型测试 | 使用 `expectTypeOf` 和 `assertType` 做类型级测试          | [advanced-type-testing](references/advanced-type-testing.md) |
| Projects | 多项目 workspace，以及按项目区分配置                      | [advanced-projects](references/advanced-projects.md)         |
