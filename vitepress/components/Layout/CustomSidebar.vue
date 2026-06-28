<!-- 
vitepress/components/Layout/CustomSidebar.vue 
-->

<template>
  <div class="custom-sidebar-wrapper">
    <nav class="nav sidebar-nav" ref="navRef">
      <a
        :href="readmeLink"
        class="nav-item readme-nav-item"
        :class="{ active: isReadmeActive }"
      >
        README
      </a>

      <!-- 使用递归组件渲染侧边栏，支持任意层级嵌套 -->
      <SidebarItems
        :items="displaySidebarGroups"
        :depth="0"
        :max-depth="maxDepth"
        :show-note-id="showNoteId"
        :base="base"
        :current-path="route.path"
        :is-dev="isDev"
        :done-prefix="donePrefix"
        :undone-prefix="undonePrefix"
        :drag-context="sidebarDrag"
        @create-note-in-group="createNoteInGroup"
        @create-notes-in-group="createNotesInGroup"
        @create-folder-in-group="createFolderInGroup"
        @rename-folder="renameFolder"
        @delete-entry="deleteEntry"
        @rename-note="renameNote"
        @delete-note="deleteNote"
        @create-note-around="createNoteAround"
        @open-note-about="openNoteAbout"
      />

      <div
        v-if="dropSlot.visible"
        class="sidebar-drop-slot"
        :style="{
          top: `${dropSlot.top}px`,
          left: `${dropSlot.left}px`,
          width: `${dropSlot.width}px`,
          height: `${dropSlot.height}px`,
        }"
      />

      <div
        v-if="dropIndicator.visible"
        class="sidebar-drop-layer"
        :style="{ top: `${dropIndicator.top}px` }"
      >
        <template v-if="dropIndicator.mode === 'tail-rail'">
          <div
            v-for="depth in dropIndicator.depthLevels"
            :key="depth"
            class="sidebar-drop-rail-segment"
            :class="{ 'is-active': depth === dropIndicator.activeDepth }"
            :style="{
              left: `${getDropRailLeft(depth)}px`,
              width: `${getDropRailWidth(depth)}px`,
            }"
          />
        </template>
        <div
          v-else
          class="sidebar-drop-indicator"
          :class="{ 'is-inside': dropIndicator.mode === 'inside' }"
          :style="{
            left: `${dropIndicator.left}px`,
            width: `${dropIndicator.width}px`,
            height:
              dropIndicator.mode === 'inside'
                ? `${getDropInsideHeight()}px`
                : undefined,
          }"
        />
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useData } from 'vitepress'
import { ref, onMounted, watch, computed } from 'vue'

import {
  useSidebarDrag,
  getDropRailLeft as calcDropRailLeft,
  type DragReorderMeta,
  type YuqueReorderPayload,
} from './composables/useSidebarDrag'
import {
  applySidebarCollapsedState,
  saveSidebarCollapsedState,
  loadSidebarCollapsedState,
  mergeCollapseStore,
  saveCollapseEntries,
  buildPostDropCollapsePatch,
  shouldSuppressActiveItemScroll,
  suppressActiveItemScroll,
  getCollapseKeyForTreeItem,
} from './sidebarCollapsedState'
import { SIDEBAR_ROW_HEIGHT } from './sidebarDragLogic'
import SidebarItems from './SidebarItems.vue'
import { enrichSidebarNodeIds, computeSidebarNodeId } from '../../../utils/tocNodeId'
import {
  SIDEBAR_SHOW_NOTE_ID_KEY,
  SIDEBAR_MAX_DEPTH_KEY,
  SIDEBAR_DONE_PREFIX_KEY,
  SIDEBAR_UNDONE_PREFIX_KEY,
  SIDEBAR_COLLAPSED_STATE_KEY,
  SIDEBAR_SUPPRESS_ACTIVE_SCROLL_KEY,
} from '../constants'
// @ts-expect-error - VitePress Data Loader
import { data as sidebarConfig } from '../sidebar.data'
// @ts-expect-error - VitePress Data Loader
import { data as tnotesConfig } from '../tnotes-config.data'

