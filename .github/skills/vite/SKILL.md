---
name: vite
description: Vite 构建工具配置、插件 API、SSR，以及 Vite 8 Rolldown 迁移。处理 Vite 项目、vite.config.ts、Vite 插件，或用 Vite 构建库/SSR 应用时使用。
---

# Vite

> 基于 Vite 8 beta（由 Rolldown 驱动）。Vite 8 使用 Rolldown bundler 和 Oxc transformer。

Vite 是新一代前端构建工具，提供快速开发服务器（原生 ESM + HMR）与优化后的生产构建。

## 偏好

- 使用 TypeScript：优先选择 `vite.config.ts`
- 始终使用 ESM，避免 CommonJS

## 核心

| 主题     | 说明                                                                         | 参考                                             |
| -------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| 配置     | `vite.config.ts`、`defineConfig`、条件配置与 `loadEnv`                       | [core-config](references/core-config.md)         |
| 特性     | `import.meta.glob`、资源查询（`?raw`、`?url`）、`import.meta.env` 与 HMR API | [core-features](references/core-features.md)     |
| 插件 API | Vite 专属 hooks、虚拟模块与插件顺序                                          | [core-plugin-api](references/core-plugin-api.md) |

## 构建与 SSR

| 主题       | 说明                                                           | 参考                                         |
| ---------- | -------------------------------------------------------------- | -------------------------------------------- |
| 构建与 SSR | 库模式、SSR middleware 模式、`ssrLoadModule` 与 JavaScript API | [build-and-ssr](references/build-and-ssr.md) |

## 进阶

| 主题            | 说明                                                        | 参考                                                   |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| Environment API | Vite 6+ 多环境支持与自定义运行时                            | [environment-api](references/environment-api.md)       |
| Rolldown 迁移   | Vite 8 的变化：Rolldown bundler、Oxc transformer 与配置迁移 | [rolldown-migration](references/rolldown-migration.md) |

## 快速参考

### CLI 命令

```bash
vite              # 启动开发服务器
vite build        # 生产构建
vite preview      # 预览生产构建结果
vite build --ssr  # SSR 构建
```

### 常用配置

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [],
  resolve: { alias: { '@': '/src' } },
  server: { port: 3000, proxy: { '/api': 'http://localhost:8080' } },
  build: { target: 'esnext', outDir: 'dist' },
})
```

### 官方插件

- `@vitejs/plugin-vue` - Vue 3 SFC 支持
- `@vitejs/plugin-vue-jsx` - Vue 3 JSX 支持
- `@vitejs/plugin-react` - 基于 Oxc/Babel 的 React 支持
- `@vitejs/plugin-react-swc` - 基于 SWC 的 React 支持
- `@vitejs/plugin-legacy` - 旧版浏览器支持
