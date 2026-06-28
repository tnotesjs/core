/**
 * localSearchReindexPlugin.ts
 *
 * dev 下监听笔记 README 变更，debounced 全量重建 Local Search 索引并 HMR 推送。
 */

import path from 'node:path'



import {
  buildLocalSearchIndexSnapshot,
  createLocalSearchMarkdownRenderer,
  type LocalSearchIndexSnapshot,
} from './localSearchIndexBuilder'
import { isNoteReadmePath } from './localSearchReindexLogic'
import {
  patchVPNavBarSearch,
} from './localSearchReindexPatch'
import { ConfigManager } from '../../config/ConfigManager'

import type { PluginOption, ViteDevServer } from 'vite'
import type { SiteConfig } from 'vitepress'

const LOCAL_SEARCH_INDEX_REQUEST_PATH = '/@localSearchIndex'
const LOCAL_SEARCH_INDEX_ID = '@localSearchIndex'
const SEARCH_REINDEX_HTTP_PATH = '/__tnotes_search_reindex'
const SEARCH_INDEX_HMR_EVENT = 'tnotes:search-index-updated'
const REBUILD_DEBOUNCE_MS = 400

const VP_NAV_BAR_SEARCH =
  /vitepress[/\\]dist[/\\]client[/\\]theme-default[/\\]components[/\\]VPNavBarSearch\.vue$/

type ReindexController = {
  schedule: (reason: string) => void
}

type ViteServerConfigWithVp = ViteDevServer['config'] & {
  vitepress?: SiteConfig
}

let reindexController: ReindexController | null = null
let indexSnapshot: LocalSearchIndexSnapshot | null = null
let snapshotRevision = 0

const DEBUG = process.env.TNOTES_DEBUG_SEARCH_REINDEX === '1'

function debugLog(message: string, detail?: unknown): void {
  if (!DEBUG) return
  if (detail === undefined) {
    console.log(`[tnotes:search-reindex] ${message}`)
    return
  }
  console.log(`[tnotes:search-reindex] ${message}`, detail)
}

function logInfo(message: string): void {
  console.warn(`[tnotes:search-reindex] ${message}`)
}

function normalizeId(id: string): string {
  return id.replace(/\\/g, '/')
}

function getVitePressSiteConfig(server: ViteDevServer): SiteConfig | null {
  return (server.config as ViteServerConfigWithVp).vitepress ?? null
}

function isLocalSearchEnabled(server: ViteDevServer): boolean {
  return server.config.plugins.some(
    (entry) =>
      entry.name === 'vitepress:local-search' && typeof entry.load === 'function',
  )
}

function normalizeLocalSearchModuleId(id: string): string {
  return id.split('?')[0]!
}

function getLocaleFromIndexModuleId(id: string): string | null {
  const normalized = normalizeLocalSearchModuleId(id)
  if (normalized === LOCAL_SEARCH_INDEX_REQUEST_PATH) return null
  if (!normalized.startsWith(LOCAL_SEARCH_INDEX_REQUEST_PATH)) return null
  return normalized.slice(LOCAL_SEARCH_INDEX_REQUEST_PATH.length) || null
}

function getSearchIndexModuleIds(snapshot: LocalSearchIndexSnapshot): string[] {
  const ids = [LOCAL_SEARCH_INDEX_REQUEST_PATH]
  for (const locale of snapshot.keys()) {
    ids.push(`${LOCAL_SEARCH_INDEX_REQUEST_PATH}${locale}`)
  }
  return ids
}

function notifySearchIndexUpdated(
  server: ViteDevServer,
  snapshot: LocalSearchIndexSnapshot,
  revision: number,
): void {
  const moduleIds = getSearchIndexModuleIds(snapshot)
  const updates: Array<{
    acceptedPath: string
    path: string
    timestamp: number
    type: 'js-update'
  }> = []

  for (const moduleId of moduleIds) {
    server.moduleGraph.onFileChange(moduleId)
    const mod = server.moduleGraph.getModuleById(moduleId)
    if (mod) {
      server.moduleGraph.invalidateModule(mod)
      updates.push({
        acceptedPath: mod.url,
        path: mod.url,
        timestamp: Date.now(),
        type: 'js-update',
      })
      continue
    }
    debugLog(`HMR module not loaded yet: ${moduleId}`)
  }

  if (updates.length > 0) {
    server.ws.send({ type: 'update', updates })
    debugLog('HMR pushed', updates.map((item) => item.path))
  } else {
    debugLog('HMR skipped: no loaded search index modules')
  }

  server.ws.send({
    type: 'custom',
    event: SEARCH_INDEX_HMR_EVENT,
    data: { revision },
  })
  debugLog('custom HMR event sent', { revision })
}

