<!-- 
vitepress/components/Layout/SidebarItems.vue 
-->

<template>
  <template v-for="item in items" :key="getItemKey(item)">
    <div
      v-if="item.isDragPlaceholder"
      class="sidebar-row is-drag-placeholder"
      :style="getNodeStyle(depth)"
      aria-hidden="true"
    />

    <!-- 纯目录行（无 link） -->
    <div
      v-else-if="isPureFolder(item)"
      class="group"
      :class="[{ 'is-drag-source-slot': item.isDragSourceSlot }]"
    >
      <div
        class="sidebar-row group-row folder-row"
        :class="[{ 'is-drag-source-slot': item.isDragSourceSlot }]"
        :style="getNodeStyle(depth)"
        :data-folder-path="serializeFolderPath(item)"
        :data-toc-line-index="item.tocLineIndex"
        :data-node-id="getNodeId(item)"
        @pointerdown="onFolderRowPointerDown($event, item)"
      >
        <button
          v-if="hasChildren(item)"
          class="group-arrow-btn"
          type="button"
          :title="item.collapsed ? '展开' : '折叠'"
          @click.stop="toggleItem(item)"
        >
          <span class="arrow" :class="{ collapsed: item.collapsed }">
            <img
              :src="
                item.collapsed ? icon__sidebar_collapsed : icon__sidebar_opened
              "
              alt=""
            />
          </span>
        </button>
        <span v-else class="group-arrow-spacer" aria-hidden="true" />

        <button
          type="button"
          class="group-title row-main"
          @click.stop="onGroupTitleClick(item)"
        >
          <span class="group-title-text">{{ item.text }}</span>
        </button>

        <div
          v-if="isDev"
          class="row-actions"
          :class="{ 'menu-open': isGroupMenuOpen(item) || isFolderMenuOpen(item) }"
          @click.stop
        >
          <button
            class="action-btn menu-trigger"
            title="更多操作"
            type="button"
            @click="toggleMenu(getFolderMenuKey(item, 'more'))"
          >
            <span class="ellipsis">...</span>
          </button>

          <div
            v-if="isMenuOpen(getFolderMenuKey(item, 'more'))"
            class="action-menu"
          >
            <button
              class="menu-item"
              type="button"
              @click="renameFolder(item)"
            >
              重命名
            </button>
            <button
              class="menu-item danger"
              type="button"
              @click="deleteFolder(item)"
            >
              删除分组
            </button>
          </div>

          <button
            class="action-btn menu-trigger add-trigger"
            title="新增子笔记"
            type="button"
            @click="toggleMenu(getGroupMenuKey(item, 'add'))"
          >
            +
          </button>

          <div
            v-if="isMenuOpen(getGroupMenuKey(item, 'add'))"
            class="action-menu"
          >
            <button
              class="menu-item"
              type="button"
              @click="createNoteInGroup(item)"
            >
              新增笔记
            </button>
            <button
              class="menu-item"
              type="button"
              @click="createNotesInGroup(item)"
            >
              新增多篇笔记
            </button>
            <button
              class="menu-item"
              type="button"
              @click="createFolderInGroup(item)"
            >
              新建子目录
            </button>
          </div>
        </div>
      </div>

      <div v-show="!item.collapsed" class="group-items">
        <SidebarItems
          :items="getChildItems(item)"
          :depth="depth + 1"
          :max-depth="maxDepth"
          :show-note-id="showNoteId"
          :base="base"
          :current-path="currentPath"
          :item-depth="depth + 1"
          :group-path="getFolderPath(item)"
          :is-dev="isDev"
          :done-prefix="donePrefix"
          :undone-prefix="undonePrefix"
          :drag-context="getSidebarDrag()"
          @create-note-in-group="$emit('create-note-in-group', $event)"
          @create-notes-in-group="$emit('create-notes-in-group', $event)"
          @create-folder-in-group="$emit('create-folder-in-group', $event)"
          @rename-folder="$emit('rename-folder', $event)"
          @delete-entry="$emit('delete-entry', $event)"
          @rename-note="$emit('rename-note', $event)"
          @delete-note="$emit('delete-note', $event)"
          @create-note-around="$emit('create-note-around', $event)"
          @open-note-about="$emit('open-note-about', $event)"
        />
      </div>
    </div>

    <!-- 父笔记行（legacy：有 link 且有子项） -->
    <div
      v-else-if="hasChildren(item)"
      class="group"
      :class="[{ 'is-drag-source-slot': item.isDragSourceSlot }]"
    >
      <div
        class="sidebar-row group-row parent-note-row"
        :class="[{ 'is-drag-source-slot': item.isDragSourceSlot }]"
        :style="getNodeStyle(depth)"
        :data-note-id="extractNoteIdFromLink(item.link) || undefined"
        :data-toc-line-index="item.tocLineIndex"
        :data-node-id="getNodeId(item)"
        @pointerdown="onRowPointerDown($event, item)"
      >
        <button
          class="group-arrow-btn"
          type="button"
          :title="item.collapsed ? '展开' : '折叠'"
          @click.stop="toggleItem(item)"
        >
          <span class="arrow" :class="{ collapsed: item.collapsed }">
            <img
              :src="
                item.collapsed ? icon__sidebar_collapsed : icon__sidebar_opened
              "
              alt=""
            />
          </span>
        </button>

        <a
          :href="getFullLink(item.link)"
          :class="[
            'nav-item',
            'row-main',
            'parent-note-link',
            { active: isActive(item.link) },
            `nav-item-${extractNoteIdFromLink(item.link)}`,
            `nav-item-level-${depth + 1}`,
          ]"
          :data-note-id="extractNoteIdFromLink(item.link)"
          @click="onParentNoteTitleClick($event, item)"
        >
          {{ getNoteDisplayText(item.text, item.link) }}
        </a>

        <div
          v-if="isDev"
          class="row-actions"
          :class="{ 'menu-open': isGroupMenuOpen(item) || isNoteMenuOpen(item) }"
          @click.stop
        >
          <button
            class="action-btn menu-trigger"
            title="更多操作"
            type="button"
            @click="toggleMenu(getNoteMenuKey(item, 'more'))"
          >
            <span class="ellipsis">...</span>
          </button>

          <div
            v-if="isMenuOpen(getNoteMenuKey(item, 'more'))"
            class="action-menu"
          >
            <button class="menu-item" type="button" @click="renameNote(item)">
              重命名
            </button>
            <button
              class="menu-item danger"
              type="button"
              @click="deleteNote(item)"
            >
              删除笔记
            </button>
            <button class="menu-item" type="button" @click="openNoteAbout(item)">
              关于
            </button>
          </div>

          <button
            class="action-btn menu-trigger add-trigger"
            title="新增子笔记"
            type="button"
            @click="toggleMenu(getGroupMenuKey(item, 'add'))"
          >
            +
          </button>

          <div
            v-if="isMenuOpen(getGroupMenuKey(item, 'add'))"
            class="action-menu"
          >
            <button
              class="menu-item"
              type="button"
              @click="createNoteInGroup(item)"
            >
              新增笔记
            </button>
            <button
              class="menu-item"
              type="button"
              @click="createNotesInGroup(item)"
            >
              新增多篇笔记
            </button>
            <button
              class="menu-item"
              type="button"
              @click="createFolderInGroup(item)"
            >
              新建子目录
            </button>
          </div>
        </div>
      </div>

      <div v-show="!item.collapsed" class="group-items">
        <SidebarItems
          :items="getChildItems(item)"
          :depth="depth + 1"
          :max-depth="maxDepth"
          :show-note-id="showNoteId"
          :base="base"
          :current-path="currentPath"
          :item-depth="depth + 1"
          :group-path="getGroupPath(item)"
          :is-dev="isDev"
          :done-prefix="donePrefix"
          :undone-prefix="undonePrefix"
          :drag-context="getSidebarDrag()"
          @create-note-in-group="$emit('create-note-in-group', $event)"
          @create-notes-in-group="$emit('create-notes-in-group', $event)"
          @create-folder-in-group="$emit('create-folder-in-group', $event)"
          @rename-folder="$emit('rename-folder', $event)"
          @delete-entry="$emit('delete-entry', $event)"
          @rename-note="$emit('rename-note', $event)"
          @delete-note="$emit('delete-note', $event)"
          @create-note-around="$emit('create-note-around', $event)"
          @open-note-about="$emit('open-note-about', $event)"
        />
      </div>
    </div>

    <!-- 如果是链接项，或者是超过最大层级的组，都不渲染 -->
    <div
      v-else-if="!hasChildren(item)"
      class="sidebar-row note-row"
      :class="[{ 'is-drag-source-slot': item.isDragSourceSlot }]"
      :style="getNodeStyle(actualItemDepth)"
      :data-note-id="extractNoteIdFromLink(item.link) || undefined"
      :data-toc-line-index="item.tocLineIndex"
      :data-node-id="getNodeId(item)"
      @pointerdown="onRowPointerDown($event, item)"
    >
      <span class="group-arrow-spacer" aria-hidden="true" />

      <a
        :href="getFullLink(item.link)"
        :class="[
          'nav-item',
          'row-main',
          { active: isActive(item.link) },
          `nav-item-${extractNoteIdFromLink(item.link)}`,
          `nav-item-level-${actualItemDepth + 1}`,
        ]"
        :data-note-id="extractNoteIdFromLink(item.link)"
      >
        {{ getNoteDisplayText(item.text, item.link) }}
      </a>

      <div
        v-if="isDev"
        class="row-actions"
        :class="{ 'menu-open': isNoteMenuOpen(item) }"
        @click.stop
      >
        <button
          class="action-btn menu-trigger"
          title="更多操作"
          type="button"
          @click="toggleMenu(getNoteMenuKey(item, 'more'))"
        >
          <span class="ellipsis">...</span>
        </button>

        <div
          v-if="isMenuOpen(getNoteMenuKey(item, 'more'))"
          class="action-menu"
        >
          <button class="menu-item" type="button" @click="renameNote(item)">
            重命名
          </button>
          <button
            class="menu-item danger"
            type="button"
            @click="deleteNote(item)"
          >
            删除笔记
          </button>
          <button class="menu-item" type="button" @click="openNoteAbout(item)">
            关于
          </button>
        </div>

        <button
          class="action-btn menu-trigger add-trigger"
          title="新增"
          type="button"
          @click="toggleMenu(getNoteMenuKey(item, 'add'))"
        >
          +
        </button>

        <div
          v-if="isMenuOpen(getNoteMenuKey(item, 'add'))"
          class="action-menu"
        >
          <button
            class="menu-item"
            type="button"
            @click="createNoteAround(item, 'before')"
          >
            在上方新增笔记
          </button>
          <button
            class="menu-item"
            type="button"
            @click="createNoteAround(item, 'after')"
          >
            在下方新增笔记
          </button>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { useRouter } from 'vitepress'
