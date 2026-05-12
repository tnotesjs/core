# Good and Bad Tests

## Good Tests

**Integration-style**：通过真实接口测试，不 mock 内部部件。

```typescript
// GOOD：测试可观察行为
test("user can checkout with valid cart", async () => {
  const cart = createCart()
  cart.add(product)
  const result = await checkout(cart, paymentMethod)
  expect(result.status).toBe('confirmed')
})
```

特征：

- 测试调用方关心的行为。
- 只用 public API。
- 内部重构后测试仍存活。
- 描述 WHAT，不是 HOW。
- 每个 test 一个逻辑断言。

## Bad Tests

**Implementation-detail tests**：耦合到内部结构。

```typescript
// BAD：测试实现细节
test("checkout calls paymentService.process", async () => {
  const mockPayment = vi.mocked(paymentService)
  await checkout(cart, payment)
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total)
})
```

危险信号：

- Mock 内部 collaborator。
- 测试私有方法。
- 断言调用次数或顺序。
- 重构不改变行为时测试挂了。
- test 名描述 HOW 不是 WHAT。
- 绕过接口去外部验证。

```typescript
// BAD：绕过接口验证数据库
test("createUser saves to database", async () => {
  await createUser({ name: 'Alice' })
  const row = await db.query('SELECT * FROM users WHERE name = ?', ['Alice'])
  expect(row).toBeDefined()
})

// GOOD：通过接口验证
test("createUser makes user retrievable", async () => {
  const user = await createUser({ name: 'Alice' })
  const retrieved = await getUser(user.id)
  expect(retrieved.name).toBe('Alice')
})
```

## 本仓库的具体含义

- utils/ 和 core/ 中的纯函数：直接 import → call → assert result，无需 mock。
- services/ 中的类：通过 dependency injection 传入外部依赖，测试时传入 fake/mock。
- CLI 命令：先拆出可独立测试的纯逻辑，把 I/O 边界留给 integration test。
- VitePress 组件：暂不纳入 TDD 范围（等确定组件测试策略后再扩展）。
