/**
 * 全局「重命名遮罩」状态。
 *
 * Layout 顶层渲染 `<LoadingPage />`，由本 store 控制 visible/message/tip，
 * `useRenameRedirect` 调用 show/hide 即可。
 */
import { reactive } from 'vue'

export interface RenameOverlayState {
  visible: boolean
  message: string
  tip: string
}

const state = reactive<RenameOverlayState>({
  visible: false,
  message: '正在处理...',
  tip: '',
})

export function useRenameOverlay() {
  function show(payload: { message?: string; tip?: string } = {}) {
    state.message = payload.message ?? '正在处理...'
    state.tip = payload.tip ?? ''
    state.visible = true
  }

  function hide() {
    state.visible = false
  }

  return { state, show, hide }
}