import { computed, onBeforeUnmount, ref } from 'vue'

import { useSidebarDragContext } from './composables/useSidebarDrag'
import { SIDEBAR_INDENT_SIZE } from './sidebarDragLogic'
import { computeSidebarNodeId } from '../../../utils/tocNodeId'
import {
  icon__sidebar_opened,
  icon__sidebar_collapsed,
} from '../../assets/icons'

import type { SidebarDragContext } from './composables/useSidebarDrag'

interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
  folderPath?: string[]
  tocLineIndex?: number
  nodeId?: string
  isDragSourceSlot?: boolean
  isDragPlaceholder?: boolean
}

interface Props {
  items: SidebarItem[]
  depth: number
  maxDepth: number
  showNoteId: boolean
  base: string
  currentPath: string
  itemDepth?: number // 用于计算链接项的缩进，默认等于 depth
  groupPath?: string[]
  isDev?: boolean
  donePrefix?: string
  undonePrefix?: string
  dragContext?: SidebarDragContext | null
}

const router = useRouter()

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  maxDepth: 0,
  showNoteId: false,
  base: '/',
  currentPath: '',
  itemDepth: undefined,
  groupPath: () => [],
  isDev: false,
  donePrefix: '✅',
  undonePrefix: '⏰',
  dragContext: null,
})

