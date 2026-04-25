import { useData } from 'vitepress'
import { ref, computed } from 'vue'

import { redirectAfterRename } from './useRenameRedirect'

import type { NoteConfig } from '../../../../types'
import type { Ref, ComputedRef } from 'vue'

/**
 * 处理笔记配置的保存和重置逻辑
 */
export function useNoteSave(
  currentNoteId: Ref<string>,
  isDev: Ref<boolean> | ComputedRef<boolean>,
  hasConfigChanges: ComputedRef<boolean>,
  titleError: Ref<string>,
  editableNoteTitle: Ref<string>,
  originalNoteTitle: Ref<string>,
  editableNoteStatus: Ref<boolean>,
  originalNoteStatus: Ref<boolean>,
  editableDiscussionsEnabled: Ref<boolean>,
  originalDiscussionsEnabled: Ref<boolean>,
  editableDescription: Ref<string>,
  originalDescription: Ref<string>,
  allNotesConfig: Record<string, NoteConfig & { redirect?: string }>,
  updateOriginalValues: () => void
) {
  const vpData = useData()

  // 保存状态
  const isSaving = ref(false)
  const showSuccessToast = ref(false)
  const savingMessage = ref('') // 保存进度提示

  // 保存按钮文本
  const saveButtonText = computed(() => {
    if (isSaving.value) return '保存中...'
    if (!hasConfigChanges.value) return '无更改'
    return '保存配置'
  })

  // 保存笔记配置
  async function saveNoteConfig() {
    if (!currentNoteId.value || !isDev.value || !hasConfigChanges.value) return

    // 验证标题
    if (titleError.value) {
      alert('❌ 请修正标题错误后再保存')
      return
    }

    const titleChanged =
      editableNoteTitle.value.trim() !== originalNoteTitle.value &&
      editableNoteTitle.value.trim()

    isSaving.value = true
    savingMessage.value = '正在保存配置...'

    let renameNewUrl: string | null = null

    try {
      // 如果标题有变化,先重命名文件夹
      if (titleChanged) {
        savingMessage.value = '正在重命名文件夹...'

        const renameResponse = await fetch('/__tnotes_rename_note', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            noteIndex: currentNoteId.value,
            newTitle: editableNoteTitle.value.trim(),
          }),
        })

        if (!renameResponse.ok) {
          const error = await renameResponse.text()
          throw new Error(`重命名失败: ${error}`)
        }

        // 后端已经完成所有更新（含文件系统、根 README、sidebar）
        const result = (await renameResponse.json()) as {
          success: boolean
          newUrl?: string
        }

        if (!result?.newUrl) {
          throw new Error('重命名响应缺少 newUrl 字段')
        }

        renameNewUrl = result.newUrl
        savingMessage.value = '文件已同步,准备跳转...'
      }

      // 检查是否需要更新配置（无论标题是否改变）
      const needConfigUpdate =
        editableNoteStatus.value !== originalNoteStatus.value ||
        editableDiscussionsEnabled.value !== originalDiscussionsEnabled.value ||
        editableDescription.value.trim() !== originalDescription.value

      if (needConfigUpdate) {
        savingMessage.value = '正在更新笔记配置...'

        const response = await fetch('/__tnotes_update_config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            noteIndex: currentNoteId.value,
            config: {
              done: editableNoteStatus.value,
              enableDiscussions: editableDiscussionsEnabled.value,
              description: editableDescription.value.trim(),
            },
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(error || '保存失败')
        }
      }

      // 更新原始值
      updateOriginalValues()

      // 更新本地配置（立即反映在页面上）
      if (allNotesConfig[currentNoteId.value]) {
        allNotesConfig[currentNoteId.value].done = editableNoteStatus.value
        allNotesConfig[currentNoteId.value].enableDiscussions =
          editableDiscussionsEnabled.value
        allNotesConfig[currentNoteId.value].description =
          editableDescription.value.trim()
      }

      savingMessage.value = '保存成功！'

      // 显示成功提示
      showSuccessToast.value = true
      setTimeout(() => {
        showSuccessToast.value = false
      }, 3000)

      // 如果标题改变了, 显示遮罩并整页跳到新 URL
      if (titleChanged && renameNewUrl) {
        // 提前结束「保存中」状态，避免遮罩退出后按钮文案残留
        isSaving.value = false
        savingMessage.value = ''

        const base = vpData.site.value.base || '/'
        await redirectAfterRename(renameNewUrl, { base })
      }
    } catch (error) {
      console.error('保存配置失败:', error)
      savingMessage.value = ''

      alert(
        '❌ 保存失败: ' +
          (error instanceof Error ? error.message : String(error))
      )
    } finally {
      if (!titleChanged) {
        isSaving.value = false
        savingMessage.value = ''
      }
    }
  }

  return {
    isSaving,
    showSuccessToast,
    savingMessage,
    saveButtonText,
    saveNoteConfig,
  }
}
