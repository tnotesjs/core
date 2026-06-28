/**
 * utils/migrateReadmeToToc.test.ts
 */

import { describe, it, expect } from 'vitest'

import {
  extractReadmeBodyAfterToc,
  migrateReadmeToToc,
  README_TOC_END_TAG,
} from './migrateReadmeToToc'

const TOC_REGION = `<!-- region:toc -->

- [1. Alpha](#1-alpha)

${README_TOC_END_TAG}`

describe('extractReadmeBodyAfterToc', () => {
  it('returns lines after endregion:toc', () => {
    const content = `${TOC_REGION}\n\n## 1. Alpha\n- [x] [0001. A](url)`
    const lines = extractReadmeBodyAfterToc(content)
    expect(lines.some((l) => l.includes('## 1. Alpha'))).toBe(true)
    expect(lines.some((l) => l.includes('#1-alpha'))).toBe(false)
  })

  it('throws when endregion:toc is missing', () => {
    expect(() => extractReadmeBodyAfterToc('# no toc')).toThrow(
      README_TOC_END_TAG,
    )
  })
})

describe('migrateReadmeToToc', () => {
  it('outputs folder + nested notes for heading sections', () => {
    const content = `${TOC_REGION}

## 1. One
- [x] [0001. Alpha](https://github.com/a/b)
- [ ] [0002. Beta](https://github.com/a/b)
`
    const { entries } = migrateReadmeToToc(content)
    expect(entries).toEqual([
      { kind: 'folder', folderTitle: '1. One', indent: 0 },
      { kind: 'note', noteIndex: '0001', indent: 1, completed: true },
      { kind: 'note', noteIndex: '0002', indent: 1, completed: false },
    ])
  })

  it('handles single note section with folder', () => {
    const content = `${TOC_REGION}

## 7. Solo
- [ ] [0036. Only](https://github.com/a/b)
`
    const { entries } = migrateReadmeToToc(content)
    expect(entries).toEqual([
      { kind: 'folder', folderTitle: '7. Solo', indent: 0 },
      { kind: 'note', noteIndex: '0036', indent: 1, completed: false },
    ])
  })

  it('treats ## and ### as separate groups', () => {
    const content = `${TOC_REGION}

## 1. A
- [x] [0001. Alpha](url)
- [ ] [0002. Beta](url)
### 1.1 B
- [x] [0003. Gamma](url)
- [ ] [0004. Delta](url)
`
    const { entries } = migrateReadmeToToc(content)
    expect(entries).toEqual([
      { kind: 'folder', folderTitle: '1. A', indent: 0 },
      { kind: 'note', noteIndex: '0001', indent: 1, completed: true },
      { kind: 'note', noteIndex: '0002', indent: 1, completed: false },
      { kind: 'folder', folderTitle: '1.1 B', indent: 0 },
      { kind: 'note', noteIndex: '0003', indent: 1, completed: true },
      { kind: 'note', noteIndex: '0004', indent: 1, completed: false },
    ])
  })

  it('deduplicates note indexes with warnings', () => {
    const content = `${TOC_REGION}

## 1. A
- [x] [0001. Alpha](url)
## 2. B
- [ ] [0001. Alpha again](url)
`
    const { entries, warnings } = migrateReadmeToToc(content)
    expect(entries).toHaveLength(2)
    expect(warnings.some((w) => w.includes('0001'))).toBe(true)
  })

  it('skips empty sections', () => {
    const content = `${TOC_REGION}

## Empty

## 2. B
- [x] [0002. Beta](url)
`
    const { entries } = migrateReadmeToToc(content)
    expect(entries).toEqual([
      { kind: 'folder', folderTitle: '2. B', indent: 0 },
      { kind: 'note', noteIndex: '0002', indent: 1, completed: true },
    ])
  })
})
