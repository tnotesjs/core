/**
 * vitepress/components/Layout/composables/useSidebarLayout.ts
 *
 * 侧边栏布局管理的组合式函数
 */

import { ref } from 'vue'

const SIDEBAR_HIDDEN_KEY = 'vp:sidebar:hidden'
const SIDEBAR_WIDTH_KEY = 'vp:sidebar:width'
const SIDEBAR_MIN_WIDTH = 260
const SIDEBAR_MAX_WIDTH = 480
const SIDEBAR_DEFAULT_WIDTH = 260

const hidden = ref(false)
const autoHidden = ref(false)
const width = ref(SIDEBAR_DEFAULT_WIDTH)
let initialized = false

function canUseDOM(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function clampSidebarWidth(nextWidth: number): number {
  if (!Number.isFinite(nextWidth)) return SIDEBAR_DEFAULT_WIDTH

  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(nextWidth)),
  )
}

function readStoredWidth(): number {
  if (!canUseDOM()) return SIDEBAR_DEFAULT_WIDTH

  const savedWidth = window.localStorage.getItem(SIDEBAR_WIDTH_KEY)
  if (!savedWidth) return SIDEBAR_DEFAULT_WIDTH

  return clampSidebarWidth(Number(savedWidth))
}

function isSidebarLayoutCollapsed(): boolean {
  return hidden.value || autoHidden.value
}

function applyHiddenState(nextHidden: boolean) {
  if (!canUseDOM()) return

  document.documentElement.classList.toggle('hide-sidebar', nextHidden)
}

function applySidebarWidth(nextWidth: number, layoutCollapsed = isSidebarLayoutCollapsed()) {
  if (!canUseDOM()) return

  const widthValue = `${clampSidebarWidth(nextWidth)}px`
  const layoutWidthValue = layoutCollapsed ? '0px' : widthValue
  document.documentElement.style.setProperty('--tn-sidebar-width', widthValue)
  document.documentElement.style.setProperty(
    '--tn-sidebar-layout-width',
    layoutWidthValue,
  )
  document.documentElement.style.setProperty(
    '--vp-sidebar-width',
    layoutWidthValue,
  )
}

function persistHiddenState(nextHidden: boolean) {
  if (!canUseDOM()) return

  try {
    window.localStorage.setItem(SIDEBAR_HIDDEN_KEY, nextHidden ? '1' : '0')
  } catch {}
}

function persistSidebarWidth(nextWidth: number) {
  if (!canUseDOM()) return

  try {
    window.localStorage.setItem(
      SIDEBAR_WIDTH_KEY,
      String(clampSidebarWidth(nextWidth)),
    )
  } catch {}
}

function applySidebarLayout() {
  applyHiddenState(hidden.value)
  applySidebarWidth(width.value, isSidebarLayoutCollapsed())
}

function initSidebarLayout() {
  if (!canUseDOM()) return

  if (!initialized) {
    hidden.value = window.localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1'
    width.value = readStoredWidth()
    initialized = true
  }

  applySidebarLayout()
}

function setSidebarAutoHidden(nextAutoHidden: boolean) {
  autoHidden.value = nextAutoHidden
  applySidebarWidth(width.value, isSidebarLayoutCollapsed())
}

function setSidebarHidden(nextHidden: boolean) {
  hidden.value = nextHidden
  applyHiddenState(nextHidden)
  applySidebarWidth(width.value, isSidebarLayoutCollapsed())
  persistHiddenState(nextHidden)
}

function toggleSidebar() {
  setSidebarHidden(!hidden.value)
}

function setSidebarWidth(nextWidth: number) {
  width.value = clampSidebarWidth(nextWidth)
  applySidebarWidth(width.value, isSidebarLayoutCollapsed())
}

function saveSidebarWidth() {
  persistSidebarWidth(width.value)
}

export function useSidebarLayout() {
  return {
    hidden,
    autoHidden,
    width,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    defaultWidth: SIDEBAR_DEFAULT_WIDTH,
    initSidebarLayout,
    setSidebarAutoHidden,
    setSidebarHidden,
    toggleSidebar,
    setSidebarWidth,
    saveSidebarWidth,
    isSidebarLayoutCollapsed,
  }
}
