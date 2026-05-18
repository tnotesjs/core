---
name: web-design-guidelines
description: 按 Web Interface Guidelines 审查 UI 代码。当用户要求审查 UI、检查可访问性、做设计审计、审查 UX，或检查站点是否符合最佳实践时使用。
---

# Web 界面指南

审查文件是否符合 Web Interface Guidelines。

## 工作方式

1. 从下方源地址获取最新指南
2. 读取指定文件（或让用户提供文件/匹配模式）
3. 对照拉取到的指南逐条检查
4. 使用简洁的 `file:line` 格式输出发现的问题

## 指南来源

每次审查前都要重新获取最新指南：

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

使用 WebFetch 获取最新规则。拉取到的内容包含完整规则以及输出格式要求。

## 用法

当用户提供文件或匹配模式参数时：

1. 从上方源地址获取指南
2. 读取指定文件
3. 应用所获取指南中的全部规则
4. 按指南规定的格式输出发现的问题

如果用户没有指定文件，就询问要审查哪些文件。