// 支持递归的侧边栏项类型
interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
  tocLineIndex?: number
  folderPath?: string[]
  nodeId?: string
}

const route = useRoute()
const { site } = useData()
const sidebarGroups = ref<SidebarItem[]>([])
const navRef = ref<HTMLElement | null>(null)
const currentFocusIndex = ref(0)

const base = computed(() => site.value.base || '/')
const readmeLink = computed(() => `${base.value}README`)

function normalizeRoutePath(path: string): string {
  const normalizedPath = path.split(/[?#]/)[0].replace(/\.html$/, '')

  return normalizedPath.length > 1
    ? normalizedPath.replace(/\/$/, '')
    : normalizedPath
}

const isReadmeActive = computed(() => {
  const currentPath = normalizeRoutePath(route.path)
  const readmePath = normalizeRoutePath(readmeLink.value)

  return currentPath === readmePath || currentPath === '/README'
})

const emit = defineEmits<{
  'open-note-about': [noteIndex: string]
}>()

interface ParentNoteActionPayload {
  parentNoteIndex?: string
  parentFolderPath?: string[]
  parentTocLineIndex?: number
  text: string
}

interface NoteActionPayload {
  noteIndex: string
  text: string
  link?: string
  placement?: 'before' | 'after'
}

interface SidebarActionResult {
  success: boolean
  message?: string
  redirectUrl?: string
  newUrl?: string
  deletedNoteIndexes?: string[]
}

interface ReorderPayload {
  dragType: 'note' | 'folder'
  dragTocLineIndex?: number
  noteIndex?: string
  targetType: 'group' | 'note'
  targetNoteIndex?: string
  targetFolderPath?: string[]
  targetTocLineIndex?: number
  placement?: 'before' | 'after' | 'inside'
}

interface FolderActionPayload {
  tocLineIndex: number
  text: string
}

interface EntryActionPayload {
  tocLineIndex: number
  text: string
  noteIndex?: string
}

const DEFAULT_DONE_PREFIX = '✅'
const DEFAULT_UNDONE_PREFIX = '⏰'

// 最大解析层级（0 = 不限制）
const maxDepth = computed(() => {
  if (typeof window === 'undefined') {
    return tnotesConfig.sidebarMaxDepth ?? 0
  }

  const savedMaxDepth = localStorage.getItem(SIDEBAR_MAX_DEPTH_KEY)
  if (savedMaxDepth !== null) {
    const parsed = parseInt(savedMaxDepth, 10)
    return parsed > 0 ? parsed : 0
  }

  return tnotesConfig.sidebarMaxDepth ?? 0
})

// 获取配置：是否显示笔记 ID
const showNoteId = computed(() => {
  if (typeof window === 'undefined') {
    return tnotesConfig.sidebarShowNoteId ?? false
  }

  const savedShowNoteId = localStorage.getItem(SIDEBAR_SHOW_NOTE_ID_KEY)
  if (savedShowNoteId !== null) {
    return savedShowNoteId === 'true'
  }

  return tnotesConfig.sidebarShowNoteId ?? false
})

const donePrefix = computed(() => {
  if (typeof window === 'undefined') return DEFAULT_DONE_PREFIX

  const savedPrefix = localStorage.getItem(SIDEBAR_DONE_PREFIX_KEY)
  return savedPrefix !== null ? savedPrefix : DEFAULT_DONE_PREFIX
})

const undonePrefix = computed(() => {
  if (typeof window === 'undefined') return DEFAULT_UNDONE_PREFIX

  const savedPrefix = localStorage.getItem(SIDEBAR_UNDONE_PREFIX_KEY)
  return savedPrefix !== null ? savedPrefix : DEFAULT_UNDONE_PREFIX
})

const isDev = computed(() => {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  )
})

function getDropInsideHeight(): number {
  const nodeId = sidebarDrag.dropIndicator.value.targetNodeId
  if (!nodeId || !navRef.value) return SIDEBAR_ROW_HEIGHT

  const row = navRef.value.querySelector<HTMLElement>(
    `.sidebar-row[data-node-id="${nodeId}"]`,
  )
  return row?.getBoundingClientRect().height ?? SIDEBAR_ROW_HEIGHT
}

function findSidebarItemByNodeId(
  items: SidebarItem[],
  nodeId: string,
): SidebarItem | null {
  for (const item of items) {
    const id = item.nodeId ?? computeSidebarNodeId(item)
    if (id === nodeId) return item
    if (item.items?.length) {
      const found = findSidebarItemByNodeId(item.items, nodeId)
      if (found) return found
    }
  }
  return null
}

function resolveTargetCollapseKey(
  targetNodeId: string | null | undefined,
): string | null {
  if (!targetNodeId) return null
  const item = findSidebarItemByNodeId(sidebarGroups.value, targetNodeId)
  return item ? resolveCollapseKey(item) : null
}

function applyPostDropCollapsePatch(patch: Record<string, boolean>) {
  if (!Object.keys(patch).length) return

  const merged = mergeCollapseStore(
    loadSidebarCollapsedState(SIDEBAR_COLLAPSED_STATE_KEY),
    patch,
  )
  saveCollapseEntries(SIDEBAR_COLLAPSED_STATE_KEY, merged)
}

function reorderSidebarOptimistic(
  payload: YuqueReorderPayload,
  meta: DragReorderMeta,
) {
  if (!payload.node_uuid || !payload.action) return
  const isRootPrepend =
    payload.action === 'prependChild' && !payload.target_uuid
  if (!isRootPrepend && !payload.target_uuid) return

  suppressActiveItemScroll(SIDEBAR_SUPPRESS_ACTIVE_SCROLL_KEY)
  persistSidebarCollapsedState()
  applyPostDropCollapsePatch(
    buildPostDropCollapsePatch(payload, {
      ...meta,
      targetCollapseKey: resolveTargetCollapseKey(
        meta.targetNodeId ?? payload.target_uuid,
      ),
    }),
  )

  void runSidebarAction(async () => {
    await requestSidebarAction('/__tnotes_sidebar_reorder', payload)
  })
}

function resolveCollapseKey(item: SidebarItem): string | null {
  return getCollapseKeyForTreeItem(item)
}

const sidebarDrag = useSidebarDrag({
  items: sidebarGroups,
  navRef,
  maxDepth,
  isDev,
  resolveCollapseKey,
  onReorder: reorderSidebarOptimistic,
})

const displaySidebarGroups = computed(
  () => sidebarDrag.previewItems.value ?? sidebarGroups.value,
)

const dropIndicator = computed(() => sidebarDrag.dropIndicator.value)
const dropSlot = computed(() => sidebarDrag.dropSlot.value)

function getDropRailLeft(depth: number): number {
  const indentSize = dropIndicator.value.indentSize
  return calcDropRailLeft(depth, indentSize)
}

function getDropRailWidth(depth: number): number {
  const nav = navRef.value
  if (!nav) return 24

  if (depth === dropIndicator.value.activeDepth) {
    return Math.max(nav.clientWidth - getDropRailLeft(depth) - 8, 24)
  }

  return 12
}

// 加载 sidebar 数据
function loadSidebar() {
  if (sidebarConfig && sidebarConfig['/notes/']) {
    sidebarGroups.value = processItems(sidebarConfig['/notes/'])
  }
}

function persistSidebarCollapsedState() {
  saveSidebarCollapsedState(SIDEBAR_COLLAPSED_STATE_KEY, sidebarGroups.value)
}

// 递归处理侧边栏项，合并 localStorage 中的展开/折叠状态
function processItems(items: any[]): SidebarItem[] {
  const normalized = items.map((item) => ({
    ...item,
    collapsed: item.collapsed ?? true,
    items: item.items as SidebarItem[] | undefined,
  }))

  return enrichSidebarNodeIds(
    applySidebarCollapsedState(
      normalized,
      loadSidebarCollapsedState(SIDEBAR_COLLAPSED_STATE_KEY),
    ) as SidebarItem[],
  )
}

function stripHeadingNumber(text: string): string {
  return text.replace(/^\d+(?:\.\d+)*\.\s*/, '')
}

function stripNoteTitlePrefix(text: string): string {
  return text
    .replace(/^[✅⏰]\s*/, '')
    .replace(/^\d{4}\.?\s*/, '')
    .trim()
}

function isCurrentNote(noteIndex: string): boolean {
  const decodedRoutePath = decodeURIComponent(route.path)
  return decodedRoutePath.includes(`/notes/${noteIndex}.`)
}

function getCurrentNoteIndex(): string | null {
  const decodedRoutePath = decodeURIComponent(route.path)
  const match = decodedRoutePath.match(/\/notes\/(\d{4})\./)
  return match ? match[1] : null
}

function resolveUrl(path: string): string {
  const normalizedBase = base.value.endsWith('/') ? base.value : `${base.value}/`
  return normalizedBase + path.replace(/^\/+/, '')
}

async function requestSidebarAction(
  path: string,
  body: unknown,
  options?: { skipReload?: boolean },
): Promise<SidebarActionResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const result = (await response.json().catch(() => null)) as
    | SidebarActionResult
    | null

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || response.statusText || '操作失败')
  }

  if (!options?.skipReload) {
    setTimeout(() => {
      loadSidebar()
    }, 150)
  }

  return result
}

