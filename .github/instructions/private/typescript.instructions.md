---
name: 'TS 使用规范'
description: '在编辑 .ts 和 .vue 文件时，TypeScript 相关的使用规范。覆盖 TypeScript 配置、类型声明、编译选项等方面的规则。'
applyTo:
  - '*.ts'
  - '*.vue'
  - 'tsconfig*.json'
---

# TS 使用规范

- Const Object Pattern with Type Extraction：使用 const 对象配合类型提取的方式定义常量和相关类型，禁止使用 enum 和联合类型。[demos.1]
- interface > type：优先使用 interface 定义类型，除非需要映射类型等 type 特有的功能。[demos.2]
- 禁止 any：禁止使用 any，未知类型使用 unknown，配合类型收窄（type narrowing）处理。[demos.3]
- import type：纯类型引用必须使用 import type 导入，避免运行时引入不必要的模块。[demos.4]
- 函数返回类型：导出函数必须显式声明返回类型，内部函数可依赖类型推断。[demos.5]
- 泛型命名规范：单字母大写（T / K / V / E / R），语义复杂时可使用多字符名称。[demos.6]
- 非空断言限制：优先使用可选链（?.）和空值合并（??），仅在生命周期等确定非空的场景使用 !。[demos.7]

## TypeScript 配置（tsconfig\*.json）

- 修改路径别名（paths）后，同步检查受影响文件中的 import 路径是否仍然正确。
- 新增或修改 `compilerOptions` 时，明确说明该选项对编译产物和类型检查的具体影响。
- 不为了消除类型错误而关闭严格检查选项（`strict`、`noUnusedLocals` 等），应修复源头。
- `tsconfig.json` 作为入口只做项目引用（references），不直接存放具体配置。

## 示例

关于"TS 使用规范"的具体示例，请参考 [TS 使用规范示例](./demos/typescript.demos.md)。
