---
name: vitest
description: 'Vitest 测试工具规范。适用于当前仓库里编写或维护 `*.test.ts`、调整 `vitest.config.ts`、处理 `globals: false` 下的显式导入、mocking、snapshot、coverage、过滤运行、type testing 或 Vitest 报错时使用。'
argument-hint: '描述你要写的测试、Vitest 配置、mock 场景或报错信息'
user-invocable: true
disable-model-invocation: false
---

# Vitest 工具规范

## 适用范围

适用于以下表面：

- `vitest.config.ts`
- `**/*.test.ts`
- 使用 Vitest 的 TypeScript / Vue 测试文件
- 与 mocking、snapshot、coverage、过滤运行、环境切换相关的问题

当前仓库已经集成 Vitest v4，并且测试主要覆盖 `utils/`、`core/` 等纯逻辑层。这里需要的不是“是否采用 TDD”的流程讨论，而是“如何正确使用 Vitest 这个工具”。

## 何时使用

- 需要新增或修改测试文件
- 需要理解 `describe`、`it`、`expect`、`vi` 的具体写法
- 需要 mock 文件系统、Git、时间、网络等系统边界
- 需要调整 `vitest.config.ts`
- 需要处理 snapshot、coverage、过滤运行、type testing
- 需要定位某个 Vitest 报错或测试执行行为

## 何时不要使用

- 如果问题是“是否要先写测试、怎么走 red-green-refactor、如何拆行为优先级”
  这类问题使用 [../tdd/SKILL.md](../tdd/SKILL.md)
- 如果问题是组件目录怎么拆、composable 怎么设计
  这类问题使用 [../vue-architecture/SKILL.md](../vue-architecture/SKILL.md)

## 当前仓库里的 Vitest 约定

- 测试框架：Vitest v4
- 配置入口：`vitest.config.ts`
- 测试匹配：`**/*.test.ts`
- `globals: false`，因此测试文件应显式从 `vitest` 导入 `describe`、`it`、`expect`、`vi` 等 API
- 测试文件与源码同目录，命名 `<source>.test.ts`
- 当前主战场是 `utils/`、`core/` 等纯函数和低副作用逻辑

## 核心原则

### 1. 先区分 workflow 和 tool

`TDD` 解决的是开发流程，`Vitest` 解决的是测试工具本身。

- 需要决定先写测试还是先写实现 → `tdd`
- 已经确定要写测试，但不确定怎么用 `vi`、怎么配 config、怎么做 snapshot → 本 skill

### 2. 遵循当前仓库的显式导入风格

由于 `globals: false`，不要假设 `describe`、`it`、`expect`、`vi` 是全局可用的。

当前仓库的标准写法是：

```ts
import { describe, expect, it } from 'vitest'
```

需要 mocking 或 spy 时，再显式引入 `vi`。

### 3. 优先写窄测试，贴着 public interface 断言

当前仓库的测试大多针对纯逻辑和公共输出。优先保持：

- 每个 `it()` 只验证一个具体行为
- 断言 public interface，不依赖内部实现
- 测试名直接描述行为结果

这和 `tdd` 的哲学一致，但本 skill 更关心如何用 Vitest 把它表达出来。

### 4. mock 只打系统边界

当前仓库的既有纪律是：

- 可以 mock 文件系统、Git、网络、时间
- 不要 mock 自己的 module、class 或内部实现细节

在 Vitest 里，这通常意味着：

- `vi.mock()` 用于外部模块边界
- `vi.spyOn()` 用于观测外部对象的调用
- fake timers 只在确实涉及时间行为时使用

### 5. snapshot 只用于大输出，不用于小断言偷懒

如果输出是：

- 长 Markdown 结果
- 复杂目录树
- 大段结构化文本

可以考虑 snapshot。

如果只是字符串、布尔值、短数组、短对象，优先直接断言，不要把简单断言藏进 snapshot。

### 6. 默认使用 Node 测试环境

当前仓库的测试主要是 Node / 纯逻辑语境。只有在确实要测 DOM、浏览器 API、Vue 组件渲染时，才考虑引入 `jsdom` 或 `happy-dom`。

不要因为 Vitest 支持多环境，就默认把测试复杂化。

### 7. 配置改动优先保持最小

当前 `vitest.config.ts` 很薄。新增配置前先确认是否真的需要：

- 改 `include` / `exclude`
- 切环境
- 加 coverage
- 调整 alias / setup files

没有明确需求时，不要把通用模板整包搬进当前仓库。

### 8. type testing 只在公共类型契约上使用

当你需要验证公开类型、导出签名或泛型推断时，可以考虑 `expectTypeOf` / `assertType`。

但如果问题只是运行时行为，不要把类型测试混进普通单元测试里增加噪音。

## 分支决策

| 场景 | 处理方式 |
| ---- | -------- |
| 给 `utils/` 或 `core/` 新增行为测试 | 同目录新增 `<source>.test.ts`，显式导入 `describe/it/expect` |
| services 层要隔离文件系统 / Git / 时间 | 用 `vi.mock()`、`vi.spyOn()` 或 fake timers，且只打系统边界 |
| 输出是长文本或复杂结构 | 评估 snapshot 是否比手写断言更清晰 |
| 只是简单标量或短对象 | 直接用 `toBe`、`toEqual` 等显式断言 |
| 需要跑单个文件或筛选测试 | 优先使用 Vitest CLI 过滤，而不是改测试源码 |
| 需要覆盖率 | 明确开启 coverage 配置，不默认引入 |
| 需要 DOM / 组件测试 | 先确认是否真的值得引入额外环境和渲染工具 |
| 需要 test-first 流程指导 | 回到 `tdd` skill |

## 常用起手式

### 基础测试

```ts
import { describe, expect, it } from 'vitest'

import { subject } from './subject'

describe('subject', () => {
  it('does something observable', () => {
    expect(subject()).toBe('value')
  })
})
```

### 带 mock 的测试

```ts
import { describe, expect, it, vi } from 'vitest'

describe('subject', () => {
  it('calls external dependency once', () => {
    const fn = vi.fn()

    subject(fn)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
```

## 阅读顺序

当问题落在测试工具层时，优先阅读：

1. `vitest.config.ts`
2. 目标源码旁边的现有 `*.test.ts`
3. 目标源码本身
4. 若仍不清楚，再查具体 Vitest API

## 检查清单

在完成测试相关改动前，至少确认：

- 这次问题是 Vitest 工具问题，而不是 TDD 流程问题
- 测试文件是否沿用当前仓库的显式导入风格
- mock 是否只打系统边界
- 是否引入了不必要的环境、setup 或 coverage 配置
- 测试是否仍然贴着 public interface，而不是内部实现

## 参考映射

这份 skill 提炼自上游 Vitest 文档中的以下几块知识，但已经按当前仓库场景收窄：

- 基础测试 API
- mocking 与 `vi`
- snapshots
- coverage
- 过滤运行与配置
- type testing

未默认展开的部分不代表无用，只是当前仓库还没有足够多的场景需要它们成为默认规则。
