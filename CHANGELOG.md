# Changelog

本文件记录 @tnotesjs/core 的所有版本变更，格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [Unreleased]

暂无待发布的变更。

## [0.1.12] - 2026-03-31

### Changed

- `tn:push` 流程重构：`git add -A → git commit → fix-timestamps → git commit --amend --no-edit → git push`
  - 时间戳（`updated_at`）精确等于 git commit 时间，对外只产生 1 个 commit
  - 移除原 commit 前 `updateNotesTimestamp(Date.now())` 逻辑
- `TimestampService.fixAllTimestamps()` 性能优化：从 O(2n) 次 git 调用降至 2 次
  - 新增 `buildGitTimestampMap()`，一次性解析全量 git 历史构建时间戳 Map
  - 支持 `maxBuffer: 100MB`，适应最大 10000 篇笔记的知识库
- `NoteConfig.created_at / updated_at` 改为 optional，创建笔记时不再写入错误的时间戳
- `RootItem.created_at / updated_at / days_since_birth` 改为 optional

### Removed

- `CreateNoteCommand` / `NoteService.createNote()` 不再写入 `created_at / updated_at`（改由 `tn:push` 时统一写入）
- `NoteService.updateNoteConfig()` 不再强制覆盖 `updated_at`
- `UpdateCommand.updateRootItem()` 不再写入 `updated_at`
- `UpdateCompletedCountCommand` 不再写入 `updated_at`

### Fixed

- 修复 `index.ts` ts(7053)：`CommandArgs` 索引签名
- 修复 `tsup.config.ts` ts(2339)：`esbuildOptions context` 类型
- 新增 `types/shims.d.ts`：补全 `.vue` / `.svg` 模块声明，消除 41 个 ts(2307)
- 移除 `HelpCommand` 中无效的 `COMMAND_NAMES.SYNC_SCRIPTS` 引用

## [0.1.11] - 2026-03-31

### Removed

- 移除 `sync` 命令（保留 `push` 和 `pull`）
- 移除所有 `--all` 批量操作逻辑（`pushAll`、`pullAll`、`syncAll`、`updateAll` 等）
- 移除 `sync-core` 命令及 `SyncCoreService`（submodule 时代遗留）
- 移除 `getTargetDirs`、`syncRepo` 工具函数
- 移除 `TNOTES_BASE_DIR`、`TNOTES_CORE_DIR`、`EN_WORDS_DIR` 常量

### Fixed

- 修复 `index.ts` 的 ts(7053) 类型错误（`CommandArgs` 索引签名）
- 修复 `tsup.config.ts` 的 ts(2339) 类型错误（`esbuildOptions` context 类型）
- 新增 `types/shims.d.ts`，修复 `.vue` 和 `.svg` 模块的 ts(2307) 类型声明缺失

## [0.1.9] - 2026-03-31

### Changed

- 架构迁移：从 Git Submodule 迁移为 NPM 包（`@tnotesjs/core`）
- `ConfigManager` 使用 `process.cwd()` 作为默认根路径（适配 NPM 模式）
- VitePress 配置新增 `resolve.dedupe: ['vue', 'vitepress']` 解决 pnpm link 下 Vue 实例重复问题
- VitePress 配置新增 `optimizeDeps.include` 处理 CJS 依赖（katex、dayjs、sanitize-url、mermaid）
- `sass-embedded`、`markdown-it-task-lists` 从 devDependencies 移至 dependencies
- `mermaid` 加入 dependencies

### Removed

- 移除 `GitManager` 中的 submodule 相关逻辑（~100 行）
- 宿主仓库依赖从 22 个精简为 4 个

## [1.0.0] - 2025-02-20

### Added

- 从 TNotes.introduction 中提取共享核心脚本，初始化为独立仓库
- **commands/** — CLI 命令体系（dev、build、preview、push、pull、update 等）
- **config/** — 配置管理（ConfigManager、默认配置、模板、常量）
- **core/** — 核心模块（GitManager、NoteManager、NoteIndexCache、ProcessManager、ReadmeGenerator、TocGenerator）
- **services/** — 服务层（file-watcher、git、note、readme、timestamp、vitepress）
- **types/** — TypeScript 类型定义（config、note）
- **utils/** — 工具函数（日志、文件操作、端口检测、Markdown 解析、校验等）
- **vitepress/** — VitePress 主题与插件（Layout、Discussions、EnWordList、Footprints、NotesTable、Mermaid、MarkMap 等组件）

[Unreleased]: https://github.com/tnotesjs/core/compare/v0.1.11...HEAD
[0.1.11]: https://github.com/tnotesjs/core/compare/v0.1.9...v0.1.11
[0.1.9]: https://github.com/tnotesjs/core/compare/v1.0.0...v0.1.9
[1.0.0]: https://github.com/tnotesjs/core/releases/tag/v1.0.0
