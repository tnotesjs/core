---
name: "Vitest 默认规则"
description: "在编写或维护 `*.test.ts` 与 `vitest.config.ts` 时使用。覆盖显式导入、测试文件 colocate、mock 边界、snapshot 使用边界和最小配置变更。"
applyTo:
  - "**/*.test.ts"
  - "vitest.config.ts"
---

# Vitest 默认规则

- 当前仓库 `globals: false`，测试文件必须显式从 `vitest` 导入 `describe`、`it`、`expect`、`vi` 等 API。
- 测试文件与源码同目录，命名为 `<source>.test.ts`。
- 优先写窄测试并断言 public interface，不依赖内部实现细节。
- mock 只打文件系统、Git、时间、网络等系统边界，不 mock 自己的内部模块或实现细节。
- 默认保持 Node 测试环境；没有明确需求时，不要引入 `jsdom`、`happy-dom`、额外 setup 或覆盖率配置膨胀。
- 如果问题进入 Vitest API、mocking 细节、snapshot / coverage 策略，使用 [../../skills/vitest/SKILL.md](../../skills/vitest/SKILL.md)。
