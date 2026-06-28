import { describe, expect, it, vi } from 'vitest'

import {
  applySidebarCollapsedState,
  buildPostDropCollapsePatch,
  collapseKeyForLine,
  collapseKeyForNote,
  collectSidebarCollapsedState,
  mergeCollapseStore,
  normalizeCollapseStore,
  shouldSuppressActiveItemScroll,
  suppressActiveItemScroll,
} from './sidebarCollapsedState'

describe('sidebarCollapsedState', () => {
  const tree = [
    {
      link: '/notes/0037. Writing/README',
      collapsed: false,
      tocLineIndex: 10,
      items: [
        {
          link: '/notes/0038. Mode/README',
          collapsed: true,
          items: [],
        },
      ],
    },
    {
      link: '/notes/0019. Author/README',
      collapsed: true,
      tocLineIndex: 20,
      items: [
        {
          link: '/notes/0036. Workflow/README',
          collapsed: true,
          items: [],
        },
      ],
    },
    {
      text: 'Giscus',
      collapsed: false,
      tocLineIndex: 34,
      items: [
        {
          link: '/notes/0003. Giscus/README',
          collapsed: true,
          items: [],
        },
      ],
    },
  ]

  it('collectSidebarCollapsedState records note and line keys', () => {
    expect(collectSidebarCollapsedState(tree)).toEqual({
      [collapseKeyForNote('0037')]: false,
      [collapseKeyForNote('0019')]: true,
      [collapseKeyForLine(34)]: false,
    })
  })

  it('applySidebarCollapsedState restores cached expansion', () => {
    const restored = applySidebarCollapsedState(
      tree.map((item) => ({ ...item, collapsed: true })),
      { [collapseKeyForNote('0037')]: false },
    )

    expect(restored[0].collapsed).toBe(false)
    expect(restored[1].collapsed).toBe(true)
    expect(restored[2].collapsed).toBe(true)
  })

  it('applySidebarCollapsedState restores pure folder by line key', () => {
    const restored = applySidebarCollapsedState(
      [{ ...tree[2], collapsed: true }],
      { [collapseKeyForLine(34)]: false },
    )
    expect(restored[0].collapsed).toBe(false)
  })

  it('normalizeCollapseStore migrates v1 note keys', () => {
    expect(normalizeCollapseStore({ '0019': false, '0037': true })).toEqual({
      [collapseKeyForNote('0019')]: false,
      [collapseKeyForNote('0037')]: true,
    })
  })

  it('normalizeCollapseStore reads v2 entries', () => {
    expect(
      normalizeCollapseStore({
        v: 2,
        entries: { [collapseKeyForLine(34)]: false },
      }),
    ).toEqual({
      [collapseKeyForLine(34)]: false,
    })
  })

  it('mergeCollapseStore applies patch', () => {
    expect(
      mergeCollapseStore(
        { [collapseKeyForNote('0019')]: true },
        { [collapseKeyForNote('0019')]: false },
      ),
    ).toEqual({ [collapseKeyForNote('0019')]: false })
  })

  it('buildPostDropCollapsePatch returns empty for moveAfter', () => {
    expect(
      buildPostDropCollapsePatch(
        { action: 'moveAfter', target_uuid: 'note:0039' },
        { sourceCollapseKey: null, wasExpanded: false },
      ),
    ).toEqual({})
  })

  it('buildPostDropCollapsePatch expands prependChild target folder', () => {
    expect(
      buildPostDropCollapsePatch(
        { action: 'prependChild', target_uuid: 'line:41' },
        { sourceCollapseKey: null, wasExpanded: false },
      ),
    ).toEqual({ [collapseKeyForLine(41)]: false })
  })

  it('buildPostDropCollapsePatch expands prependChild target note', () => {
    expect(
      buildPostDropCollapsePatch(
        { action: 'prependChild', target_uuid: 'note:0019' },
        { sourceCollapseKey: null, wasExpanded: false },
      ),
    ).toEqual({ [collapseKeyForNote('0019')]: false })
  })

  it('buildPostDropCollapsePatch expands folder target via targetCollapseKey', () => {
    expect(
      buildPostDropCollapsePatch(
        {
          action: 'prependChild',
          target_uuid: 'folder:TNotes 笔记书写规范',
        },
        {
          sourceCollapseKey: null,
          wasExpanded: false,
          targetCollapseKey: collapseKeyForLine(41),
        },
      ),
    ).toEqual({ [collapseKeyForLine(41)]: false })
  })

  it('buildPostDropCollapsePatch preserves expanded source folder', () => {
    expect(
      buildPostDropCollapsePatch(
        { action: 'moveAfter', target_uuid: 'note:0039' },
        {
          sourceCollapseKey: collapseKeyForNote('0019'),
          wasExpanded: true,
        },
      ),
    ).toEqual({ [collapseKeyForNote('0019')]: false })
  })

  it('shouldSuppressActiveItemScroll respects TTL', () => {
    const key = 'test-suppress-active-scroll'
    const storage = new Map<string, string>()

    const sessionStorage = {
      getItem: (name: string) => storage.get(name) ?? null,
      setItem: (name: string, value: string) => {
        storage.set(name, value)
      },
    }

    vi.stubGlobal('window', { sessionStorage })

    suppressActiveItemScroll(key, 2000, 1000)
    expect(shouldSuppressActiveItemScroll(key, 1500)).toBe(true)
    expect(shouldSuppressActiveItemScroll(key, 3500)).toBe(false)

    vi.unstubAllGlobals()
  })
})
