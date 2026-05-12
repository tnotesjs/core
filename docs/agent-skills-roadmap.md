# Agent Skills Roadmap

## 当前已接入的轻量 Skill

- .github/skills/diagnose/SKILL.md
- .github/skills/grill-with-docs/SKILL.md
- .github/skills/zoom-out/SKILL.md
- .github/skills/handoff/SKILL.md
- .github/skills/grill-me/SKILL.md
- .github/skills/improve-codebase-architecture/SKILL.md
- .github/skills/tdd/SKILL.md
- .github/skills/vue-composable-architecture/SKILL.md

## 当前文档布局

- 根目录使用 CONTEXT.md 维护域词汇。
- docs/adr/ 维护架构决策记录。

## 已接入 Skill 的使用前提

### grill-with-docs

当前已接入，使用时依赖：

- CONTEXT.md 中已有一批稳定术语。
- 团队愿意在讨论过程中即时修正文档。
- 确认哪些决定值得形成 ADR。

### improve-codebase-architecture

当前已接入，使用时依赖：

- CONTEXT.md 能表达当前系统的模块语言。
- docs/adr/ 至少积累少量真实决策，避免架构分析失去背景。
- 能区分“短期实现问题”和“值得升级为结构问题”的事项。

### tdd

当前已接入，使用时依赖：

- 目标代码是纯函数或工具函数（utils/、core/），优先适用。
- 已建立 Vitest 测试链路（当前仓库已就绪）。
- 用户已确认 public interface 和行为优先级。

## 建议的推进顺序

1. 每次新增跨模块术语时，先更新 CONTEXT.md。
2. 当出现 hard-to-reverse 的结构决策时，再新增 ADR。
3. 使用 grill-with-docs 时，优先把新术语和澄清结果即时写回 CONTEXT.md。
4. 使用 improve-codebase-architecture 时，只在真实结构摩擦足够明显时才升级为 ADR 讨论。

## 测试基础设施

- 测试框架：Vitest v4（2026-05 已集成）。
- 初始策略：B+A 混合——新代码/工具函数必测，旧代码不强求；bug 修复前先补回归测试。
- 起始覆盖目标：utils/ + core/ 纯函数层。
- 测试入口：`pnpm test`（vitest run），`pnpm test:watch`（vitest watch 模式）。
- 下一个可扩展方向：services/ 层的 integration test（需 mock 文件系统与 Git）。
- tdd skill 已集成，配合 Vitest 可执行 red-green-refactor 循环。
