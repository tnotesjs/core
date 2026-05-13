/**
 * utils/parseArgs.test.ts
 *
 * 测试 parseArgs 函数，锁定当前 CLI 的布尔优先语义
 */

import { describe, expect, it } from 'vitest'

import { parseArgs } from './parseArgs'

describe('parseArgs', () => {
  it('parses command flags used by the current CLI as booleans', () => {
    const result = parseArgs(['--update', '--quiet', '--force'])

    expect(result.update).toBe(true)
    expect(result.quiet).toBe(true)
    expect(result.force).toBe(true)
    expect(result._).toEqual([])
  })

  it('treats non-boolean values after long flags as positional args', () => {
    const result = parseArgs(['--update', 'notes/0001'])

    expect(result.update).toBe(true)
    expect(result._).toEqual(['notes/0001'])
  })

  it('consumes explicit boolean strings after long flags', () => {
    const result = parseArgs(['--quiet', 'false', '--force', 'true'])

    expect(result.quiet).toBe(false)
    expect(result.force).toBe(true)
    expect(result._).toEqual([])
  })

  it('parses negated long flags as false', () => {
    const result = parseArgs(['--no-force'])

    expect(result.force).toBe(false)
    expect(result._).toEqual([])
  })

  it('parses equals syntax as string values', () => {
    const result = parseArgs(['--repo=TNotes.core'])

    expect(result.repo).toBe('TNotes.core')
    expect(result._).toEqual([])
  })

  it('parses bundled short flags and preserves positional args', () => {
    const result = parseArgs(['-abc', 'rest'])

    expect(result.a).toBe(true)
    expect(result.b).toBe(true)
    expect(result.c).toBe(true)
    expect(result._).toEqual(['rest'])
  })
})