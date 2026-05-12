# Mocking Guidelines

## 在系统边界处 Mock

只 mock 当前仓库不拥有的外部依赖：

- 文件系统（fs）
- Git 调用（execSync / child_process）
- 网络请求（fetch / http）
- 时间（Date.now / setTimeout）
- 外部 SDK（如 Stripe、GitHub API）

不要 mock：

- 当前仓库自己的 module 或 class。
- 内部 collaborator。
- 你完全控制的东西。

## 让代码可 Mock：Dependency Injection

把外部依赖作为参数传入，不要在内部直接 import：

```typescript
// ✅ 容易 mock
function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total)
}

// ❌ 难 mock
function processPayment(order) {
  const client = new StripeClient(process.env.STRIPE_KEY)
  return client.charge(order.total)
}
```

## 偏好 SDK 风格接口

为每个外部操作创建独立函数，而不是一个通用 fetch：

```typescript
// ✅ 每个函数独立可 mock
const git = {
  getChangedFiles: () => execSync('git diff --name-only'),
  getCommitHash: () => execSync('git rev-parse HEAD'),
}

// ❌ mock 时需要条件分支
const git = {
  run: (cmd) => execSync(cmd),
}
```

## Vitest Mock 示例

```typescript
import { vi, describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
}))

it('should parse config', () => {
  vi.mocked(readFileSync).mockReturnValue('{"key": "value"}')
  const result = parseConfig('/fake/path')
  expect(result.key).toBe('value')
})
```

## 本仓库的边界清单

| 边界 | 典型 mock 目标 | 位置 |
| ---- | -------------- | ---- |
| 文件系统 | fs.readFileSync, fs.writeFileSync, fs.existsSync | config/, core/, services/ |
| Git | execSync('git ...') | commands/git/, services/git/ |
| 网络 | http.request | services/file-watcher/（broadcastRename） |
| 环境变量 | process.env | config/ |
| 时间 | Date.now | config/, services/timestamp/ |
