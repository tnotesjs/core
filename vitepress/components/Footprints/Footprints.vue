<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'

// ----------------------------------------------------------
// #region - 图片处理
// ----------------------------------------------------------
/**
 * 获取图片容器的 DOM 引用
 */
const imageContainer = ref(null)

/**
 * 动态存储图片路径的列表
 */
const images = ref([])

/**
 * 控制 modal 显示
 */
const isModalVisible = ref(false)

/**
 * 当前预览的图片索引
 */
const currentIndex = ref(0)
const currentImage = computed(() => images.value[currentIndex.value])

/**
 * 唯一标识符，用于区分不同的组件实例。
 * 解决被多次复用的时候，直接操作 DOM 的相关逻辑出现 bug。
 */
const instanceId = Math.random().toString(36).substr(2, 9)

/**
 * 打开模态框
 * @param index 需要展示的图片的索引
 */
const openModal = (index) => {
  currentIndex.value = index
  isModalVisible.value = true
}
/**
 * 关闭模态框
 */
const closeModal = () => (isModalVisible.value = false)
/**
 * 键盘事件处理
 * @param event 事件对象
 */
const handleKeyDown = (event) => {
  if (!isModalVisible.value) return
  switch (event.key) {
    case 'ArrowLeft':
      if (currentIndex.value > 0) currentIndex.value -= 1
      break
    case 'ArrowRight':
      if (currentIndex.value < images.value.length - 1) currentIndex.value += 1
      break
    case 'Escape':
      closeModal()
      break
  }
}
/**
 * 手指按下的初始 X 坐标
 */
let touchStartX = 0
/**
 * 手指抬起的最终 X 坐标
 */
let touchEndX = 0

/**
 * 处理触摸开始事件
 * @param event 事件对象
 */
const handleTouchStart = (event) => {
  event.preventDefault() // 阻止默认行为
  touchStartX = event.touches[0].clientX // 记录手指按下的初始位置
  // console.log(`Touch start at: ${touchStartX}`);
}

/**
 * 处理触摸移动事件
 * @param event 事件对象
 */
const handleTouchMove = (event) => {
  event.preventDefault() // 阻止默认行为
  const currentX = event.touches[0].clientX
  const moveDistance = currentX - touchStartX

  // 可选：添加视觉反馈（例如轻微移动图片的位置）
  // console.log(`Move distance: ${moveDistance}`);
}

/**
 * 处理触摸结束事件
 * - 向右滑动：切换到上一张图片
 * - 向左滑动：切换到下一张图片
 */
const handleTouchEnd = () => {
  const swipeThreshold = 50 // 滑动阈值，单位为像素
  const swipeDistance = touchEndX - touchStartX // 计算滑动距离
  console.log(`Touch end at: ${touchEndX}, Distance: ${swipeDistance}`)

  if (swipeDistance > swipeThreshold && currentIndex.value > 0) {
    currentIndex.value--
  } else if (
    swipeDistance < -swipeThreshold &&
    currentIndex.value < images.value.length - 1
  ) {
    currentIndex.value++
  }
}
/**
 * 鼠标按下的初始 X 坐标
 */
let mouseStartX = 0
/**
 * 处理鼠标按下事件
 * @param event 事件对象
 */
const handleMouseDown = (event) => {
  event.preventDefault()
  mouseStartX = event.clientX // 记录鼠标按下的初始位置
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}
/**
 * 处理鼠标移动事件
 * @param event 事件对象
 */
const handleMouseMove = (event) => {
  event.preventDefault()
  const currentX = event.clientX
  const moveDistance = currentX - mouseStartX
  // 可以在这里添加一些视觉反馈，比如轻微移动图片的位置
  // console.log(`Move distance: ${moveDistance}`);
}
/**
 * 处理鼠标松开事件
 */
