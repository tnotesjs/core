/**
 * utils/file.ts
 *
 * 文件操作工具函数
 */

import fs from 'fs'

/**
 * 确保目录存在
 * @param dir - 目录路径
 */
export async function ensureDirectory(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true })
  }
}