const emit = defineEmits<{
  'create-note-in-group': [payload: ParentNotePayload]
  'create-notes-in-group': [payload: ParentNotePayload]
  'create-folder-in-group': [payload: ParentNotePayload]
  'rename-folder': [payload: FolderPayload]
  'delete-entry': [payload: EntryPayload]
  'rename-note': [payload: NotePayload]
  'delete-note': [payload: NotePayload]
  'create-note-around': [
    payload: NotePayload & { placement: 'before' | 'after' },
  ]
  'open-note-about': [payload: NotePayload]
}>()

interface ParentNotePayload {
  parentNoteIndex?: string
  parentFolderPath?: string[]
  parentTocLineIndex?: number
  text: string
}

interface FolderPayload {
  tocLineIndex: number
  text: string
}

interface EntryPayload {
  tocLineIndex: number
  text: string
  noteIndex?: string
}

interface NotePayload {
  noteIndex: string
  text: string
  link?: string
}

type MenuType = 'more' | 'add'
type NoteStatus = 'done' | 'undone' | null

// 获取实际的 item depth（用于链接项的缩进）
const actualItemDepth = computed(() => props.itemDepth ?? props.depth)
const openMenuKey = ref<string | null>(null)
const injectedDrag = useSidebarDragContext()
let ignoredToggleKey: string | null = null

