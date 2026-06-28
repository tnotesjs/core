/**
 * services/toc/service.ts
 *
 * TOC.md 服务 - 知识库目录唯一数据源
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  promises as fsPromises,
} from 'fs'

import { ConfigManager } from '../../config/ConfigManager'
import { ROOT_TOC_PATH, VP_SIDEBAR_PATH } from '../../config/constants'
import { NoteIndexCache } from '../../core/NoteIndexCache'
import { NoteManager } from '../../core/NoteManager'
import { logger } from '../../utils'
import {
  adjustTocLineIndexAfterSubtreeRemoval,
  buildFolderTocLine,
  buildSidebarFromTocTree,
  buildTocLine,
  collectNoteIndexesInSubtree,
  findFolderLineIndex,
  findTocLineIndex,
  getPreviousNoteIndexOutsideSubtree,
  getTocEntrySubtreeRange,
  getPreviousTocNoteIndex,
  getTocLineCompleted,
  isNoteIndexInSubtree,
  parseTocLine,
  parseTocToTree,
  processTocEmptyLines,
  renameFolderLine,
  resolveNoteFromIndex,
  serializeTocTree,
  TOC_INDENT_SPACES,
} from '../../utils/tocHelpers'
import { parseNodeId } from '../../utils/tocNodeId'
import { NoteService } from '../note/service'

import type { NoteInfo, NoteConfig } from '../../types'
import type { TocTreeNode } from '../../utils/tocHelpers'

type NoteInsertPlacement = 'before' | 'after'

export type MoveNoteTarget =
  | {
      targetTocLineIndex: number
      placement: NoteInsertPlacement | 'inside'
    }
  | {
      targetType: 'note'
      targetNoteIndex: string
      placement: NoteInsertPlacement | 'inside'
    }
  | {
      targetType: 'folder'
      targetFolderPath: string[]
      placement: NoteInsertPlacement | 'inside'
    }

/** @alias MoveNoteTarget — 分组/笔记统一移动目标 */
export type MoveTocEntryTarget = MoveNoteTarget

/**
 * TOC 服务类（单例）
 */
export class TocService {
  private static instance: TocService
  private noteManager: NoteManager
  private configManager: ConfigManager
  private noteIndexCache: NoteIndexCache

  private constructor() {
    this.noteManager = NoteManager.getInstance()
    this.configManager = ConfigManager.getInstance()
    this.noteIndexCache = NoteIndexCache.getInstance()
  }

  static getInstance(): TocService {
    if (!TocService.instance) {
      TocService.instance = new TocService()
    }
    return TocService.instance
  }

  /**
   * 确保 TOC.md 存在
   */
  ensureTocExists(): void {
    if (!existsSync(ROOT_TOC_PATH)) {
      throw new Error(
        `TOC.md 不存在: ${ROOT_TOC_PATH}。请在知识库根目录创建 TOC.md 作为目录数据源。`,
      )
    }
  }

  /**
   * update 主流程：规范化 TOC.md
   */
  async normalizeToc(notes: NoteInfo[]): Promise<void> {
    this.ensureTocExists()

    const content = await fsPromises.readFile(ROOT_TOC_PATH, 'utf-8')
    const lines = content.split('\n')
    const tree = parseTocToTree(lines, notes)

    const existingIndexes = new Set<string>()
    const collectNoteIndexes = (nodes: TocTreeNode[]) => {
      for (const node of nodes) {
        if (node.kind === 'note') {
          existingIndexes.add(node.noteIndex)
        }
        collectNoteIndexes(node.children)
      }
    }
    collectNoteIndexes(tree)

    const missingNotes = notes.filter((n) => !existingIndexes.has(n.index))
    if (missingNotes.length > 0) {
      logger.info(`TOC.md 追加 ${missingNotes.length} 篇缺失笔记`)
      missingNotes.sort((a, b) => a.index.localeCompare(b.index))
      for (const note of missingNotes) {
        tree.push({
          kind: 'note',
          noteIndex: note.index,
          indent: 0,
          tocLineIndex: 0,
          children: [],
        })
      }
    }

    const configByIndex = new Map<string, Partial<NoteConfig>>()
    for (const note of notes) {
      configByIndex.set(note.index, {
        done: getTocLineCompleted(note),
      })
    }

    const normalizedLines = serializeTocTree(tree, notes, configByIndex)
    await this.writeTocLines(normalizedLines)
    logger.info('已规范化 TOC.md')
  }

