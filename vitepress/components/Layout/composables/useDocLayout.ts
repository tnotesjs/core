/**
 * vitepress/components/Layout/composables/useDocLayout.ts
 *
 * 语雀式三栏布局：正文页宽模式 + 视口不足时自动隐藏右栏/左栏
 */

import { ref } from 'vue'


import {
  resolveResponsiveLayoutState,
  type ContentWidthMode,
} from './docLayoutLogic'
import { useSidebarLayout } from './useSidebarLayout'
import { CONTENT_WIDTH_MODE_KEY } from '../../constants'

export type { ContentWidthMode } from './docLayoutLogic'

const contentWidthMode = ref<ContentWidthMode>('wide')
const asideAutoHidden = ref(false)
let initialized = false
let resizeListenerAttached = false

function canUseDOM(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function readContentWidthMode(): ContentWidthMode {
  if (!canUseDOM()) return 'wide'

  try {
    const saved = window.localStorage.getItem(CONTENT_WIDTH_MODE_KEY)
    return saved === 'standard' ? 'standard' : 'wide'
  } catch {
    return 'wide'
  }
}

function applyContentWidthMode(mode: ContentWidthMode) {
  if (!canUseDOM()) return

  const root = document.documentElement
  root.classList.toggle('content-width-wide', mode === 'wide')
  root.classList.toggle('content-width-standard', mode === 'standard')
}

function pageHasDocAside(): boolean {
  if (!canUseDOM()) return false
  return Boolean(document.querySelector('.VPDoc.has-aside'))
}

function applyAsideAutoHidden(nextHidden: boolean) {
  if (!canUseDOM()) return

  asideAutoHidden.value = nextHidden
  document.documentElement.classList.toggle('aside-auto-hidden', nextHidden)
}

function applySidebarAutoHidden(nextHidden: boolean) {
  if (!canUseDOM()) return

  document.documentElement.classList.toggle('sidebar-auto-hidden', nextHidden)
  const { setSidebarAutoHidden } = useSidebarLayout()
  setSidebarAutoHidden(nextHidden)
}

export function updateResponsiveLayout() {
  if (!canUseDOM()) return

  const { hidden, width } = useSidebarLayout()
  const next = resolveResponsiveLayoutState({
    viewportWidth: window.innerWidth,
    sidebarWidth: width.value,
    userSidebarHidden: hidden.value,
    contentWidthMode: contentWidthMode.value,
    hasAside: pageHasDocAside(),
  })

  applyAsideAutoHidden(next.asideAutoHidden)
  applySidebarAutoHidden(next.sidebarAutoHidden)
}

function handleLayoutResize() {
  updateResponsiveLayout()
}

function attachResizeListener() {
  if (!canUseDOM() || resizeListenerAttached) return

  window.addEventListener('resize', handleLayoutResize, { passive: true })
  resizeListenerAttached = true
}

function initDocLayout() {
  if (!canUseDOM()) return

  useSidebarLayout().initSidebarLayout()
  contentWidthMode.value = readContentWidthMode()
  applyContentWidthMode(contentWidthMode.value)

  if (!initialized) {
    initialized = true
    attachResizeListener()
  }

  updateResponsiveLayout()
}

export function useDocLayout() {
  return {
    contentWidthMode,
    asideAutoHidden,
    initDocLayout,
    updateResponsiveLayout,
    readContentWidthMode,
    applyContentWidthMode,
  }
}

export function persistContentWidthMode(mode: ContentWidthMode) {
  if (!canUseDOM()) return

  try {
    window.localStorage.setItem(CONTENT_WIDTH_MODE_KEY, mode)
  } catch {
    // ignore quota / privacy mode
  }
}
