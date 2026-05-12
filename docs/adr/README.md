# ADRs

## 目的

这个目录保存 @tnotesjs/core 的 Architecture Decision Records。

ADR 只记录值得长期保留背景的架构决策，不记录日常改动流水账。

## 何时写 ADR

只有同时满足下面三点时才值得新增一篇 ADR：

1. 这个决定后续不容易回滚。
2. 如果不写下来，未来读者会疑惑为什么这样做。
3. 这个决定来自真实权衡，而不是唯一显然选项。

## 不要为这些事情写 ADR

- 纯命名调整。
- 常规 bug 修复。
- 机械性重构。
- 没有明确 trade-off 的实现细节。

## 目录与命名

- 所有 ADR 统一放在 docs/adr/。
- 文件名格式：0001-short-kebab-title.md。
- 编号单调递增，不复用旧编号。

## 推荐模板

```markdown
# 0001 Decision Title

## Status

Accepted

## Context

为什么现在需要做这个决定。

## Decision

最终选择了什么。

## Consequences

这个决定会带来什么好处、限制和后果。

## Alternatives Considered

- 方案 A：为什么没选。
- 方案 B：为什么没选。
```

## 当前最可能出现 ADR 的主题

- 测试基础设施与测试 runner 的选择。
- 文件监听协调模型与全局更新策略。
- 哪些 VitePress 代码以源码形式发布，哪些需要预编译。
- 对外导出 API 的边界与稳定性策略。
