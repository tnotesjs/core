/**
 * vitepress/components/Layout/composables/useSidebarDrag.ts
 *
 * 语雀式侧边栏拖拽 v3：overlay 指示、仅 drop 写后端。
 */

import {
  computed,
  inject,
  onBeforeUnmount,
  provide,
  ref,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue'

import { computeSidebarNodeId } from '../../../../utils/tocNodeId'
import {
  buildSidebarDragPreviewTree,
  extractNoteIndexFromLink,
  findTreeItem,
  getDepthContentLeft,
  SIDEBAR_INDENT_SIZE,
  isDropIntentNoOp,
  type SidebarTreeItem,
  type YuqueReorderPayload,
} from '../sidebarDragLogic'
import {
  buildFlatForHitTest,
  collectRowMetrics,
  createHitTestState,
  dropIntentFingerprint,
  resolveDropIntent,
  type DropIntent,
  type HitTestState,
} from '../sidebarHitTest'

export interface DropIndicatorState {
  visible: boolean
  top: number
  left: number
  width: number
  mode: 'line' | 'inside' | 'tail-rail' | 'root-prepend'
  targetNodeId: string | null
  depthLevels: number[]
  activeDepth: number
  indentSize: number
}

export interface DropSlotState {
  visible: boolean
  top: number
  left: number
  width: number
  height: number
}

export interface DragReorderMeta {
  sourceCollapseKey: string | null
  wasExpanded: boolean
  targetNodeId: string | null
  action: 'moveAfter' | 'prependChild' | null
}

export interface SidebarDragContext {
  isDragging: ComputedRef<boolean>
  draggingNodeId: Ref<string | null>
  previewItems: Ref<SidebarTreeItem[] | null>
  dropIndicator: Ref<DropIndicatorState>
  dropSlot: Ref<DropSlotState>
  startDrag: (
    noteIndex: string,
    tocLineIndex: number,
    rowEl: HTMLElement,
    event: PointerEvent,
  ) => void
  startFolderDrag: (
    tocLineIndex: number,
    rowEl: HTMLElement,
    event: PointerEvent,
  ) => void
}

export const SIDEBAR_DRAG_KEY: InjectionKey<SidebarDragContext> =
  Symbol('sidebar-drag')

interface UseSidebarDragOptions {
  items: Ref<SidebarTreeItem[]>
  navRef: Ref<HTMLElement | null>
  maxDepth: ComputedRef<number>
  isDev: ComputedRef<boolean>
  resolveCollapseKey: (item: SidebarTreeItem) => string | null
  onReorder: (payload: YuqueReorderPayload, meta: DragReorderMeta) => void
}

function emptyDropIndicator(): DropIndicatorState {
  return {
    visible: false,
    top: 0,
    left: 0,
    width: 0,
    mode: 'line',
    targetNodeId: null,
    depthLevels: [],
    activeDepth: 0,
    indentSize: SIDEBAR_INDENT_SIZE,
  }
}

function emptyDropSlot(): DropSlotState {
  return {
    visible: false,
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  }
}

function cloneSidebarTree(items: SidebarTreeItem[]): SidebarTreeItem[] {
  return JSON.parse(JSON.stringify(items)) as SidebarTreeItem[]
}

function createCollapsedGhost(rowEl: HTMLElement, rect: DOMRect): HTMLElement {
  const ghost = document.createElement('div')
  ghost.className = rowEl.className
  ghost.classList.add('sidebar-drag-ghost', 'sidebar-row')

  const titleEl =
    rowEl.querySelector('.group-title-text') ??
    rowEl.querySelector('.row-main') ??
    rowEl.querySelector('.nav-item')

  const title = document.createElement('span')
  title.className = 'ghost-title-text'
  title.textContent = titleEl?.textContent?.trim() ?? ''
  ghost.appendChild(title)

  ghost.style.pointerEvents = 'none'
  ghost.style.width = `${rect.width}px`
  return ghost
}

export function useSidebarDrag(options: UseSidebarDragOptions) {
  const draggingNodeId = ref<string | null>(null)
  const activeIntent = ref<DropIntent | null>(null)
  const previewItems = ref<SidebarTreeItem[] | null>(null)
  const dropIndicator = ref<DropIndicatorState>(emptyDropIndicator())
  const dropSlot = ref<DropSlotState>(emptyDropSlot())

  let ghostEl: HTMLElement | null = null
  let pointerOffsetX = 0
  let pointerOffsetY = 0
  let activePointerId: number | null = null
  let dragSourceRow: HTMLElement | null = null
  let baseSnapshot: SidebarTreeItem[] | null = null
  let hitState: HitTestState = createHitTestState()
  let dragSource: {
    kind: 'note' | 'folder'
    tocLineIndex: number
    noteIndex?: string
    nodeId: string
  } | null = null
  let dragReorderMeta: DragReorderMeta = {
    sourceCollapseKey: null,
    wasExpanded: false,
    targetNodeId: null,
    action: null,
  }
  let pendingDropIntent: DropIntent | null = null

  const isDragging = computed(() => dragSource !== null)

  function findTreeItemByTocLineIndex(
    items: SidebarTreeItem[],
    tocLineIndex: number,
  ): SidebarTreeItem | null {
    for (const node of items) {
      if (node.tocLineIndex === tocLineIndex) return node
      if (node.items?.length) {
        const found = findTreeItemByTocLineIndex(node.items, tocLineIndex)
        if (found) return found
      }
    }
    return null
  }

  function cleanupDrag() {
    draggingNodeId.value = null
    dragSource = null
    activeIntent.value = null
    pendingDropIntent = null
    previewItems.value = null
    baseSnapshot = null
    hitState = createHitTestState()
    dropIndicator.value = emptyDropIndicator()
    dropSlot.value = emptyDropSlot()

    if (ghostEl) {
      ghostEl.remove()
      ghostEl = null
    }

    if (
      dragSourceRow &&
      activePointerId !== null &&
      dragSourceRow.hasPointerCapture(activePointerId)
    ) {
      dragSourceRow.releasePointerCapture(activePointerId)
    }
    dragSourceRow = null
    activePointerId = null

    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    document.body.classList.remove('sidebar-drag-active')
  }

  function findRowElementByNodeId(nodeId: string): HTMLElement | null {
    const nav = options.navRef.value
    if (!nav) return null
    return nav.querySelector<HTMLElement>(`.sidebar-row[data-node-id="${nodeId}"]`)
  }

  function updateOverlays(intent: DropIntent | null) {
    const nav = options.navRef.value
    if (!nav || !intent || intent.isRootPrepend) {
      dropIndicator.value = emptyDropIndicator()
      dropSlot.value = emptyDropSlot()
      return
    }

    const indentSize = SIDEBAR_INDENT_SIZE
    const navRect = nav.getBoundingClientRect()
    const targetRow =
      intent.targetNodeId !== null
        ? findRowElementByNodeId(intent.targetNodeId)
        : null
    const hoverMetric = collectRowMetrics(nav).find(
      (m) => m.tocLineIndex !== null && dragSource && m.tocLineIndex !== dragSource.tocLineIndex,
    )

    let rowRect: DOMRect | null = targetRow?.getBoundingClientRect() ?? null
    if (!rowRect && intent.hoverRowIndex >= 0) {
      const metrics = collectRowMetrics(nav)
      rowRect = metrics[intent.hoverRowIndex]?.rect ?? null
    }

    const left = getDepthContentLeft(intent.indicator.activeDepth, indentSize)

    if (intent.indicator.mode === 'inside') {
      const insideRow =
        findRowElementByNodeId(intent.targetNodeId) ??
        (hoverMetric ? findRowElementByNodeId(hoverMetric.nodeId) : null)
      const insideRect = insideRow?.getBoundingClientRect()
      dropSlot.value = emptyDropSlot()
      dropIndicator.value = {
        visible: true,
        top: insideRect ? insideRect.top - navRect.top : 0,
        left,
        width: Math.max(navRect.width - left - 8, 24),
        mode: 'inside',
        targetNodeId: intent.targetNodeId,
        depthLevels: intent.indicator.depthLevels,
        activeDepth: intent.indicator.activeDepth,
        indentSize,
      }
      return
    }

    if (rowRect) {
      const height = Math.max(rowRect.height, 28)
      const lineAfterTarget = intent.action === 'moveAfter'
      const slotTop = lineAfterTarget
        ? rowRect.bottom - navRect.top - height
        : rowRect.top - navRect.top

      dropSlot.value = {
        visible: intent.action === 'moveAfter',
        top: slotTop,
        left,
        width: Math.max(navRect.width - left - 8, 24),
        height,
      }

      const lineTop = lineAfterTarget
        ? rowRect.bottom - navRect.top - 1
        : rowRect.top - navRect.top - 1

      dropIndicator.value = {
        visible: true,
        top: lineTop,
        left,
        width: Math.max(navRect.width - left - 8, 24),
        mode: intent.indicator.mode,
        targetNodeId: intent.targetNodeId,
        depthLevels: intent.indicator.depthLevels,
        activeDepth: intent.indicator.activeDepth,
        indentSize,
      }
    }
  }

  function resolveIntentAtPoint(clientX: number, clientY: number): DropIntent | null {
    if (!dragSource || !baseSnapshot || !options.navRef.value) return null

    const nav = options.navRef.value
    const navRect = nav.getBoundingClientRect()
    const flat = buildFlatForHitTest(baseSnapshot, dragSource.tocLineIndex)
    const rowMetrics = collectRowMetrics(nav)

    return resolveDropIntent(
      {
        tree: baseSnapshot,
        flat,
        dragSource,
        sourceNodeId: dragSource.nodeId,
        clientX,
        clientY,
        navLeft: navRect.left,
        navTop: navRect.top,
        navWidth: navRect.width,
        rowMetrics,
        maxDepth: options.maxDepth.value,
      },
      hitState,
    )
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragSource || !baseSnapshot || !options.navRef.value) return

    if (ghostEl) {
      ghostEl.style.left = `${event.clientX - pointerOffsetX}px`
      ghostEl.style.top = `${event.clientY - pointerOffsetY}px`
    }

    const intent = resolveIntentAtPoint(event.clientX, event.clientY)

    const fingerprint = intent ? dropIntentFingerprint(intent) : null
    if (fingerprint !== hitState.lastIntentFingerprint) {
      hitState.lastIntentFingerprint = fingerprint
      activeIntent.value = intent
      previewItems.value = buildSidebarDragPreviewTree(
        baseSnapshot,
        dragSource,
        intent,
      )
      updateOverlays(intent)
    }

    if (
      intent &&
      !isDropIntentNoOp(baseSnapshot, dragSource.tocLineIndex, intent)
    ) {
      pendingDropIntent = intent
    }
  }

  function onPointerUp(event: PointerEvent) {
    const meta = { ...dragReorderMeta }
    const source = dragSource
    const snapshot = baseSnapshot
    const savedActiveIntent = activeIntent.value
    const savedPendingIntent = pendingDropIntent

    const intentAtRelease = resolveIntentAtPoint(event.clientX, event.clientY)
    const intent =
      intentAtRelease ??
      savedPendingIntent ??
      savedActiveIntent

    const isNoOp =
      !!intent &&
      !!snapshot &&
      !!source &&
      isDropIntentNoOp(snapshot, source.tocLineIndex, intent)

    cleanupDrag()

    if (!intent || !source || !snapshot || !options.isDev.value) return
    if (isNoOp) return

    const payload: YuqueReorderPayload = {
      node_uuid: source.nodeId,
      action: intent.action,
    }
    if (intent.targetNodeId) {
      payload.target_uuid = intent.targetNodeId
    }
    if (intent.isRootPrepend && snapshot?.[0]?.tocLineIndex !== undefined) {
      payload.dragTocLineIndex = source.tocLineIndex
      payload.placement = 'before'
      payload.targetTocLineIndex = snapshot[0].tocLineIndex
    }

    options.onReorder(payload, {
      ...meta,
      targetNodeId: intent.targetNodeId,
      action: intent.action,
    })
  }

  function startDragEntry(
    source: {
      kind: 'note' | 'folder'
      tocLineIndex: number
      noteIndex?: string
    },
    rowEl: HTMLElement,
    event: PointerEvent,
  ) {
    if (!options.isDev.value) return

    event.preventDefault()
    event.stopPropagation()

    const sourceItem =
      source.noteIndex !== undefined
        ? findTreeItem(options.items.value, source.noteIndex)
        : findTreeItemByTocLineIndex(options.items.value, source.tocLineIndex)

    const nodeId = sourceItem
      ? (sourceItem.nodeId ?? computeSidebarNodeId(sourceItem))
      : `line:${source.tocLineIndex}`

    dragReorderMeta = {
      sourceCollapseKey: sourceItem
        ? options.resolveCollapseKey(sourceItem)
        : null,
      wasExpanded: sourceItem ? !sourceItem.collapsed : false,
      targetNodeId: null,
      action: null,
    }

    baseSnapshot = cloneSidebarTree(options.items.value)
    dragSource = { ...source, nodeId }
    draggingNodeId.value = nodeId
    previewItems.value = buildSidebarDragPreviewTree(
      baseSnapshot,
      dragSource,
      null,
    )

    dragSourceRow = rowEl
    activePointerId = event.pointerId
    rowEl.setPointerCapture(event.pointerId)
    document.body.classList.add('sidebar-drag-active')

    const rect = rowEl.getBoundingClientRect()
    pointerOffsetX = event.clientX - rect.left
    pointerOffsetY = event.clientY - rect.top

    ghostEl = createCollapsedGhost(rowEl, rect)
    ghostEl.style.left = `${rect.left}px`
    ghostEl.style.top = `${rect.top}px`
    document.body.appendChild(ghostEl)

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  function startDrag(
    noteIndex: string,
    tocLineIndex: number,
    rowEl: HTMLElement,
    event: PointerEvent,
  ) {
    startDragEntry({ kind: 'note', tocLineIndex, noteIndex }, rowEl, event)
  }

  function startFolderDrag(
    tocLineIndex: number,
    rowEl: HTMLElement,
    event: PointerEvent,
  ) {
    startDragEntry({ kind: 'folder', tocLineIndex }, rowEl, event)
  }

  onBeforeUnmount(() => {
    cleanupDrag()
  })

  const context: SidebarDragContext = {
    isDragging,
    draggingNodeId,
    previewItems,
    dropIndicator,
    dropSlot,
    startDrag,
    startFolderDrag,
  }

  provide(SIDEBAR_DRAG_KEY, context)

  return context
}

export function useSidebarDragContext(): SidebarDragContext | null {
  return inject(SIDEBAR_DRAG_KEY, null)
}

export function getDropRailLeft(depth: number, indentSize: number): number {
  return getDepthContentLeft(depth, indentSize)
}

export type { YuqueReorderPayload }

export function extractNoteIdFromLink(link?: string): string | null {
  return extractNoteIndexFromLink(link)
}
