---
name: 'Import 排序规则'
description: '编辑 .ts、.vue、.js、.mjs、.cjs 文件时，规范 import 分组、空行和字典序。'
applyTo:
	- '*.ts'
	- '*.vue'
	- '*.js'
	- '*.mjs'
	- '*.cjs'
---

# Import 排序规则

当前仓库以 `eslint.config.mjs` 中的 `import/order` 和 `import/newline-after-import` 为准。

- import 按 4 个分组排序：`builtin + external` -> `parent + sibling + index` -> `internal` -> `type`
- `builtin` 和 `external` 属于同一组，组内不插空行
- 相对路径导入（`../`、`./`）整体早于内部别名导入；不要把 `@/...` 提前到相对路径组之前
- 当前只有 `@/**` 被视为 `internal` 组，且放在相对路径组之后
- 纯类型导入放在最后的 `type` 组；如果整条语句只导入类型，使用 `import type`
- `import type` 不参与 `@/**` 的 `internal` 特例；只要是纯类型导入，一律归入最后的 `type` 组
- 同组内按模块路径字典序升序排列，忽略大小写
- 字典序针对模块路径，不要求手动重排 `{ ... }` 中的成员顺序
- 分组之间保留 1 个空行，同一分组内部不要人为插入空行
- import 区块结束后，正文开始前再保留 1 个空行
- 如果同一模块同时需要运行时值和类型，优先写成同一条 mixed import，例如 `import { foo, type Bar } from './x'`，不要只为了凑 `type` 分组拆成两条重复导入

## 示例

```ts
import { resolve } from 'path'
import { defineConfig } from 'vitepress'

import { getThemeConfig } from '../config/theme'
import { readmePlugin } from './readmePlugin'
import { sidebarPlugin } from './sidebarPlugin'

import { useSidebarStore } from '@/stores/sidebar'

import type { TNotesConfig } from '@/types'
```
