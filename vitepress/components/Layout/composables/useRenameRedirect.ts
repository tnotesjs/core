/**
 * 重命名后跳转工具：显示遮罩 → 等 Vite HMR 重建路由 → 整页跳到新 URL。
 *
 * 关于面板保存与文件系统直接重命名两条入口共用此函数，确保行为一致。
 */
import { useRenameOverlay } from './useRenameOverlay'

export interface RedirectAfterRenameOptions {
  /** 主标题，默认「正在跳转到新地址...」 */
  message?: string
  /** 副提示，默认「请稍候」 */
  tip?: string
  /** 等待 HMR 的毫秒数，默认 200ms（经验值，给 Vite 重算路由表留时间） */
  delayMs?: number
  /** 站点 base，例如 `/TNotes.introduction/`；不传则使用 `import.meta.env.BASE_URL` 或 `/` */
  base?: string
}

/**
 * 根据后端返回的 `newUrl`（形如 `/notes/xxx/README`）跳转到最终地址。
 *
 * 注意：使用 `window.location.replace` 整页跳，避免 SPA 路由表滞后导致 404。
 */
export async function redirectAfterRename(
  newUrl: string,
  opts: RedirectAfterRenameOptions = {},
): Promise<void> {
  const { show } = useRenameOverlay()

  show({
    message: opts.message ?? '正在跳转到新地址...',
    tip: opts.tip ?? '请稍候',
  })

  const base =
    opts.base ??
    (typeof import.meta !== 'undefined' ? import.meta.env?.BASE_URL : '/') ??
    '/'

  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = newUrl.replace(/^\/+/, '')
  const finalUrl = normalizedBase + normalizedPath

  // 关键：先用 replaceState 把地址栏同步切到新 URL。
  // 文件系统重命名场景下，Vite chokidar 会几乎同时触发 full-reload，
  // 如果只用 setTimeout + location.replace，会被 full-reload 抢先以旧 URL 重载页面。
  // 先 replaceState 后，无论谁先重载，浏览器都从新 URL 拉页面。
  try {
    window.history.replaceState(null, '', finalUrl)
  } catch {
    // 跨域等异常下退回 location.replace
  }

  await new Promise((resolve) => setTimeout(resolve, opts.delayMs ?? 200))

  // 再做一次显式跳转，确保 SPA 状态完全重置。
  // 此时 location.href 已是 finalUrl，等价于 reload。
  window.location.replace(finalUrl)
}