async function runSidebarAction(action: () => Promise<void>) {
  if (!isDev.value) return

  try {
    await action()
  } catch (error) {
    alert(error instanceof Error ? error.message : String(error))
  }
}

function createNoteInGroup(payload: ParentNoteActionPayload) {
  void runSidebarAction(async () => {
    await requestSidebarAction('/__tnotes_sidebar_create_note', {
      parentNoteIndex: payload.parentNoteIndex,
      parentFolderPath: payload.parentFolderPath,
      parentTocLineIndex: payload.parentTocLineIndex,
      count: 1,
    })
  })
}

function createNotesInGroup(payload: ParentNoteActionPayload) {
  void runSidebarAction(async () => {
    const input = window.prompt('请输入新增笔记数量（1-100）', '1')
    if (input === null) return

    const count = Number(input)
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      throw new Error('新增多篇笔记的数量必须是 1-100 的整数')
    }

    await requestSidebarAction('/__tnotes_sidebar_create_notes', {
      parentNoteIndex: payload.parentNoteIndex,
      parentFolderPath: payload.parentFolderPath,
      parentTocLineIndex: payload.parentTocLineIndex,
      count,
    })
  })
}

function createFolderInGroup(payload: ParentNoteActionPayload) {
  void runSidebarAction(async () => {
    if (payload.parentTocLineIndex === undefined) {
      throw new Error('无法定位父节点（缺少 tocLineIndex，请刷新侧边栏后重试）')
    }

    const title = window.prompt('请输入子目录名称')
    if (title === null) return

    const trimmed = title.trim()
    if (!trimmed) {
      throw new Error('目录标题不能为空')
    }

    await requestSidebarAction('/__tnotes_sidebar_create_folder', {
      parentTocLineIndex: payload.parentTocLineIndex,
      title: trimmed,
    })
  })
}

