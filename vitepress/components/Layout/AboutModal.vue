<template>
  <!-- 使用 teleport 将 modal 放到 body 之下（避免父容器样式影响） -->
  <teleport to="body">
    <div v-if="modelValue" class="modalBackdrop" @click.self="close">
      <div class="modal" ref="modalRef">
        <header class="modalHeader">
          <h3 class="modalTitle">
            <!-- 标题通过 slot #title 提供，未提供则使用 prop title -->
            <slot name="title">
              {{ title }}
            </slot>
          </h3>
          <button
            class="closeBtn"
            @click="close"
            title="Close"
            type="button"
          >
            ✕
          </button>
        </header>

        <section class="modalBody">
          <!-- 默认插槽用于传入内容 -->
          <slot>
            <!-- fallback 内容（如果父组件没有传入插槽） -->
            <p>No content provided.</p>
          </slot>
        </section>

        <footer class="modalFooter" v-if="$slots.footer">
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'close'])

const modalRef = ref(null)

// close modal (emit update and close)
function close() {
  emit('update:modelValue', false)
  emit('close')
}

// handle ESC to close
function onKeyDown(e) {
  if (e.key === 'Escape' || e.key === 'Esc') {
    close()
  }
}

// focus trap: basic - focus modal when opened
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      // small timeout to ensure element exists
      setTimeout(() => {
        modalRef.value?.focus?.()
      }, 0)
      document.addEventListener('keydown', onKeyDown)
      // prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  },
  { immediate: false },
)

onMounted(() => {
  if (props.modelValue) {
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
  document.body.style.overflow = ''
})
</script>

<style scoped lang="scss">
// AboutModal 组件样式

// 模态框背景遮罩
.modalBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 1rem;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 模态框主体
.modal {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  border-radius: 16px;
  max-width: 580px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
  outline: none;
  animation: slideUp 0.3s ease-out;

  // 暗色模式优化
  :global(.dark) & {
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.08);
  }
}

// 模态框头部
.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: linear-gradient(
    180deg,
    var(--vp-c-bg-soft) 0%,
    var(--vp-c-bg) 100%
  );
  position: relative;

  // 添加顶部装饰条
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(
      90deg,
      var(--vp-c-brand-1),
      var(--vp-c-brand-2)
    );
  }
}

// 模态框标题
.modalTitle {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  // 添加图标装饰（可选，如果标题前有 emoji）
  &::before {
    content: '📝';
    font-size: 1.25rem;
  }
}

// 关闭按钮
.closeBtn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  padding: 0.5rem;
  border-radius: 8px;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;

  &:hover {
    background: var(--vp-c-bg-soft);
    color: var(--vp-c-text-1);
    transform: rotate(90deg);
  }

  &:active {
    transform: rotate(90deg) scale(0.95);
  }
}

// 模态框主体内容
.modalBody {
  padding: 1.5rem;
  font-size: 0.95rem;
  color: var(--vp-c-text-2);
  line-height: 1.7;
  max-height: 60vh;
  overflow-y: auto;

  // 美化滚动条
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--vp-c-divider);
    border-radius: 3px;

    &:hover {
      background: var(--vp-c-text-3);
    }
  }

  // 优化内容样式
  p {
    margin: 0.75rem 0;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  // 如果内容中有图标，增加间距
  :deep(span) {
    margin-right: 0.25rem;
  }

  // 强调文本
  strong {
    color: var(--vp-c-text-1);
    font-weight: 600;
  }

  // 链接样式
  a {
    color: var(--vp-c-brand-1);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: var(--vp-c-brand-2);
      text-decoration: underline;
    }
  }
}

// 模态框底部（可选）
.modalFooter {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  text-align: right;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  align-items: center;
}

// 响应式优化
@media (max-width: 640px) {
  .modal {
    max-width: 100%;
    margin: 1rem;
    border-radius: 12px;
  }

  .modalHeader {
    padding: 1rem 1.25rem;
  }

  .modalTitle {
    font-size: 1rem;
  }

  .modalBody {
    padding: 1.25rem;
    max-height: 50vh;
  }

  .modalFooter {
    padding: 0.875rem 1.25rem;
  }
}
</style>
