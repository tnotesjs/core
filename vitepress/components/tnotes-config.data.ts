/**
 * vitepress/components/tnotes-config.data.ts
 *
 * 负责加载和监视 .tnotes.json 配置文件的变化
 * 供 VitePress 组件使用，确保组件能够实时响应配置变更
 */

import fs from 'node:fs'
import path from 'node:path'

import { validateAndCompleteConfig } from '../../config/defaultConfig'

import type { TNotesConfig } from '../../types'

const rootPath = process.cwd()

export default {
  watch: [path.resolve(rootPath, '.tnotes.json')],
  load(watchedFiles: string[]): TNotesConfig {
    console.log('[tnotes-config.data.ts] Config loaded')
    const fileContent = fs.readFileSync(watchedFiles[0], 'utf-8')
    const rawConfig = JSON.parse(fileContent)
    const { config } = validateAndCompleteConfig(rawConfig)
    return config
  },
}
