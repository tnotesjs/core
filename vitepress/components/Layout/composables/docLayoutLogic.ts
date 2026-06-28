/**
 * docLayoutLogic.ts
 *
 * 语雀式三栏布局的纯函数（可单测，不依赖 VitePress define）
 */

export type ContentWidthMode = 'wide' | 'standard'

const ASIDE_WIDTH = 300
const STANDARD_CONTENT_WIDTH = 750
const WIDE_CONTENT_MIN_WIDTH = 640
const LAYOUT_PADDING = 16
/** VitePress 桌面侧栏断点；以下由 VP 自带移动顶栏/抽屉负责 */
export const DESKTOP_SIDEBAR_BREAKPOINT = 960

function getContentTargetWidth(mode: ContentWidthMode): number {
  return mode === 'standard' ? STANDARD_CONTENT_WIDTH : WIDE_CONTENT_MIN_WIDTH
}

export function resolveResponsiveLayoutState(input: {
  viewportWidth: number
  sidebarWidth: number
  userSidebarHidden: boolean
  contentWidthMode: ContentWidthMode
  hasAside: boolean
}): { asideAutoHidden: boolean; sidebarAutoHidden: boolean } {
  // 移动端不使用桌面三栏降级，避免误隐藏顶栏站点标题
  if (input.viewportWidth < DESKTOP_SIDEBAR_BREAKPOINT) {
    return { asideAutoHidden: false, sidebarAutoHidden: false }
  }

  const sidebarWidth = input.userSidebarHidden ? 0 : input.sidebarWidth
  const contentTarget = getContentTargetWidth(input.contentWidthMode)

  if (!input.hasAside) {
    const needSidebarAndContent =
      sidebarWidth + contentTarget + LAYOUT_PADDING * 2

    return {
      asideAutoHidden: false,
      sidebarAutoHidden: input.viewportWidth < needSidebarAndContent,
    }
  }

  const needThreeColumns =
    sidebarWidth + contentTarget + ASIDE_WIDTH + LAYOUT_PADDING * 2
  const needSidebarAndContent =
    sidebarWidth + contentTarget + LAYOUT_PADDING * 2

  if (input.viewportWidth < needSidebarAndContent) {
    return { asideAutoHidden: true, sidebarAutoHidden: true }
  }

  if (input.viewportWidth < needThreeColumns) {
    return { asideAutoHidden: true, sidebarAutoHidden: false }
  }

  return { asideAutoHidden: false, sidebarAutoHidden: false }
}
