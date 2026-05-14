---
name: tdd
description: "Test-driven development with red-green-refactor 循环。适用于用户想用 TDD 构建功能或修复 bug，提及 red-green-refactor、integration test，或要求 test-first 开发。"
argument-hint: "描述你要实现的 Feature 或要修复的 Bug"
user-invocable: true
---

# TDD

## 何时使用

- 用户要求用 test-first 方式开发。
- 需要修复 bug，但要求先写回归测试再修复。
- 用户提及 "red-green-refactor"。
- 当前改动涉及纯逻辑或工具函数（utils/、core/ 纯函数层），最适合 TDD 起手。

## 当前仓库的起手式

- 测试框架：Vitest v4，已集成。
- 测试脚本：`pnpm test`（单次运行），`pnpm test:watch`（watch 模式）。
- 测试文件与源码同目录，命名 `<source>.test.ts`。
- 先用 /grill-me 确认接口和行为优先级，再进入 TDD 循环。
- 如果卡在 Vitest API、mocking、snapshot、coverage 或配置细节，使用 [../vitest/SKILL.md](../vitest/SKILL.md)。

## 哲学

**核心原则**：测试应该通过 public interface 验证行为，而不是验证实现细节。代码可以完全重写，测试应该存活。

- Good test：描述 *系统做什么*，不是 *怎么做的*。
- Bad test：耦合到内部结构，重构不变行为时测试挂了。

## 反模式：Horizontal Slices

不要先写完所有 test 再写所有代码：

```text
错误（水平切片）：
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5
```

正确方式是垂直切片，一次只走一个 red-green 循环：

```text
正确（垂直切片）：
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
```

## 工作流

### 1. Planning

- 确认 public interface 形状。
- 确认行为优先级（测什么比怎么测重要）。
- 如涉及模块设计，参考 [improve-codebase-architecture 的 INTERFACE-DESIGN.md](../improve-codebase-architecture/INTERFACE-DESIGN.md)。
- 获取用户同意后再动笔。

### 2. Tracer Bullet

写一个 test 确认一件事：

```text
RED:   写第一个 test → 失败
GREEN: 写最少代码让它通过 → 通过
```

### 3. Incremental Loop

对剩余行为逐个迭代：

```text
RED:   写下一个 test → 失败
GREEN: 最少代码 → 通过
```

规则：

- 一次只写一个 test。
- 只写够让当前 test 通过的代码。
- 不要预先实现还没 test 覆盖的功能。

### 4. Refactor

当所有 test 通过后，检查重构空间：

- 提取重复。
- 加深 module（把复杂度压到小 interface 后面）。
- 保持 test 通过。

**RED 状态下不要重构**，先全变 GREEN。

## 当前仓库的 mock 纪律

- 只 mock 系统边界：文件系统、Git 调用、网络请求、时间。
- 不要 mock 自己的 module 或 class。
- 本仓库的 services/ 层需要用 dependency injection 模式来方便 mock。

## Checklist（每个循环）

```text
[] Test 描述行为，不是实现
[] Test 只用了 public interface
[] Test 能在内部重构后存活
[] 代码只够通过当前 test
[] 没有超前添加未测试的功能
```

## 参考

- [Good and Bad Tests](./tests.md)
- [Mocking Guidelines](./mocking.md)
- [Vitest Tooling](../vitest/SKILL.md)
- [Interface Design](../improve-codebase-architecture/INTERFACE-DESIGN.md)
- [Architecture Language](../improve-codebase-architecture/LANGUAGE.md)
