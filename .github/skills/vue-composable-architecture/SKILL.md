---
name: vue-composable-architecture
description: "页面级 Vue composable 架构设计规范。用于拆分主/子 composable、状态所有权、依赖解耦与编排方法设计。"
argument-hint: "描述你的页面场景与当前 composable 结构"
user-invocable: true
disable-model-invocation: false
---

# Vue Composable 架构 Skill

## 适用范围

页面级 composable 架构设计。不适用于全局共享 composable。

---

## 术语定义

- **states**：响应式状态，包括 ref、reactive、computed 等一切可响应的数据
- **methods**：函数，包括操作状态的方法、副作用逻辑、watch 等
- **主 composable**：页面级编排者，唯一持有 states 的 composable
- **子 composable**：纯方法集合，不持有任何状态

---

## 核心原则

### 1. 主 composable 聚合所有 states

主 composable 是页面所有状态的唯一 owner，包括：

- 业务状态（ref、reactive）
- 派生状态（computed）
- 暂态（loading、error 等方法执行状态）

子 composable 不允许持有任何状态。

**理由：** 消除子 composable 之间的状态循环依赖，消除调用顺序敏感问题。

```typescript
// ✅ 正确
function useCheckout() {
  const user = ref<User | null>(null)
  const cartItems = ref<CartItem[]>([])
  const loading = ref(false)
  const total = computed(() => cartItems.value.reduce((s, i) => s + i.price, 0))

  // ...
}

// ❌ 错误 — 子 composable 持有了状态
function useCart() {
  const items = ref([]) // 不允许
  // ...
}
```

### 2. 子 composable 是无状态的纯方法集合

子 composable 的全部数据来自 options 参数，自身不产生任何状态。

```typescript
// ✅ 正确 — 状态全部由外部传入
function useAuth(options: UseAuthOptions) {
  const { user, setUser } = options

  async function login(credentials: Credentials) {
    setUser(await api.login(credentials))
  }

  return { login }
}
```

### 3. 子 composable 只读消费 states，写入必须通过显式 setter

子 composable 接收 states 时为只读引用，如需写入，主 composable 必须显式传入 setter 函数。

```typescript
// 子 composable 契约
interface UseAuthOptions {
  user: Ref<User | null>                // 只读
  setUser: (val: User | null) => void   // 显式写入授权
}

function useAuth(options: UseAuthOptions) {
  const { user, setUser } = options

  async function login(credentials: Credentials) {
    setUser(await api.login(credentials))
  }

  function isLoggedIn() {
    return user.value !== null          // 只读消费
  }

  return { login, isLoggedIn }
}
```

**理由：** 主 composable 对每一处状态变更拥有完全的知情权和控制权。

### 4. 子 composable 之间不允许存在依赖

子 composable 之间不互相消费 states 或 methods。所有跨子 composable 的协调逻辑归主 composable。

```typescript
// ❌ 错误 — A 消费 B 的 methods，形成循环依赖
function useAuth(options, { cartService }) { ... }

// ✅ 正确 — 编排逻辑上提到主 composable
function useCheckout() {
  const auth = useAuth(...)
  const cart = useCart(...)

  // 编排方法归主 composable
  async function loginAndRestore(credentials: Credentials) {
    await auth.login(credentials)
    cart.restore()
  }

  return { ...auth, ...cart, loginAndRestore }
}
```

### 5. methods 分为原子方法和编排方法

| 类型     | 持有者         | 特征                                    |
| -------- | -------------- | --------------------------------------- |
| 原子方法 | 子 composable  | 只操作自身 options 范围内的数据         |
| 编排方法 | 主 composable  | 协调多个子 composable 的复合逻辑        |

```typescript
function useCheckout() {
  const user = ref<User | null>(null)
  const cartItems = ref<CartItem[]>([])
  const order = ref<Order | null>(null)

  const auth = useAuth(user, { setUser })
  const cart = useCart(cartItems, user, { setItems })
  const orderService = useOrder(order, user, cartItems, { setOrder })

  // 编排方法 — 协调多个子 composable
  async function checkout() {
    if (!user.value) return
    await orderService.create(cartItems.value)
    cart.clear()
  }

  return {
    // 所有 states
    user, cartItems, order,
    // 所有原子方法 + 编排方法
    ...auth, ...cart, ...orderService,
    checkout,
  }
}
```

## 实施流程

1. 明确页面边界与主 composable 名称（如 useCheckout）。
2. 在主 composable 一次性声明页面所需的全部 states（业务状态、派生状态、暂态）。
3. 为需要被子 composable 写入的状态定义显式 setter。
4. 按领域拆分子 composable，并通过 options 传入只读 states 与必要 setter。
5. 将跨子 composable 的协作逻辑上提为主 composable 的编排方法。
6. 在主 composable 中统一 return：全部 states、全部原子方法、全部编排方法。

## 分支决策

- 需要新增状态：只能加在主 composable，子 composable 禁止新建 ref/reactive/computed。
- 子 composable 需要修改状态：必须通过主 composable 注入的 setter；不得直接写入外部状态。
- 方法涉及多个子 composable：定义为主 composable 的编排方法；不得横向调用子 composable。
- 出现子 composable 互相依赖倾向：立即回收依赖到主 composable 做编排。

## 完成检查

- 仅存在一个状态 owner：主 composable。
- 所有子 composable 均为无状态方法集合。
- 所有状态写入路径均可追溯到主 composable 注入的 setter。
- 任意一个子 composable 删除后，不会破坏其他子 composable 的内部依赖关系。
- 编排方法只在主 composable 中出现，且语义清晰反映业务流程。
