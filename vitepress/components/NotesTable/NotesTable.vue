<template>
  <div v-if="errorMessage" class="error">
    {{ errorMessage }}
  </div>

  <div v-else-if="notFoundIds.length > 0" class="warning">
    以下笔记 ID 未找到配置: {{ notFoundIds.join(', ') }}
  </div>

  <table v-if="tableData.length > 0" class="notesTable">
    <thead>
      <tr>
        <th>笔记</th>
        <th>简介</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="note in tableData" :key="note.id">
        <td>
          <a :href="note.url" class="noteLink">
            <span class="noteId">{{ note.id }}.</span>
            <span>{{ note.title }}</span>
          </a>
        </td>
        <td>
          <span class="description" :class="{ empty: !note.description }">
            {{ note.description || '暂无简介' }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'

// @ts-expect-error - VitePress data loader exports data at runtime
import { data as allNotesConfig } from '../notesConfig.data.ts'

interface Props {
  ids: string[]
}

const props = defineProps<Props>()
const vpData = useData()

// 错误消息
const errorMessage = computed(() => {
  if (!props.ids || !Array.isArray(props.ids)) {
    return '错误: ids 属性必须是一个数组'
  }
  if (props.ids.length === 0) {
    return '错误: ids 数组不能为空'
  }
  return null
})

// 未找到的笔记 ID
const notFoundIds = computed(() => {
  if (errorMessage.value) return []

  return props.ids.filter((id) => !allNotesConfig[id])
})

// 表格数据
const tableData = computed(() => {
  if (errorMessage.value) return []

  return props.ids
    .filter((id) => allNotesConfig[id]) // 只保留存在的笔记
    .map((id) => {
      const config = allNotesConfig[id]
      const base = vpData.site.value.base || '/'

      // 从 redirect 路径中提取笔记标题
      // redirect 格式: notes/0001. 标题/README
      let title = id
      if (config.redirect) {
        const match = config.redirect.match(/notes\/\d{4}\.\s*([^/]+)\/README/)
        if (match) {
          title = match[1]
        }
      }

      return {
        id,
        title,
        description: config.description || '',
        url: config.redirect ? `${base}${config.redirect}` : '#',
      }
    })
})
</script>

<style scoped lang="scss">
.notesTable {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5rem 0;
  font-size: 0.95rem;

  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
    border: 1px solid var(--vp-c-divider);
  }

  th {
    background-color: var(--vp-c-bg-soft);
    font-weight: 600;
    color: var(--vp-c-text-1);
  }

  tbody tr {
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--vp-c-bg-soft);
    }
  }

  td {
    color: var(--vp-c-text-2);
  }

  .noteLink {
    color: var(--vp-c-brand-1);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s;

    &:hover {
      color: var(--vp-c-brand-2);
      text-decoration: underline;
    }
  }

  .noteId {
    font-family: var(--vp-font-family-mono);
    font-size: 0.9em;
    color: var(--vp-c-text-3);
    margin-right: 0.5rem;
  }

  .description {
    line-height: 1.6;

    &.empty {
      color: var(--vp-c-text-3);
      font-style: italic;
    }
  }
}

.error {
  padding: 1rem;
  margin: 1rem 0;
  border-left: 4px solid var(--vp-c-danger-1);
  background-color: var(--vp-c-danger-soft);
  color: var(--vp-c-danger-1);
  border-radius: 4px;
}

.warning {
  padding: 1rem;
  margin: 1rem 0;
  border-left: 4px solid var(--vp-c-warning-1);
  background-color: var(--vp-c-warning-soft);
  color: var(--vp-c-warning-1);
  border-radius: 4px;
}
</style>
