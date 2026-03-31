import { defineConfig } from 'tsup'

/**
 * tsup 构建配置
 *
 * 只编译 CLI 部分（Node.js 运行时）。
 * src/vitepress/ 目录以源码形式发布，由 VitePress/Vite 在宿主仓库中处理。
 */
export default defineConfig({
  entry: {
    'cli/index': 'index.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  splitting: true,
  clean: true,
  dts: true,
  outDir: 'dist',
  // 外部依赖不打包
  external: [
    'vitepress',
    'vue',
    'vite',
    // Node.js built-ins
    /^node:/,
  ],
  banner: {
    // CLI 入口添加 shebang
    js: '#!/usr/bin/env node',
  },
  esbuildOptions(options, context) {
    // 只给 CLI 入口加 shebang，其他入口不加
    if (context.entryPoints?.toString().includes('src/index.ts')) {
      options.banner = { js: '' }
    }
  },
})
