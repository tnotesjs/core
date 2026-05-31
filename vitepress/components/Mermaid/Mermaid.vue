<!-- 
vitepress/components/Mermaid/Mermaid.vue

Mermaid 图表组件，用于在页面中渲染 Mermaid 图表
-->

<template>
  <div
    ref="mermaidRef"
    class="mermaidWrapper"
    @mouseenter="showActions = true"
    @mouseleave="showActions = false"
  >
    <!-- 右上角按钮组（hover 时显示，与 code block 风格一致） -->
    <div
      v-if="!loading && !error"
      class="mermaidActions"
      :class="{ visible: showActions }"
    >
      <button
        @click="copySource"
        class="actionBtn"
        title="复制源码"
      >
        <img :src="icon__copy" alt="复制" class="btnIcon" />
      </button>
      <button
        @click="toggleFullscreen"
        class="actionBtn"
        title="全屏"
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
    </div>

    <!-- 图表容器 -->
    <div
      ref="containerRef"
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
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import mermaid from 'mermaid'
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'

import {
  icon__copy,
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
const containerRef = ref<HTMLElement | null>(null)
const diagramRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isFullscreen = ref(false)
const showActions = ref(false)

// ===================================
// #region 复制源码
// ===================================
function copySource() {
  const text = decodeURIComponent(props.graph)
  navigator.clipboard.writeText(text).catch(() => {
    // fallback: 静默忽略
  })
}
// #endregion

// ===================================
// #region 拖拽平移（仅全屏模式）
// ===================================
const dragging = ref(false)
let dragStartX = 0
let dragStartY = 0
let scrollStartX = 0
let scrollStartY = 0

function startDrag(e: MouseEvent) {
  if (!isFullscreen.value || !containerRef.value) return
  dragging.value = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  scrollStartX = containerRef.value.scrollLeft
  scrollStartY = containerRef.value.scrollTop
}

function onDrag(e: MouseEvent) {
  if (!dragging.value || !containerRef.value) return
  const dx = e.clientX - dragStartX
  const dy = e.clientY - dragStartY
  containerRef.value.scrollLeft = scrollStartX - dx
  containerRef.value.scrollTop = scrollStartY - dy
}

function endDrag() {
  dragging.value = false
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
/* #region 右上角按钮组（hover 显示，与 code block 一致） */
/* ===================================== */
.mermaidActions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
  z-index: 10;

  &.visible {
    opacity: 1;
  }
}

.actionBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }

  .btnIcon {
    width: 16px;
    height: 16px;
    display: block;
    pointer-events: none;
  }
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
  overflow: auto;
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
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
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
  display: inline-block;

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
  .actionBtn {
    width: 28px;
    height: 28px;

    .btnIcon {
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
