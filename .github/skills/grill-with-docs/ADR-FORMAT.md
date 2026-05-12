# ADR Format

## 文件位置

- 放在 docs/adr/ 目录。
- 文件名格式：`0001-short-kebab-title.md`。

## 模板

```markdown
# 0001 Decision Title

## Status

Accepted

## Context

为什么现在需要做这个决定。

## Decision

最终选择了什么。

## Consequences

这个决定会带来什么收益、限制和代价。

## Alternatives Considered

- 方案 A：为什么没选。
- 方案 B：为什么没选。
```

## 使用规则

- ADR 记录的是“为什么这样定”，不是“这次改了哪些文件”。
- 如果理由只是“现在先这么做”，通常不值得写 ADR。
- 如果只是修复局部 bug，也通常不值得写 ADR。