const handleMouseUp = () => {
  const swipeThreshold = 50 // 滑动阈值，单位为像素
  const modalContent = document.querySelector('.__dynamic__modal-content')
  if (!modalContent) return

  // 使用鼠标松开时的位置
  const currentX = event.clientX // 直接从事件对象中获取
  const moveDistance = currentX - mouseStartX

  if (moveDistance > swipeThreshold && currentIndex.value > 0) {
    currentIndex.value-- // 向右滑动，切换到上一张图片
  } else if (
    moveDistance < -swipeThreshold &&
    currentIndex.value < images.value.length - 1
  ) {
    currentIndex.value++ // 向左滑动，切换到下一张图片
  }

  // 清理变量和事件监听器
  mouseStartX = 0
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
}

onMounted(() => {
  const imgElements = imageContainer.value.querySelectorAll('img')
  images.value = Array.from(imgElements).map((img) => img.src)

  // 添加键盘事件监听器
  window.addEventListener('keydown', handleKeyDown)

  // 添加触摸事件监听器
  const modalContent = document.querySelector(
    `.__dynamic__modal-content-${instanceId}`
  )
  if (modalContent) {
    modalContent.addEventListener('touchstart', handleTouchStart)
    modalContent.addEventListener('touchmove', handleTouchMove) // 绑定 touchmove 事件
    modalContent.addEventListener('touchend', (event) => {
      touchEndX = event.changedTouches[0].clientX // 记录手指抬起的最终位置
      handleTouchEnd()
    })

    // 添加鼠标事件监听器
    modalContent.addEventListener('mousedown', handleMouseDown)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)

  // 移除触摸事件监听器
  const modalContent = document.querySelector(
    `.__dynamic__modal-content-${instanceId}`
  )
  if (modalContent) {
    modalContent.removeEventListener('touchstart', handleTouchStart)
    modalContent.removeEventListener('touchmove', handleTouchMove) // 移除 touchmove 事件
    modalContent.removeEventListener('touchend', handleTouchEnd)
    modalContent.removeEventListener('mousedown', handleMouseDown)
  }
})
// ----------------------------------------------------------
// #endregion - 图片处理
// ----------------------------------------------------------

// ----------------------------------------------------------
// #region - 文案处理
// ----------------------------------------------------------

/**
 * 文本容器的 DOM 引用
 */
const textContainer = ref(null)

/**
 * 控制文本是否折叠
 */
const isCollapsed = ref(true)

/**
 * 是否需要显示“全文”按钮
 */
const isExpandable = ref(false)

/**
 * 计算一级子元素数量并判断是否需要折叠
 * 1. 获取所有一级子元素
 * 2. 如果一级子元素数量大于 2，则可以展开
 */
const checkChildElementCount = () => {
  if (textContainer.value) {
    const childElements = textContainer.value.children
    isExpandable.value = childElements.length > 2
  }
}

/**
 * 切换折叠/展开状态
 */
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

/**
 * 在 DOM 渲染后再做计算
 */
onMounted(() => {
  nextTick(checkChildElementCount)
})
// ----------------------------------------------------------
// #endregion - 文案处理
// ----------------------------------------------------------

// ----------------------------------------------------------
// #region - 时间信息处理
// ----------------------------------------------------------
const props = defineProps({
  times: {
    type: Array,
    default: () => [],
    validator: (value) => {
      // 验证数组长度和内容类型
      return (
        value.length >= 2 &&
        value.length <= 6 &&
        value.every((item, index) => {
          if (index === 0) return typeof item === 'number' && item >= 0 // 年
          if (index === 1)
            return typeof item === 'number' && item >= 1 && item <= 12 // 月
          if (index === 2)
            return typeof item === 'number' && item >= 1 && item <= 31 // 日
          if (index === 3)
            return typeof item === 'number' && item >= 0 && item <= 23 // 小时
          if (index === 4)
            return typeof item === 'number' && item >= 0 && item <= 59 // 分钟
          if (index === 5)
            return typeof item === 'number' && item >= 0 && item <= 59 // 秒
          return false
        })
      )
    },
  },
})

