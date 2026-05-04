<template>
  <div class="settingsWrapper">
    <section class="settingsSection">
      <div class="settingItem">
        <div class="settingMeta">
          <div class="labelLine">
            <span class="itemName">本地知识库路径</span>
            <span class="infoWrap">
              <span class="infoIcon">?</span>
              <span class="tooltip">
                适用于 PC 桌面环境，需要本地安装 VS Code。配置后可从页面快速打开本地笔记目录。
              </span>
            </span>
          </div>
          <span v-if="path" class="statusText">已配置</span>
        </div>

        <div class="inputGroup">
          <input
            v-model="path"
            type="text"
            placeholder="/Users/username/notes"
            class="input"
          />
          <button
            v-if="path"
            @click="clearPath"
            class="clearBtn"
            title="清空"
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      <div class="settingItem">
        <div class="settingMeta">
          <div class="labelLine">
            <span class="itemName">侧边栏目录</span>
            <span class="infoWrap">
              <span class="infoIcon">?</span>
              <span class="tooltip">
                控制侧边栏笔记编号显示，以及目录行距密度。保存后会刷新页面以应用侧边栏配置。
              </span>
            </span>
          </div>
          <span v-if="showNoteId" class="statusText">显示编号</span>
        </div>

        <div class="fieldStack">
          <label class="checkRow">
            <input
              v-model="showNoteId"
              type="checkbox"
              class="checkbox"
            />
            <span>显示笔记编号</span>
          </label>

          <div class="controlRow">
            <span class="controlLabel">目录风格</span>
            <div class="segmented">
              <label
                v-for="option in sidebarDensityOptions"
                :key="option.value"
                :class="[
                  'segment',
                  { activeSegment: sidebarDensity === option.value },
                ]"
              >
                <input
                  v-model="sidebarDensity"
                  type="radio"
                  name="sidebar-density"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </div>

          <div class="prefixGrid">
            <label class="field">
              <span class="controlLabel">已完成笔记的前缀</span>
              <input
                v-model="donePrefix"
                type="text"
                placeholder="可留空"
                class="input prefixInput"
              />
            </label>

            <label class="field">
              <span class="controlLabel">未完成笔记前缀</span>
              <input
                v-model="undonePrefix"
                type="text"
                placeholder="可留空"
                class="input prefixInput"
              />
            </label>
          </div>
        </div>
      </div>

      <div class="settingItem">
        <div class="settingMeta">
          <div class="labelLine">
            <span class="itemName">MarkMap 思维导图</span>
            <span class="infoWrap">
              <span class="infoIcon">?</span>
              <span class="tooltip">
                配置 MarkMap 的默认分支配色和初始展开层级。
              </span>
            </span>
          </div>
        </div>

        <div class="inlineGrid">
          <label class="field">
            <span class="controlLabel">分支主题</span>
            <select v-model="markmapTheme" class="select">
              <option value="default">默认</option>
              <option value="colorful">多彩</option>
              <option value="dark">深色</option>
            </select>
          </label>

          <label class="field">
            <span class="controlLabel">展开层级</span>
            <div class="inputWithUnit">
              <input
                v-model.number="markmapExpandLevel"
                type="number"
                min="1"
                max="100"
                class="input"
              />
              <span class="unit">层</span>
            </div>
          </label>
        </div>
      </div>
    </section>

    <div class="actionBar">
      <button v-if="hasChanges" @click="reset" class="resetBtn">
        重置
      </button>
      <button
        @click="save"
        class="saveBtn"
        :class="{ disabled: !hasChanges }"
        :disabled="!hasChanges"
      >
        {{ saveText }}
      </button>
    </div>

    <Transition name="toast">
      <div v-if="showSuccessToast" class="toast">保存成功</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import {
  NOTES_DIR_KEY,
  MARKMAP_THEME_KEY,
  MARKMAP_EXPAND_LEVEL_KEY,
  SIDEBAR_SHOW_NOTE_ID_KEY,
  SIDEBAR_DENSITY_KEY,
  SIDEBAR_DONE_PREFIX_KEY,
  SIDEBAR_UNDONE_PREFIX_KEY,
} from '../constants'
// @ts-expect-error - VitePress Data Loader
import { data as tnotesConfig } from '../tnotes-config.data'

type SidebarDensity = 'compact' | 'default' | 'loose'

const DEFAULT_SIDEBAR_DENSITY: SidebarDensity = 'default'
const DEFAULT_DONE_PREFIX = '✅'
const DEFAULT_UNDONE_PREFIX = '⏰'
const sidebarDensityOptions: Array<{
  label: string
  value: SidebarDensity
}> = [
  { label: '紧凑', value: 'compact' },
  { label: '默认', value: 'default' },
  { label: '宽松', value: 'loose' },
]

