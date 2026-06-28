/**
 * vitepress/plugins/sidebarStructurePlugin.ts
 *
 * VitePress dev middleware - 处理语雀风格侧边栏的目录结构操作。
 */

import { scheduleNoteSearchReindex } from './localSearchReindexPlugin'
import { FileWatcherService, NoteService, TocService } from '../../services'


import type { NoteInfo } from '../../types'
import type { IncomingMessage, ServerResponse } from 'http'
import type { PluginOption } from 'vite'

interface JsonResponse {
  success: boolean
  message?: string
  sidebarChanged?: boolean
  redirectUrl?: string
  redirectNoteIndex?: string | null
  createdNotes?: Array<{ index: string; dirName: string; link: string }>
  deletedNoteIndexes?: string[]
}

async function readJsonBody(req: IncomingMessage): Promise<any> {
  let body = ''

  await new Promise<void>((resolve, reject) => {
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', resolve)
    req.on('error', reject)
  })

  return body ? JSON.parse(body) : {}
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: JsonResponse,
): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function normalizePathname(url?: string): string {
  return (url || '').split('?')[0]
}

function normalizeCount(value: unknown): number {
  const count = Number(value ?? 1)
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error('count must be an integer between 1 and 100')
  }
  return count
}

function getCreatedNotePayload(notes: NoteInfo[]) {
  return notes.map((note) => ({
    index: note.index,
    dirName: note.dirName,
    link: `/notes/${encodeURIComponent(note.dirName)}/README`,
  }))
}

function buildNoteReadmeLink(note: NoteInfo): string {
  return `/notes/${encodeURIComponent(note.dirName)}/README`
}

function resolveDeleteRedirectUrl(
  noteService: NoteService,
  previousNoteIndex: string | null,
): string {
  if (!previousNoteIndex) return '/'

  const previousNote = noteService.getNoteByIndex(previousNoteIndex)
  if (!previousNote) return '/'

  return buildNoteReadmeLink(previousNote)
}

async function withSuspendedWatcher<T>(task: () => Promise<T>): Promise<T> {
  const watcher = FileWatcherService.getInstance()

  try {
    watcher?.suspend()
    return await task()
  } finally {
    watcher?.unsuspend()
  }
}