function getSidebarDrag(): SidebarDragContext | null {
  return props.dragContext ?? injectedDrag
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', closeMenuOnDocumentClick, true)
}

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', closeMenuOnDocumentClick, true)
  }
})

// 判断项是否有子项
function hasChildren(item: SidebarItem): boolean {
  return !!(item.items && item.items.length > 0)
}

function getChildItems(item: SidebarItem): SidebarItem[] {
  return item.items ?? []
}

// 获取项的唯一 key
function getItemKey(item: SidebarItem): string {
  if (item.isDragPlaceholder) {
    return `drag-placeholder-${item.tocLineIndex ?? 'slot'}`
  }
  return item.link || item.text
}

// 切换项的展开/折叠状态
function toggleItem(item: SidebarItem) {
  if (!hasChildren(item)) return
  item.collapsed = !item.collapsed
}

function onGroupTitleClick(item: SidebarItem) {
  toggleItem(item)
}

function navigateToSidebarLink(link?: string) {
  if (!link || isActive(link)) return
  router.go(getFullLink(link))
}

function activateParentNoteLink(item: SidebarItem) {
  if (!hasChildren(item) || !item.link) return
  toggleItem(item)
  navigateToSidebarLink(item.link)
}

function suppressNextParentNoteClick(row: HTMLElement) {
  row.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return
      if (!event.target.closest('.parent-note-link')) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    { capture: true, once: true },
  )
}

function onParentNoteTitleClick(event: MouseEvent, item: SidebarItem) {
  if (!hasChildren(item) || !item.link) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
    return
  }
  event.preventDefault()
  activateParentNoteLink(item)
}

function getNodeStyle(depth: number) {
  return {
    paddingLeft: `${depth * getIndentSize()}px`,
  }
}

function getIndentSize(): number {
  return SIDEBAR_INDENT_SIZE
}

function getGroupPath(item: SidebarItem): string[] {
  return [...props.groupPath, item.text]
}

function isPureFolder(item: SidebarItem): boolean {
  return !item.link && (!!(item.folderPath && item.folderPath.length > 0) || hasChildren(item))
}

function getFolderPath(item: SidebarItem): string[] {
  return item.folderPath ?? getGroupPath(item)
}

function serializeFolderPath(item: SidebarItem): string {
  return JSON.stringify(getFolderPath(item))
}

function getParentNotePayload(item: SidebarItem): ParentNotePayload {
  const base = {
    parentTocLineIndex: item.tocLineIndex,
    text: item.text,
  }

  if (isPureFolder(item)) {
    return {
      ...base,
      parentFolderPath: getFolderPath(item),
    }
  }

  return {
    ...base,
    parentNoteIndex: extractNoteIdFromLink(item.link) || '',
  }
}

function getNotePayload(item: SidebarItem): NotePayload {
  return {
    noteIndex: extractNoteIdFromLink(item.link) || '',
    text: item.text,
    link: item.link,
  }
}

function getGroupMenuKey(item: SidebarItem, menuType: MenuType): string {
  if (item.tocLineIndex !== undefined) {
    return `group:${menuType}:${item.tocLineIndex}`
  }
  return `group:${menuType}:${getGroupPath(item).join('/')}`
}

function getFolderMenuKey(item: SidebarItem, menuType: MenuType): string {
  return `folder:${menuType}:${item.tocLineIndex ?? item.text}`
}

function getNoteMenuKey(item: SidebarItem, menuType: MenuType): string {
  return `note:${menuType}:${extractNoteIdFromLink(item.link) || item.link || item.text}`
}