const path = ref('')
const originalPath = ref('')
const markmapTheme = ref('default')
const originalMarkmapTheme = ref('default')
const markmapExpandLevel = ref(5)
const originalMarkmapExpandLevel = ref(5)
const showNoteId = ref(false)
const originalShowNoteId = ref(false)
const sidebarDensity = ref<SidebarDensity>(DEFAULT_SIDEBAR_DENSITY)
const originalSidebarDensity = ref<SidebarDensity>(DEFAULT_SIDEBAR_DENSITY)
const donePrefix = ref(DEFAULT_DONE_PREFIX)
const originalDonePrefix = ref(DEFAULT_DONE_PREFIX)
const undonePrefix = ref(DEFAULT_UNDONE_PREFIX)
const originalUndonePrefix = ref(DEFAULT_UNDONE_PREFIX)
const showSuccessToast = ref(false)

const hasChanges = computed(
  () =>
    path.value !== originalPath.value ||
    markmapTheme.value !== originalMarkmapTheme.value ||
    markmapExpandLevel.value !== originalMarkmapExpandLevel.value ||
    showNoteId.value !== originalShowNoteId.value ||
    sidebarDensity.value !== originalSidebarDensity.value ||
    donePrefix.value !== originalDonePrefix.value ||
    undonePrefix.value !== originalUndonePrefix.value,
)

const saveText = computed(() => {
  if (!hasChanges.value) return '无更改'
  return '保存'
})

onMounted(() => {
  if (typeof window === 'undefined') return

  const savedPath = localStorage.getItem(NOTES_DIR_KEY) || ''
  path.value = savedPath
  originalPath.value = savedPath

  const savedTheme = localStorage.getItem(MARKMAP_THEME_KEY) || 'default'
  markmapTheme.value = savedTheme
  originalMarkmapTheme.value = savedTheme

  const savedLevel = localStorage.getItem(MARKMAP_EXPAND_LEVEL_KEY) || '5'
  markmapExpandLevel.value = parseInt(savedLevel, 10)
  originalMarkmapExpandLevel.value = markmapExpandLevel.value

  const savedShowNoteId = localStorage.getItem(SIDEBAR_SHOW_NOTE_ID_KEY)
  showNoteId.value =
    savedShowNoteId !== null
      ? savedShowNoteId === 'true'
      : tnotesConfig?.sidebarShowNoteId ?? false
  originalShowNoteId.value = showNoteId.value

  const savedSidebarDensity = normalizeSidebarDensity(
    localStorage.getItem(SIDEBAR_DENSITY_KEY),
  )
  sidebarDensity.value = savedSidebarDensity
  originalSidebarDensity.value = savedSidebarDensity

  const savedDonePrefix = localStorage.getItem(SIDEBAR_DONE_PREFIX_KEY)
  donePrefix.value =
    savedDonePrefix !== null ? savedDonePrefix : DEFAULT_DONE_PREFIX
  originalDonePrefix.value = donePrefix.value

  const savedUndonePrefix = localStorage.getItem(SIDEBAR_UNDONE_PREFIX_KEY)
  undonePrefix.value =
    savedUndonePrefix !== null ? savedUndonePrefix : DEFAULT_UNDONE_PREFIX
  originalUndonePrefix.value = undonePrefix.value
})

function normalizeSidebarDensity(value: string | null): SidebarDensity {
  if (value === 'compact' || value === 'default' || value === 'loose') {
    return value
  }

  return DEFAULT_SIDEBAR_DENSITY
}

function clearPath() {
  path.value = ''
}

function save() {
  if (!hasChanges.value) return

  try {
    const needReload =
      showNoteId.value !== originalShowNoteId.value ||
      sidebarDensity.value !== originalSidebarDensity.value ||
      donePrefix.value !== originalDonePrefix.value ||
      undonePrefix.value !== originalUndonePrefix.value

    localStorage.setItem(NOTES_DIR_KEY, path.value)
    localStorage.setItem(MARKMAP_THEME_KEY, markmapTheme.value)
    localStorage.setItem(
      MARKMAP_EXPAND_LEVEL_KEY,
      markmapExpandLevel.value.toString(),
    )
    localStorage.setItem(SIDEBAR_SHOW_NOTE_ID_KEY, showNoteId.value.toString())
    localStorage.setItem(SIDEBAR_DENSITY_KEY, sidebarDensity.value)
    localStorage.setItem(SIDEBAR_DONE_PREFIX_KEY, donePrefix.value)
    localStorage.setItem(SIDEBAR_UNDONE_PREFIX_KEY, undonePrefix.value)

    originalPath.value = path.value
    originalMarkmapTheme.value = markmapTheme.value
    originalMarkmapExpandLevel.value = markmapExpandLevel.value
    originalShowNoteId.value = showNoteId.value
    originalSidebarDensity.value = sidebarDensity.value
    originalDonePrefix.value = donePrefix.value
    originalUndonePrefix.value = undonePrefix.value

    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 2400)

    if (needReload) {
      setTimeout(() => {
        window.location.reload()
      }, 450)
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    alert('保存失败，请检查浏览器设置')
  }
}

