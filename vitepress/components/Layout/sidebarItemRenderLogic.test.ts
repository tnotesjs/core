import { describe, expect, it } from 'vitest'

import {
  getSidebarItemRenderMode,
  type SidebarRenderItem,
} from './sidebarItemRenderLogic'

/** introduction：TNotes 笔记书写规范 → 0027 → Giscus folder */
const giscusFolderAtDepth2: SidebarRenderItem = {
  text: '评论功能的技术实现（Giscus）',
  items: [
    {
      text: '⏰ 评论功能的技术实现（Giscus）',
      link: '/notes/0003. 评论功能的技术实现（Giscus）/README',
    },
  ],
}

describe('sidebarItemRenderLogic', () => {
  it('renders pure folder at depth 2 when maxDepth is 3 (0027 child)', () => {
    expect(getSidebarItemRenderMode(giscusFolderAtDepth2, 2, 3)).toBe(
      'pure-folder',
    )
  })

  it('legacy cutoff depth < maxDepth - 1 would hide depth-2 folders', () => {
    const legacyAllowsGroup = 2 < 3 - 1
    expect(legacyAllowsGroup).toBe(false)
  })

  it('parent note at depth 1 still renders as group', () => {
    const emojiNote: SidebarRenderItem = {
      text: '✅ emoji 规范',
      link: '/notes/0027. emoji 规范/README',
      items: [giscusFolderAtDepth2],
    }
    expect(getSidebarItemRenderMode(emojiNote, 1, 3)).toBe('parent-note')
  })

  it('leaf note at depth 3 renders when maxDepth is 3', () => {
    const leaf: SidebarRenderItem = {
      text: '⏰ 0003',
      link: '/notes/0003. x/README',
    }
    expect(getSidebarItemRenderMode(leaf, 3, 3)).toBe('leaf')
  })

  it('renders depth-2 pure folder when maxDepth is 0 (unlimited)', () => {
    expect(getSidebarItemRenderMode(giscusFolderAtDepth2, 2, 0)).toBe(
      'pure-folder',
    )
  })
})
