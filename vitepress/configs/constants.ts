/**
 * .vitepress/config/constants.ts
 *
 * 常量配置 - 从运行时配置派生，不再硬编码相对路径 import
 */
import type { TNotesConfig } from '../../types'

/**
 * 获取忽略的文件和目录列表
 */
export function getIgnoreList(config: TNotesConfig): string[] {
  return [...config.ignore_dirs.map((dir: string) => `**/${dir}/**`)]
}

/**
 * 获取 GitHub Pages URL
 */
export function getGithubPageUrl(config: TNotesConfig): string {
  return (
    'https://' +
    config.author.toLowerCase() +
    '.github.io/' +
    config.repoName +
    '/'
  )
}
