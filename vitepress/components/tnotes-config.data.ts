import fs from 'node:fs'
import path from 'node:path'

const rootPath = process.cwd()

export interface TNotesConfig {
  sidebarShowNoteId: boolean
  author?: string
  repoName?: string
  [key: string]: any
}

export default {
  watch: [path.resolve(rootPath, '.tnotes.json')],
  load(watchedFiles: string[]): TNotesConfig {
    console.log('[tnotes-config.data.ts] Config loaded')
    const fileContent = fs.readFileSync(watchedFiles[0], 'utf-8')
    const config = JSON.parse(fileContent) as TNotesConfig
    return config
  },
}
