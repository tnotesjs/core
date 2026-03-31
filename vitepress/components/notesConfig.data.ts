// .vitepress/components/notesConfig.data.ts
import fs from 'node:fs'
import path from 'node:path'

const rootPath = process.cwd()

/**
 * 从配置文件读取忽略目录列表
 * 注意：data loader 运行在 Node.js 上下文，不经过 vite.define，
 * 因此需要直接读取配置文件而非从 constants.ts 导入。
 */
function getIgnoreDirs(): string[] {
  try {
    const configPath = path.resolve(process.cwd(), '.tnotes.json')
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return config.ignore_dirs || []
  } catch {
    return []
  }
}

interface NoteConfig {
  [key: string]: any
  redirect?: string
}

export default {
  // 监听笔记目录下第一级的 .tnotes.json 文件变化
  watch: [
    path.resolve(rootPath, 'notes').replace(/\\/g, '/') + '/*/.tnotes.json',
  ],
  load(watchedFiles: string[]): Record<string, NoteConfig> {
    // console.log('watchedFiles', watchedFiles)

    const IGNORE_DIRS = getIgnoreDirs()

    // 初始化一个空对象，用于存储所有笔记的配置数据（以笔记索引为键）
    const allNotesConfig: Record<string, NoteConfig> = {}

    // 遍历所有监听到的 .tnotes.json 文件
    watchedFiles.forEach((filePath) => {
      try {
        // 检查目录是否在忽略列表中
        const dirName = filePath.split('/').slice(-2, -1)[0] // 提取目录名称
        if (IGNORE_DIRS.includes(dirName)) {
          console.log(`Skipping ignored directory: ${dirName}`)
          return // 跳过忽略的目录
        }

        // 读取文件内容
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const configData = JSON.parse(fileContent) as NoteConfig

        // 提取笔记索引（文件路径中前 4 个数字）
        const noteIndexMatch = filePath.match(/notes\/(\d{4})\./)
        if (noteIndexMatch) {
          const noteIndex = noteIndexMatch[1] // 获取笔记索引
          const redirect = filePath.replace(/\.tnotes\.json$/, 'README')
          allNotesConfig[noteIndex] = {
            ...configData,
            redirect,
          } // 将配置数据存入对象
        }
      } catch (error) {
        console.error(`Failed to load config file: ${filePath}`, error)
      }
    })

    // console.log('All notes config loaded:', allNotesConfig)

    return allNotesConfig
  },
}
