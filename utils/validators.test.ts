/**
 * utils/validators.test.ts
 *
 * 测试 validateNoteTitle 函数，覆盖文件名合法性校验的所有边界条件
 */

import { describe, expect, it } from 'vitest'

import { validateNoteTitle } from './validators'

describe('validateNoteTitle', () => {
  it('rejects empty string', () => {
    expect(validateNoteTitle('')).toMatchObject({ valid: false })
  })

  it('rejects whitespace-only string', () => {
    expect(validateNoteTitle('   ')).toMatchObject({ valid: false })
  })

  it('rejects title longer than 200 characters', () => {
    const long = 'a'.repeat(201)
    expect(validateNoteTitle(long)).toMatchObject({ valid: false })
  })

  it('accepts title of exactly 200 characters', () => {
    const exact = 'a'.repeat(200)
    expect(validateNoteTitle(exact)).toMatchObject({ valid: true })
  })

  it.each(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])(
    'rejects title containing invalid char "%s"',
    (char) => {
      expect(validateNoteTitle(`title${char}name`)).toMatchObject({ valid: false })
    },
  )

  it('rejects title containing control character', () => {
    expect(validateNoteTitle('title\x01name')).toMatchObject({ valid: false })
  })

  it('rejects title starting with a dot', () => {
    expect(validateNoteTitle('.hidden')).toMatchObject({ valid: false })
  })

  it('rejects title ending with a dot', () => {
    expect(validateNoteTitle('file.')).toMatchObject({ valid: false })
  })

  it('accepts title with trailing space (trimmed before validation)', () => {
    expect(validateNoteTitle('file ')).toMatchObject({ valid: true })
  })

  it.each(['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT9'])(
    'rejects Windows reserved name "%s"',
    (name) => {
      expect(validateNoteTitle(name)).toMatchObject({ valid: false })
    },
  )

  it('rejects Windows reserved name regardless of case', () => {
    expect(validateNoteTitle('con')).toMatchObject({ valid: false })
    expect(validateNoteTitle('Con')).toMatchObject({ valid: false })
  })

  it('rejects reserved name with extension like CON.txt', () => {
    expect(validateNoteTitle('CON.txt')).toMatchObject({ valid: false })
  })

  it('accepts a normal title', () => {
    expect(validateNoteTitle('My Note')).toMatchObject({ valid: true })
  })

  it('accepts Chinese characters in title', () => {
    expect(validateNoteTitle('笔记标题')).toMatchObject({ valid: true })
  })

  it('accepts alphanumeric with dashes and dots in middle', () => {
    expect(validateNoteTitle('note-01.md')).toMatchObject({ valid: true })
  })
})
