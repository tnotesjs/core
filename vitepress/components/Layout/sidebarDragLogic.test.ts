import { describe, expect, it } from 'vitest'

import {
  applyMoveInSidebarTree,
  applyMoveInSidebarTreeByTocLine,
  buildSidebarDragPreviewTree,
  depthFromClientX,
  flattenVisibleSidebar,
  getDropProjection,
  getSubtreeDepthSpan,
  isDescendantInTree,
  isInvalidDrop,
  isTailAfterDrop,
  SIDEBAR_ARROW_WIDTH,
  SIDEBAR_ROW_BASE_PADDING,
  toReorderPayload,
  type DragSource,
  type SidebarTreeItem,
} from './sidebarDragLogic'

function note(
  index: string,
  title: string,
  children: SidebarTreeItem[] = [],
  collapsed = false,
  tocLineIndex = 0,
): SidebarTreeItem {
  return {
    text: `${index}. ${title}`,
    link: `/notes/${index}. ${title}/README`,
    items: children.length ? children : undefined,
    collapsed,
    tocLineIndex,
  }
}

function dragNote(index: string, tocLineIndex: number): DragSource {
  return { kind: 'note', noteIndex: index, tocLineIndex }
}

const sampleTree: SidebarTreeItem[] = [
  note('0001', 'A', [
    note('0002', 'A1', [], false, 1),
    note('0003', 'A2', [], false, 2),
  ], false, 0),
  note('0004', 'B', [], false, 3),
]

const config = { maxDepth: 3, indentSize: 24, draggedSubtreeDepthSpan: 0 }
const navLeft = 100

function project(
  dragNoteIndex: string,
  dragTocLineIndex: number,
  overIndex: number,
  verticalPlacement: 'before' | 'after',
  offsetX = 0,
  clientX = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH,
) {
  const flat = flattenVisibleSidebar(sampleTree)
  return getDropProjection(
    sampleTree,
    flat,
    dragNote(dragNoteIndex, dragTocLineIndex),
    overIndex,
    verticalPlacement,
    config,
    { offsetX, clientX, navLeft },
  )
}

