import { describe, expect, it } from 'vitest'

import {
  getRepoRootPath,
  resolveNoteReadmePath,
  toVscodeFileUrl,
} from './vscodePaths'

const notesDir = 'C:\\tnotesjs\\TNotes.introduction\\notes'

describe('vscodePaths', () => {
  it('getRepoRootPath resolves parent of notes directory', () => {
    expect(getRepoRootPath(notesDir)).toBe('C:\\tnotesjs\\TNotes.introduction')
  })

  it('resolveNoteReadmePath handles sidebar link format', () => {
    expect(resolveNoteReadmePath(notesDir, '/notes/0002. TNotes/README')).toBe(
      'C:\\tnotesjs\\TNotes.introduction\\notes\\0002. TNotes\\README.md',
    )
  })

  it('resolveNoteReadmePath handles vitepress page relativePath', () => {
    expect(
      resolveNoteReadmePath(notesDir, 'notes/0002. TNotes 公式支持/README.md'),
    ).toBe(
      'C:\\tnotesjs\\TNotes.introduction\\notes\\0002. TNotes 公式支持\\README.md',
    )
  })

  it('resolveNoteReadmePath handles repo README page', () => {
    expect(resolveNoteReadmePath(notesDir, 'README.md')).toBe(
      'C:\\tnotesjs\\TNotes.introduction\\README.md',
    )
  })

  it('toVscodeFileUrl encodes file path', () => {
    expect(toVscodeFileUrl('C:\\notes\\0001\\README.md')).toContain(
      'vscode://file/',
    )
  })
})
