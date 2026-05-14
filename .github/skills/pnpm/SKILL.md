---
name: pnpm
description: 'pnpm 包管理规范。适用于当前仓库里处理依赖安装与移除、`package.json` 依赖分类、`peerDependencies`、`pnpm-workspace.yaml`、lockfile、overrides、patches、`pnpm link/unlink` 或 pnpm 命令差异时使用。'
argument-hint: '描述你要调整的依赖、pnpm 配置、workspace 行为或报错'
user-invocable: true
disable-model-invocation: false
---

# pnpm 包管理规范

## 适用范围

适用于以下表面：

- `package.json` 中与依赖、scripts、packageManager 相关的部分
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- 与 pnpm install / add / remove / update / exec / dlx / link 相关的问题
- overrides、patches、peerDependencies、workspace 行为相关的问题

当前仓库的包管理器是 pnpm。这里需要处理的是“pnpm 作为工具应如何使用”，不是仓库私有的发布决策或 API 兼容策略。

## 何时使用

- 需要新增、移除、升级依赖
- 需要判断依赖应放在 `dependencies`、`devDependencies` 还是 `peerDependencies`
- 需要理解或调整 `pnpm-workspace.yaml`
- 需要处理 lockfile、workspace、link、本地调试或安装行为异常
- 需要评估是否该使用 overrides、patches、catalogs 等 pnpm 特性

## 何时不要使用

- 如果问题是当前仓库的发版策略、版本号语义、CHANGELOG 纪律
  这些约束以 [../../copilot-instructions.md](../../copilot-instructions.md) 和私有 instructions 为准
- 如果问题是代码导出边界、VitePress 运行时、组件架构
  这些问题应交给对应的 skill 或 instruction

## 当前仓库里的 pnpm 约定

- 包管理器：pnpm
- `packageManager` 已固定在 `package.json`
- 当前存在 `pnpm-workspace.yaml`，但配置很薄，不要默认把 monorepo 模板整包搬进来
- 日常开发和验证命令已经以 pnpm 脚本形式存在于 `package.json`
- 当前仓库对 `vite`、`vitepress`、`vue` 有明确的 `peerDependencies` 约束

## 核心原则

### 1. 先判断是工具问题还是仓库策略问题

pnpm skill 负责回答：

- 命令怎么用
- 依赖该放哪一栏
- workspace / lockfile / overrides / patches 是否该启用

它不负责定义：

- 当前仓库的发版策略
- 版本升级后的兼容性标准
- 对外 API 是否该调整

### 2. 依赖分类先看运行时边界

新增依赖前先问三个问题：

- 它是否在发布包运行时真正需要
- 它是否只在开发、测试、lint、构建阶段使用
- 它是否应由宿主仓库提供，而不是由本包强绑定

在当前仓库里，`vite`、`vitepress`、`vue` 这类宿主侧能力优先放在 `peerDependencies`，不要因为本地方便就挪进 `dependencies`。

### 3. workspace 配置优先保持最小

当前 `pnpm-workspace.yaml` 很薄。没有明确收益时，不要主动引入：

- catalogs
- overrides
- patches
- hooks
- 大量 workspace 模板配置

pnpm 支持这些能力，不代表当前仓库现在就需要它们。

### 4. lockfile 是状态结果，不是手工编辑目标

`pnpm-lock.yaml` 应由 pnpm 命令维护，而不是手工改写。处理依赖问题时，优先改：

- `package.json`
- `pnpm-workspace.yaml`
- 必要的 pnpm 配置文件

再让 pnpm 生成新的 lockfile。

### 5. overrides 和 patches 只在“必须绕过上游”时使用

如果一个问题可以通过：

- 正常升级依赖
- 调整 semver range
- 修正依赖分类

解决，就不要先上 overrides 或 patches。

只有在上游包短期内无法直接满足需求时，再把 overrides / patches 作为最后手段。

### 6. link 本地调试要和仓库现有约定一致

当前仓库已经有明确的本地联调方式和恢复方式。涉及 `pnpm link`、`pnpm unlink` 或本地包替换时，优先遵循仓库现有约定，而不是临时发明另一套流程。

### 7. 优先通过脚本入口运行任务

如果 `package.json` 已经定义了脚本，优先使用现有脚本，而不是重复拼长命令。这样更符合当前仓库的约定，也更容易保持命令一致。

### 8. 严格模式带来的约束是好事

pnpm 的严格依赖解析会暴露 phantom dependency 一类问题。出现这类报错时，优先修正真实依赖关系，而不是想办法绕过它。

## 分支决策

| 场景 | 处理方式 |
| ---- | -------- |
| 新增仅开发阶段使用的工具 | 放 `devDependencies` |
| 新增发布包运行时必须依赖的库 | 放 `dependencies` |
| 新增应由宿主仓库提供的框架能力 | 优先放 `peerDependencies` |
| 只是跑已有任务 | 优先使用 `package.json` 里的 pnpm script |
| lockfile 变化与 `package.json` 不一致 | 先修正声明文件，再重新生成 lockfile |
| 想用 overrides / patches | 先证明正常升级或分类修正解决不了问题 |
| 遇到 workspace / link 异常 | 先读 `pnpm-workspace.yaml` 与仓库现有约定 |
| 需要发版相关操作 | 回到仓库私有发布规则，而不是只看 pnpm 语义 |

## 常用起手式

### 安装与移除

```bash
pnpm add <pkg>
pnpm add -D <pkg>
pnpm remove <pkg>
```

### 执行已有脚本

```bash
pnpm test
pnpm lint
pnpm build
```

### 执行本地依赖提供的命令

```bash
pnpm exec <command>
```

### 临时执行包

```bash
pnpm dlx <package>
```

## 阅读顺序

当问题落在包管理层时，优先阅读：

1. `package.json`
2. `pnpm-workspace.yaml`
3. `pnpm-lock.yaml`
4. 仓库私有发布与依赖约束说明

## 检查清单

在完成 pnpm 相关改动前，至少确认：

- 这次问题是否真的是 pnpm 工具层问题
- 新依赖是否放在了正确的 dependency bucket
- 是否误把宿主仓库应提供的能力塞进了 `dependencies`
- 是否引入了不必要的 workspace 特性
- lockfile 是否由工具生成，而不是手工改动

## 参考映射

这份 skill 提炼自上游 pnpm 文档中的以下几块知识，但已经按当前仓库场景收窄：

- CLI 基础命令
- 配置与 workspace
- peer dependency 处理
- overrides / patches 的使用边界
- lockfile 与安装行为

未默认展开的部分不代表无用，只是当前仓库还没有足够多的场景需要它们成为默认规则。
