<!-- .vitepress\components\Layout\ToggleSidebar.vue -->
<template>
  <img
    @click="toggleSidebar"
    class="sidebarToggleBtn"
    :title="hidden ? '显示侧边栏' : '隐藏侧边栏'"
    :src="hidden ? icon__next : icon__prev"
    alt=""
  />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useSidebarLayout } from './composables/useSidebarLayout'
import { icon__next, icon__prev } from '../../assets/icons'

const { hidden, initSidebarLayout, toggleSidebar } = useSidebarLayout()

onMounted(() => {
  initSidebarLayout()
})
</script>

<style scoped lang="scss">
.sidebarToggleBtn {
  width: 1.5rem;
  height: 1.5rem;
  padding: 3px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: var(--vp-c-bg-alt);
  }
}
</style>