function renameNote(payload: NoteActionPayload) {
  void runSidebarAction(async () => {
    if (!payload.noteIndex) return

    const newTitle = window.prompt(
      '请输入新的笔记名称',
      stripNoteTitlePrefix(payload.text),
    )
    if (newTitle === null) return

    const result = await requestSidebarAction('/__tnotes_rename_note', {
      noteIndex: payload.noteIndex,
      newTitle,
    })

    if (result.newUrl && isCurrentNote(payload.noteIndex)) {
      window.location.replace(resolveUrl(result.newUrl))
    }
  })
}

function renameFolder(payload: FolderActionPayload) {
  void runSidebarAction(async () => {
    if (payload.tocLineIndex < 0) return

    const newTitle = window.prompt(
      '请输入新的目录名称',
      stripHeadingNumber(payload.text),
    )
    if (newTitle === null) return

    const trimmed = newTitle.trim()
    if (!trimmed) {
      throw new Error('目录标题不能为空')
    }

    await requestSidebarAction('/__tnotes_sidebar_rename_folder', {
      tocLineIndex: payload.tocLineIndex,
      newTitle: trimmed,
    })
  })
}

function deleteEntry(payload: EntryActionPayload) {
  void runSidebarAction(async () => {
    if (payload.tocLineIndex < 0) return

    const confirmed = window.confirm(
      `确定删除「${stripHeadingNumber(payload.text)}」及其所有子项吗？子树内的笔记将从磁盘删除。`,
    )
    if (!confirmed) return

    const result = await requestSidebarAction('/__tnotes_sidebar_delete_entry', {
      tocLineIndex: payload.tocLineIndex,
      currentNoteIndex: getCurrentNoteIndex() ?? '',
    })

    if (result.redirectUrl) {
      window.location.replace(resolveUrl(result.redirectUrl))
    }
  })
}