function toggleMenu(menuKey: string) {
  if (ignoredToggleKey === menuKey) {
    ignoredToggleKey = null
    return
  }

  openMenuKey.value = openMenuKey.value === menuKey ? null : menuKey
}

function closeMenu() {
  openMenuKey.value = null
}

function isMenuOpen(menuKey: string): boolean {
  return openMenuKey.value === menuKey
}

function closeMenuOnDocumentClick() {
  if (!openMenuKey.value) return

  const closedMenuKey = openMenuKey.value
  openMenuKey.value = null
  ignoredToggleKey = closedMenuKey

  window.setTimeout(() => {
    if (ignoredToggleKey === closedMenuKey) {
      ignoredToggleKey = null
    }
  })
}

function isGroupMenuOpen(item: SidebarItem): boolean {
  return isMenuOpen(getGroupMenuKey(item, 'add'))
}

function isFolderMenuOpen(item: SidebarItem): boolean {
  return isMenuOpen(getFolderMenuKey(item, 'more'))
}

function isNoteMenuOpen(item: SidebarItem): boolean {
  return (
    isMenuOpen(getNoteMenuKey(item, 'more')) ||
    isMenuOpen(getNoteMenuKey(item, 'add'))
  )
}

function createNoteInGroup(item: SidebarItem) {
  emit('create-note-in-group', getParentNotePayload(item))
  closeMenu()
}

function createNotesInGroup(item: SidebarItem) {
  emit('create-notes-in-group', getParentNotePayload(item))
  closeMenu()
}

function createFolderInGroup(item: SidebarItem) {
  emit('create-folder-in-group', getParentNotePayload(item))
  closeMenu()
}

function getFolderPayload(item: SidebarItem): FolderPayload {
  return {
    tocLineIndex: item.tocLineIndex ?? -1,
    text: item.text,
  }
}

function getEntryPayload(item: SidebarItem): EntryPayload {
  return {
    tocLineIndex: item.tocLineIndex ?? -1,
    text: item.text,
    noteIndex: extractNoteIdFromLink(item.link) || undefined,
  }
}

function renameFolder(item: SidebarItem) {
  emit('rename-folder', getFolderPayload(item))
  closeMenu()
}

function deleteFolder(item: SidebarItem) {
  emit('delete-entry', getEntryPayload(item))
  closeMenu()
}

function renameNote(item: SidebarItem) {
  emit('rename-note', getNotePayload(item))
  closeMenu()
}

function deleteNote(item: SidebarItem) {
  if (hasChildren(item) && item.tocLineIndex !== undefined) {
    emit('delete-entry', getEntryPayload(item))
  } else {
    emit('delete-note', getNotePayload(item))
  }
  closeMenu()
}

function openNoteAbout(item: SidebarItem) {
  emit('open-note-about', getNotePayload(item))
  closeMenu()
}

function createNoteAround(item: SidebarItem, placement: 'before' | 'after') {
  emit('create-note-around', {
    ...getNotePayload(item),
    placement,
  })
  closeMenu()
}

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return !!target.closest(
    '.group-arrow-btn, .row-actions, .action-menu, .action-btn',
  )
}

const DRAG_START_THRESHOLD_PX = 4

