# demos - TypeScript 使用规范

## demos.1 - Const Object Pattern with Type Extraction

````typescript
type ValueOf<T> = T[keyof T]

/**
 * 图片比例常量
 *
 * @example ✅ 正确用法
 * ```ts
 * // 直接引用常量
 * const ratio = ASPECT_RATIO.LANDSCAPE // '16:9'
 *
 * // 类型注解
 * function setSize(ratio: AspectRatio) { ... }
 * setSize(ASPECT_RATIO.SQUARE)
 *
 * // 判断
 * if (ratio === ASPECT_RATIO.PORTRAIT) { ... }
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止硬编码字符串
 * const ratio = '16:9'
 *
 * // 禁止使用 enum
 * enum AspectRatio { LANDSCAPE = '16:9' }
 *
 * // 禁止使用联合类型代替常量
 * type AspectRatio = '16:9' | '9:16' | '4:3'
 * ```
 */
export const ASPECT_RATIO = {
  /** 横屏 16:9，适用于宽屏展示、横幅素材 */
  LANDSCAPE: '16:9',
  /** 竖屏 9:16，适用于手机全屏、短视频封面 */
  PORTRAIT: '9:16',
  /** 标准屏 4:3，适用于传统显示器、演示文稿 */
  STANDARD: '4:3',
  /** 经典竖屏 3:4，适用于证件照、竖版印刷 */
  CLASSIC: '3:4',
  /** 正方形 1:1，适用于头像、社交媒体封面 */
  SQUARE: '1:1',
} as const
export type AspectRatio = ValueOf<typeof ASPECT_RATIO>

/**
 * 图像生成状态常量
 *
 * @example ✅ 正确用法
 * ```ts
 * // 直接引用常量
 * const status = IMAGE_GENERATE_STATUS.PENDING
 *
 * // 类型注解
 * function handleStatus(status: ImageGenerateStatus) { ... }
 * handleStatus(IMAGE_GENERATE_STATUS.PROCESSING)
 *
 * // 判断
 * if (status === IMAGE_GENERATE_STATUS.COMPLETED) { ... }
 *
 * // 作为对象 key
 * const labelMap: Record<ImageGenerateStatus, string> = {
 *   [IMAGE_GENERATE_STATUS.PENDING]: '等待中',
 *   [IMAGE_GENERATE_STATUS.PROCESSING]: '处理中',
 *   [IMAGE_GENERATE_STATUS.COMPLETED]: '已完成',
 *   [IMAGE_GENERATE_STATUS.FAILED]: '已失败',
 * }
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止硬编码字符串
 * const status = 'PENDING'
 *
 * // 禁止使用 enum
 * enum ImageGenerateStatus { PENDING = 'PENDING' }
 *
 * // 禁止使用联合类型代替常量
 * type ImageGenerateStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
 *
 * // 禁止直接使用字符串比较
 * if (status === 'COMPLETED') { ... }
 * ```
 */
export const IMAGE_GENERATE_STATUS = {
  /** 等待中，任务已创建尚未开始处理 */
  PENDING: 'PENDING',
  /** 处理中，图像正在生成 */
  PROCESSING: 'PROCESSING',
  /** 已完成，图像生成成功 */
  COMPLETED: 'COMPLETED',
  /** 已失败，图像生成异常 */
  FAILED: 'FAILED',
} as const
export type ImageGenerateStatus = ValueOf<typeof IMAGE_GENERATE_STATUS>
````

## demos.2 - Interface > Type

````typescript
/**
 * 用户信息
 *
 * @example ✅ 正确用法
 * ```ts
 * // 使用 interface 定义对象类型
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 * }
 *
 * // 使用 interface 进行类型注解
 * function getUserInfo(user: User) { ... }
 * const user: User = { id: 1, name: 'Alice', email: 'alice@example.com' }
 *
 * // 使用 interface 继承（extends）
 * interface Admin extends User {
 *   role: 'admin'
 * }
 *
 * // 使用 interface 声明合并（Declaration Merging）
 * interface User {
 *   phone?: string
 * }
 * // 上述声明会与之前的 User 接口自动合并
 *
 * // 使用 interface 定义函数类型
 * interface FetchUser {
 *   (id: number): Promise<User>
 * }
 *
 * // 使用 interface 定义索引签名
 * interface UserMap {
 *   [key: string]: User
 * }
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止使用 type 定义对象结构
 * type User = {
 *   id: number
 *   name: string
 *   email: string
 * }
 *
 * // 禁止使用 type 继承对象结构
 * type Admin = User & {
 *   role: 'admin'
 * }
 *
 * // 禁止使用 type 定义函数签名
 * type FetchUser = (id: number) => Promise<User>
 *
 * // 禁止使用 type 定义索引签名
 * type UserMap = {
 *   [key: string]: User
 * }
 * ```
 */