  /**
   * 从 TOC.md 重新生成 sidebar.json
   */
  async regenerateSidebar(notes?: NoteInfo[]): Promise<void> {
    this.ensureTocExists()

    const allNotes =
      notes ??
      (this.noteIndexCache.isInitialized()
        ? this.noteIndexCache.toNoteInfoList()
        : this.noteManager.scanNotes())

    const content = readFileSync(ROOT_TOC_PATH, 'utf-8')
    const lines = content.split('\n')
    const tree = parseTocToTree(lines, allNotes)

    const sidebarShowNoteId = this.configManager.get('sidebarShowNoteId')
    const hierarchicalSidebar = buildSidebarFromTocTree(tree, allNotes, {
      sidebarShowNoteId,
      sidebarIsCollapsed: true,
    })

    const sidebarContent = JSON.stringify(hierarchicalSidebar, null, 2)
    const existingContent = existsSync(VP_SIDEBAR_PATH)
      ? readFileSync(VP_SIDEBAR_PATH, 'utf-8')
      : ''

    if (sidebarContent !== existingContent) {
      writeFileSync(VP_SIDEBAR_PATH, sidebarContent, 'utf-8')
    }

    logger.info('已更新侧边栏配置')
  }

  /**
   * 增量更新 TOC.md 中某笔记的完成状态与链接
   */
  async updateNoteInToc(
    noteIndex: string,
    updates: Partial<NoteConfig>,
  ): Promise<void> {
    this.ensureTocExists()

    const item = this.noteIndexCache.getByNoteIndex(noteIndex)
    if (!item) {
      logger.warn(`尝试更新 TOC 中不存在的笔记: ${noteIndex}`)
      return
    }

    const notes = this.noteIndexCache.isInitialized()
      ? this.noteIndexCache.toNoteInfoList()
      : this.noteManager.scanNotes()

    const note = resolveNoteFromIndex(noteIndex, notes)
    if (!note) return

    const mergedConfig = {
      ...note.config,
      ...updates,
      ...item.noteConfig,
    } as NoteConfig

    const tempNote: NoteInfo = {
      ...note,
      dirName: item.folderName,
      config: mergedConfig,
    }

    const lines = await this.readTocLines()
    let updated = false

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseTocLine(lines[i])
      if (parsed.noteIndex === noteIndex) {
        lines[i] = buildTocLine(
          tempNote,
          parsed.indentLevel,
          getTocLineCompleted(tempNote),
        )
        updated = true
      }
    }

