/**
 * utils/tocHelpers.test.ts
 */

import { describe, it, expect } from 'vitest'

import {
  parseTocLine,
  parseTocToTree,
  serializeTocTree,
  getSubtreeLineRange,
  getFolderSubtreeRange,
  getTocEntrySubtreeRange,
  adjustTocLineIndexAfterSubtreeRemoval,
  collectNoteIndexesInSubtree,
  renameFolderLine,
  getPreviousNoteIndexOutsideSubtree,
  isNoteIndexInSubtree,
  findFolderLineIndex,
  parseTocCompletedNotes,
  buildSidebarFromTocTree,
  getPreviousTocNoteIndex,
} from './tocHelpers'

import type { NoteInfo } from '../types'

function makeNote(index: string, dirName: string, done = false): NoteInfo {
  return {
    index,
    dirName,
    path: `/notes/${dirName}`,
    readmePath: `/notes/${dirName}/README.md`,
    configPath: `/notes/${dirName}/.tnotes.json`,
    config: {
      id: `id-${index}`,
      bilibili: [],
      tnotes: [],
      yuque: [],
      done,
      enableDiscussions: false,
    },
  }
}

const notes: NoteInfo[] = [
  makeNote('0001', '0001. Alpha', true),
  makeNote('0002', '0002. Beta', false),
  makeNote('0003', '0003. Giscus', false),
  makeNote('0019', '0019. Author', true),
  makeNote('0027', '0027. emoji', true),
  makeNote('0036', '0036. Workflow', false),
  makeNote('0037', '0037. Writing guide', false),
  makeNote('0039', '0039. new', false),
]

describe('parseTocLine', () => {
  it('parses canonical note with title', () => {
    const result = parseTocLine('  - [x] 0002. Beta')
    expect(result.kind).toBe('note')
    expect(result.noteIndex).toBe('0002')
  })

  it('parses folder line', () => {
    const result = parseTocLine('- TNotes 组件')
    expect(result.kind).toBe('folder')
    expect(result.folderTitle).toBe('TNotes 组件')
  })
})

describe('parseTocToTree / serializeTocTree', () => {
  it('assigns tocLineIndex from source lines', () => {
    const lines = [
      '- Group',
      '  - [x] 0001. Alpha',
      '- [ ] 0003. Gamma',
    ]
    const tree = parseTocToTree(lines, notes)
    expect(tree[0].kind).toBe('folder')
    if (tree[0].kind === 'folder') {
      expect(tree[0].tocLineIndex).toBe(0)
      expect(tree[0].children[0]).toMatchObject({
        kind: 'note',
        noteIndex: '0001',
        tocLineIndex: 1,
      })
    }
    expect(tree[1]).toMatchObject({ kind: 'note', tocLineIndex: 2 })
  })

  it('parses note -> folder -> note nesting (introduction 0027 case)', () => {
    const lines = [
      '- Writing',
      '  - [ ] 0037. Writing guide',
      '  - [x] 0027. emoji',
      '    - Giscus',
      '      - [ ] 0003. Giscus',
    ]
    const tree = parseTocToTree(lines, notes)
    const writing = tree[0]
    expect(writing.kind).toBe('folder')
    if (writing.kind !== 'folder') return

    const emoji = writing.children[1]
    expect(emoji.kind).toBe('note')
    if (emoji.kind !== 'note') return

    expect(emoji.tocLineIndex).toBe(2)
    expect(emoji.children[0].kind).toBe('folder')
    if (emoji.children[0].kind === 'folder') {
      expect(emoji.children[0].title).toBe('Giscus')
      expect(emoji.children[0].tocLineIndex).toBe(3)
      expect(emoji.children[0].children[0]).toMatchObject({
        kind: 'note',
        noteIndex: '0003',
        tocLineIndex: 4,
      })
    }
  })

  it('round-trips mixed nesting', () => {
    const lines = [
      '- [x] 0019. Author',
      '  - Appendix',
      '    - [ ] 0036. Workflow',
    ]
    const tree = parseTocToTree(lines, notes)
    expect(serializeTocTree(tree, notes)).toEqual(lines)
  })

  it('distinguishes duplicate folder titles by tocLineIndex', () => {
    const lines = [
      '- [x] 0019. Author',
      '  - Appendix',
      '    - [ ] 0036. Workflow',
      '- [ ] 0039. new',
      '  - Appendix',
      '    - [ ] 0002. Beta',
    ]
    const tree = parseTocToTree(lines, notes)
    const folders: number[] = []
    function walk(nodes: typeof tree) {
      for (const node of nodes) {
        if (node.kind === 'folder') {
          folders.push(node.tocLineIndex)
          walk(node.children)
        } else {
          walk(node.children)
        }
      }
    }
    walk(tree)
    expect(folders).toEqual([1, 4])
    expect(findFolderLineIndex(lines, ['Appendix'])).toBe(1)
  })
})