function deleteNote(payload: NoteActionPayload) {
  void runSidebarAction(async () => {
    if (!payload.noteIndex) return

    const confirmed = window.confirm(
      `确定删除笔记「${stripHeadingNumber(payload.text)}」吗？`,
    )
    if (!confirmed) return

    const result = await requestSidebarAction('/__tnotes_sidebar_delete_note', {
      noteIndex: payload.noteIndex,
    })

    if (result.redirectUrl && isCurrentNote(payload.noteIndex)) {
      window.location.replace(resolveUrl(result.redirectUrl))
    }
  })
}

function createNoteAround(payload: NoteActionPayload) {
  void runSidebarAction(async () => {
    if (!payload.noteIndex || !payload.placement) return

    await requestSidebarAction('/__tnotes_sidebar_create_note', {
      targetNoteIndex: payload.noteIndex,
      placement: payload.placement,
      count: 1,
    })
  })
}

function openNoteAbout(payload: NoteActionPayload) {
  if (!payload.noteIndex) return
  emit('open-note-about', payload.noteIndex)
}

// 判断项是否有子项
function hasChildren(item: SidebarItem): boolean {
  return !!(item.items && item.items.length > 0)
}

// 获取项的唯一 key
function getItemKey(item: SidebarItem): string {
  return item.link || item.text
}

// 切换项的展开/折叠状态（支持递归）
function toggleItem(item: SidebarItem) {
  item.collapsed = !item.collapsed
}

// 递归查找并切换项
function toggleItemRecursive(items: SidebarItem[], text: string): boolean {
  for (const item of items) {
    if (item.text === text) {
      item.collapsed = !item.collapsed
      return true
    }
    if (item.items && toggleItemRecursive(item.items, text)) {
      return true
    }
  }
  return false
}

// 切换组展开/折叠（保留兼容性）
function toggleGroup(groupText: string) {
  toggleItemRecursive(sidebarGroups.value, groupText)
}

// 递归展开/折叠所有项
function setAllCollapsed(items: SidebarItem[], collapsed: boolean) {
  items.forEach((item) => {
    if (item.items) {
      item.collapsed = collapsed
      setAllCollapsed(item.items, collapsed)
    }
  })
}

// 检查是否有任何一级章节处于展开状态
function hasAnyFirstLevelExpanded(): boolean {
  return sidebarGroups.value.some((group) => !group.collapsed)
}

// 展开全部
function expandAll() {
  setAllCollapsed(sidebarGroups.value, false)
}

// 折叠全部
function collapseAll() {
  setAllCollapsed(sidebarGroups.value, true)
}

