<template>
  <div
    v-if="show"
    class="rightClickMenu"
    :style="{ left: x + 'px', top: y + 'px' }"
  >
    <div class="menuItem" @click="handlePin">📌 Pin</div>
    <div class="menuItem" @click="(e) => handlePronounce(e, 'en-GB')">
      📢 Pronounce（英）
    </div>
    <div class="menuItem" @click="(e) => handlePronounce(e, 'en-US')">
      📢 Pronounce（美）
    </div>
    <div
      class="menuItem"
      @click="(e) => handlePronounceAll(e, 'en-GB')"
    >
      📢 Pronounce All（英）
    </div>
    <div
      class="menuItem"
      @click="(e) => handlePronounceAll(e, 'en-US')"
    >
      📢 Pronounce All（美）
    </div>
    <div class="menuItem" @click="handleAutoShowCard">
      🔍 Auto Show Card（{{ isAutoShowCard ? '关' : '开' }}）
    </div>
    <div class="menuItem" @click="handleCheckAll">✅ Check All</div>
    <div class="menuItem" @click="handleReset">❌ Reset</div>
  </div>
</template>

<script setup>
const props = defineProps({
  show: Boolean,
  isAutoShowCard: Boolean,
  x: Number,
  y: Number,
})

const emit = defineEmits(['pin', 'pronounce'])
const handlePin = (e) => {
  emit('pin')
  e.preventDefault()
}
const handleAutoShowCard = () => {
  emit('autoShowCard')
}
const handlePronounce = (e, lang) => {
  emit('pronounce', lang)
  e.preventDefault()
}
const handlePronounceAll = (e, lang) => {
  emit('pronounceAll', lang)
  e.preventDefault()
}
const handleCheckAll = () => {
  emit('checkAll')
}
const handleReset = () => {
  emit('reset')
}
</script>

<style scoped lang="scss">
// RightClickMenu 组件样式

.rightClickMenu {
  position: fixed;
  z-index: 99999;
  background: #2c2c2c;
  border: 1px solid #444;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  font-size: 13px;
  color: #eee;
  cursor: pointer;
  user-select: none;
}

.menuItem {
  padding: 8px 16px;

  &:hover {
    background-color: #444;
  }
}
</style>
