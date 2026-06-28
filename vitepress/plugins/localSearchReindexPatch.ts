/**
 * localSearchReindexPatch.ts
 *
 * VitePress Local Search 组件 dev patch（可单测）
 *
 * 只 patch VPNavBarSearch（:key remount），不修改 VPLocalSearchBox 索引逻辑。
 */

export function patchVPLocalSearchBox(_code: string): string | null {
  return null
}

export function patchVPNavBarSearch(code: string): string | null {
  if (code.includes('localSearchIndexBridge')) return null
  if (!code.includes('VPLocalSearchBox')) return null

  let next = code.replace(
    /<script lang="ts" setup>\r?\n/,
    `<script lang="ts" setup>
import { searchBoxRemountKey } from '@tnotesjs/core/vitepress/client/localSearchIndexBridge'
`,
  )

  next = next.replace(
    /<VPLocalSearchBox\r?\n\s+v-if="showSearch"\r?\n\s+@close="showSearch = false"\r?\n\s+\/>/,
    `<VPLocalSearchBox
        v-if="showSearch"
        :key="searchBoxRemountKey"
        @close="showSearch = false"
      />`,
  )

  return next === code ? null : next
}

/** @internal test alias */
export const patchVPLocalSearchBoxForTest = patchVPLocalSearchBox