const formattedTime = computed(() => {
  if (props.times.length < 2) return ''

  const [year, month, day, hour, minute, second] = props.times

  // 格式化年月日
  const datePart = `${String(year).padStart(4, '0')}-${String(month).padStart(
    2,
    '0'
  )}`
  const dayPart = day !== undefined ? `-${String(day).padStart(2, '0')}` : ''

  // 格式化时分秒
  let timePart = ''
  if (hour !== undefined && minute !== undefined && second !== undefined) {
    timePart = ` ${String(hour).padStart(2, '0')}:${String(minute).padStart(
      2,
      '0'
    )}:${String(second).padStart(2, '0')}`
  } else if (hour !== undefined && minute !== undefined) {
    timePart = ` ${String(hour).padStart(2, '0')}:${String(minute).padStart(
      2,
      '0'
    )}`
  }

  // 👣 天数
  let daysSinceBirthday = ''
  if (day !== undefined) {
    // 确保时间部分为 00:00:00，避免时区和时间部分的影响
    const birthday = new Date(Date.UTC(1999, 5, 29)) // 注意：月份从 0 开始计数
    const currentDate = new Date(Date.UTC(year, month - 1, day)) // 同样使用 UTC 时间
    const diffInMilliseconds = currentDate - birthday
    const diffInDays =
      Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24)) + 1
    daysSinceBirthday = `👣 ${diffInDays} | `
  }

  return daysSinceBirthday + datePart + dayPart + timePart
})
// ----------------------------------------------------------
// #endregion - 时间信息处理
// ----------------------------------------------------------
</script>

<template>
  <div class="textContainer">
    <div
      class="textContent"
      :class="{ collapsed: isCollapsed }"
      ref="textContainer"
    >
      <slot name="text-area"></slot>
    </div>
    <button
      v-if="isExpandable"
      class="toggleButton"
      @click="toggleCollapse"
    >
      {{ isCollapsed ? '全文' : '收起' }}
    </button>
  </div>

  <div class="imageContainer" ref="imageContainer">
    <slot
      name="image-list"
      :openModal="openModal"
      :closeModal="closeModal"
      :currentImage="currentImage"
      :isModalVisible="isModalVisible"
    ></slot>
  </div>
  <div class="modal" v-show="isModalVisible" @click.self="closeModal">
    <span class="close" @click="closeModal">&times;</span>
    <img
      :class="['modalContent', `__dynamic__modal-content-${instanceId}`]"
      :src="currentImage"
      alt="Preview"
      @mousedown="handleMouseDown"
    />
  </div>

  <div class="timeContainer">
    <p>{{ formattedTime }}</p>
  </div>
  <div class="otherInfoContainer">
    <slot name="other-info"></slot>
  </div>
</template>

<style scoped lang="scss">
// Footprints 组件样式

// 其他信息容器和时间容器
.otherInfoContainer,
.timeContainer {
  font-size: 0.8rem;
  color: gray;
}

// 文本容器
.textContainer {
  position: relative;
  margin-bottom: 1rem;
}

// 文本内容
.textContent {
  overflow: hidden;
  transition: max-height 0.3s ease;

  // 折叠状态：隐藏从第三个开始的所有一级子元素
  &.collapsed > :nth-child(n + 3) {
    display: none;
  }
}

// 切换按钮
.toggleButton {
  display: block;
  margin-top: 0.5rem;
  background-color: transparent;
  color: #007bff;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 1rem;

  &:hover {
    text-decoration: underline;
  }
}

// 图片容器
.imageContainer {
  display: flex;
  width: 100%;
  flex-wrap: wrap;

  img {
    width: calc(33.33% - 10px);
    aspect-ratio: 1; // 设置宽高比为 1:1
    object-fit: cover;
    cursor: pointer;
    margin: 0.3rem;
  }
}

// 模态框
.modal {
  display: flex;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgba(0, 0, 0, 1);
  align-items: center;
  justify-content: center;
}

// 模态框内容（图片）
.modalContent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 90%;
  max-height: 90%;
  cursor: grab;
}

// 关闭按钮
.close {
  position: absolute;
  top: 20px;
  right: 30px;
  color: white;
  font-size: 30px;
  font-weight: bold;
  cursor: pointer;
}
</style>