export interface User {
  /** 用户 ID */
  id: number
  /** 用户名称 */
  name: string
  /** 用户邮箱 */
  email: string
}

/**
 * 管理员信息，继承自用户信息
 */
export interface Admin extends User {
  /** 角色 */
  role: 'admin'
}

/**
 * 获取用户信息
 */
export interface FetchUser {
  (id: number): Promise<User>
}

/**
 * 用户映射表
 */
export interface UserMap {
  [key: string]: User
}
````

## demos.3 - 禁止 any，优先使用 unknown

````typescript
/**
 * @example ✅ 正确用法
 * ```ts
 * // 未知类型使用 unknown
 * function parse(input: unknown) {
 *   if (typeof input === 'string') {
 *     return JSON.parse(input)
 *   }
 * }
 *
 * // 泛型约束替代 any
 * function merge<T extends object>(a: T, b: T): T {
 *   return { ...a, ...b }
 * }
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止显式 any
 * function parse(input: any) { ... }
 *
 * // 禁止隐式 any（未开启 noImplicitAny 时）
 * function getValue(key) { ... }
 *
 * // 禁止 any 绕过类型检查
 * const data: any = fetchData()
 * ```
 */
````

## demos.4 - 使用 import type 进行纯类型导入

````typescript
/**
 * @example ✅ 正确用法
 * ```ts
 * // 纯类型引用必须使用 import type
 * import type { User } from './user'
 * import type { AspectRatio } from './constants'
 *
 * // 值和类型混合导入时，类型用 import type 分行
 * import { ASPECT_RATIO } from './constants'
 * import type { AspectRatio } from './constants'
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止用 import 导入仅作为类型使用的标识符
 * import { User } from './user' // User 仅在类型位置使用
 *
 * // 禁止混合导入值和类型不分离
 * import { ASPECT_RATIO, type AspectRatio } from './constants'
 * // 注：此写法合法但不推荐，类型应独立 import type
 * ```
 */
````

## demos.5 - 导出函数必须显式声明返回类型

````typescript
/**
 * @example ✅ 正确用法
 * ```ts
 * // 公共 API / 导出函数必须显式声明返回类型
 * export function getUser(id: number): Promise<User> {
 *   return fetchUser(id)
 * }
 *
 * // 内部工具函数可依赖类型推断
 * function add(a: number, b: number) {
 *   return a + b // 推断为 number，无需注解
 * }
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止导出函数省略返回类型
 * export function getUser(id: number) {
 *   return fetchUser(id) // 调用方无法从 .d.ts 直观了解返回值
 * }
 * ```
 */
````

## demos.6 - 泛型命名规范

````typescript
/**
 * @example ✅ 正确用法
 * ```ts
 * // 单字母大写，语义化顺序
 * // T = Type, K = Key, V = Value, E = Element, R = Return
 * type ValueOf<T> = T[keyof T]
 * function first<E>(arr: E[]): E | undefined
 * function mapKeys<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K>
 *
 * // 语义复杂时可使用多字符名称
 * interface ApiResponse<ResponseData, ErrorData = null> {
 *   data: ResponseData
 *   error: ErrorData
 * }
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止无意义或小写泛型参数
 * function get<t>(id: string): t { ... }
 * function parse(data: any, type: any): any { ... }
 * ```
 */
````

## demos.7 - 非空断言 `!` 的使用限制

````typescript
/**
 * @example ✅ 正确用法
 * ```ts
 * // 在生命周期钩子中，已知 DOM 挂载后访问
 * onMounted(() => {
 *   const el = document.getElementById('canvas')!
 * })
 *
 * // 优先使用可选链 + 空值合并
 * const name = user?.profile?.name ?? 'unknown'
 * ```
 *
 * @example ❌ 错误用法
 * ```ts
 * // 禁止在业务逻辑中大量使用非空断言
 * const value = someMap[id]!.deep!.field!
 *
 * // 禁止用非空断言绕过 null 检查
 * const data = fetchData() // data 的类型是 User | null
 * console.log(data!.name)  // 应做 if 判断或可选链
 * ```
 */
````
