/**
 * vitepress/components/Layout/sidebarHitTest.test.ts
 */

import { describe, expect, it } from 'vitest'

import {
  buildFlatForHitTest,
  createHitTestState,
  dropIntentFingerprint,
  resolveDropIntent,
  type RowMetric,
} from './sidebarHitTest'

import type { SidebarTreeItem } from './sidebarDragLogic'

function note(
  index: string,
  title: string,
  children: SidebarTreeItem[] = [],
  collapsed = false,
  tocLineIndex = 0,
): SidebarTreeItem {
  const nodeId = `note:${index}`
  return {
    text: `${index}. ${title}`,
    link: `/notes/${index}. ${title}/README`,
    nodeId,
    items: children.length ? children : undefined,
    collapsed,
    tocLineIndex,
  }
}

function mockRect(top: number, height = 32): DOMRect {
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 200,
    width: 200,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect
}

describe('sidebarHitTest', () => {
  it('resolves moveAfter when hovering lower half of sibling', () => {
    const tree: SidebarTreeItem[] = [
      note('0034', 'A', [], false, 0),
      note('0035', 'B', [], false, 1),
    ]
    const flat = buildFlatForHitTest(tree, 0)
    const rowMetrics: RowMetric[] = [
      { nodeId: 'note:0034', tocLineIndex: 0, rect: mockRect(100) },
      { nodeId: 'note:0035', tocLineIndex: 1, rect: mockRect(132) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 0, noteIndex: '0034' },
        sourceNodeId: 'note:0034',
        clientX: 120,
        clientY: 150,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('moveAfter')
    expect(intent?.targetNodeId).toBe('note:0035')
  })

  it('resolves root prependChild when hovering upper half of first root row', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = true,
      tocLineIndex = 0,
    ): SidebarTreeItem {
      return {
        text: title,
        folderPath: [title],
        nodeId: `folder:${title}`,
        tocLineIndex,
        items: children.length ? children : undefined,
        collapsed,
      }
    }

    const tree: SidebarTreeItem[] = [
      folder('TNotes.introduction', [note('0015', 'Intro', [], false, 1)], true, 0),
      folder('TNotes 组件', [note('0006', 'Comp', [], false, 3)], true, 2),
      note('0039', 'new', [], false, 4),
    ]
    const flat = buildFlatForHitTest(tree, 4)
    const rowMetrics: RowMetric[] = [
      {
        nodeId: 'folder:TNotes.introduction',
        tocLineIndex: 0,
        rect: mockRect(100),
      },
      { nodeId: 'folder:TNotes 组件', tocLineIndex: 2, rect: mockRect(132) },
      { nodeId: 'note:0039', tocLineIndex: 4, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 4, noteIndex: '0039' },
        sourceNodeId: 'note:0039',
        clientX: 120,
        clientY: 108,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.isRootPrepend).toBe(true)
    expect(intent?.targetNodeId).toBeNull()
    expect(intent?.indicator.mode).toBe('root-prepend')
  })

  it('uses line after folder when hovering upper half of next sibling', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = true,
      tocLineIndex = 0,
    ): SidebarTreeItem {
      return {
        text: title,
        folderPath: [title],
        nodeId: `folder:${title}`,
        tocLineIndex,
        items: children.length ? children : undefined,
        collapsed,
      }
    }

    const tree: SidebarTreeItem[] = [
      folder('TNotes 组件', [note('0006', 'Comp', [], false, 1)], true, 0),
      folder('TNotes 笔记书写规范', [], true, 2),
      note('0039', 'new', [], false, 3),
    ]
    const flat = buildFlatForHitTest(tree, 3)
    const rowMetrics: RowMetric[] = [
      { nodeId: 'folder:TNotes 组件', tocLineIndex: 0, rect: mockRect(100) },
      {
        nodeId: 'folder:TNotes 笔记书写规范',
        tocLineIndex: 2,
        rect: mockRect(132),
      },
      { nodeId: 'note:0039', tocLineIndex: 3, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 3, noteIndex: '0039' },
        sourceNodeId: 'note:0039',
        clientX: 120,
        clientY: 140,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('moveAfter')
    expect(intent?.targetNodeId).toBe('folder:TNotes 组件')
    expect(intent?.linePlacement).toBe('after')
  })

  it('resolves prependChild when hovering collapsed folder row without visible children', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = true,
      tocLineIndex = 0,
    ): SidebarTreeItem {
      return {
        text: title,
        folderPath: [title],
        tocLineIndex,
        items: children.length ? children : undefined,
        collapsed,
      }
    }

    const tree: SidebarTreeItem[] = [
      folder(
        'TNotes 笔记书写规范',
        [note('0027', 'emoji', [], false, 42), note('0037', 'Writing', [], false, 43)],
        true,
        41,
      ),
      note('0039', 'new', [], false, 45),
    ]
    const flat = buildFlatForHitTest(tree, 45)
    const rowMetrics: RowMetric[] = [
      {
        nodeId: 'line:41',
        tocLineIndex: 41,
        rect: mockRect(132),
      },
      { nodeId: 'note:0039', tocLineIndex: 45, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 45, noteIndex: '0039' },
        sourceNodeId: 'note:0039',
        clientX: 120,
        clientY: 148,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('line:41')
    expect(intent?.indicator.mode).toBe('inside')
  })

  it('resolves prependChild when folder hovers external note row body', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = true,
      tocLineIndex = 0,
    ): SidebarTreeItem {
      return {
        text: title,
        folderPath: [title],
        tocLineIndex,
        items: children.length ? children : undefined,
        collapsed,
      }
    }

    const tree: SidebarTreeItem[] = [
      folder(
        'TNotes 笔记书写规范',
        [note('0027', 'emoji', [], false, 42)],
        true,
        41,
      ),
      note('0039', 'new', [], false, 45),
    ]
    const flat = buildFlatForHitTest(tree, 45)
    const rowMetrics: RowMetric[] = [
      {
        nodeId: 'line:41',
        tocLineIndex: 41,
        rect: mockRect(132),
      },
      { nodeId: 'note:0039', tocLineIndex: 45, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'folder', tocLineIndex: 41 },
        sourceNodeId: 'line:41',
        clientX: 150,
        clientY: 180,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('note:0039')
    expect(intent?.indicator.mode).toBe('inside')
  })

  it('resolves prependChild when note hovers external note row body', () => {
    const tree: SidebarTreeItem[] = [
      note('0027', 'emoji', [], false, 44),
      note('0039', 'new', [], false, 45),
    ]
    const flat = buildFlatForHitTest(tree, 45)
    const rowMetrics: RowMetric[] = [
      { nodeId: 'note:0027', tocLineIndex: 44, rect: mockRect(132) },
      { nodeId: 'note:0039', tocLineIndex: 45, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 45, noteIndex: '0039' },
        sourceNodeId: 'note:0039',
        clientX: 150,
        clientY: 148,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('note:0027')
    expect(intent?.indicator.mode).toBe('inside')
  })

  it('resolves prependChild when note above hovers upper half of next note row', () => {
    const tree: SidebarTreeItem[] = [
      note('0023', 'git log', [], false, 43),
      note('0027', 'emoji', [], false, 44),
    ]
    const flat = buildFlatForHitTest(tree, 43)
    const rowMetrics: RowMetric[] = [
      { nodeId: 'note:0023', tocLineIndex: 43, rect: mockRect(132) },
      { nodeId: 'note:0027', tocLineIndex: 44, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 43, noteIndex: '0023' },
        sourceNodeId: 'note:0023',
        clientX: 150,
        clientY: 172,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('note:0027')
    expect(intent?.indicator.mode).toBe('inside')
  })

  it('resolves prependChild when hovering empty collapsed folder row', () => {
    const tree: SidebarTreeItem[] = [
      {
        text: '评论功能的技术实现（Giscus）',
        folderPath: ['评论功能的技术实现（Giscus）'],
        items: [],
        collapsed: true,
        tocLineIndex: 20,
      },
      note('0039', 'new', [], false, 45),
    ]
    const flat = buildFlatForHitTest(tree, 45)
    const rowMetrics: RowMetric[] = [
      {
        nodeId: 'line:20',
        tocLineIndex: 20,
        rect: mockRect(132),
      },
      { nodeId: 'note:0039', tocLineIndex: 45, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 45, noteIndex: '0039' },
        sourceNodeId: 'note:0039',
        clientX: 120,
        clientY: 148,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('line:20')
    expect(intent?.indicator.mode).toBe('inside')
  })

  it('resolves prependChild to parent when hovering upper half of first nested child', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex = 0,
    ): SidebarTreeItem {
      return {
        text: title,
        folderPath: [title],
        nodeId: `folder:${title}`,
        tocLineIndex,
        items: children.length ? children : undefined,
        collapsed,
      }
    }

    const tree: SidebarTreeItem[] = [
      folder(
        'TNotes 笔记书写规范',
        [
          note('0037', '规范', [], false, 1),
          note('0038', '问题驱动', [], false, 2),
          note('0027', 'emoji', [], false, 3),
        ],
        false,
        0,
      ),
    ]
    const flat = buildFlatForHitTest(tree, 3)
    const rowMetrics: RowMetric[] = [
      {
        nodeId: 'folder:TNotes 笔记书写规范',
        tocLineIndex: 0,
        rect: mockRect(100),
      },
      { nodeId: 'note:0037', tocLineIndex: 1, rect: mockRect(132) },
      { nodeId: 'note:0038', tocLineIndex: 2, rect: mockRect(164) },
      { nodeId: 'note:0027', tocLineIndex: 3, rect: mockRect(196) },
    ]
    const state = createHitTestState()

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 3, noteIndex: '0027' },
        sourceNodeId: 'note:0027',
        clientX: 140,
        clientY: 140,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('folder:TNotes 笔记书写规范')
    expect(intent?.isRootPrepend).toBeFalsy()
    expect(intent?.indicator.mode).toBe('inside')
  })

  it('keeps prependChild to parent in sticky zone on lower part of first child row', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex = 0,
    ): SidebarTreeItem {
      return {
        text: title,
        folderPath: [title],
        nodeId: `folder:${title}`,
        tocLineIndex,
        items: children.length ? children : undefined,
        collapsed,
      }
    }

    const tree: SidebarTreeItem[] = [
      folder(
        'Group',
        [note('0037', 'A', [], false, 1), note('0027', 'B', [], false, 2)],
        false,
        0,
      ),
    ]
    const flat = buildFlatForHitTest(tree, 2)
    const rowMetrics: RowMetric[] = [
      { nodeId: 'folder:Group', tocLineIndex: 0, rect: mockRect(100) },
      { nodeId: 'note:0037', tocLineIndex: 1, rect: mockRect(132) },
      { nodeId: 'note:0027', tocLineIndex: 2, rect: mockRect(164) },
    ]
    const state = createHitTestState()

    resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 2, noteIndex: '0027' },
        sourceNodeId: 'note:0027',
        clientX: 140,
        clientY: 140,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    const intent = resolveDropIntent(
      {
        tree,
        flat,
        dragSource: { kind: 'note', tocLineIndex: 2, noteIndex: '0027' },
        sourceNodeId: 'note:0027',
        clientX: 140,
        clientY: 158,
        navLeft: 0,
        navTop: 0,
        navWidth: 240,
        rowMetrics,
        maxDepth: 0,
      },
      state,
    )

    expect(intent?.action).toBe('prependChild')
    expect(intent?.targetNodeId).toBe('folder:Group')
  })

  it('fingerprints stable intents', () => {
    const fp = dropIntentFingerprint({
      action: 'prependChild',
      targetNodeId: 'note:0019',
      sourceNodeId: 'note:0039',
      indicator: { mode: 'inside', depthLevels: [0, 1], activeDepth: 1 },
      linePlacement: 'after',
      hoverRowIndex: 0,
    })
    expect(fp).toContain('prependChild')
    expect(fp).toContain('note:0019')
  })
})
