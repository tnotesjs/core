---
name: improve-codebase-architecture
description: "寻找当前代码库里值得 deepening 的模块与结构摩擦点，帮助做更深、更稳、更易测的重构。适用于用户想改进 architecture、合并浅层模块、提升 testability 或 AI navigability。"
argument-hint: "描述你想改进的目录、模块或结构性痛点"
user-invocable: true
---

# Improve Codebase Architecture

## 目标

识别真正的结构摩擦点，并提出 deepening opportunities，而不是罗列表面清理项。

## 当前仓库约束

- 领域语言统一读取根目录 CONTEXT.md。
- 历史结构决策统一读取 docs/adr/。

## 术语纪律

在建议中统一使用 [LANGUAGE.md](./LANGUAGE.md) 的架构词汇，以及 CONTEXT.md 的领域词汇。

- 说 module、interface、implementation、seam、adapter、depth、leverage、locality。
- 不要在同一轮分析里漂移成 component、boundary、wrapper、layer 等混杂词。

## Process

### 1. Explore

先读 CONTEXT.md 与相关 ADR，再探索代码，重点寻找这些信号：

- 理解一个概念需要在很多浅层文件之间来回跳转。
- interface 几乎和 implementation 一样复杂。
- 纯函数或小模块被抽出来只是为了测试，但真实复杂度仍散落在调用方。
- 紧耦合逻辑横跨多个 module，缺少稳定 seam。
- 现有代码很难通过 public interface 做有效测试。

对怀疑过浅的 module，执行 deletion test：如果删掉它，复杂度会集中回一个地方，还是只是原地外溢到 N 个调用方？

### 2. Present candidates

先给一个编号列表，不要直接进入实现。每个 candidate 必须包含：

1. Files：涉及哪些文件或 module。
2. Problem：当前结构为什么带来摩擦。
3. Solution：plain English 或简洁中文描述要如何 deepening。
4. Benefits：从 locality、leverage、test surface 三个角度解释收益。

如果 candidate 与现有 ADR 冲突，只有在真实摩擦已经足够大时才提出，并明确标注冲突关系。

候选列表阶段不要直接设计 interface；先让用户选最值得继续的一项。

### 3. Grilling loop

用户选定 candidate 后，进入追问：

- 这个 module 的真正 interface 应该让调用方知道什么，不该知道什么？
- 哪些复杂度应该被压到 implementation 内部？
- seam 是否真实存在，还是只是一个 pass-through module？
- 哪些 tests 应该通过公开 interface 存活下来？

如果讨论中产生了新的稳定术语，立即更新 CONTEXT.md。

如果用户以 load-bearing reason 拒绝某个候选，并且这个理由未来值得反复引用，可以提议写 ADR。

如果需要进一步推敲 interface 形状，参考 [INTERFACE-DESIGN.md](./INTERFACE-DESIGN.md)。

## 输出要求

完成一轮 architecture review 后，输出：

1. 候选列表或已选候选。
2. 结构摩擦的根因判断。
3. 推荐的 deepening 方向。
4. 需要同步到 CONTEXT.md 或 ADR 的内容。
