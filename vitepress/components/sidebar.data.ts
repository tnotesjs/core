/**
 * vitepress/components/sidebar.data.ts
 */

import fs from 'node:fs'
import path from 'node:path'

import { TocService } from '../../services/toc/service'

const rootPath = process.cwd()
const sidebarFilePath = path.resolve(rootPath, 'sidebar.json')
const tocFilePath = path.resolve(rootPath, 'TOC.md')

/**
 * VitePress Data Loader for Sidebar
 * 以 TOC.md 为唯一数据源，加载前重建 sidebar.json，并监听 TOC/sidebar 变化做 HMR
 */

interface SidebarItem {
  text: string
  link: string
}

interface SidebarGroup {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
}

interface SidebarConfig {
  '/notes/': SidebarGroup[]
}

export default {
  watch: [sidebarFilePath, tocFilePath],

  async load(): Promise<SidebarConfig> {
    try {
      const tocService = TocService.getInstance()
      await tocService.regenerateSidebar()

      const fileContent = fs.readFileSync(sidebarFilePath, 'utf-8')
      const sidebarArray = JSON.parse(fileContent) as SidebarGroup[]

      const sidebarData: SidebarConfig = {
        '/notes/': sidebarArray,
      }

      console.log('[sidebar.data.ts] Sidebar loaded from TOC.md')

      return sidebarData
    } catch (error) {
      console.error('❌ [sidebar.data.ts] Failed to load sidebar.json:', error)

      return {
        '/notes/': [],
      }
    }
  },
}
