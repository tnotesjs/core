/**
 * 全局「设置 Dialog」状态。
 *
 * Layout 顶层渲染 `<SettingsDialog />`，本 store 控制 visible/fullscreen，
 * 任何位置（导航入口、SidebarCard 提示等）调 `open()` 即可弹出，
 * 关闭后停留在当前路由与滚动位置。
 */
import { reactive } from 'vue'

export interface SettingsDialogState {
  visible: boolean
  fullscreen: boolean
}

const state = reactive<SettingsDialogState>({
  visible: false,
  fullscreen: false,
})

export function useSettingsDialog() {
  function open() {
    state.visible = true
  }

  function close() {
    state.visible = false
    state.fullscreen = false
  }

  function toggleFullscreen() {
    state.fullscreen = !state.fullscreen
  }

  return { state, open, close, toggleFullscreen }
}