    if (updated) {
      await this.writeTocLines(lines)
      logger.info(`增量更新 TOC.md 中的笔记: ${noteIndex}`)
    } else {
      logger.warn(`TOC.md 中未找到笔记: ${noteIndex}`)
    }
  }

  /**
   * 在 TOC.md 末尾或父节点下追加笔记
   */
  async appendNoteToToc(
    noteIndex: string,
    options?: {
      parentTocLineIndex?: number
      parentFolderPath?: string[]
      parentNoteIndex?: string
    },
  ): Promise<void> {
    const item = this.noteIndexCache.getByNoteIndex(noteIndex)
    if (!item) {
      logger.warn(`尝试添加不存在的笔记到 TOC: ${noteIndex}`)
      return
    }

    const notes = this.noteIndexCache.isInitialized()
      ? this.noteIndexCache.toNoteInfoList()
      : this.noteManager.scanNotes()

    const note = resolveNoteFromIndex(noteIndex, notes)
    if (!note) return

    const tempNote: NoteInfo = {
      ...note,
      dirName: item.folderName,
      config: item.noteConfig,
    }

    if (!existsSync(ROOT_TOC_PATH)) {
      await this.writeTocLines([buildTocLine(tempNote, 0, false)])
      logger.info(`创建 TOC.md 并添加笔记: ${noteIndex}`)
      return
    }

    const lines = await this.readTocLines()

    if (options?.parentTocLineIndex !== undefined) {
      await this.insertNotesUnderTocLine(options.parentTocLineIndex, [tempNote])
      return
    }

    if (options?.parentNoteIndex) {
      const parentIndex = findTocLineIndex(lines, options.parentNoteIndex)
      await this.insertNotesUnderTocLine(parentIndex, [tempNote])
      return
    }

    if (options?.parentFolderPath && options.parentFolderPath.length > 0) {
      const folderIndex = findFolderLineIndex(lines, options.parentFolderPath)
      await this.insertNotesUnderTocLine(folderIndex, [tempNote])
      return
    }

    lines.push(buildTocLine(tempNote, 0, false))

    await this.writeTocLines(lines)
    logger.info(`在 TOC.md 末尾添加笔记: ${noteIndex}`)
  }

  /**
   * 删除前按 TOC 文档顺序获取上一项笔记索引；首项返回 null
   */
  async getPreviousNoteIndexBeforeDelete(
    noteIndex: string,
  ): Promise<string | null> {
    if (!existsSync(ROOT_TOC_PATH)) return null

    const lines = await this.readTocLines()
    return getPreviousTocNoteIndex(lines, noteIndex)
  }

  /**
   * 从 TOC.md 删除笔记及其缩进子树
   */
  async deleteNoteFromToc(noteIndex: string): Promise<void> {
    if (!existsSync(ROOT_TOC_PATH)) return

    const lines = await this.readTocLines()
    let lineIndex: number
    try {
      lineIndex = findTocLineIndex(lines, noteIndex)
    } catch {
      logger.warn(`TOC.md 中未找到笔记: ${noteIndex}`)
      return
    }

    const { start, end } = getTocEntrySubtreeRange(lines, lineIndex)
    lines.splice(start, end - start)

    await this.writeTocLines(lines)
    logger.info(`从 TOC.md 删除笔记及子树: ${noteIndex} (${end - start} 行)`)
  }

  /**
   * 重命名 TOC.md 中的笔记行（保留位置与缩进）
   */
  async renameNoteInToc(noteIndex: string, newDirName: string): Promise<void> {
    if (!existsSync(ROOT_TOC_PATH)) return

    const item = this.noteIndexCache.getByNoteIndex(noteIndex)
    const notes = this.noteIndexCache.isInitialized()
      ? this.noteIndexCache.toNoteInfoList()
      : this.noteManager.scanNotes()

    const note = resolveNoteFromIndex(noteIndex, notes)
    if (!note) return

    const tempNote: NoteInfo = {
      ...note,
      dirName: newDirName,
      config: item?.noteConfig ?? note.config,
    }

    const lines = await this.readTocLines()
    let updated = false

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseTocLine(lines[i])
      if (parsed.noteIndex === noteIndex) {
        lines[i] = buildTocLine(
          tempNote,
          parsed.indentLevel,
          parsed.completed,
        )
        updated = true
      }
    }

    if (updated) {
      await this.writeTocLines(lines)
      logger.info(`TOC.md 重命名笔记: ${noteIndex} -> ${newDirName}`)
    }
  }

  /**
   * 移动笔记（含子树）到目标位置
   */
  async moveNoteInToc(
    noteIndex: string,
    target: MoveNoteTarget,
  ): Promise<void> {
    const lines = await this.readTocLines()
    const sourceIndex = findTocLineIndex(lines, noteIndex)
    await this.moveTocEntryByLineIndex(sourceIndex, target)
  }

  /**
   * 移动任意 TOC 行（分组或笔记）及其子树
   */
  async moveTocEntryByLineIndex(
    sourceTocLineIndex: number,
    target: MoveTocEntryTarget,
  ): Promise<void> {
    const lines = await this.readTocLines()
    const sourceParsed = parseTocLine(lines[sourceTocLineIndex])
    if (!sourceParsed.isMatch) {
      throw new Error(`无效的 TOC 行索引: ${sourceTocLineIndex}`)
    }

    const { start, end } = getTocEntrySubtreeRange(lines, sourceTocLineIndex)
    const resolvedTargetIndex = this.resolveMoveTargetLineIndex(lines, target)

    if (resolvedTargetIndex >= start && resolvedTargetIndex < end) {
      throw new Error('不能移动到自身或子树内')
    }

    const movingLines = lines.splice(start, end - start)
    if (movingLines.length === 0) {
      throw new Error(`无法移动空子树: 行 ${sourceTocLineIndex}`)
    }

    const targetLineIndex = adjustTocLineIndexAfterSubtreeRemoval(
      resolvedTargetIndex,
      start,
      end,
    )
    const targetParsed = parseTocLine(lines[targetLineIndex])
    if (!targetParsed.isMatch) {
      throw new Error(`无效的目标 TOC 行索引: ${targetLineIndex}`)
    }

    let insertIndex: number
    let newIndent: number

    if (target.placement === 'inside') {
      insertIndex = targetLineIndex + 1
      newIndent = targetParsed.indentLevel + 1
    } else if (target.placement === 'before') {
      insertIndex = targetLineIndex
      newIndent = targetParsed.indentLevel
    } else {
      insertIndex = getTocEntrySubtreeRange(lines, targetLineIndex).end
      newIndent = targetParsed.indentLevel
    }

    const oldBaseIndent = parseTocLine(movingLines[0]).indentLevel
    const indentDelta = newIndent - oldBaseIndent
    const adjustedLines = this.adjustSubtreeIndent(movingLines, indentDelta)

    const maxDepth = this.getSidebarMaxDepth()
    if (maxDepth > 0) {
      const maxIndent = this.getMaxSubtreeIndent(adjustedLines)
      const maxAllowedIndent = maxDepth - 1
      if (maxIndent > maxAllowedIndent) {
        throw new Error(`移动后将超出目录最大层级（${maxDepth} 层）`)
      }
    }

    lines.splice(insertIndex, 0, ...adjustedLines)
    await this.writeTocLines(lines)

    logger.info(
      `TOC.md 移动行 ${sourceTocLineIndex} -> 行 ${targetLineIndex} (${target.placement})`,
    )
  }

  /**
   * 语雀式移动：成为 target 的下一同级
   */
  async moveAfterByNodeId(
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<void> {
    const lines = await this.readTocLines()
    const sourceIndex = this.resolveNodeIdToTocLineIndex(lines, sourceNodeId)
    const targetIndex = this.resolveNodeIdToTocLineIndex(lines, targetNodeId)
    await this.moveTocEntryByLineIndex(sourceIndex, {
      targetTocLineIndex: targetIndex,
      placement: 'after',
    })
  }

  /**
   * 语雀式：prepend 到侧栏列表顶（无 target_uuid，book 即容器）
   */
  async prependToRootByNodeId(sourceNodeId: string): Promise<void> {
    const lines = await this.readTocLines()
    const sourceIndex = this.resolveNodeIdToTocLineIndex(lines, sourceNodeId)
    let targetLineIndex = 0
    while (
      targetLineIndex < lines.length &&
      !parseTocLine(lines[targetLineIndex]).isMatch
    ) {
      targetLineIndex++
    }
    if (targetLineIndex >= lines.length) {
      throw new Error('TOC.md 为空，无法移动到顶部')
    }
    await this.moveTocEntryByLineIndex(sourceIndex, {
      targetTocLineIndex: targetLineIndex,
      placement: 'before',
    })
  }

  /**
   * 语雀式移动：成为 target 的第一个子项
   */
  async prependChildByNodeId(
    sourceNodeId: string,
    targetNodeId: string,
  ): Promise<void> {
    const lines = await this.readTocLines()
    const sourceIndex = this.resolveNodeIdToTocLineIndex(lines, sourceNodeId)
    const targetIndex = this.resolveNodeIdToTocLineIndex(lines, targetNodeId)
    await this.moveTocEntryByLineIndex(sourceIndex, {
      targetTocLineIndex: targetIndex,
      placement: 'inside',
    })
  }

  resolveNodeIdToTocLineIndex(lines: string[], nodeId: string): number {
    const parsed = parseNodeId(nodeId)
    if (parsed.kind === 'note' && parsed.noteIndex) {
      return findTocLineIndex(lines, parsed.noteIndex)
    }
    if (parsed.kind === 'line' && parsed.tocLineIndex !== undefined) {
      return parsed.tocLineIndex
    }
    if (parsed.kind === 'folder' && parsed.folderPath) {
      return findFolderLineIndex(lines, parsed.folderPath)
    }
    throw new Error(`无法解析 nodeId: ${nodeId}`)
  }

  /**
   * 重命名 TOC 目录行
   */
  async renameFolderInToc(
    tocLineIndex: number,
    newTitle: string,
  ): Promise<void> {
    const lines = await this.readTocLines()
    const updated = renameFolderLine(lines, tocLineIndex, newTitle)
    await this.writeTocLines(updated)
    logger.info(`TOC.md 重命名目录行 ${tocLineIndex}: ${newTitle.trim()}`)
  }

  /**
   * 删除子树前获取回退笔记（子树之前的最后一篇笔记）
   */
  async getPreviousNoteIndexBeforeEntryDelete(
    tocLineIndex: number,
  ): Promise<string | null> {
    const lines = await this.readTocLines()
    return getPreviousNoteIndexOutsideSubtree(lines, tocLineIndex)
  }

  /**
   * 判断 noteIndex 是否在指定 TOC 行子树内
   */
  async isNoteInTocEntrySubtree(
    tocLineIndex: number,
    noteIndex: string,
  ): Promise<boolean> {
    const lines = await this.readTocLines()
    return isNoteIndexInSubtree(lines, tocLineIndex, noteIndex)
  }

  /**
   * 级联删除 TOC 子树，并删除子树内所有笔记磁盘目录
   */
  async deleteTocEntryCascade(tocLineIndex: number): Promise<string[]> {
    if (!existsSync(ROOT_TOC_PATH)) return []

    const lines = await this.readTocLines()
    const noteIndexes = collectNoteIndexesInSubtree(lines, tocLineIndex)
    const { start, end } = getTocEntrySubtreeRange(lines, tocLineIndex)
    lines.splice(start, end - start)
    await this.writeTocLines(lines)

    const noteService = NoteService.getInstance()
    for (const noteIndex of noteIndexes) {
      await noteService.deleteNote(noteIndex)
    }

    logger.info(
      `级联删除 TOC 行 ${tocLineIndex}（${end - start} 行，${noteIndexes.length} 篇笔记）`,
    )
    return noteIndexes
  }

  /**
   * 在指定 TOC 行（folder 或 note）子树末尾插入笔记
   */
  async insertNotesUnderTocLine(
    parentTocLineIndex: number,
    notesToInsert: NoteInfo[],
  ): Promise<void> {
    if (notesToInsert.length === 0) return

    const lines = await this.readTocLines()
    const parentParsed = parseTocLine(lines[parentTocLineIndex])
    if (!parentParsed.isMatch) {
      throw new Error(`无效的 TOC 行索引: ${parentTocLineIndex}`)
    }

    const childIndent = parentParsed.indentLevel + 1
    const { end } = getTocEntrySubtreeRange(lines, parentTocLineIndex)

    const noteLines = notesToInsert.map((note) =>
      buildTocLine(note, childIndent, getTocLineCompleted(note)),
    )

    lines.splice(end, 0, ...noteLines)
    await this.writeTocLines(lines)
    logger.info(
      `在 TOC 行 ${parentTocLineIndex} 下插入 ${notesToInsert.length} 篇笔记`,
    )
  }

  /**
   * 在指定 TOC 行（folder 或 note）子树末尾插入子目录
   */
  async insertFolderUnderParent(
    parentTocLineIndex: number,
    title: string,
  ): Promise<void> {
    const trimmed = title.trim()
    if (!trimmed) {
      throw new Error('目录标题不能为空')
    }

    const lines = await this.readTocLines()
    const parentParsed = parseTocLine(lines[parentTocLineIndex])
    if (!parentParsed.isMatch) {
      throw new Error(`无效的 TOC 行索引: ${parentTocLineIndex}`)
    }

    const childIndent = parentParsed.indentLevel + 1
    const { end } = getTocEntrySubtreeRange(lines, parentTocLineIndex)
    lines.splice(end, 0, buildFolderTocLine(trimmed, childIndent))
    await this.writeTocLines(lines)
    logger.info(`在 TOC 行 ${parentTocLineIndex} 下插入目录: ${trimmed}`)
  }

  /**
   * 在指定笔记上方或下方插入笔记
   */
  async insertNotesAroundNote(
    targetNoteIndex: string,
    notesToInsert: NoteInfo[],
    placement: NoteInsertPlacement,
  ): Promise<void> {
    if (notesToInsert.length === 0) return

    const lines = await this.readTocLines()
    const targetIndex = findTocLineIndex(lines, targetNoteIndex)
    const targetParsed = parseTocLine(lines[targetIndex])
    const indent = targetParsed.indentLevel

    const noteLines = notesToInsert.map((note) =>
      buildTocLine(note, indent, getTocLineCompleted(note)),
    )

    const insertIndex =
      placement === 'before'
        ? targetIndex
        : getTocEntrySubtreeRange(lines, targetIndex).end
    lines.splice(insertIndex, 0, ...noteLines)

    await this.writeTocLines(lines)
    logger.info(
      `在笔记 ${targetNoteIndex} ${placement === 'before' ? '上方' : '下方'}插入 ${notesToInsert.length} 篇笔记`,
    )
  }

  /**
   * 在目录子树末尾插入笔记
   */
  async insertNotesUnderFolder(
    folderPath: string[],
    notesToInsert: NoteInfo[],
  ): Promise<void> {
    if (notesToInsert.length === 0) return

    const lines = await this.readTocLines()
    const folderIndex = findFolderLineIndex(lines, folderPath)
    await this.insertNotesUnderTocLine(folderIndex, notesToInsert)
  }

  async insertNotesUnderParent(
    parentNoteIndex: string,
    notesToInsert: NoteInfo[],
  ): Promise<void> {
    if (notesToInsert.length === 0) return

    const lines = await this.readTocLines()
    const parentIndex = findTocLineIndex(lines, parentNoteIndex)
    await this.insertNotesUnderTocLine(parentIndex, notesToInsert)
  }

  /**
   * 规范化 TOC 并刷新 sidebar
   */
  async refreshTocAndSidebar(notes?: NoteInfo[]): Promise<void> {
    const allNotes =
      notes ??
      (this.noteIndexCache.isInitialized()
        ? this.noteIndexCache.toNoteInfoList()
        : this.noteManager.scanNotes())

    await this.normalizeToc(allNotes)
    await this.regenerateSidebar(allNotes)
  }

  private resolveMoveTargetLineIndex(
    lines: string[],
    target: MoveNoteTarget,
  ): number {
    if ('targetTocLineIndex' in target) {
      return target.targetTocLineIndex
    }
    if (target.targetType === 'folder') {
      return findFolderLineIndex(lines, target.targetFolderPath)
    }
    return findTocLineIndex(lines, target.targetNoteIndex)
  }

  private getSidebarMaxDepth(): number {
    const config = this.configManager.getAll() as { sidebarMaxDepth?: number }
    const depth = config.sidebarMaxDepth ?? 0
    return depth > 0 ? depth : 0
  }

  private getMaxSubtreeIndent(lines: string[]): number {
    let max = 0
    for (const line of lines) {
      const parsed = parseTocLine(line)
      if (parsed.isMatch) {
        max = Math.max(max, parsed.indentLevel)
      }
    }
    return max
  }

  private adjustSubtreeIndent(lines: string[], delta: number): string[] {
    if (delta === 0) return lines

    return lines.map((line) => {
      const parsed = parseTocLine(line)
      if (!parsed.isMatch) return line

      const newIndent = Math.max(0, parsed.indentLevel + delta)
      const withoutIndent = line.trimStart()
      return `${' '.repeat(newIndent * TOC_INDENT_SPACES)}${withoutIndent}`
    })
  }

  private async readTocLines(): Promise<string[]> {
    this.ensureTocExists()
    const content = await fsPromises.readFile(ROOT_TOC_PATH, 'utf-8')
    return content.split('\n')
  }

  private async writeTocLines(lines: string[]): Promise<void> {
    const content = processTocEmptyLines(lines).join('\n')
    await fsPromises.writeFile(ROOT_TOC_PATH, content, 'utf-8')
  }
}
