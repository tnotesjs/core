/**
 * .vitepress/tnotes/vitepress/plugins/fileWatcherBridgePlugin.ts
 *
 * file-watcher 与浏览器之间的 IPC 桥。
 *
 * file-watcher 跑在 DevCommand 主进程，VitePress / Vite 跑在子进程，
 * 两者无法共享单例。文件夹直接重命名后，file-watcher 会 fetch 本接口，
 * 本接口调 `server.ws.send` 向浏览器广播 `tnotes:note-renamed`。
 */
import type { PluginOption } from 'vite'

const RENAME_EVENT = 'tnotes:note-renamed'
const BROADCAST_PATH = '/__tnotes_broadcast_rename'

export function fileWatcherBridgePlugin(): PluginOption {
  return {
    name: 'tnotes-file-watcher-bridge',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Vite 的 baseMiddleware 顺序在不同版本可能不同，
        // 这里同时接受 `/__tnotes_broadcast_rename` 与带 base 前缀的路径。
        const url = req.url ?? ''
        const isBroadcast =
          url === BROADCAST_PATH || url.endsWith(BROADCAST_PATH)
        if (!isBroadcast || req.method !== 'POST') {
          return next()
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}')
            server.ws.send({ type: 'custom', event: RENAME_EVENT, data })
            res.statusCode = 204
            res.end()
          } catch (error) {
            res.statusCode = 400
            res.end(
              error instanceof Error ? error.message : 'Bad rename payload',
            )
          }
        })
      })
    },
  }
}
