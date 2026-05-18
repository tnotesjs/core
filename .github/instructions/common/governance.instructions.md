---
name: 'copilot 定制文件治理规则'
description: '在创建、重命名或重组 .github 下的 Copilot 定制文件时使用。覆盖总入口与细分规则的分层、目录命名、可移植性，以及何时使用 copilot-instructions.md、*.instructions.md 与 skill。'
applyTo:
  - '.github/copilot-instructions.md'
  - '.github/instructions/**'
  - '.github/skills/**'
---

# copilot 定制文件治理规则

copilot 定制文件指 `.github/` 目录下为 Copilot 定义的行为配置，包括 instructions 文件（约束）和 skills 文件（能力）。

## 总入口（copilot-instructions.md）

- 只保留一个总入口：`.github/copilot-instructions.md`。
- 只放所有对话都适用的硬约束和导航索引，不堆长篇项目背景。
- 项目相关的背景信息应写入项目知识库文档（如 CONTEXT.md），总入口通过引用指向它。
- 如果需要在此文件中声明演进协议或元规则，保持简短，具体细节展开到对应的 instruction 文件。

## 细分指令（.github/instructions/）

- 按子目录分层，目录承担 scope，文件名只保留 topic。
  - `common/` — 可跨项目复用的规则，不写死项目名、目录名或当前仓库特例。
  - `private/` — 当前仓库独有的规则，不重复 common 已覆盖的内容。
- 文件统一命名为 `<topic>.instructions.md`。
- 每份 instruction 文件只承担一个关注点，不混入不相关的规则。
- 只对部分文件生效的规则，拆分为独立的 instruction 文件并配合 `applyTo` 限定范围，不堆回总入口。

## Skills（.github/skills/）

- 每个 skill 独立目录，入口文件固定为 `SKILL.md`，配套资料与入口同目录。
- Skill 本质上是“按需加载的能力”，不是行为约束。判断标准：
  - 如果是“写代码时必须遵守的规范” => 写成 `.instructions.md`
  - 如果是“执行某个具体任务时才需要的流程或指导” => 保留为 skill
- Skill 应具备可复用性，项目特有的背景信息不写入 skill，写入 private instruction 或知识库文档。

## 目录结构基线

```
.github/
├── copilot-instructions.md              # 总入口
├── instructions/
│   ├── common/                          # 跨项目可复用
│   │   ├── frontend.instructions.md
│   │   ├── config.instructions.md
│   │   ├── workflow.instructions.md
│   │   └── governance.instructions.md
│   └── private/                         # 当前仓库独有
│       └── oc3--ai-course.instructions.md
└── skills/
    ├── <skill-name>/
    │   ├── SKILL.md                     # 技能定义（必需）
    │   └── *.md                         # 配套资料（可选）
    └── ...
```

新增文件沿用这一模式。
