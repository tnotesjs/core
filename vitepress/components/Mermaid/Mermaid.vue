<template>
  <div
    ref="mermaidRef"
    class="mermaidWrapper"
    @mouseenter="showToolbar = true"
    @mouseleave="showToolbar = false"
  >
    <!-- 工具栏 -->
    <div
      v-if="!loading && !error"
      class="toolbar"
      :class="{ visible: showToolbar }"
    >
      <button
        @click="zoomIn"
        class="toolbarBtn iconBtn"
        title="放大 (Ctrl + +)"
      >
        <img :src="icon__zoom_in" alt="放大" class="btnIcon" />
      </button>
      <button
        @click="zoomOut"
        class="toolbarBtn iconBtn"
        title="缩小 (Ctrl + -)"
      >
        <img :src="icon__zoom_out" alt="缩小" class="btnIcon" />
      </button>
      <button
        @click="resetZoom"
        class="toolbarBtn iconBtn"
        title="重置缩放 (Ctrl + 0)"
      >
        <img :src="icon__zoom_reset" alt="重置" class="btnIcon" />
      </button>
      <button
        @click="fitToScreen"
        class="toolbarBtn iconBtn"
        title="适应屏幕"
      >
        <img :src="icon__zoom_fit" alt="适应屏幕" class="btnIcon" />
      </button>
      <button
        @click="toggleFullscreen"
        class="toolbarBtn iconBtn"
        title="全屏 (F11)"
      >
        <img
          v-if="isFullscreen"
          :src="icon__fullscreen_exit"
          alt="退出全屏"
          class="btnIcon"
        />
        <img
          v-else
          :src="icon__fullscreen"
          alt="全屏"
          class="btnIcon"
        />
      </button>
      <span class="zoomLevel">{{ Math.round(scale * 100) }}%</span>
    </div>

    <!-- 图表容器 -->
    <div
      class="mermaidContainer"
      :class="{ fullscreen: isFullscreen }"
      @click="handleContainerClick"
    >
      <div v-if="loading" class="mermaidLoading">
        <div class="spinner"></div>
        <p>加载图表中...</p>
      </div>
      <div v-else-if="error" class="mermaidError">
        <span class="errorIcon">⚠️</span>
        <p>{{ error }}</p>
      </div>
      <div
        v-show="!loading && !error"
        ref="diagramRef"
        :class="['mermaidDiagram', props.class]"
        :style="{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }"
        @wheel.prevent="handleWheel"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import mermaid from 'mermaid'
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'

import {
  icon__zoom_in,
  icon__zoom_out,
  icon__zoom_reset,
  icon__zoom_fit,
  icon__fullscreen,
  icon__fullscreen_exit,
} from '../../assets/icons'

const props = defineProps({
  graph: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  class: {
    type: String,
    default: 'mermaid',
  },
})

const mermaidRef = ref<HTMLElement | null>(null)
const diagramRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const scale = ref(1)
const isFullscreen = ref(false)
const showToolbar = ref(false)

// ===================================
// #region 工具栏显示控制
// ===================================
let hideTimer: ReturnType<typeof setTimeout> | null = null

function handleContainerClick() {
  // 移动端点击切换工具栏显示
  if (window.innerWidth <= 768) {
    showToolbar.value = !showToolbar.value

    // 3秒后自动隐藏
    if (showToolbar.value) {
      if (hideTimer) clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        showToolbar.value = false
      }, 3000)
    }
  }
}
// #endregion

// ===================================
// #region 缩放控制
// ===================================
const MIN_SCALE = 0.1
const MAX_SCALE = 5
const SCALE_STEP = 0.1

function zoomIn() {
  scale.value = Math.min(scale.value + SCALE_STEP, MAX_SCALE)
}

function zoomOut() {
  scale.value = Math.max(scale.value - SCALE_STEP, MIN_SCALE)
}

function resetZoom() {
  scale.value = 1
}

function fitToScreen() {
  if (!diagramRef.value || !mermaidRef.value) return

  const svg = diagramRef.value.querySelector('svg')
  if (!svg) return

  const containerRect = mermaidRef.value.getBoundingClientRect()
  const svgRect = svg.getBoundingClientRect()

  const scaleX = (containerRect.width * 0.9) / svgRect.width
  const scaleY = (containerRect.height * 0.9) / svgRect.height

  scale.value = Math.min(scaleX, scaleY, 1)
}

function handleWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta))
  }
}
// #endregion

// ===================================
// #region 全屏控制
// ===================================
function toggleFullscreen() {
  if (!mermaidRef.value) return

  if (!isFullscreen.value) {
    if (mermaidRef.value.requestFullscreen) {
      mermaidRef.value.requestFullscreen()
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}
// #endregion

// ===================================
// #region 键盘快捷键
// ===================================
function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === '=' || e.key === '+') {
      e.preventDefault()
      zoomIn()
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault()
      zoomOut()
    } else if (e.key === '0') {
      e.preventDefault()
      resetZoom()
    }
  } else if (e.key === 'F11') {
    e.preventDefault()
    toggleFullscreen()
  } else if (e.key === 'Escape' && isFullscreen.value) {
    toggleFullscreen()
  }
}
// #endregion

// ===================================
// #region Mermaid 渲染
// ===================================
// 获取当前主题
const getCurrentTheme = () => {
  return document.documentElement.classList.contains('dark')
    ? 'dark'
    : 'default'
}

// 初始化 Mermaid
const initMermaid = async () => {
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: getCurrentTheme(),
      securityLevel: 'loose',
      fontFamily: 'inherit',
    })
  } catch (err) {
    console.error('Mermaid initialization error:', err)
  }
}

