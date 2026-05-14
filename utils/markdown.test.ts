/**
 * utils/markdown.test.ts
 *
 * 测试 createAddNumberToTitle 和 generateToc 函数
 */

import { describe, expect, it } from 'vitest'

import { createAddNumberToTitle, generateToc } from './markdown'

describe('createAddNumberToTitle', () => {
  it('returns h1 title unchanged', () => {
    const addNumber = createAddNumberToTitle()
    const [newTitle, plainTitle] = addNumber('# Introduction')
    expect(newTitle).toBe('# Introduction')
    expect(plainTitle).toBe('Introduction')
  })

  it('numbers the first h2 as "1."', () => {
    const addNumber = createAddNumberToTitle()
    const [newTitle, plainTitle] = addNumber('## First Section')
    expect(newTitle).toBe('## 1. First Section')
    expect(plainTitle).toBe('First Section')
  })

  it('increments numbering for consecutive h2 headings', () => {
    const addNumber = createAddNumberToTitle()
    addNumber('## First')
    const [second] = addNumber('## Second')
    expect(second).toBe('## 2. Second')
  })

  it('generates nested numbering for h3 under h2', () => {
    const addNumber = createAddNumberToTitle()
    addNumber('## Section')       // 1.
    const [sub] = addNumber('### Sub') // 1.1.
    expect(sub).toBe('### 1.1. Sub')
  })

  it('resets sub-level counter when returning to parent level', () => {
    const addNumber = createAddNumberToTitle()
    addNumber('## A')        // 1.
    addNumber('### A1')      // 1.1.
    addNumber('## B')        // 2. — resets h3
    const [sub2] = addNumber('### B1') // 2.1.
    expect(sub2).toBe('### 2.1. B1')
  })

  it('strips existing numbers from title text when computing plainTitle', () => {
    const addNumber = createAddNumberToTitle()
    const [, plainTitle] = addNumber('## 99. Already Numbered')
    expect(plainTitle).toBe('Already Numbered')
  })

  it('each factory call produces independent state', () => {
    const first = createAddNumberToTitle()
    const second = createAddNumberToTitle()
    first('## A') // advances first counter to 1
    const [t1] = first('## B') // 2. B
    const [t2] = second('## B') // 1. B — independent state
    expect(t1).toBe('## 2. B')
    expect(t2).toBe('## 1. B')
  })
})

describe('generateToc', () => {
  it('wraps output in newlines', () => {
    const toc = generateToc(['## Section'])
    expect(toc).toMatch(/^\n/)
    expect(toc).toMatch(/\n$/)
  })

  it('generates a flat TOC for h2 headings', () => {
    const toc = generateToc(['## Section 1', '## Section 2'])
    expect(toc).toContain('- [Section 1](#section-1)')
    expect(toc).toContain('- [Section 2](#section-2)')
  })

  it('indents h3 headings by 2 spaces relative to h2 (baseLevel=2)', () => {
    const toc = generateToc(['## Parent', '### Child'])
    expect(toc).toContain('- [Parent](#parent)')
    expect(toc).toContain('  - [Child](#child)')
  })

  it('uses custom eol character between entries', () => {
    const toc = generateToc(['## A', '## B'], 2, '\r\n')
    expect(toc).toContain('\r\n')
  })

  it('returns only surrounding newlines for empty input', () => {
    const toc = generateToc([])
    expect(toc).toBe('\n\n')
  })

  it('respects custom baseLevel for indentation calculation', () => {
    // baseLevel=3: h3 → 0 indent, h4 → 2 indent
    const toc = generateToc(['### Top', '#### Nested'], 3)
    expect(toc).toContain('- [Top](#top)')
    expect(toc).toContain('  - [Nested](#nested)')
  })
})