// 智能切换：如果有展开的一级章节则折叠全部，否则展开全部
function toggleExpandCollapse() {
  if (hasAnyFirstLevelExpanded()) {
    collapseAll()
  } else {
    expandAll()
  }
}

// 获取当前笔记的所有出现位置
function getCurrentNotePositions(): HTMLElement[] {
  const elements: HTMLElement[] = []

  if (!navRef.value) {
    return elements
  }

  const activeItems = navRef.value.querySelectorAll('.nav-item.active')

  activeItems.forEach((item) => {
    elements.push(item as HTMLElement)
  })

  return elements
}

// 展开指定元素的父级分组
function expandParentGroup(element: HTMLElement) {
  // 查找所有父级 group 元素（从最近的开始）
  let currentElement: HTMLElement | null = element
  const groupsToExpand: string[] = []

  // 向上遍历，收集所有父级 group 的标题文本
  while (currentElement) {
    const groupElement: HTMLElement | null =
      currentElement.closest<HTMLElement>('.group')
    if (!groupElement) break

    const groupTitleText = groupElement.querySelector('.parent-note-link, .group-title-text')
    if (groupTitleText) {
      const groupText = groupTitleText.textContent?.trim()
      if (groupText) {
        groupsToExpand.push(groupText)
      }
    }

    // 继续向上查找
    currentElement =
      groupElement.parentElement?.closest<HTMLElement>('.group') || null
  }

  // 从最外层开始展开，逐层向内
  // 但是搜索时要确保在正确的上下文中搜索
  if (groupsToExpand.length === 0) return

  // 反转数组，从最外层开始处理
  const outerToInner = [...groupsToExpand].reverse()

  // 第一层必须从根开始搜索
  let currentContext: SidebarItem[] | null = null

  for (let i = 0; i < outerToInner.length; i++) {
    const groupText = outerToInner[i]

    if (i === 0) {
      // 第一层从根搜索
      const found = expandGroupRecursive(sidebarGroups.value, groupText)
      if (found) {
        // 找到后，获取这个分组的 items 作为下一层的搜索上下文
        const foundGroup = findGroupByText(sidebarGroups.value, groupText)
        if (foundGroup?.items) {
          currentContext = foundGroup.items
        }
      }
    } else {
      // 后续层从上一层的上下文中搜索
      if (currentContext) {
        const found = expandGroupRecursive(currentContext, groupText)
        if (found) {
          const foundGroup = findGroupByText(currentContext, groupText)
          if (foundGroup?.items) {
            currentContext = foundGroup.items
          }
        }
      }
    }
  }
}

// 查找分组（不展开，只返回引用）
function findGroupByText(
  items: SidebarItem[],
  targetText: string
): SidebarItem | null {
  for (const item of items) {
    if (item.text === targetText) {
      return item
    }
    if (item.items) {
      const found = findGroupByText(item.items, targetText)
      if (found) return found
    }
  }
  return null
}

// 递归查找并展开分组
function expandGroupRecursive(
  items: SidebarItem[],
  targetText: string,
): boolean {
  for (const item of items) {
    if (item.text === targetText) {
      item.collapsed = false
      return true
    }

    if (item.items) {
      const found = expandGroupRecursive(item.items, targetText)
      if (found) {
        // 如果在子项中找到了，也展开当前项
        item.collapsed = false
        return true
      }
    }
  }

  return false
}

