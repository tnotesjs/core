import { describe, expect, it } from 'vitest'

import {
  buildSidebarTree,
  collectParentKeys,
  formatTreeNodeName,
} from './sidebarTreeHelpers'

const sampleSidebar = [
  {
    text: '✅ 0001. Root note',
    link: '/notes/0001/README',
    items: [
      {
        text: '⏰ 0002. Child note',
        link: '/notes/0002/README',
      },
    ],
  },
]

const mixedNestingSidebar = [
  {
    text: 'TNotes 简介',
    items: [
      {
        text: '✅ 0001. TNotes 简介',
        link: '/notes/0001. TNotes 简介/README',
      },
    ],
  },
  {
    text: '✅ 0019. 关于作者 Tdahuyou',
    link: '/notes/0019. 关于作者 Tdahuyou/README',
    items: [{ text: '⏰ 0039. new', link: '/notes/0039. new/README' }],
  },
  { text: '⏰ 0039. new', link: '/notes/0039. new/README' },
]

/** introduction TOC 片段：note → folder → note 混嵌 */
const noteFolderNoteSidebar = [
  {
    text: 'TNotes 笔记书写规范',
    items: [
      {
        text: '✅ emoji 规范',
        link: '/notes/0027. emoji 规范/README',
        items: [
          {
            text: '评论功能的技术实现（Giscus）',
            items: [
              {
                text: '⏰ 评论功能的技术实现（Giscus）',
                link: '/notes/0003. 评论功能的技术实现（Giscus）/README',
              },
            ],
          },
        ],
      },
    ],
  },
]

describe('sidebarTreeHelpers', () => {
  it('buildSidebarTree includes parent when children are filtered out', () => {
    const tree = buildSidebarTree(sampleSidebar, {
      showDone: true,
      showPending: false,
      base: '/repo',
    })

    expect(tree).toHaveLength(1)
    expect(tree[0].text).toBe('Root note')
    expect(tree[0].children).toHaveLength(0)
    expect(tree[0].fullLink).toBe('/repo/notes/0001/README')
  })

  it('buildSidebarTree includes pending children when enabled', () => {
    const tree = buildSidebarTree(sampleSidebar, {
      showDone: true,
      showPending: true,
      base: '/repo',
    })

    expect(tree[0].children).toHaveLength(1)
  })

  it('formatTreeNodeName includes status emoji', () => {
    const tree = buildSidebarTree(sampleSidebar, {
      includeAll: true,
      base: '/repo',
    })

    expect(formatTreeNodeName(tree[0])).toBe('✅ Root note')
  })

  it('collectParentKeys returns keys for branch nodes', () => {
    const tree = buildSidebarTree(sampleSidebar, {
      includeAll: true,
      base: '/repo',
    })

    expect(collectParentKeys(tree)).toEqual(['/notes/0001/README'])
  })

  it('buildSidebarTree keeps pure folders but fullLink is null (FolderTreeItems must handle)', () => {
    const tree = buildSidebarTree(mixedNestingSidebar, {
      showDone: true,
      showPending: true,
      base: '/',
    })

    expect(tree).toHaveLength(3)
    const pureFolder = tree[0]
    expect(pureFolder.text).toBe('TNotes 简介')
    expect(pureFolder.fullLink).toBeNull()
    expect(pureFolder.children).toHaveLength(1)
    expect(tree[1].text).toBe('关于作者 Tdahuyou')
    expect(tree[1].fullLink).toBeTruthy()
  })

  it('buildSidebarTree preserves note → folder → note nesting (introduction 0027)', () => {
    const tree = buildSidebarTree(noteFolderNoteSidebar, {
      showDone: true,
      showPending: true,
      base: '/',
    })

    expect(tree).toHaveLength(1)
    expect(tree[0].text).toBe('TNotes 笔记书写规范')
    expect(tree[0].fullLink).toBeNull()

    const emojiNote = tree[0].children[0]
    expect(emojiNote.text).toBe('emoji 规范')
    expect(emojiNote.fullLink).toBeTruthy()

    const giscusFolder = emojiNote.children[0]
    expect(giscusFolder.text).toBe('评论功能的技术实现（Giscus）')
    expect(giscusFolder.fullLink).toBeNull()
    expect(giscusFolder.children).toHaveLength(1)
  })
})