function onRowPointerDown(event: PointerEvent, item: SidebarItem) {
  const sidebarDrag = getSidebarDrag()
  if (!props.isDev || !sidebarDrag || event.button !== 0) return
  if (isInteractiveDragTarget(event.target)) return

  const noteIndex = extractNoteIdFromLink(item.link)
  if (!noteIndex || item.tocLineIndex === undefined) return

  const row = event.currentTarget as HTMLElement
  const fromLink =
    event.target instanceof Element && !!event.target.closest('.row-main')

  if (fromLink) {
    event.preventDefault()
  }

  row.setPointerCapture(event.pointerId)

  const startX = event.clientX
  const startY = event.clientY
  const pointerId = event.pointerId
  let dragged = false

  function onPendingMove(moveEvent: PointerEvent) {
    if (moveEvent.pointerId !== pointerId) return

    const distance = Math.hypot(
      moveEvent.clientX - startX,
      moveEvent.clientY - startY,
    )
    if (distance < DRAG_START_THRESHOLD_PX) return

    dragged = true
    moveEvent.preventDefault()
    cleanupPending()
    closeMenu()
    sidebarDrag.startDrag(noteIndex, item.tocLineIndex!, row, moveEvent)
  }

  function onPendingUp(upEvent: PointerEvent) {
    if (upEvent.pointerId !== pointerId) return

    cleanupPending()

    if (!dragged && fromLink) {
      if (hasChildren(item) && item.link) {
        suppressNextParentNoteClick(row)
        activateParentNoteLink(item)
      } else if (hasChildren(item)) {
        toggleItem(item)
      } else {
        row.querySelector<HTMLAnchorElement>('.row-main')?.click()
      }
    }
  }

  function cleanupPending() {
    if (row.hasPointerCapture(pointerId)) {
      row.releasePointerCapture(pointerId)
    }
    window.removeEventListener('pointermove', onPendingMove)
    window.removeEventListener('pointerup', onPendingUp)
    window.removeEventListener('pointercancel', onPendingUp)
  }

  window.addEventListener('pointermove', onPendingMove)
  window.addEventListener('pointerup', onPendingUp)
  window.addEventListener('pointercancel', onPendingUp)
}

function onFolderRowPointerDown(event: PointerEvent, item: SidebarItem) {
  const sidebarDrag = getSidebarDrag()
  if (!props.isDev || !sidebarDrag || event.button !== 0) return
  if (isInteractiveDragTarget(event.target)) return
  if (item.tocLineIndex === undefined) return

  const row = event.currentTarget as HTMLElement
  const fromTitle =
    event.target instanceof Element && !!event.target.closest('.group-title')

  if (fromTitle) {
    event.preventDefault()
  }

  row.setPointerCapture(event.pointerId)

  const startX = event.clientX
  const startY = event.clientY
  const pointerId = event.pointerId
  let dragged = false

  function onPendingMove(moveEvent: PointerEvent) {
    if (moveEvent.pointerId !== pointerId) return

    const distance = Math.hypot(
      moveEvent.clientX - startX,
      moveEvent.clientY - startY,
    )
    if (distance < DRAG_START_THRESHOLD_PX) return

    dragged = true
    moveEvent.preventDefault()
    cleanupPending()
    closeMenu()
    sidebarDrag!.startFolderDrag(item.tocLineIndex!, row, moveEvent)
  }

  function onPendingUp(upEvent: PointerEvent) {
    if (upEvent.pointerId !== pointerId) return
    cleanupPending()

    if (!dragged && fromTitle) {
      toggleItem(item)
    }
  }

  function cleanupPending() {
    if (row.hasPointerCapture(pointerId)) {
      row.releasePointerCapture(pointerId)
    }
    window.removeEventListener('pointermove', onPendingMove)
    window.removeEventListener('pointerup', onPendingUp)
    window.removeEventListener('pointercancel', onPendingUp)
  }

  window.addEventListener('pointermove', onPendingMove)
  window.addEventListener('pointerup', onPendingUp)
  window.addEventListener('pointercancel', onPendingUp)
}

function getNodeId(item: SidebarItem): string {
  return item.nodeId ?? computeSidebarNodeId(item)
}

// 获取完整链接（包含 base）
function getFullLink(link?: string) {
  if (!link) return '#'
  const cleanLink = link.startsWith('/') ? link.slice(1) : link
  return props.base + cleanLink
}

// 判断链接是否激活
function isActive(link?: string) {
  if (!link) return false
  const fullLink = getFullLink(link)
  const decodedRoutePath = decodeURIComponent(props.currentPath)
  const decodedFullLink = decodeURIComponent(fullLink)

  return (
    decodedRoutePath === decodedFullLink ||
    decodedRoutePath === decodedFullLink + '.html'
  )
}

// 从链接中提取笔记 ID
function extractNoteIdFromLink(link?: string): string | null {
  if (!link) return null
  const match = link.match(/\/notes\/(\d{4})\./)
  return match ? match[1] : null
}

// 提取文本开头的 emoji
function extractEmoji(text: string): { emoji: string; rest: string } {
  const emojiMatch = text.match(
    /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}✅❌⏰]+)\s*/u
  )

  if (emojiMatch) {
    return {
      emoji: emojiMatch[1],
      rest: text.slice(emojiMatch[0].length),
    }
  }

  return { emoji: '', rest: text }
}

