/**
 * localSearchIndexBridge.ts
 *
 * dev 下 Local Search HMR：仅 remount 搜索框，不替换 VP 索引加载逻辑。
 */

import { shallowRef } from 'vue'

export const SEARCH_INDEX_HMR_EVENT = 'tnotes:search-index-updated'

/** 变更 searchIndex 后递增，强制 remount VPLocalSearchBox 以重新 import 索引 */
export const searchBoxRemountKey = shallowRef(0)

let hmrInitialized = false

export function initTnotesSearchIndexHmr(): void {
  if (typeof window === 'undefined') return
  if (!import.meta.hot || hmrInitialized) return
  hmrInitialized = true

  import.meta.hot.on(SEARCH_INDEX_HMR_EVENT, () => {
    searchBoxRemountKey.value += 1
  })
}