describe('getTocEntrySubtreeRange', () => {
  it('covers note and nested folder children', () => {
    const lines = [
      '  - [x] 0027. emoji',
      '    - Giscus',
      '      - [ ] 0003. Giscus',
      '- [ ] 0039. new',
    ]
    expect(getTocEntrySubtreeRange(lines, 0)).toEqual({ start: 0, end: 3 })
    expect(getTocEntrySubtreeRange(lines, 1)).toEqual({ start: 1, end: 3 })
  })

  it('matches getSubtreeLineRange and getFolderSubtreeRange', () => {
    const lines = ['- Group', '  - [x] 0001. Alpha', '- [ ] 0003. Gamma']
    expect(getTocEntrySubtreeRange(lines, 0)).toEqual(
      getFolderSubtreeRange(lines, 0),
    )
    expect(getTocEntrySubtreeRange(lines, 1)).toEqual(
      getSubtreeLineRange(lines, 1),
    )
  })
})

describe('buildSidebarFromTocTree', () => {
  it('includes tocLineIndex on folder and note items', () => {
    const tree = parseTocToTree(
      ['- Components', '  - [ ] 0002. Beta', '- [x] 0019. Author', '  - [ ] 0036. Workflow'],
      notes,
    )
    const sidebar = buildSidebarFromTocTree(tree, notes, {
      sidebarShowNoteId: true,
    })
    expect(sidebar[0].tocLineIndex).toBe(0)
    expect(sidebar[0].items![0].tocLineIndex).toBe(1)
    expect(sidebar[1].tocLineIndex).toBe(2)
    expect(sidebar[1].items![0].tocLineIndex).toBe(3)
  })

  it('folder under note renders with link parent and folder child', () => {
    const tree = parseTocToTree(
      ['- [x] 0027. emoji', '  - Giscus', '    - [ ] 0003. Giscus'],
      notes,
    )
    const sidebar = buildSidebarFromTocTree(tree, notes, {
      sidebarShowNoteId: true,
    })
    expect(sidebar[0].link).toBeDefined()
    expect(sidebar[0].items![0].link).toBeUndefined()
    expect(sidebar[0].items![0].tocLineIndex).toBe(1)
  })
})

describe('getPreviousTocNoteIndex', () => {
  it('returns previous note in document order', () => {
    const lines = ['- [x] 0001. Alpha', '- [ ] 0003. Gamma']
    expect(getPreviousTocNoteIndex(lines, '0003')).toBe('0001')
  })
})

describe('parseTocCompletedNotes', () => {
  it('counts completed notes', () => {
    const content = ['- [x] 0001. Alpha', '- [ ] 0002. Beta'].join('\n')
    const result = parseTocCompletedNotes(content)
    expect(result.completedCount).toBe(1)
    expect(result.totalCount).toBe(2)
  })
})

describe('folder subtree helpers', () => {
  const introLines = [
    '- TNotes 笔记书写规范',
    '  - [ ] 0037. Writing guide',
    '  - [x] 0027. emoji',
    '    - 评论功能的技术实现（Giscus）',
    '      - [ ] 0003. Giscus',
    '      - [ ] 0023. git log',
    '      - [ ] 0009. search',
  ]

  it('collectNoteIndexesInSubtree on 0027 includes nested notes', () => {
    const indexes = collectNoteIndexesInSubtree(introLines, 2)
    expect(indexes).toEqual(['0027', '0003', '0023', '0009'])
  })

  it('collectNoteIndexesInSubtree on giscus folder excludes 0027', () => {
    const indexes = collectNoteIndexesInSubtree(introLines, 3)
    expect(indexes).toEqual(['0003', '0023', '0009'])
  })

  it('renameFolderLine updates folder title only', () => {
    const updated = renameFolderLine(introLines, 3, 'Giscus Renamed')
    expect(updated[3]).toBe('    - Giscus Renamed')
    expect(updated[2]).toBe(introLines[2])
  })

  it('getPreviousNoteIndexOutsideSubtree for giscus folder', () => {
    expect(getPreviousNoteIndexOutsideSubtree(introLines, 3)).toBe('0027')
  })

  it('isNoteIndexInSubtree detects membership', () => {
    expect(isNoteIndexInSubtree(introLines, 2, '0003')).toBe(true)
    expect(isNoteIndexInSubtree(introLines, 3, '0027')).toBe(false)
  })
})

describe('adjustTocLineIndexAfterSubtreeRemoval', () => {
  it('shifts target line index when source subtree is removed above it', () => {
    // introduction：0019 子树占 37–43，0039 原在行 45
    expect(adjustTocLineIndexAfterSubtreeRemoval(45, 37, 43)).toBe(39)
  })

  it('keeps target line index when target is above removed subtree', () => {
    expect(adjustTocLineIndexAfterSubtreeRemoval(30, 37, 43)).toBe(30)
  })
})

describe('parseTocLine safety', () => {
  it('does not throw on undefined line', () => {
    expect(parseTocLine(undefined).isMatch).toBe(false)
    expect(parseTocLine(null).isMatch).toBe(false)
  })
})
