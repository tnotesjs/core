/**
 * utils/migrateReadmeToToc.ts
 *
 * 从 v0.1.x 根目录 README.md 解析笔记分区，生成 TOC.md 条目（init-toc 过渡命令）
 */

import { parseTocLine } from './tocHelpers'

/** 与 TocGenerator 保持一致 */
export const README_TOC_END_TAG = '<!-- endregion:toc -->'

/** 迁移后的 flat TOC 条目 */
export type MigratedTocEntry =
  | {
      kind: 'folder'
      folderTitle: string
      indent: number
    }
  | {
      kind: 'note'
      noteIndex: string
      indent: number
      completed: boolean
    }

/** migrateReadmeToToc 返回结果 */
export interface MigrateReadmeToTocResult {
  entries: MigratedTocEntry[]
  warnings: string[]
}

interface NoteGroupItem {
  noteIndex: string
  completed: boolean
}

interface ReadmeSection {
  heading: string | null
  items: NoteGroupItem[]
}

/**
 * 取 `<!-- endregion:toc -->` 之后的 README 正文行
 */
export function extractReadmeBodyAfterToc(content: string): string[] {
  const endTagIndex = content.indexOf(README_TOC_END_TAG)
  if (endTagIndex === -1) {
    throw new Error(
      `README.md 中未找到 ${README_TOC_END_TAG}，无法执行 init-toc 迁移`,
    )
  }

  const afterTag = content.slice(endTagIndex + README_TOC_END_TAG.length)
  return afterTag.split('\n')
}

/**
 * 从 v0.1.x README 正文解析 TOC 条目。
 *
 * 规则：
 * - 每个 #{2,} 标题独立成组，输出为 folder 行
 * - 组内笔记统一为 folder 下 indent 1 的 note 行
 * - 无标题组内笔记为根级 note 行
 */
export function migrateReadmeToToc(content: string): MigrateReadmeToTocResult {
  const lines = extractReadmeBodyAfterToc(content)
  const warnings: string[] = []
  const seenIndexes = new Set<string>()
  const sections: ReadmeSection[] = []
  let currentHeading: string | null = null
  let currentGroup: NoteGroupItem[] = []

  const flushGroup = () => {
    if (currentGroup.length > 0) {
      sections.push({ heading: currentHeading, items: currentGroup })
    }
    currentGroup = []
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,})\s+(.+)$/)
    if (headingMatch) {
      flushGroup()
      currentHeading = headingMatch[2].trim()
      continue
    }

    const parsed = parseTocLine(line)
    if (!parsed.isMatch || !parsed.noteIndex) continue

    if (seenIndexes.has(parsed.noteIndex)) {
      warnings.push(`跳过重复笔记索引: ${parsed.noteIndex}`)
      continue
    }

    seenIndexes.add(parsed.noteIndex)
    currentGroup.push({
      noteIndex: parsed.noteIndex,
      completed: parsed.completed,
    })
  }

  flushGroup()

  const entries: MigratedTocEntry[] = []
  for (const section of sections) {
    if (section.heading) {
      entries.push({
        kind: 'folder',
        folderTitle: section.heading,
        indent: 0,
      })
      for (const item of section.items) {
        entries.push({
          kind: 'note',
          noteIndex: item.noteIndex,
          indent: 1,
          completed: item.completed,
        })
      }
      continue
    }

    for (const item of section.items) {
      entries.push({
        kind: 'note',
        noteIndex: item.noteIndex,
        indent: 0,
        completed: item.completed,
      })
    }
  }

  return { entries, warnings }
}