// 滚动到指定元素
function scrollToElement(element: HTMLElement) {
  if (!element || !navRef.value) {
    // console.log('❌ [scrollToElement] No element or navRef')
    return
  }

  const navContainer = navRef.value.closest('.VPSidebar')
  if (!navContainer) {
    // console.log('❌ [scrollToElement] No VPSidebar container found')
    return
  }

  // console.log('📍 [scrollToElement] Scrolling to element')

  // 计算元素相对于容器的位置
  const elementRect = element.getBoundingClientRect()
  const containerRect = navContainer.getBoundingClientRect()

  // 计算需要滚动的距离（将元素放在容器中间）
  const scrollTop =
    navContainer.scrollTop +
    elementRect.top -
    containerRect.top -
    containerRect.height / 2 +
    elementRect.height / 2

  navContainer.scrollTo({
    top: scrollTop,
    behavior: 'smooth',
  })

  // 添加临时高亮动画
  element.classList.add('focus-highlight')
  setTimeout(() => {
    element.classList.remove('focus-highlight')
  }, 1000)
}

// 聚焦到当前笔记（支持多个位置切换）
function focusCurrentNote() {
  const positions = getCurrentNotePositions()

  if (positions.length === 0) {
    return
  }

  // 循环切换聚焦位置
  currentFocusIndex.value = (currentFocusIndex.value + 1) % positions.length
  const targetElement = positions[currentFocusIndex.value]

  // 展开该笔记所在的分组
  expandParentGroup(targetElement)

  // 滚动到该笔记
  setTimeout(() => {
    scrollToElement(targetElement)
  }, 100)
}

// 展开当前激活笔记的所有父级分组
function expandActiveItemParents() {
  if (shouldSuppressActiveItemScroll(SIDEBAR_SUPPRESS_ACTIVE_SCROLL_KEY)) {
    return
  }
  expandActiveItemParentsRecursive(sidebarGroups.value)
}

// 递归展开包含激活项的父级
function expandActiveItemParentsRecursive(items: SidebarItem[]): boolean {
  let hasActive = false

  for (const item of items) {
    if (item.link) {
      const fullLink = getFullLink(item.link)
      const decodedRoutePath = decodeURIComponent(route.path)
      const decodedFullLink = decodeURIComponent(fullLink)
      const itemActive =
        decodedRoutePath === decodedFullLink ||
        decodedRoutePath === decodedFullLink + '.html'

      if (itemActive) {
        hasActive = true
      }
    }

    if (item.items?.length) {
      const childHasActive = expandActiveItemParentsRecursive(item.items)
      if (childHasActive) {
        item.collapsed = false
        hasActive = true
      }
    }
  }

  return hasActive
}

// 获取完整链接（包含 base）
function getFullLink(link: string) {
  const cleanLink = link.startsWith('/') ? link.slice(1) : link
  return base.value + cleanLink
}

// 滚动到当前激活的笔记
function scrollToActiveItem() {
  if (shouldSuppressActiveItemScroll(SIDEBAR_SUPPRESS_ACTIVE_SCROLL_KEY)) {
    return
  }

  // 等待 DOM 更新
  setTimeout(() => {
    expandActiveItemParents()

    setTimeout(() => {
      const positions = getCurrentNotePositions()

      if (positions.length > 0) {
        expandParentGroup(positions[0])
        setTimeout(() => {
          scrollToElement(positions[0])
        }, 100)
      }
    }, 100)
  }, 300)
}

// 暴露函数给父组件使用
defineExpose({
  expandAll,
  collapseAll,
  toggleExpandCollapse,
  hasAnyFirstLevelExpanded,
  focusCurrentNote,
})

onMounted(() => {
  loadSidebar()
  scrollToActiveItem()
})

watch(
  sidebarGroups,
  () => persistSidebarCollapsedState(),
  { deep: true, flush: 'post' },
)

// 监听 sidebarConfig 的变化（HMR 会更新这个导入的数据）
watch(
  () => sidebarConfig,
  () => {
    loadSidebar()
  },
  { deep: true }
)

// 监听 tnotesConfig 的变化
watch(
  () => tnotesConfig,
  () => {
    // console.log(
    //   '🔄 [CustomSidebar] TNotes config changed, sidebarShowNoteId:',
    //   tnotesConfig.sidebarShowNoteId
    // )
  },
  { deep: true }
)

