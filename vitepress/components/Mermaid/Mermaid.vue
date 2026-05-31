<!-- 
vitepress/components/Mermaid/Mermaid.vue

Mermaid 图表组件，用于在页面中渲染 Mermaid 图表
-->

<template>
  <div
    ref="mermaidRef"
    class="mermaidWrapper"
  >
    <!-- 右上角按钮组（hover 时显示，与 code block 风格一致） -->
    <div
      v-if="!loading && !error"
      class="mermaidActions"
      :data-copy-state="copyState"
    >
      <button
        @click="toggleFullscreen"
        class="mermaidActionFullscreen"
        :title="isFullscreen ? '退出全屏' : '全屏查看图表'"
      >
        <img
          v-if="isFullscreen"
          :src="icon__fullscreen_exit"
          alt="退出全屏"
        />
        <img
          v-else
          :src="icon__fullscreen"
          alt="全屏"
        />
      </button>
      <button
        @click="copySource"
        class="mermaidActionCopy"
        :data-copy-state="copyState"
        :title="copyTitle"
      >
        <img :src="copyIcon" alt="复制" />
      </button>
    </div>

    <!-- 图表容器 -->
    <div
      class="mermaidContainer"
      :class="{ fullscreen: isFullscreen }"
      @mousedown="startDrag"
      @mousemove="onDrag"
      @mouseup="endDrag"
      @mouseleave="endDrag"
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
        :style="diagramTransform ? { transform: diagramTransform, transformOrigin: 'top left' } : undefined"
        @wheel="handleWheel"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import mermaid from 'mermaid'
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'

import {
  icon__check,
  icon__clipboard,
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
const isFullscreen = ref(false)

// ===================================
// #region 复制源码
// ===================================
type CopyState = 'idle' | 'copied' | 'failed'
const COPY_RESET_DELAY = 1000

const copyState = ref<CopyState>('idle')
const copyIcon = computed(() =>
  copyState.value === 'copied' ? icon__check : icon__clipboard,
)
const copyTitle = computed(() => {
  if (copyState.value === 'copied') return '已复制'
  if (copyState.value === 'failed') return '复制失败'
  return '复制源码'
})

let copyResetTimer: ReturnType<typeof setTimeout> | null = null

function copySource() {
  const text = decodeURIComponent(props.graph)
  navigator.clipboard
    .writeText(text)
    .then(() => {
      copyState.value = 'copied'
    })
    .catch(() => {
      copyState.value = 'failed'
    })
    .finally(() => {
      if (copyResetTimer) clearTimeout(copyResetTimer)
      copyResetTimer = setTimeout(() => {
        copyState.value = 'idle'
      }, COPY_RESET_DELAY)
    })
}
// #endregion

// ===================================
// #region 全屏模式：拖拽平移 + Ctrl+滚轮缩放
// ===================================
const scale = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let panStartX = 0
let panStartY = 0

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const SCALE_STEP = 0.01

const diagramTransform = computed(() =>
  isFullscreen.value
    ? `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`
    : undefined,
)

function startDrag(e: MouseEvent) {
  if (!isFullscreen.value) return
  dragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  panStartX = panX.value
  panStartY = panY.value
}

function onDrag(e: MouseEvent) {
  if (!dragging.value) return
  panX.value = panStartX + (e.clientX - dragStartX)
  panY.value = panStartY + (e.clientY - dragStartY)
}

function endDrag() {
  dragging.value = false
}

function handleWheel(e: WheelEvent) {
  if (!isFullscreen.value) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
  scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value + delta))
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
  if (!isFullscreen.value) {
    scale.value = 1
    panX.value = 0
    panY.value = 0
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

  // 监听全屏变化
  document.addEventListener('fullscreenchange', handleFullscreenChange)

  // 清理函数
  onBeforeUnmount(() => {
    themeObserver.disconnect()
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
  })
})

// 当图表内容变化时重新渲染
watch(
  () => props.graph,
  () => {
    renderDiagram()
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
/* #region 右上角按钮组（与 code block 的 .tn-code-actions 风格一致） */
/* ===================================== */
.mermaidActions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 2px;
  background-color: color-mix(in srgb, var(--vp-code-block-bg) 92%, transparent);
  border: 0.1px solid var(--vp-c-divider);
  border-radius: 7px;
  opacity: 0;
  transition: opacity 0.2s;
}

.mermaidWrapper:hover .mermaidActions,
.mermaidActions:hover,
.mermaidActions:focus-within,
.mermaidActions[data-copy-state='copied'],
.mermaidActions[data-copy-state='failed'] {
  opacity: 1;
}

.mermaidActionCopy,
.mermaidActionFullscreen {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background-color: var(--vp-c-default-soft);
    color: var(--vp-c-brand-1);
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }

  img {
    width: 16px;
    height: 16px;
  }
}

/* 与 .tn-code-action-copy 完全一致的复制反馈 */
.mermaidActionCopy {
  position: relative;
}

.mermaidActionCopy[data-copy-state='copied'] {
  background-color: var(--vp-c-green-soft);
}

.mermaidActionCopy[data-copy-state='failed'] {
  background-color: var(--vp-c-danger-soft);
}

.mermaidActionCopy::after {
  position: absolute;
  top: 50%;
  right: calc(100% + 6px);
  padding: 4px 7px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: var(--vp-shadow-2);
  content: attr(title);
  font-size: 12px;
  line-height: 18px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) translateX(2px);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
  white-space: nowrap;
}

.mermaidActionCopy[data-copy-state='copied']::after,
.mermaidActionCopy[data-copy-state='failed']::after {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}
/* ===================================== */
/* #endregion 右上角按钮组               */
/* ===================================== */

/* ===================================== */
/* #region 图表容器                      */
/* ===================================== */
.mermaidContainer {
  position: relative;
  min-height: 200px;
  padding: 20px;
  background: var(--vp-c-bg);

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: var(--vp-c-bg);
    padding: 40px;
    overflow: hidden;
    cursor: grab;

    &:active {
      cursor: grabbing;
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
  :global(svg) {
    max-width: 100%;
    height: auto;
  }

  // 重置 VitePress 全局 line-height，避免穿透 SVG foreignObject 导致
  // <p> 实际渲染高度超过 Mermaid 计算值，引发文本截断
  :global(svg .label p) {
    line-height: 1.5;
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
  .mermaidActionCopy,
  .mermaidActionFullscreen {
    width: 24px;
    height: 24px;

    img {
      width: 14px;
      height: 14px;
    }
  }

  .mermaidContainer {
    padding: 12px;

    &.fullscreen {
      padding: 20px;
    }
  }
}
/* ===================================== */
/* #endregion 响应式设计                 */
/* ===================================== */
</style>