function reset() {
  path.value = originalPath.value
  markmapTheme.value = originalMarkmapTheme.value
  markmapExpandLevel.value = originalMarkmapExpandLevel.value
  showNoteId.value = originalShowNoteId.value
  sidebarDensity.value = originalSidebarDensity.value
  donePrefix.value = originalDonePrefix.value
  undonePrefix.value = originalUndonePrefix.value
}
</script>

<style scoped lang="scss">
.settingsWrapper {
  max-width: 680px;
  margin: 0 auto;
  padding: 12px 4px 0;
}

.settingsSection {
  border-top: 1px solid var(--vp-c-divider);
}

.settingItem {
  display: grid;
  grid-template-columns: minmax(150px, 0.42fr) minmax(220px, 1fr);
  gap: 18px;
  padding: 18px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.settingMeta {
  min-width: 0;
}

.labelLine {
  display: flex;
  align-items: center;
  gap: 6px;
}

.itemName {
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
}

.statusText {
  display: inline-block;
  margin-top: 4px;
  color: var(--vp-c-text-3);
  font-size: 12px;
  line-height: 18px;
}

.infoWrap {
  position: relative;
  display: inline-flex;
}

.infoIcon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
  border-radius: 50%;
  cursor: help;
  font-size: 11px;
  line-height: 1;
}

.tooltip {
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  z-index: 10;
  width: 240px;
  padding: 8px 10px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: var(--vp-shadow-2);
  font-size: 12px;
  line-height: 18px;
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, 4px);
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.infoWrap:hover .tooltip,
.infoWrap:focus-within .tooltip {
  opacity: 1;
  transform: translate(-50%, 0);
}

.inputGroup {
  position: relative;
}

.input,
.select {
  width: 100%;
  height: 34px;
  box-sizing: border-box;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.input {
  padding: 0 34px 0 10px;
  font-family: var(--vp-font-family-mono);
}

.select {
  padding: 0 10px;
  cursor: pointer;
}

.input::placeholder {
  color: var(--vp-c-text-3);
}

.input:focus,
.select:focus {
  border-color: var(--vp-c-brand-1);
}

.clearBtn {
  position: absolute;
  top: 50%;
  right: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: var(--vp-c-text-3);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transform: translateY(-50%);
}

.clearBtn:hover {
  color: var(--vp-c-danger-1);
  background: var(--vp-c-danger-soft);
}

.fieldStack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkRow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-size: 13px;
  line-height: 20px;
  user-select: none;
}

.checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--vp-c-brand-1);
  cursor: pointer;
}

.controlRow,
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.controlLabel {
  color: var(--vp-c-text-2);
  font-size: 12px;
  line-height: 18px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}

.segment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 32px;
  color: var(--vp-c-text-2);
  border-right: 1px solid var(--vp-c-divider);
  cursor: pointer;
  font-size: 13px;
  user-select: none;
}

.segment:last-child {
  border-right: none;
}

.segment input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.segment:hover,
.activeSegment {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-default-soft);
}

.activeSegment {
  font-weight: 600;
}

.inlineGrid {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 12px;
}

.prefixGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.prefixInput {
  padding-right: 10px;
  font-family: var(--vp-font-family-base);
}

.inputWithUnit {
  position: relative;
}

.inputWithUnit .input {
  padding-right: 34px;
}

.unit {
  position: absolute;
  top: 50%;
  right: 10px;
  color: var(--vp-c-text-3);
  font-size: 12px;
  pointer-events: none;
  transform: translateY(-50%);
}

.actionBar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
}

.saveBtn,
.resetBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}

.saveBtn {
  color: #fff;
  background: var(--vp-c-brand-1);
  border: 1px solid var(--vp-c-brand-1);
}

.saveBtn:hover:not(.disabled) {
  background: var(--vp-c-brand-2);
}

.saveBtn.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.resetBtn {
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}

.resetBtn:hover {
  border-color: var(--vp-c-brand-1);
}

.toast {
  position: fixed;
  top: 78px;
  left: 50%;
  z-index: 1000;
  padding: 8px 12px;
  color: #fff;
  background: var(--vp-c-brand-1);
  border-radius: 6px;
  box-shadow: var(--vp-shadow-2);
  font-size: 13px;
  transform: translateX(-50%);
}

:global(.toast-enter-active),
:global(.toast-leave-active) {
  transition: all 0.2s ease;
}

:global(.toast-enter-from),
:global(.toast-leave-to) {
  opacity: 0;
  transform: translate(-50%, -8px);
}

@media (max-width: 768px) {
  .settingsWrapper {
    padding: 0;
  }

  .settingItem {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 16px 0;
  }

  .inlineGrid {
    grid-template-columns: 1fr;
  }

  .prefixGrid {
    grid-template-columns: 1fr;
  }

  .tooltip {
    left: 0;
    width: min(260px, calc(100vw - 48px));
    transform: translate(0, 4px);
  }

  .infoWrap:hover .tooltip,
  .infoWrap:focus-within .tooltip {
    transform: translate(0, 0);
  }

  .actionBar {
    flex-direction: column-reverse;
  }

  .saveBtn,
  .resetBtn {
    width: 100%;
  }
}
</style>
