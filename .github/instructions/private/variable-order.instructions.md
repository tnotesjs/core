---
name: '变量字典序优先规则'
description: '编辑 .ts 和 .vue 文件时，覆盖变量声明、接口成员、类成员及 Vue SFC 脚本的排序规范。'
applyTo:
  - '*.ts'
  - '*.vue'
---

# 变量字典序优先规则

## 术语声明

- **config**：表示非响应式数据
- **states**：表示响应式数据
- **computed**：表示计算属性
- **methods**：表示函数或方法
- **exported**：表示导出的成员
- **internal**：表示模块内部的私有成员
- **options**：表示传入 composable 的配置参数对象

## 排序规则

- 所有排序默认为字典序（a -> z），除非另有说明。
- 分组顺序为 config -> states -> computed -> methods，每个分组内部按 exported -> internal 排列。

## 示例

关于字典序规则的具体示例，可见 [demos - 变量字典序优先规则](./demos/variable-order.demos.md)。
