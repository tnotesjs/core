/**
 * localSearchReindexPatch.test.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { patchVPNavBarSearch } from './localSearchReindexPatch'

describe('patchVPNavBarSearch', () => {
  it('patches vitepress VPNavBarSearch with remount key', () => {
    const vpRoot = path.dirname(
      fileURLToPath(import.meta.resolve('vitepress/package.json')),
    )
    const source = fs.readFileSync(
      path.join(
        vpRoot,
        'dist/client/theme-default/components/VPNavBarSearch.vue',
      ),
      'utf8',
    )

    const patched = patchVPNavBarSearch(source)
    expect(patched).not.toBeNull()
    expect(patched).toContain('localSearchIndexBridge')
    expect(patched).toContain(':key="searchBoxRemountKey"')
  })
})
