<template>
  <ClientOnly>
    <Teleport to="body">
      <div v-if="visible" class="tnotes-loading-overlay">
        <div class="loading-container">
          <div class="spinner"></div>
          <h2>{{ message }}</h2>
          <p v-if="tip" class="tip">{{ tip }}</p>
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 是否显示遮罩，默认显示 */
    visible?: boolean
    /** 主标题 */
    message?: string
    /** 副提示文本 */
    tip?: string
  }>(),
  {
    visible: true,
    message: '正在处理...',
    tip: '',
  },
)
</script>

<style scoped>
.tnotes-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--vp-c-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-container {
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 60px;
  height: 60px;
  margin: 0 auto 2rem;
  border: 4px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: tnotes-loading-spin 1s linear infinite;
}

@keyframes tnotes-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

h2 {
  font-size: 1.5rem;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
}

.tip {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  margin-bottom: 0;
}
</style>