function renderSnapshotLoad(
  id: string,
  snapshot: LocalSearchIndexSnapshot,
): string | null {
  const normalizedId = normalizeLocalSearchModuleId(id)

  if (normalizedId === LOCAL_SEARCH_INDEX_REQUEST_PATH) {
    const records: string[] = []
    for (const locale of snapshot.keys()) {
      records.push(
        `${JSON.stringify(locale)}: () => import('${LOCAL_SEARCH_INDEX_ID}${locale}')`,
      )
    }
    return `export default {${records.join(',')}}`
  }

  const locale = getLocaleFromIndexModuleId(id)
  if (locale !== null) {
    const payload = snapshot.get(locale) ?? JSON.stringify({})
    return `export default ${payload}`
  }

  return null
}

function createDebouncer(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pendingReason = ''

  return (reason: string, task: () => Promise<void>) => {
    pendingReason = reason
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      timer = null
      const reasonToRun = pendingReason
      pendingReason = ''
      try {
        await task()
      } catch (error) {
        console.error(
          `[tnotes:search-reindex] rebuild failed (${reasonToRun})`,
          error,
        )
      }
    }, delayMs)
  }
}

function matchesSearchReindexPath(url: string): boolean {
  return url === SEARCH_REINDEX_HTTP_PATH || url.endsWith(SEARCH_REINDEX_HTTP_PATH)
}

/**
 * 由 sidebar API 等同进程模块调用，调度 debounced 全量索引重建。
 */
export function scheduleNoteSearchReindex(reason = 'external'): void {
  if (!reindexController) {
    logInfo(`schedule ignored (plugin not ready): ${reason}`)
    return
  }
  reindexController.schedule(reason)
}

export function localSearchReindexPlugin(): PluginOption {
  return {
    name: 'tnotes-local-search-reindex',
    apply: 'serve',
    enforce: 'pre',

    resolveId(source) {
      if (!source.startsWith(LOCAL_SEARCH_INDEX_ID)) return null
      const clean = source.split('?')[0]!
      if (clean === source) return null
      return `/${clean}`
    },

    transform(code, id) {
      const normalizedId = normalizeId(id)
      if (VP_NAV_BAR_SEARCH.test(normalizedId)) {
        return patchVPNavBarSearch(code)
      }
      return null
    },

    load(id) {
      if (!indexSnapshot || !id.startsWith(LOCAL_SEARCH_INDEX_REQUEST_PATH)) {
        return null
      }
      return renderSnapshotLoad(id, indexSnapshot)
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? ''
        if (!matchesSearchReindexPath(url) || req.method !== 'POST') {
          return next()
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk.toString()
        })
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}') as { reason?: string }
            scheduleNoteSearchReindex(data.reason || 'bridge:http')
            res.statusCode = 204
            res.end()
          } catch (error) {
            res.statusCode = 400
            res.end(
              error instanceof Error ? error.message : 'Bad search reindex payload',
            )
          }
        })
      })

      return async () => {
        indexSnapshot = null
        snapshotRevision = 0

        if (!isLocalSearchEnabled(server)) {
          reindexController = null
          logInfo('vitepress:local-search not found, reindex disabled')
          return
        }

        const siteConfig = getVitePressSiteConfig(server)
        if (!siteConfig) {
          reindexController = null
          logInfo('server.config.vitepress missing, reindex disabled')
          return
        }

        ConfigManager.init({ rootPath: process.cwd() })
        const ignoreDirNames =
          ConfigManager.getInstance().getAll().ignore_dirs ?? []

        const md = await createLocalSearchMarkdownRenderer(siteConfig)
        const debouncedRebuild = createDebouncer(REBUILD_DEBOUNCE_MS)

        async function rebuildFullIndex(reason: string): Promise<void> {
          const startedAt = Date.now()
          snapshotRevision += 1
          debugLog(`rebuild start (${reason}) rev=${snapshotRevision}`)
          const { snapshot, pageCount } = await buildLocalSearchIndexSnapshot(
            siteConfig,
            md,
          )
          indexSnapshot = snapshot
          notifySearchIndexUpdated(server, indexSnapshot, snapshotRevision)
          logInfo(
            `rebuild done (${reason}) rev=${snapshotRevision} pages=${pageCount} locales=${indexSnapshot.size} elapsed=${Date.now() - startedAt}ms`,
          )
        }

        reindexController = {
          schedule(reason: string) {
            debugLog(`scheduled (${reason})`)
            debouncedRebuild(reason, () => rebuildFullIndex(reason))
          },
        }

        const onWatcherEvent = (
          absoluteFile: string,
          event: 'add' | 'change' | 'unlink',
        ) => {
          if (!isNoteReadmePath(absoluteFile, ignoreDirNames)) return
          scheduleNoteSearchReindex(
            `watcher:${event}:${path.basename(absoluteFile)}`,
          )
        }

        server.watcher.on('add', (file) => onWatcherEvent(file, 'add'))
        server.watcher.on('change', (file) => onWatcherEvent(file, 'change'))
        server.watcher.on('unlink', (file) => onWatcherEvent(file, 'unlink'))
      }
    },
  }
}
