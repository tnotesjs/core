<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition name="tnotes-settings-dialog">
        <div
          v-if="state.visible"
          class="tnotes-settings-overlay"
          @click.self="close"
        >
          <div
            class="tnotes-settings-dialog"
            :class="{ 'is-fullscreen': state.fullscreen }"
          >
            <header class="tnotes-settings-header">
              <h2 class="tnotes-settings-title">⚙️ 设置</h2>
              <div class="tnotes-settings-actions">
                <button
                  type="button"
                  class="tnotes-settings-icon-btn"
                  :title="state.fullscreen ? '退出全屏' : '全屏'"
                  @click="toggleFullscreen"
                >
                  <svg
                    v-if="!state.fullscreen"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M4 9V4h5" />
                    <path d="M20 9V4h-5" />
                    <path d="M4 15v5h5" />
                    <path d="M20 15v5h-5" />
                  </svg>
                  <svg
                    v-else
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M9 4v5H4" />
                    <path d="M15 4v5h5" />
                    <path d="M9 20v-5H4" />
                    <path d="M15 20v-5h5" />
                  </svg>
                </button>
                <button
                  type="button"
                  class="tnotes-settings-icon-btn"
                  title="关闭"
                  @click="close"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </header>
            <div class="tnotes-settings-body">
              <Settings />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

import { useSettingsDialog } from './composables/useSettingsDialog'
import Settings from './Settings.vue'

const { state, close, toggleFullscreen } = useSettingsDialog()

/**
 * 在 dialog 打开期间，捕获阶段拦截 Ctrl/Cmd+K，
 * 阻止 VitePress 本地搜索弹窗在设置面板之上叠加；
 * 同时在捕获阶段处理 Escape 关闭，避免被搜索栏等其它组件吃掉。
 */
function blockSearchHotkey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopImmediatePropagation()
    e.preventDefault()
    close()
    return
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
}

watch(
  () => state.visible,
  (visible) => {
    if (typeof document === 'undefined') return
    if (visible) {
      document.addEventListener('keydown', blockSearchHotkey, { capture: true })
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', blockSearchHotkey, {
        capture: true,
      })
      document.body.style.overflow = ''
    }
  },
)

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('keydown', blockSearchHotkey, { capture: true })
  document.body.style.overflow = ''
})
</script>

<style scoped>
.tnotes-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.tnotes-settings-dialog {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.24);
  width: min(720px, 100%);
  max-height: min(80vh, 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    width 0.2s ease,
    max-height 0.2s ease,
    border-radius 0.2s ease;
}

.tnotes-settings-dialog.is-fullscreen {
  width: 100vw;
  max-width: 100vw;
  height: 100vh;
  max-height: 100vh;
  border-radius: 0;
  border: none;
}

.tnotes-settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

.tnotes-settings-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  color: var(--vp-c-text-1);
}

.tnotes-settings-actions {
  display: flex;
  gap: 0.25rem;
}

.tnotes-settings-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.tnotes-settings-icon-btn:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.tnotes-settings-body {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

/* dialog 进入/离开过渡 */
.tnotes-settings-dialog-enter-active,
.tnotes-settings-dialog-leave-active {
  transition: opacity 0.18s ease;
}
.tnotes-settings-dialog-enter-from,
.tnotes-settings-dialog-leave-to {
  opacity: 0;
}
</style>