// 监听路由变化，自动展开当前激活项所在的组并滚动
watch(
  () => route.path,
  () => {
    // 重置聚焦索引
    currentFocusIndex.value = 0

    // 展开并滚动到当前笔记
    expandActiveItemParents()
    scrollToActiveItem()
  }
)
</script>

<style scoped>
/* 自定义 sidebar 容器，适配 VitePress 的 sidebar-nav-before 插槽 */
.custom-sidebar-wrapper {
  width: 100%;
  min-width: 0;
}

.nav {
  position: relative;
  font-size: 14px;
  line-height: 2;
}

.sidebar-nav {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
}

.sidebar-drop-slot {
  position: absolute;
  z-index: 45;
  box-sizing: border-box;
  background: transparent;
  border: 1px dashed var(--vp-c-brand-1);
  border-radius: 6px;
  opacity: 0.65;
  pointer-events: none;
}

.sidebar-drop-layer {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 50;
  height: 0;
  pointer-events: none;
}

.sidebar-drop-rail-segment {
  position: absolute;
  top: -2px;
  height: 3px;
  background: var(--vp-c-text-2);
  border-radius: 999px;
  opacity: 0.65;
}

.sidebar-drop-rail-segment.is-active {
  top: -2px;
  height: 4px;
  background: var(--vp-c-brand-1);
  opacity: 1;
  box-shadow:
    0 0 0 1px var(--vp-c-brand-soft),
    0 0 10px color-mix(in srgb, var(--vp-c-brand-1) 70%, transparent);
}

.sidebar-drop-rail-segment.is-active::before {
  position: absolute;
  top: -4px;
  left: -1px;
  width: 0;
  height: 0;
  border-top: 4px solid transparent;
  border-bottom: 4px solid transparent;
  border-left: 6px solid var(--vp-c-brand-1);
  content: '';
}

.sidebar-drop-indicator {
  position: absolute;
  top: -1px;
  z-index: 50;
  height: 3px;
  background: var(--vp-c-brand-1);
  border-radius: 999px;
  box-shadow:
    0 0 0 1px var(--vp-c-brand-soft),
    0 0 8px color-mix(in srgb, var(--vp-c-brand-1) 65%, transparent);
  pointer-events: none;
}

.sidebar-drop-indicator.is-inside {
  height: auto;
  min-height: 28px;
  background: var(--vp-c-brand-soft);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
}

.group {
  margin-bottom: 16px;
  width: 100%;
  min-width: 0;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 6px 0;
  font-weight: 600;
  color: var(--vp-c-text-1);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: color 0.25s;
}

.group-title:hover {
  color: var(--vp-c-brand-1);
}

.arrow {
  font-size: 10px;
  transform: rotate(90deg);
  transition: transform 0.25s;
}

.arrow.collapsed {
  transform: rotate(0deg);
}

.nav-item {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 36px;
  padding: 6px 8px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-radius: 8px;
  font-size: 14px;
  line-height: 22px;
  transition: all 0.25s;
}

.nav-item:hover {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-default-soft);
}

.nav-item.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.readme-nav-item {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

/* 聚焦高亮动画 */
.nav-item.focus-highlight {
  animation: focusPulse 1s ease-in-out;
}

@keyframes focusPulse {
  0%,
  100% {
    background-color: transparent;
  }
  50% {
    background-color: var(--vp-c-brand-soft);
  }
}
</style>

<!-- 全局样式：侧边栏拖拽与默认导航隐藏 -->
<style>
/* 隐藏 VitePress 默认 sidebar 分组（自定义目录在 sidebar-nav-after 插槽） */
#VPSidebarNav > .group {
  display: none !important;
}

body.sidebar-drag-active {
  cursor: grabbing;
  user-select: none;
}

body.sidebar-drag-active .sidebar-row {
  cursor: grabbing;
}

.sidebar-drag-ghost {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 8px;
  opacity: 0.92;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 6px;
  box-shadow: var(--vp-shadow-3);
  pointer-events: none;
}

.sidebar-drag-ghost .ghost-title-text {
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
