/**
 * commands/init-toc/InitTocCommand.ts
 *
 * 过渡命令（v0.2.x）：从 v0.1.x 根 README.md 初始化 TOC.md
 * 计划在 v0.3.x 移除。
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'

import { ROOT_README_PATH, ROOT_TOC_PATH } from '../../config/constants'
import { NoteManager } from '../../core/NoteManager'
import { TocService } from '../../services/toc/service'
import { buildTocLine, buildFolderTocLine, processTocEmptyLines, resolveNoteFromIndex } from '../../utils'
import { migrateReadmeToToc } from '../../utils/migrateReadmeToToc'
import { BaseCommand } from '../BaseCommand'

export class InitTocCommand extends BaseCommand {
  private noteManager: NoteManager
  private tocService: TocService

  constructor() {
    super('init-toc')
    this.noteManager = NoteManager.getInstance()
    this.tocService = TocService.getInstance()
  }

  protected async run(): Promise<void> {
    if (!existsSync(ROOT_README_PATH)) {
      throw new Error(`README.md 不存在: ${ROOT_README_PATH}`)
    }

    const readmeContent = readFileSync(ROOT_README_PATH, 'utf-8')
    const notes = this.noteManager.scanNotes()

    const { entries, warnings } = migrateReadmeToToc(readmeContent)

    for (const warning of warnings) {
      this.logger.warn(warning)
    }

    const lines: string[] = []
    let skipped = 0

    for (const entry of entries) {
      if (entry.kind === 'folder') {
        lines.push(buildFolderTocLine(entry.folderTitle, entry.indent))
        continue
      }

      const note = resolveNoteFromIndex(entry.noteIndex, notes)
      if (!note) {
        skipped++
        this.logger.warn(
          `跳过 README 中存在但 notes/ 目录中不存在的笔记: ${entry.noteIndex}`,
        )
        continue
      }

      lines.push(buildTocLine(note, entry.indent, entry.completed))
    }

    if (lines.length === 0) {
      throw new Error(
        '未能从 README.md 解析到任何有效笔记条目，TOC.md 未写入',
      )
    }

    const content = processTocEmptyLines(lines).join('\n')
    writeFileSync(ROOT_TOC_PATH, content, 'utf-8')

    await this.tocService.regenerateSidebar(notes)

    this.logger.success(
      `TOC.md 已从 README.md 初始化（${lines.length} 条笔记${skipped > 0 ? `，跳过 ${skipped} 条` : ''}）`,
    )
    this.logger.info(`输出路径: ${ROOT_TOC_PATH}`)
    this.logger.info(
      '过渡命令 init-toc 仅在 v0.2.x 提供，v0.3.x 将移除；后续请使用 TOC.md + pnpm tn:update',
    )

    const listedIndexes = new Set(
      entries.filter((e) => e.kind === 'note').map((e) => e.noteIndex),
    )
    const missingInReadme = notes.filter((n) => !listedIndexes.has(n.index))
    if (missingInReadme.length > 0) {
      this.logger.info(
        `README 中未列出 ${missingInReadme.length} 篇笔记，可执行 pnpm tn:update 追加到 TOC.md`,
      )
    }
  }
}
