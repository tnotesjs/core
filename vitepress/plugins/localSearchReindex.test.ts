/**
 * localSearchReindex.test.ts
 */

import { describe, expect, it } from 'vitest'

import {
  getDocIdFromFile,
  isNoteReadmePath,
} from './localSearchReindexLogic'

describe('isNoteReadmePath', () => {
  it('matches note readme paths', () => {
    expect(
      isNoteReadmePath('C:/repo/notes/0040. new/README.md'),
    ).toBe(true)
    expect(
      isNoteReadmePath('notes/0040. new/README.md'),
    ).toBe(true)
  })

  it('rejects non-note markdown files', () => {
    expect(isNoteReadmePath('notes/0040. new/notes.md')).toBe(false)
    expect(isNoteReadmePath('README.md')).toBe(false)
    expect(isNoteReadmePath('TOC.md')).toBe(false)
  })

  it('respects ignore_dirs folder names', () => {
    expect(
      isNoteReadmePath('notes/0040. draft/README.md', ['0040. draft']),
    ).toBe(false)
  })
})

describe('getDocIdFromFile', () => {
  it('builds clean url doc id with site base', () => {
    expect(
      getDocIdFromFile({
        srcDir: 'C:/repo',
        base: '/TNotes.introduction/',
        cleanUrls: true,
        absoluteOrRelativeFile: 'C:/repo/notes/0040. new/README.md',
      }),
    ).toBe('/TNotes.introduction/notes/0040. new/README')
  })
})