export function sidebarStructurePlugin(): PluginOption {
  const noteService = NoteService.getInstance()
  const tocService = TocService.getInstance()

  async function createNotes(count: number) {
    const notes = []
    const usedIndexes = new Set<number>()

    for (const note of noteService.getAllNotes()) {
      const index = parseInt(note.index, 10)
      if (!isNaN(index)) {
        usedIndexes.add(index)
      }
    }

    for (let i = 0; i < count; i++) {
      const note = await noteService.createNote({
        title: 'new',
        usedIndexes,
      })
      const index = parseInt(note.index, 10)
      if (!isNaN(index)) {
        usedIndexes.add(index)
      }
      notes.push(note)
    }

    return notes
  }

  async function refreshTocAndSidebar() {
    await tocService.regenerateSidebar()
  }

  return {
    name: 'tnotes-sidebar-structure',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = normalizePathname(req.url)
        const handledPaths = new Set([
          '/__tnotes_sidebar_create_note',
          '/__tnotes_sidebar_create_notes',
          '/__tnotes_sidebar_create_folder',
          '/__tnotes_sidebar_delete_note',
          '/__tnotes_sidebar_delete_entry',
          '/__tnotes_sidebar_rename_folder',
          '/__tnotes_sidebar_reorder',
        ])

        if (!handledPaths.has(pathname)) {
          next()
          return
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { success: false, message: 'Method Not Allowed' })
          return
        }

        try {
          const data = await readJsonBody(req)

          const result = await withSuspendedWatcher(async () => {
            if (pathname === '/__tnotes_sidebar_delete_note') {
              const noteIndex = String(data.noteIndex || '')
              if (!noteIndex) throw new Error('Missing noteIndex')

              const previousNoteIndex =
                await tocService.getPreviousNoteIndexBeforeDelete(noteIndex)

              await tocService.deleteNoteFromToc(noteIndex)
              await noteService.deleteNote(noteIndex)
              await refreshTocAndSidebar()
              scheduleNoteSearchReindex('api:delete-note')

              return {
                success: true,
                sidebarChanged: true,
                redirectUrl: resolveDeleteRedirectUrl(
                  noteService,
                  previousNoteIndex,
                ),
                redirectNoteIndex: previousNoteIndex,
                deletedNoteIndexes: [noteIndex],
                message: '笔记已删除',
              }
            }

            if (pathname === '/__tnotes_sidebar_delete_entry') {
              const tocLineIndex = Number(data.tocLineIndex)
              if (!Number.isInteger(tocLineIndex) || tocLineIndex < 0) {
                throw new Error('Missing tocLineIndex')
              }

              const currentNoteIndex = String(data.currentNoteIndex || '')
              const previousNoteIndex =
                await tocService.getPreviousNoteIndexBeforeEntryDelete(
                  tocLineIndex,
                )
              const inSubtree =
                currentNoteIndex &&
                (await tocService.isNoteInTocEntrySubtree(
                  tocLineIndex,
                  currentNoteIndex,
                ))

              const deletedNoteIndexes =
                await tocService.deleteTocEntryCascade(tocLineIndex)
              await refreshTocAndSidebar()
              scheduleNoteSearchReindex('api:delete-entry')

              return {
                success: true,
                sidebarChanged: true,
                redirectUrl: inSubtree
                  ? resolveDeleteRedirectUrl(noteService, previousNoteIndex)
                  : undefined,
                redirectNoteIndex: inSubtree ? previousNoteIndex : null,
                deletedNoteIndexes,
                message: '已删除',
              }
            }

            if (pathname === '/__tnotes_sidebar_rename_folder') {
              const tocLineIndex = Number(data.tocLineIndex)
              const newTitle = String(data.newTitle || '')
              if (!Number.isInteger(tocLineIndex) || tocLineIndex < 0) {
                throw new Error('Missing tocLineIndex')
              }

              await tocService.renameFolderInToc(tocLineIndex, newTitle)
              await refreshTocAndSidebar()

              return {
                success: true,
                sidebarChanged: true,
                message: '目录已重命名',
              }
            }

            if (pathname === '/__tnotes_sidebar_reorder') {
              if (
                data.node_uuid &&
                data.action === 'prependChild' &&
                !data.target_uuid
              ) {
                await tocService.prependToRootByNodeId(String(data.node_uuid))
                await refreshTocAndSidebar()
                return {
                  success: true,
                  sidebarChanged: true,
                  message: '排序已更新',
                }
              }

              if (
                data.node_uuid &&
                data.target_uuid &&
                (data.action === 'moveAfter' || data.action === 'prependChild')
              ) {
                if (data.action === 'moveAfter') {
                  await tocService.moveAfterByNodeId(
                    String(data.node_uuid),
                    String(data.target_uuid),
                  )
                } else {
                  await tocService.prependChildByNodeId(
                    String(data.node_uuid),
                    String(data.target_uuid),
                  )
                }
                await refreshTocAndSidebar()
                return {
                  success: true,
                  sidebarChanged: true,
                  message: '排序已更新',
                }
              }

              const dragTocLineIndex = Number(data.dragTocLineIndex)
              if (!Number.isInteger(dragTocLineIndex) || dragTocLineIndex < 0) {
                throw new Error('Missing dragTocLineIndex')
              }

              const placement =
                data.targetType === 'group' || data.placement === 'inside'
                  ? 'inside'
                  : data.placement === 'after'
                    ? 'after'
                    : 'before'

              if (
                data.targetTocLineIndex !== undefined &&
                data.targetTocLineIndex !== null
              ) {
                await tocService.moveTocEntryByLineIndex(dragTocLineIndex, {
                  targetTocLineIndex: Number(data.targetTocLineIndex),
                  placement,
                })
              } else if (
                Array.isArray(data.targetFolderPath) &&
                data.targetFolderPath.length > 0
              ) {
                await tocService.moveTocEntryByLineIndex(dragTocLineIndex, {
                  targetType: 'folder',
                  targetFolderPath: data.targetFolderPath.map(String),
                  placement,
                })
              } else {
                const targetNoteIndex = String(
                  data.targetNoteIndex || data.targetGroupNoteIndex || '',
                )
                if (!targetNoteIndex) throw new Error('Missing targetNoteIndex')

                await tocService.moveTocEntryByLineIndex(dragTocLineIndex, {
                  targetType: 'note',
                  targetNoteIndex,
                  placement,
                })
              }

              await refreshTocAndSidebar()
              return {
                success: true,
                sidebarChanged: true,
                message: '排序已更新',
              }
            }

            if (pathname === '/__tnotes_sidebar_create_folder') {
              const parentTocLineIndex = Number(data.parentTocLineIndex)
              const title = String(data.title || '')
              if (
                !Number.isInteger(parentTocLineIndex) ||
                parentTocLineIndex < 0
              ) {
                throw new Error('Missing parentTocLineIndex')
              }

              await tocService.insertFolderUnderParent(
                parentTocLineIndex,
                title,
              )
              await refreshTocAndSidebar()

              return {
                success: true,
                sidebarChanged: true,
                message: '目录已创建',
              }
            }

            const count = normalizeCount(data.count)
            const notes = await createNotes(count)

            if (data.targetNoteIndex) {
              const placement = data.placement === 'after' ? 'after' : 'before'
              await tocService.insertNotesAroundNote(
                String(data.targetNoteIndex),
                notes,
                placement,
              )
            } else if (
              data.parentTocLineIndex !== undefined &&
              data.parentTocLineIndex !== null
            ) {
              await tocService.insertNotesUnderTocLine(
                Number(data.parentTocLineIndex),
                notes,
              )
            } else if (
              Array.isArray(data.parentFolderPath) &&
              data.parentFolderPath.length > 0
            ) {
              await tocService.insertNotesUnderFolder(
                data.parentFolderPath.map(String),
                notes,
              )
            } else if (data.parentNoteIndex) {
              await tocService.insertNotesUnderParent(
                String(data.parentNoteIndex),
                notes,
              )
            } else {
              for (const note of notes) {
                await tocService.appendNoteToToc(note.index)
              }
            }

            await refreshTocAndSidebar()
            scheduleNoteSearchReindex('api:create-notes')

            return {
              success: true,
              sidebarChanged: true,
              createdNotes: getCreatedNotePayload(notes),
              message: '笔记已创建',
            }
          })

          sendJson(res, 200, result)
        } catch (error) {
          console.error('侧边栏结构操作失败:', error)
          sendJson(res, 500, {
            success: false,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      })
    },
  }
}