describe('sidebarDragLogic', () => {
  it('flattenVisibleSidebar respects collapsed state', () => {
    const tree = [
      note('0001', 'A', [note('0002', 'A1', [], false, 1)], true, 0),
    ]
    const flat = flattenVisibleSidebar(tree)
    expect(flat.map((row) => row.noteIndex)).toEqual(['0001'])
  })

  it('flattenVisibleSidebar expands nested items', () => {
    const flat = flattenVisibleSidebar(sampleTree)
    expect(flat.map((row) => row.noteIndex)).toEqual([
      '0001',
      '0002',
      '0003',
      '0004',
    ])
    expect(flat[2].depth).toBe(1)
  })

  it('flattenVisibleSidebar includes empty pure folder with folderPath', () => {
    const tree: SidebarTreeItem[] = [
      {
        text: '评论功能的技术实现（Giscus）',
        folderPath: ['评论功能的技术实现（Giscus）'],
        items: [],
        collapsed: true,
        tocLineIndex: 20,
      },
    ]
    const flat = flattenVisibleSidebar(tree)
    expect(flat).toHaveLength(1)
    expect(flat[0]).toMatchObject({
      kind: 'folder',
      folderPath: ['评论功能的技术实现（Giscus）'],
      hasChildren: false,
      collapsed: true,
      tocLineIndex: 20,
    })
  })

  it('isDescendantInTree detects child targets', () => {
    expect(isDescendantInTree(sampleTree, '0001', '0002')).toBe(true)
    expect(isDescendantInTree(sampleTree, '0001', '0004')).toBe(false)
  })

  it('isTailAfterDrop detects middle vs tail rows', () => {
    const flat = flattenVisibleSidebar(sampleTree)

    expect(isTailAfterDrop(flat, 1, 'after')).toBe(false)
    expect(isTailAfterDrop(flat, 2, 'after')).toBe(true)
    expect(isTailAfterDrop(flat, 2, 'before')).toBe(false)
    expect(isTailAfterDrop(flat, 3, 'after')).toBe(true)
    expect(isTailAfterDrop(flat, 1, 'after', '0003')).toBe(true)

    const collapsedAdjacent: SidebarTreeItem[] = [
      note('0019', 'Parent', [note('0035', 'C', [], false, 1)], true, 0),
      note('0039', 'Sibling', [], false, 2),
    ]
    const collapsedFlat = flattenVisibleSidebar(collapsedAdjacent)
    expect(isTailAfterDrop(collapsedFlat, 0, 'after', '0039')).toBe(false)
  })

  it('depthFromClientX maps pointer to depth levels', () => {
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    expect(depthFromClientX(base, navLeft, 24, 2)).toBe(0)
    expect(depthFromClientX(base + 24, navLeft, 24, 2)).toBe(1)
    expect(depthFromClientX(base + 48, navLeft, 24, 2)).toBe(2)
  })

  it('getDropProjection supports before/after on same level', () => {
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const before = project('0003', 2, 3, 'before')
    expect(before?.target).toMatchObject({
      targetNoteIndex: '0004',
      placement: 'before',
      projectedDepth: 0,
    })
    expect(before?.indicator.mode).toBe('line')

    const after = project('0003', 2, 1, 'after', 0, base)
    expect(after?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'after',
      projectedDepth: 0,
    })
    expect(after?.indicator.mode).toBe('tail-rail')
  })

  it('getDropProjection reorders middle child via sibling before line', () => {
    const reorder = project('0002', 1, 2, 'before')
    expect(reorder?.target).toMatchObject({
      targetNoteIndex: '0003',
      placement: 'before',
      projectedDepth: 1,
    })
    expect(reorder?.indicator.mode).toBe('line')
  })

  it('getDropProjection outdents last child when tail rail selects parent depth', () => {
    const flat = flattenVisibleSidebar(sampleTree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const leftDrag = getDropProjection(
      sampleTree,
      flat,
      dragNote('0003', 2),
      1,
      'after',
      config,
      {
        offsetX: -48,
        clientX: base,
        navLeft,
      },
    )
    expect(leftDrag?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'after',
      projectedDepth: 0,
    })
    expect(leftDrag?.indicator.mode).toBe('tail-rail')
  })

  it('getDropProjection supports inside when offset to the right on non-tail row', () => {
    const inside = project('0004', 3, 0, 'after', 30)
    expect(inside?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection uses tail-rail on last child after for same-folder reorder', () => {
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const flat = flattenVisibleSidebar(sampleTree)

    const tailSameDepth = getDropProjection(
      sampleTree,
      flat,
      dragNote('0002', 1),
      2,
      'after',
      config,
      { offsetX: 0, clientX: base + 24, navLeft },
    )
    expect(tailSameDepth?.indicator.mode).toBe('tail-rail')
    expect(tailSameDepth?.indicator.depthLevels).toEqual([0, 1])
    expect(tailSameDepth?.target).toMatchObject({
      targetNoteIndex: '0003',
      placement: 'after',
      projectedDepth: 1,
    })

    const tailOutdent = getDropProjection(
      sampleTree,
      flat,
      dragNote('0004', 3),
      2,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(tailOutdent?.indicator.mode).toBe('tail-rail')
    expect(tailOutdent?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'after',
      projectedDepth: 0,
    })
  })

  it('getDropProjection routes external drag into parent via tail or right offset', () => {
    const folderTree: SidebarTreeItem[] = [
      note('0001', 'Parent', [
        note('0002', 'C1', [], false, 1),
        note('0003', 'C2', [], false, 2),
      ], false, 0),
      note('0004', 'External', [], false, 3),
    ]
    const flat = flattenVisibleSidebar(folderTree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const external = dragNote('0004', 3)

    const onParentRow = getDropProjection(
      folderTree,
      flat,
      external,
      0,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(onParentRow?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'inside',
      projectedDepth: 1,
    })

    const onParentRowInside = getDropProjection(
      folderTree,
      flat,
      external,
      0,
      'after',
      config,
      { offsetX: 24, clientX: base + 24, navLeft },
    )
    expect(onParentRowInside?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'inside',
      projectedDepth: 1,
    })

    const onLastChildTail = getDropProjection(
      folderTree,
      flat,
      external,
      2,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(onLastChildTail?.target).toMatchObject({
      targetNoteIndex: '0001',
      placement: 'after',
      projectedDepth: 0,
    })

    const onLastChildTailAppend = getDropProjection(
      folderTree,
      flat,
      external,
      2,
      'after',
      config,
      { offsetX: 0, clientX: base + 24, navLeft },
    )
    expect(onLastChildTailAppend?.target).toMatchObject({
      targetNoteIndex: '0003',
      placement: 'after',
      projectedDepth: 1,
    })

    const reorderWithinFolder = getDropProjection(
      folderTree,
      flat,
      dragNote('0002', 1),
      2,
      'after',
      config,
      { offsetX: 0, clientX: base + 24, navLeft },
    )
    expect(reorderWithinFolder?.target).toMatchObject({
      targetNoteIndex: '0003',
      placement: 'after',
      projectedDepth: 1,
    })
  })

  it('getDropProjection lets external note drop as sibling below expanded parent', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [
        note('0036', 'Workflow', [], false, 1),
        note('0035', 'Norm', [], false, 2),
      ], false, 0),
      note('0039', 'External', [], false, 3),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const parentIndex = flat.findIndex((row) => row.noteIndex === '0019')
    const lastChildIndex = flat.findIndex((row) => row.noteIndex === '0035')
    const external = dragNote('0039', 3)

    const belowParentRow = getDropProjection(
      tree,
      flat,
      external,
      parentIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(belowParentRow?.target).toMatchObject({
      targetNoteIndex: '0019',
      placement: 'inside',
      projectedDepth: 1,
    })

    const belowParentTail = getDropProjection(
      tree,
      flat,
      external,
      lastChildIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(belowParentTail?.target).toMatchObject({
      targetNoteIndex: '0019',
      placement: 'after',
      projectedDepth: 0,
    })

    const appendToFolderEnd = getDropProjection(
      tree,
      flat,
      external,
      lastChildIndex,
      'after',
      config,
      { offsetX: 0, clientX: base + 24, navLeft },
    )
    expect(appendToFolderEnd?.target).toMatchObject({
      targetNoteIndex: '0035',
      placement: 'after',
      projectedDepth: 1,
    })
  })

  it('getDropProjection drops non-adjacent sibling into collapsed folder on parent row', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [note('0035', 'Norm', [], false, 1)], true, 0),
      note('0004', 'Other', [], false, 2),
      note('0039', 'new', [], false, 3),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const parentIndex = flat.findIndex((row) => row.noteIndex === '0019')

    expect(flat.map((row) => row.noteIndex)).toEqual(['0019', '0004', '0039'])

    const inside = getDropProjection(
      tree,
      flat,
      dragNote('0039', 3),
      parentIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetNoteIndex: '0019',
      placement: 'inside',
      projectedDepth: 1,
    })
  })

  it('flattenVisibleSidebar force-collapses dragged subtree during preview', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [note('0035', 'Norm', [], false, 1)], false, 0),
    ]
    const flat = flattenVisibleSidebar(tree, 0, null, null, {
      forceCollapsedTocLineIndex: 0,
    })
    expect(flat.map((row) => row.noteIndex)).toEqual(['0019'])
  })

  it('buildSidebarDragPreviewTree keeps source slot in place', () => {
    const tree: SidebarTreeItem[] = [
      note('0034', 'A', [], false, 0),
      note('0035', 'B', [], false, 1),
    ]

    const preview = buildSidebarDragPreviewTree(tree, dragNote('0034', 0), null)

    expect(extractIndexes(preview)).toEqual(['0034', '0035'])
    expect(preview[0].isDragSourceSlot).toBe(true)
    expect(preview[1].isDragSourceSlot).toBeFalsy()
  })

  it('buildSidebarDragPreviewTree prepends inside folder when intent is prependChild', () => {
    const tree: SidebarTreeItem[] = [
      {
        text: 'Group',
        folderPath: ['Group'],
        nodeId: 'folder:Group',
        tocLineIndex: 0,
        collapsed: false,
        items: [
          note('0037', 'A', [], false, 1),
          note('0027', 'B', [], false, 2),
        ],
      },
    ]

    const preview = buildSidebarDragPreviewTree(tree, dragNote('0027', 2), {
      action: 'prependChild',
      targetNodeId: 'folder:Group',
      sourceNodeId: 'note:0027',
      indicator: { mode: 'inside', depthLevels: [0], activeDepth: 0 },
      linePlacement: 'before',
      hoverRowIndex: 1,
    })

    expect(preview[0].items?.[0].isDragPlaceholder).toBe(true)
    expect(preview[0].items?.[1].link).toContain('0037')
    expect(preview[0].items?.some((item) => item.link?.includes('0027'))).toBe(
      false,
    )
  })

  it('buildSidebarDragPreviewTree prepends placeholder at root when intent is root prepend', () => {
    const tree: SidebarTreeItem[] = [
      note('0034', 'A', [], false, 0),
      note('0035', 'B', [], false, 1),
      note('0036', 'C', [], false, 2),
    ]

    const preview = buildSidebarDragPreviewTree(tree, dragNote('0036', 2), {
      action: 'prependChild',
      targetNodeId: null,
      sourceNodeId: 'note:0036',
      isRootPrepend: true,
      indicator: { mode: 'root-prepend', depthLevels: [0], activeDepth: 0 },
      linePlacement: 'before',
      hoverRowIndex: 0,
    })

    expect(extractIndexes(preview)).toEqual(['0034', '0035'])
    expect(preview[0].isDragPlaceholder).toBe(true)
  })

  it('buildSidebarDragPreviewTree reorders siblings when intent is moveAfter', () => {
    const tree: SidebarTreeItem[] = [
      note('0034', 'A', [], false, 0),
      note('0035', 'B', [], false, 1),
      note('0036', 'C', [], false, 2),
    ]

    const preview = buildSidebarDragPreviewTree(tree, dragNote('0034', 0), {
      action: 'moveAfter',
      targetNodeId: 'note:0035',
      sourceNodeId: 'note:0034',
      indicator: { mode: 'line', depthLevels: [0], activeDepth: 0 },
      linePlacement: 'after',
      hoverRowIndex: 1,
    })

    expect(extractIndexes(preview)).toEqual(['0035', '0036'])
    expect(preview.some((item) => item.isDragPlaceholder)).toBe(true)
  })

  it('buildSidebarDragPreviewTree keeps source slot when intent is noop', () => {
    const tree: SidebarTreeItem[] = [
      note('0034', 'A', [], false, 0),
      note('0035', 'B', [], false, 1),
    ]

    const preview = buildSidebarDragPreviewTree(tree, dragNote('0034', 0), {
      action: 'moveAfter',
      targetNodeId: 'note:0034',
      sourceNodeId: 'note:0034',
      indicator: { mode: 'line', depthLevels: [0], activeDepth: 0 },
      linePlacement: 'after',
      hoverRowIndex: 0,
    })
    expect(preview[0].isDragSourceSlot).toBe(true)
  })

  it('applyMoveInSidebarTreeByTocLine reorders siblings during drag preview', () => {
    const tree: SidebarTreeItem[] = [
      note('0034', 'A', [], false, 0),
      note('0035', 'B', [], false, 1),
    ]

    const moved = applyMoveInSidebarTreeByTocLine(
      tree,
      dragNote('0034', 0),
      {
        targetNoteIndex: '0035',
        targetTocLineIndex: 1,
        placement: 'before',
        projectedDepth: 0,
      },
    )

    expect(extractIndexes(moved)).toEqual(['0034', '0035'])
  })

  it('applyMoveInSidebarTreeByTocLine moves note inside collapsed parent as first child', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [note('0035', 'Norm', [], false, 1)], true, 0),
      note('0039', 'new', [], false, 2),
    ]

    const moved = applyMoveInSidebarTreeByTocLine(
      tree,
      dragNote('0039', 2),
      {
        targetNoteIndex: '0019',
        targetTocLineIndex: 0,
        placement: 'inside',
        projectedDepth: 1,
      },
    )

    expect(extractIndexes(moved)).toEqual(['0019', '0039', '0035'])
    expect(moved[0].collapsed).toBe(false)
  })

  it('getDropProjection drops adjacent sibling into collapsed folder on parent row', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [note('0035', 'Norm', [], false, 1)], true, 0),
      note('0039', 'new', [], false, 2),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const parentIndex = flat.findIndex((row) => row.noteIndex === '0019')

    expect(flat.map((row) => row.noteIndex)).toEqual(['0019', '0039'])

    const inside = getDropProjection(
      tree,
      flat,
      dragNote('0039', 2),
      parentIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetNoteIndex: '0019',
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection appends external note to folder end after last child', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [
        note('0036', 'Workflow', [], false, 1),
        note('0035', 'Norm', [], false, 2),
      ], false, 0),
      note('0039', 'new', [], false, 3),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const lastChildIndex = flat.findIndex((row) => row.noteIndex === '0035')

    const append = getDropProjection(
      tree,
      flat,
      dragNote('0039', 3),
      lastChildIndex,
      'after',
      config,
      { offsetX: 0, clientX: base + 24, navLeft },
    )
    expect(append?.indicator.mode).toBe('tail-rail')
    expect(append?.target).toMatchObject({
      targetNoteIndex: '0035',
      placement: 'after',
      projectedDepth: 1,
    })
  })

  it('getDropProjection outdents last child via previous sibling tail at parent depth', () => {
    const tree: SidebarTreeItem[] = [
      note('0019', 'Author', [
        note('0035', 'Norm', [], false, 1),
        note('0039', 'new', [], false, 2),
      ], false, 0),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const prevSiblingIndex = flat.findIndex((row) => row.noteIndex === '0035')
    const dragging = dragNote('0039', 2)

    const outdent = getDropProjection(
      tree,
      flat,
      dragging,
      prevSiblingIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(outdent?.indicator.mode).toBe('tail-rail')
    expect(outdent?.target).toMatchObject({
      targetNoteIndex: '0019',
      placement: 'after',
      projectedDepth: 0,
    })

    const reorder = getDropProjection(
      tree,
      flat,
      dragging,
      prevSiblingIndex,
      'after',
      config,
      { offsetX: 0, clientX: base + 24, navLeft },
    )
    expect(reorder?.target).toMatchObject({
      targetNoteIndex: '0035',
      placement: 'after',
      projectedDepth: 1,
    })
  })

  it('getDropProjection drops adjacent sibling into collapsed pure folder', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex?: number,
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
      folder('Author', [note('0035', 'Norm', [], false, 13)], true, 12),
      note('0039', 'new', [], false, 14),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const folderIndex = flat.findIndex((row) => row.kind === 'folder')

    expect(flat.map((row) => row.noteIndex)).toEqual([null, '0039'])
    expect(flat[0].tocLineIndex).toBe(12)

    const inside = getDropProjection(
      tree,
      flat,
      dragNote('0039', 14),
      folderIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetFolderPath: ['Author'],
      targetTocLineIndex: 12,
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection drops external note into collapsed folder on upper half', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex?: number,
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
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const folderIndex = flat.findIndex((row) => row.kind === 'folder')

    const inside = getDropProjection(
      tree,
      flat,
      dragNote('0039', 45),
      folderIndex,
      'before',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetFolderPath: ['TNotes 笔记书写规范'],
      targetTocLineIndex: 41,
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection keeps internal child reorder on expanded folder upper half', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex?: number,
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
        'Spec',
        [note('0038', 'A', [], false, 42), note('0037', 'B', [], false, 43)],
        false,
        41,
      ),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const folderIndex = flat.findIndex((row) => row.kind === 'folder')

    const before = getDropProjection(
      tree,
      flat,
      dragNote('0037', 43),
      folderIndex,
      'before',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(before?.target).toMatchObject({
      targetFolderPath: ['Spec'],
      placement: 'before',
    })
    expect(before?.indicator.mode).toBe('line')
  })

  it('getDropProjection drops folder into external leaf note row', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex?: number,
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
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const noteIndex = flat.findIndex((row) => row.noteIndex === '0039')

    const inside = getDropProjection(
      tree,
      flat,
      { kind: 'folder', tocLineIndex: 41 },
      noteIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetNoteIndex: '0039',
      targetTocLineIndex: 45,
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection drops folder into note row when offsetX is in title area', () => {
    function folder(
      title: string,
      children: SidebarTreeItem[] = [],
      collapsed = false,
      tocLineIndex?: number,
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
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const noteIndex = flat.findIndex((row) => row.noteIndex === '0039')

    const inside = getDropProjection(
      tree,
      flat,
      { kind: 'folder', tocLineIndex: 41 },
      noteIndex,
      'after',
      config,
      { offsetX: 40, clientX: base + 40, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetNoteIndex: '0039',
      targetTocLineIndex: 45,
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection drops note into external note row when offsetX is in title area', () => {
    const tree: SidebarTreeItem[] = [
      note('0027', 'emoji', [], false, 44),
      note('0039', 'new', [], false, 45),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const targetIndex = flat.findIndex((row) => row.noteIndex === '0027')

    const inside = getDropProjection(
      tree,
      flat,
      dragNote('0039', 45),
      targetIndex,
      'after',
      config,
      { offsetX: 40, clientX: base + 40, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetNoteIndex: '0027',
      targetTocLineIndex: 44,
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('getDropProjection keeps sibling before when dragging onto next row with before placement', () => {
    const tree: SidebarTreeItem[] = [
      note('0023', 'git log', [], false, 43),
      note('0027', 'emoji', [], false, 44),
    ]
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const targetIndex = flat.findIndex((row) => row.noteIndex === '0027')

    const before = getDropProjection(
      tree,
      flat,
      dragNote('0023', 43),
      targetIndex,
      'before',
      config,
      { offsetX: 40, clientX: base + 40, navLeft },
    )
    expect(before?.target).toMatchObject({
      targetNoteIndex: '0027',
      targetTocLineIndex: 44,
      placement: 'before',
      projectedDepth: 0,
    })
  })

  it('getDropProjection drops external note into empty collapsed folder', () => {
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
    const flat = flattenVisibleSidebar(tree)
    const base = navLeft + SIDEBAR_ROW_BASE_PADDING + SIDEBAR_ARROW_WIDTH
    const folderIndex = flat.findIndex((row) => row.kind === 'folder')

    const inside = getDropProjection(
      tree,
      flat,
      dragNote('0039', 45),
      folderIndex,
      'after',
      config,
      { offsetX: 0, clientX: base, navLeft },
    )
    expect(inside?.target).toMatchObject({
      targetFolderPath: ['评论功能的技术实现（Giscus）'],
      targetTocLineIndex: 20,
      placement: 'inside',
      projectedDepth: 1,
    })
    expect(inside?.indicator.mode).toBe('inside')
  })

  it('toReorderPayload prefers targetTocLineIndex for folder inside drops', () => {
    expect(
      toReorderPayload(dragNote('0039', 14), {
        targetFolderPath: ['Author'],
        targetTocLineIndex: 12,
        placement: 'inside',
        projectedDepth: 1,
      }),
    ).toEqual({
      dragType: 'note',
      dragTocLineIndex: 14,
      noteIndex: '0039',
      targetType: 'group',
      targetTocLineIndex: 12,
      targetFolderPath: ['Author'],
      placement: 'inside',
    })
  })

  it('toReorderPayload emits folder dragType for pure folder source', () => {
    expect(
      toReorderPayload(
        { kind: 'folder', tocLineIndex: 12 },
        {
          targetNoteIndex: '0039',
          targetTocLineIndex: 14,
          placement: 'after',
          projectedDepth: 0,
        },
      ),
    ).toEqual({
      dragType: 'folder',
      dragTocLineIndex: 12,
      targetType: 'note',
      targetTocLineIndex: 14,
      targetNoteIndex: '0039',
      placement: 'after',
    })
  })

  it('getDropProjection rejects dropping into own subtree', () => {
    const invalid = project('0001', 0, 1, 'after', 0, navLeft)
    expect(invalid).toBeNull()
  })

  it('isInvalidDrop enforces max depth for dragged subtree', () => {
    const flat = flattenVisibleSidebar(sampleTree)
    const parent = findNote(sampleTree, '0001')!
    const span = getSubtreeDepthSpan(parent)
    expect(span).toBe(1)

    expect(
      isInvalidDrop(
        sampleTree,
        flat,
        dragNote('0001', 0),
        { targetNoteIndex: '0004', placement: 'inside', projectedDepth: 2 },
        { maxDepth: 3, indentSize: 24, draggedSubtreeDepthSpan: span },
      ),
    ).toBe(true)
  })

  it('isInvalidDrop uses deepest indent for inside drops with nested folder subtree', () => {
    const flat = flattenVisibleSidebar(sampleTree)
    const target = {
      targetNoteIndex: '0039',
      placement: 'inside' as const,
      projectedDepth: 1,
    }

    expect(
      isInvalidDrop(
        sampleTree,
        flat,
        { kind: 'folder', tocLineIndex: 41 },
        target,
        { maxDepth: 4, indentSize: 24, draggedSubtreeDepthSpan: 2 },
      ),
    ).toBe(false)

    expect(
      isInvalidDrop(
        sampleTree,
        flat,
        { kind: 'folder', tocLineIndex: 41 },
        target,
        { maxDepth: 3, indentSize: 24, draggedSubtreeDepthSpan: 2 },
      ),
    ).toBe(true)
  })

  it('applyMoveInSidebarTree moves note after sibling', () => {
    const moved = applyMoveInSidebarTree(sampleTree, '0004', {
      targetNoteIndex: '0001',
      placement: 'after',
      projectedDepth: 0,
    })

    expect(extractIndexes(moved)).toEqual(['0001', '0002', '0003', '0004'])
  })

  it('applyMoveInSidebarTree moves external note inside parent as first child', () => {
    const folderTree: SidebarTreeItem[] = [
      note('0001', 'Parent', [
        note('0002', 'C1', [], false, 1),
        note('0003', 'C2', [], false, 2),
      ], false, 0),
      note('0004', 'External', [], false, 3),
    ]

    const moved = applyMoveInSidebarTree(folderTree, '0004', {
      targetNoteIndex: '0001',
      placement: 'inside',
      projectedDepth: 1,
    })

    expect(extractIndexes(moved)).toEqual(['0001', '0004', '0002', '0003'])
  })

  it('applyMoveInSidebarTree moves note inside parent', () => {
    const moved = applyMoveInSidebarTree(sampleTree, '0004', {
      targetNoteIndex: '0001',
      placement: 'inside',
      projectedDepth: 1,
    })

    expect(extractIndexes(moved)).toEqual(['0001', '0004', '0002', '0003'])
    expect(moved[0].items?.[0]?.link).toBe('/notes/0004. B/README')
  })
})

function findNote(
  items: SidebarTreeItem[],
  noteIndex: string,
): SidebarTreeItem | null {
  for (const item of items) {
    const match = item.link?.match(/\/notes\/(\d{4})\./)
    if (match?.[1] === noteIndex) return item
    if (item.items?.length) {
      const found = findNote(item.items, noteIndex)
      if (found) return found
    }
  }
  return null
}

function extractIndexes(items: SidebarTreeItem[]): string[] {
  const result: string[] = []
  const walk = (nodes: SidebarTreeItem[]) => {
    for (const node of nodes) {
      const match = node.link?.match(/\/notes\/(\d{4})\./)
      if (match) result.push(match[1])
      if (node.items?.length) walk(node.items)
    }
  }
  walk(items)
  return result
}
