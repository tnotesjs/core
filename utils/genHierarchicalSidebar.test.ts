/**
 * utils/genHierarchicalSidebar.test.ts
 *
 * 测试 genHierarchicalSidebar 函数，覆盖层次化侧边栏的构建逻辑
 */

import { describe, expect, it } from 'vitest'

import { genHierarchicalSidebar } from './genHierarchicalSidebar'

describe('genHierarchicalSidebar', () => {
  it('returns empty array for empty input', () => {
    expect(genHierarchicalSidebar([], [], [], false)).toEqual([])
  })

  it('skips the first h1 title (index 0, level 1)', () => {
    const result = genHierarchicalSidebar([], ['# Root'], [0], false)
    expect(result).toEqual([])
  })

  it('places h2 titles at root level', () => {
    const items = [{ text: 'Note 1', link: '/1' }]
    const result = genHierarchicalSidebar(items, ['## Section A'], [1], false)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Section A')
    expect(result[0].items).toEqual([{ text: 'Note 1', link: '/1' }])
  })

  it('nests h3 inside the preceding h2', () => {
    const items = [
      { text: 'Note 1', link: '/1' },
      { text: 'Note 2', link: '/2' },
    ]
    const titles = ['# Root', '## Section A', '### Subsection']
    const counts = [0, 1, 1]
    const result = genHierarchicalSidebar(items, titles, counts, false)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Section A')

    const children = result[0].items!
    expect(children).toHaveLength(2) // Note 1 + Subsection
    const sub = children.find((c) => c.text === 'Subsection')
    expect(sub).toBeDefined()
    expect(sub!.items).toEqual([{ text: 'Note 2', link: '/2' }])
  })

  it('resets nesting when a lower-depth heading appears after a deeper one', () => {
    const items = [
      { text: 'N1', link: '/1' },
      { text: 'N2', link: '/2' },
      { text: 'N3', link: '/3' },
    ]
    const titles = ['# Root', '## A', '### A1', '## B']
    const counts = [0, 1, 1, 1]
    const result = genHierarchicalSidebar(items, titles, counts, false)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('A')
    expect(result[1].text).toBe('B')
    expect(result[1].items).toEqual([{ text: 'N3', link: '/3' }])
  })

  it('applies sidebarIsCollapsed to all generated nodes', () => {
    const items = [{ text: 'N1', link: '/1' }]
    const result = genHierarchicalSidebar(items, ['## Section'], [1], true)

    expect(result[0].collapsed).toBe(true)
  })

  it('sets collapsed=false when sidebarIsCollapsed is false', () => {
    const items = [{ text: 'N1', link: '/1' }]
    const result = genHierarchicalSidebar(items, ['## Section'], [1], false)

    expect(result[0].collapsed).toBe(false)
  })

  it('produces empty items array for a heading with no notes', () => {
    const result = genHierarchicalSidebar([], ['## Empty Section'], [0], false)

    expect(result[0].items).toEqual([])
  })

  it('handles multiple root-level h2 headings with no sub-headings', () => {
    const items = [
      { text: 'N1', link: '/1' },
      { text: 'N2', link: '/2' },
    ]
    const titles = ['## A', '## B']
    const counts = [1, 1]
    const result = genHierarchicalSidebar(items, titles, counts, false)

    expect(result).toHaveLength(2)
    expect(result[0].text).toBe('A')
    expect(result[1].text).toBe('B')
  })
})
