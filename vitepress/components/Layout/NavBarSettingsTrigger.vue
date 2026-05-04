<template>
  <button
    type="button"
    class="tnotes-nav-settings-trigger"
    title="打开设置"
    @click="open"
  >
    <img
      :src="icon__setting"
      class="tnotes-nav-settings-icon"
      alt=""
    />
  </button>
</template>

<script setup lang="ts">
import { icon__setting } from '../../assets/icons'
import { useSettingsDialog } from '../Settings/composables/useSettingsDialog'

const { open } = useSettingsDialog()
</script>

<style scoped>
.tnotes-nav-settings-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin: 0 4px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.tnotes-nav-settings-trigger:hover {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.tnotes-nav-settings-icon {
  width: 20px;
  height: 20px;
  display: block;
  transition: transform 0.2s ease;
}

.tnotes-nav-settings-trigger:hover .tnotes-nav-settings-icon {
  transform: scale(1.1);
}
</style>
