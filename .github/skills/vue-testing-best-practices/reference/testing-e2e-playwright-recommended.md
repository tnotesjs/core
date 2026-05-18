---
title: 端到端测试优先使用 Playwright，获得跨浏览器支持和更好的开发体验
impact: MEDIUM
impactDescription: Cypress 在浏览器支持上有限，而且部分特性需要付费订阅
type: best-practice
tags: [vue3, testing, e2e, playwright, cypress, end-to-end]
---

# 端到端测试优先使用 Playwright，获得跨浏览器支持和更好的开发体验

**影响：MEDIUM** - Playwright 提供更强的跨浏览器测试能力（Chromium、WebKit、Firefox）、优秀的调试工具，并且完全开源。Cypress 在 WebKit 支持上存在限制，且部分特性需要付费订阅。

新的 E2E 测试项目应优先使用 Playwright。如果团队已经在 Cypress 上积累了经验，或者更看重它的可视化调试界面，也可以考虑继续使用 Cypress。

## 任务检查清单

- [ ] 为目标平台安装带浏览器的 Playwright
- [ ] 配置与 Vue 开发服务器的集成
- [ ] 为不同浏览器配置独立项目
- [ ] 使用与组件测试一致的定位器策略
- [ ] 配置 CI 并行执行测试
- [ ] 使用 trace 和截图能力辅助调试

## 快速开始

```bash
# 安装 Playwright
npm init playwright@latest

# 这会创建：
# - playwright.config.ts
# - tests/ 目录
# - tests-examples/ 目录
```

**playwright.config.ts：**

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // 导航使用的基础 URL
    baseURL: 'http://localhost:5173',
    // 第一次重试时采集 trace
    trace: 'on-first-retry',
    // 失败时截图
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // 移动端视口
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 在测试前启动本地开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

## 端到端测试示例

```typescript
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('User Authentication', () => {
  test('user can log in and see dashboard', async ({ page }) => {
    // 进入登录页
    await page.goto('/login')

    // 填写登录表单
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // 验证已跳转到 dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill('wrong@example.com')
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page.getByRole('alert')).toContainText('Invalid credentials')
    await expect(page).toHaveURL('/login')
  })
})
```

## Playwright 与 Cypress 对比

| 特性       | Playwright                | Cypress                                        |
| ---------- | ------------------------- | ---------------------------------------------- |
| 浏览器     | Chromium、Firefox、WebKit | Chromium、Firefox、Electron（WebKit 为实验性） |
| 跨浏览器   | 完整支持                  | 有限                                           |
| 并行化     | 内建支持                  | 需要 Cypress Cloud                             |
| 开源       | 完全开源                  | 仅核心部分开源                                 |
| 移动端测试 | 设备模拟                  | 有限                                           |
| 调试       | Inspector、trace viewer   | Time-travel UI                                 |
| API 测试   | 内建                      | 需要插件                                       |
| Iframes    | 完整支持                  | 有限                                           |

## 用 Data-Testid 测试 Vue 组件

```typescript
// e2e/product-list.spec.ts
import { test, expect } from '@playwright/test'

test('user can add product to cart', async ({ page }) => {
  await page.goto('/products')

  // 使用 data-testid 获得稳定选择器
  await page.getByTestId('product-card').first().click()

  // 验证商品详情页
  await expect(page.getByTestId('product-title')).toBeVisible()

  // 加入购物车
  await page.getByTestId('add-to-cart-button').click()

  // 验证购物车已更新
  await expect(page.getByTestId('cart-count')).toHaveText('1')
})
```

## Vue 应用中的页面对象模式

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: 'Sign In' })
    this.errorMessage = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }
}
```

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'

test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('user@example.com', 'password123')

  await expect(page).toHaveURL('/dashboard')
})
```

## 视觉回归测试

```typescript
test('homepage visual regression', async ({ page }) => {
  await page.goto('/')

  // 全页面截图比对
  await expect(page).toHaveScreenshot('homepage.png')

  // 特定元素截图比对
  await expect(page.getByTestId('hero-section')).toHaveScreenshot('hero.png')
})
```

## 运行测试

```bash
# 运行所有测试
npx playwright test

# 以 headed 模式运行（可见浏览器）
npx playwright test --headed

# 运行指定文件
npx playwright test e2e/auth.spec.ts

# 在指定浏览器中运行
npx playwright test --project=chromium

# 调试模式
npx playwright test --debug

# 根据操作录制生成测试
npx playwright codegen localhost:5173
```

## 参考资料

- [Playwright Documentation](https://playwright.dev/)
- [Vue.js E2E Testing Recommendations](https://vuejs.org/guide/scaling-up/testing#e2e-testing)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