// 渲染图表
const renderDiagram = async () => {
  // 等待下一个 DOM 更新周期
  await nextTick()

  if (!diagramRef.value) {
    // 再等待一小段时间确保 DOM 完全渲染
    await new Promise((resolve) => setTimeout(resolve, 0))
    if (!diagramRef.value) {
      // console.warn('diagramRef is still null')
      return
    }
  }

  try {
    loading.value = true
    error.value = null

    // 每次渲染前都重新初始化主题
    mermaid.initialize({
      startOnLoad: false,
      theme: getCurrentTheme(),
      securityLevel: 'loose',
      fontFamily: 'inherit',
    })

    const { svg, bindFunctions } = await mermaid.render(
      props.id,
      decodeURIComponent(props.graph)
    )

    diagramRef.value.innerHTML = svg

    // 绑定交互函数（如果有）
    if (bindFunctions) {
      bindFunctions(diagramRef.value)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    error.value = `Failed to render diagram: ${message}`
    console.error('Mermaid render error:', err)
  } finally {
    loading.value = false
  }
}

// 监听主题变化
const observeTheme = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === 'attributes' &&
        mutation.attributeName === 'class'
      ) {
        // 检查是否是主题变化
        const isDark = document.documentElement.classList.contains('dark')
        const wasDark = mutation.oldValue?.includes('dark')

        // 只有当主题实际发生变化时才重新渲染
        if ((isDark && !wasDark) || (!isDark && wasDark)) {
          renderDiagram()
        }
      }
    })
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true,
  })

  return observer
}

onMounted(async () => {
  await initMermaid()
  await renderDiagram()

  // 观察主题变化
  const themeObserver = observeTheme()

  // 监听键盘事件
  document.addEventListener('keydown', handleKeydown)

  // 监听全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // 清理函数
  onBeforeUnmount(() => {
    themeObserver.disconnect()
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })
})

// 当图表内容变化时重新渲染并重置缩放
watch(
  () => props.graph,
  () => {
    renderDiagram()
    resetZoom()
  }
)
// #endregion
</script>

<style scoped lang="scss">
/* ===================================== */
/* #region 容器布局                      */
/* ===================================== */
.mermaidWrapper {
  position: relative;
  margin: 1rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  overflow: hidden;
}
/* ===================================== */
/* #endregion 容器布局                   */
/* ===================================== */

/* ===================================== */
/* #region 工具栏                        */
/* ===================================== */
.toolbar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-wrap: wrap;
  transform: translateY(-100%);
  transition: transform 0.3s ease, opacity 0.3s ease;
  opacity: 0;
  z-index: 10;
  pointer-events: none;

  &.visible {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }
}

.toolbarBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0.6;

  &:hover {
    background: var(--vp-c-brand-soft);
    opacity: 1;
  }

  &:active {
    transform: scale(0.95);
  }
}

.iconBtn {
  padding: 4px;

  .btnIcon {
    width: 16px;
    height: 16px;
    display: block;
    pointer-events: none;
  }
}

.zoomLevel {
  margin-left: auto;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-text-3);
  user-select: none;
}
/* ===================================== */
/* #endregion 工具栏                     */
/* ===================================== */

/* ===================================== */
/* #region 图表容器                      */
/* ===================================== */
.mermaidContainer {
  position: relative;
  min-height: 200px;
  max-height: 600px;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--vp-c-bg);

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: none;
    z-index: 9999;
    background: var(--vp-c-bg);
    padding: 40px;
  }

  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--vp-c-bg-soft);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--vp-c-divider);
    border-radius: 4px;

    &:hover {
      background: var(--vp-c-text-3);
    }
  }
}
/* ===================================== */
/* #endregion 图表容器                   */
/* ===================================== */

/* ===================================== */
/* #region 加载和错误状态                */
/* ===================================== */
.mermaidLoading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 2rem;
  color: var(--vp-c-text-2);

  p {
    margin: 0;
    font-size: 14px;
  }
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.mermaidError {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 2rem;
  color: var(--vp-c-danger-1);

  p {
    margin: 0;
    font-size: 14px;
    text-align: center;
  }
}

.errorIcon {
  font-size: 32px;
}
/* ===================================== */
/* #endregion 加载和错误状态             */
/* ===================================== */

/* ===================================== */
/* #region 图表样式                      */
/* ===================================== */
.mermaidDiagram {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  :global(svg) {
    max-width: 100%;
    height: auto;
  }
}
/* ===================================== */
/* #endregion 图表样式                   */
/* ===================================== */

/* ===================================== */
/* #region 暗色主题优化                  */
/* ===================================== */
:global(html.dark) .mermaidWrapper {
  background: var(--vp-code-block-bg);
  border-color: var(--vp-c-divider);
}

:global(html.dark) .toolbar {
  background: var(--vp-code-block-bg);
}

:global(html.dark) .mermaidContainer {
  background: var(--vp-code-block-bg);
}
/* ===================================== */
/* #endregion 暗色主题优化               */
/* ===================================== */

/* ===================================== */
/* #region 响应式设计                    */
/* ===================================== */
@media (max-width: 768px) {
  .toolbar {
    padding: 4px 6px;
  }

  .toolbarBtn {
    width: 24px;
    height: 24px;
  }

  .iconBtn {
    padding: 3px;

    .btnIcon {
      width: 14px;
      height: 14px;
    }
  }

  .zoomLevel {
    font-size: 10px;
  }

  .mermaidContainer {
    padding: 12px;
    max-height: 400px;

    &.fullscreen {
      padding: 20px;
    }
  }
}
/* ===================================== */
/* #endregion 响应式设计                 */
/* ===================================== */
</style>