function getNoteStatusAndText(text: string): {
  status: NoteStatus
  rest: string
} {
  const { emoji, rest } = extractEmoji(text)

  if (emoji.includes('✅')) {
    return { status: 'done', rest }
  }

  if (emoji.includes('⏰')) {
    return { status: 'undone', rest }
  }

  return { status: null, rest: text }
}

function getStatusPrefix(status: NoteStatus): string {
  if (status === 'done') return props.donePrefix
  if (status === 'undone') return props.undonePrefix

  return ''
}

function withStatusPrefix(prefix: string, text: string): string {
  return prefix ? `${prefix} ${text}` : text
}

// 获取笔记显示文本
function getNoteDisplayText(text: string, link?: string): string {
  const { status, rest } = getNoteStatusAndText(text)
  const statusPrefix = getStatusPrefix(status)

  if (props.showNoteId) {
    if (/^\d{4}\./.test(rest)) {
      return withStatusPrefix(statusPrefix, rest)
    }

    const noteId = extractNoteIdFromLink(link)
    if (noteId) {
      return withStatusPrefix(statusPrefix, `${noteId}. ${rest}`)
    }

    return withStatusPrefix(statusPrefix, rest)
  } else {
    const cleanRest = rest.replace(/^\d{4}\.\s*/, '')
    return withStatusPrefix(statusPrefix, cleanRest)
  }
}
</script>

<style scoped>
.group {
  margin-bottom: 2px;
  width: 100%;
  min-width: 0;
}

.sidebar-row {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  border-radius: 8px;
  transition: background-color 0.18s ease;
}

.sidebar-row:hover {
  background: var(--vp-c-default-soft);
}

body.sidebar-drag-active .sidebar-row:not(.is-dragging-source) {
  cursor: grabbing;
}

.sidebar-row.is-dragging-source {
  opacity: 0.35;
}

/* 语雀式：拖拽中源项原位保留布局高度，内容不可见 */
.group.is-drag-source-slot,
.sidebar-row.is-drag-source-slot {
  visibility: hidden;
  pointer-events: none;
}

.sidebar-row.is-drag-placeholder {
  visibility: hidden;
  pointer-events: none;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.parent-note-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.note-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.group-arrow-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.group-arrow-spacer {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
}

.parent-note-link {
  font-weight: 600;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 36px;
  padding: 6px 8px;
  font-weight: 600;
  font-size: 14px;
  line-height: 22px;
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

.group-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  display: inline-flex;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
  transition: transform 0.25s;
}

.arrow:not(.collapsed) {
  transform: rotate(90deg);
}

.arrow img {
  width: 14px;
  height: 14px;
}

.nav-item {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 6px 8px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border-radius: 4px;
  font-size: 14px;
  line-height: 22px;
  transition: all 0.25s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  -webkit-user-drag: none;
  user-select: none;
}

.nav-item:hover {
  color: var(--vp-c-brand-1);
}

.nav-item.active {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.row-actions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0;
  flex: 0 0 auto;
  width: 0;
  padding-right: 0;
  opacity: 0;
  overflow: visible;
  pointer-events: none;
  transition:
    width 0.18s ease,
    padding-right 0.18s ease,
    gap 0.18s ease,
    opacity 0.18s ease;
}

.sidebar-row:hover .row-actions,
.row-actions:focus-within,
.row-actions.menu-open {
  gap: 4px;
  width: 52px;
  padding-right: 6px;
  opacity: 1;
  pointer-events: auto;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--vp-c-text-2);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
}

.action-btn:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-bg-soft);
}

.menu-trigger {
  font-weight: 600;
  font-family: var(--vp-font-family-base);
}

.ellipsis {
  display: inline-block;
  transform: rotate(90deg);
  transform-origin: center;
  letter-spacing: 1px;
}

.add-trigger {
  font-size: 15px;
}

.action-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 4px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-width: 128px;
  padding: 4px;
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: var(--vp-shadow-2);
}

.menu-item {
  display: block;
  width: 100%;
  padding: 6px 8px;
  color: var(--vp-c-text-1);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
  text-align: left;
  white-space: nowrap;
}

.menu-item:hover {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-default-soft);
}

.menu-item.danger:hover {
  color: var(--vp-c-danger-1, #ed3c50);
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
