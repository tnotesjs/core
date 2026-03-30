/**
 * .vitepress/tnotes/core/NoteManager.ts
 *
 * 笔记管理器 - 负责笔记的扫描、验证和基本操作
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs'
import { join } from 'path'
import type { NoteInfo, NoteConfig } from '../types'
import { NOTES_PATH } from '../config/constants'
import { logger, extractNoteIndex } from '../utils'

/**
 * 笔记管理器类（单例）
 */
export class NoteManager {
  private static instance: NoteManager

  private constructor() {}

  static getInstance(): NoteManager {
    if (!NoteManager.instance) {
      NoteManager.instance = new NoteManager()
    }
    return NoteManager.instance
  }

  /**
   * 扫描所有笔记并校验数据完整性
   *
   * 校验内容：noteIndex 冲突、config id 缺失、config id 重复
   * 任一检查失败则终止进程
   *
   * @returns 笔记信息数组
   */
  scanNotes(): NoteInfo[] {
    const notes: NoteInfo[] = []

    if (!existsSync(NOTES_PATH)) {
      logger.warn(`Notes directory not found: ${NOTES_PATH}`)
      return notes
    }

    const noteDirs = readdirSync(NOTES_PATH)
      .filter((dir) => {
        const fullPath = join(NOTES_PATH, dir)
        return (
          statSync(fullPath).isDirectory() &&
          !dir.startsWith('.') &&
          /^\d{4}\./.test(dir)
        )
      })
      .sort()

    for (const dirName of noteDirs) {
      const notePath = join(NOTES_PATH, dirName)
      const readmePath = join(notePath, 'README.md')
      const configPath = join(notePath, '.tnotes.json')

      if (!existsSync(readmePath)) {
        logger.warn(`README not found in note: ${dirName}`)
        continue
      }

      let config: NoteConfig | undefined
      if (existsSync(configPath)) {
        try {
          config = this.validateAndFixConfig(configPath) || undefined
        } catch {
          // validateAndFixConfig 内部已输出错误信息，此处静默处理
          // config id 缺失等问题由 validateNotes() 统一报告
        }
      }

      const id = this.getNoteIndexFromDir(dirName)

      notes.push({
        index: id,
        path: notePath,
        dirName,
        readmePath,
        configPath,
        config,
      })
    }

    this.validateNotes(notes)

    return notes
  }

  /**
   * 校验笔记数据完整性（noteIndex 冲突 + config id 缺失/重复）
   * 任一检查失败则终止进程
   */
  private validateNotes(notes: NoteInfo[]): void {
    const errors: string[] = []

    // 检查 noteIndex 冲突
    const indexMap = this.buildNoteIndexMap(notes.map((n) => n.dirName))
    for (const [index, dirNames] of indexMap.entries()) {
      if (dirNames.length > 1) {
        errors.push(`⚠️  检测到重复的笔记编号：`)
        errors.push(`   编号 ${index} 被以下笔记重复使用：`)
        dirNames.forEach((dirName) => errors.push(`      - ${dirName}`))
      }
    }

    // 检查 config id 缺失
    const missingConfigId: string[] = []
    for (const note of notes) {
      if (!note.config || !note.config.id) {
        missingConfigId.push(note.dirName)
      }
    }
    if (missingConfigId.length > 0) {
      errors.push(`⚠️  检测到笔记配置 ID 缺失：`)
      missingConfigId.forEach((dirName) => errors.push(`      - ${dirName}`))
    }

    // 检查 config id 重复
    const configIdMap = new Map<string, string[]>()
    for (const note of notes) {
      if (note.config?.id) {
        if (!configIdMap.has(note.config.id))
          configIdMap.set(note.config.id, [])
        configIdMap.get(note.config.id)!.push(note.dirName)
      }
    }
    for (const [configId, dirNames] of configIdMap.entries()) {
      if (dirNames.length > 1) {
        errors.push(`⚠️  检测到重复的笔记配置 ID：`)
        errors.push(`   配置 ID ${configId} 被以下笔记重复使用：`)
        dirNames.forEach((dirName) => errors.push(`      - ${dirName}`))
      }
    }

    if (errors.length > 0) {
      for (const line of errors) {
        logger.error(line)
      }
      logger.error('\n请修复上述问题后重新启动服务。\n')
      process.exit(1)
    }
  }

  /**
   * 按 4 位数字编号对目录名分组
   * @param dirNames - 目录名数组
   * @returns 编号 -> 目录名数组 的映射
   */
  private buildNoteIndexMap(dirNames: string[]): Map<string, string[]> {
    const indexMap = new Map<string, string[]>()
    for (const name of dirNames) {
      const index = name.slice(0, 4)
      if (!indexMap.has(index)) indexMap.set(index, [])
      indexMap.get(index)!.push(name)
    }
    return indexMap
  }

  /**
   * 从目录名提取笔记索引
   * @param dirName - 目录名
   * @returns 笔记索引
   */
  private getNoteIndexFromDir(dirName: string): string {
    return extractNoteIndex(dirName) || dirName
  }

  /** 配置字段顺序 */
  private static readonly FIELD_ORDER: readonly string[] = [
    'bilibili',
    'tnotes',
    'yuque',
    'done',
    'category',
    'enableDiscussions',
    'description',
    'id',
    'created_at',
    'updated_at',
  ]

  /** 默认配置字段 */
  private static readonly DEFAULT_CONFIG_FIELDS = {
    bilibili: [],
    tnotes: [],
    yuque: [],
    done: false,
    enableDiscussions: false,
    description: '',
  } as const

  /** 必需字段（不能缺失） */
  private static readonly REQUIRED_FIELDS = ['id'] as const

  /**
   * 验证并修复配置文件
   * @param configPath - 配置文件路径
   * @returns 修复后的配置对象，失败时返回 null
   */
  private validateAndFixConfig(configPath: string): NoteConfig | null {
    try {
      const configContent = readFileSync(configPath, 'utf-8')
      let config: Partial<NoteConfig>

      try {
        config = JSON.parse(configContent)
      } catch (error) {
        logger.error(`配置文件 JSON 解析失败: ${configPath}`, error)
        return null
      }

      let needsUpdate = false

      // 1. 检查必需字段
      for (const field of NoteManager.REQUIRED_FIELDS) {
        if (!config[field]) {
          logger.error(
            `配置文件缺少必需字段 "${field}": ${configPath}\n` +
              `请手动添加该字段或删除配置文件后重新生成`,
          )
          throw new Error(`Missing required field: ${field}`)
        }
      }

      // 2. 补充缺失的可选字段
      for (const [key, defaultValue] of Object.entries(
        NoteManager.DEFAULT_CONFIG_FIELDS,
      )) {
        if (!(key in config)) {
          ;(config as Record<string, unknown>)[key] = defaultValue
          needsUpdate = true
          logger.info(`补充缺失字段 "${key}": ${configPath}`)
        }
      }

      // 3. 确保时间戳字段存在
      // 这里仅用 Date.now() 占位，确保字段不缺失。
      // 真实的 git 时间戳由 tn:fix-timestamps 命令统一校准。
      const now = Date.now()
      if (!config.created_at) {
        config.created_at = now
        needsUpdate = true
        logger.info(
          `检测到 ${configPath} 缺失  created_at 字段，请执行 tn:fix-timestamps 校准为笔记首次 git commit 的时间）`,
        )
      }
      if (!config.updated_at) {
        config.updated_at = now
        needsUpdate = true
        logger.info(
          `检测到 ${configPath} 缺失  updated_at 字段，请执行 tn:fix-timestamps 校准为笔记最后一次 git commit 的时间）`,
        )
      }

      // 4. 按字段顺序排序
      const sortedConfig = this.sortConfigKeys(config as NoteConfig)

      // 5. 写回文件（如果有变更）
      if (needsUpdate) {
        this.writeNoteConfig(configPath, sortedConfig)
        logger.info(`配置文件已修复: ${configPath}`)
      }

      return sortedConfig
    } catch (error) {
      logger.error(`配置文件验证失败: ${configPath}`, error)
      return null
    }
  }

  /**
   * 按指定顺序排序配置对象的键
   */
  private sortConfigKeys(config: NoteConfig): NoteConfig {
    const configRecord = config as unknown as Record<string, unknown>
    const sorted: Record<string, unknown> = {}

    for (const key of NoteManager.FIELD_ORDER) {
      if (key in config) {
        sorted[key] = configRecord[key]
      }
    }

    for (const key of Object.keys(config)) {
      if (!(key in sorted)) {
        sorted[key] = configRecord[key]
      }
    }

    return sorted as unknown as NoteConfig
  }

  /**
   * 序列化 NoteConfig 为格式化的 JSON 字符串
   * 保持字段顺序，使用 2 空格缩进，末尾含换行符
   */
  serializeNoteConfig(config: NoteConfig): string {
    const sorted = this.sortConfigKeys(config)
    return JSON.stringify(sorted, null, 2) + '\n'
  }

  /**
   * 统一写入笔记配置文件
   * @param configPath - 配置文件路径
   * @param config - 笔记配置
   */
  writeNoteConfig(configPath: string, config: NoteConfig): void {
    writeFileSync(configPath, this.serializeNoteConfig(config), 'utf-8')
  }

  /**
   * 验证笔记配置
   * @param config - 笔记配置
   * @returns 是否有效
   */
  validateConfig(config: NoteConfig): boolean {
    if (!config.id) {
      logger.error('Note config missing id')
      return false
    }

    if (!Array.isArray(config.bilibili)) {
      logger.error(`Invalid bilibili config in note: ${config.id}`)
      return false
    }

    if (!Array.isArray(config.tnotes)) {
      logger.error(`Invalid tnotes config in note: ${config.id}`)
      return false
    }

    if (!Array.isArray(config.yuque)) {
      logger.error(`Invalid yuque config in note: ${config.id}`)
      return false
    }

    if (typeof config.done !== 'boolean') {
      logger.error(`Invalid done status in note: ${config.id}`)
      return false
    }

    if (typeof config.enableDiscussions !== 'boolean') {
      logger.error(`Invalid enableDiscussions status in note: ${config.id}`)
      return false
    }

    return true
  }

  /**
   * 更新笔记配置
   * @param noteInfo - 笔记信息
   * @param config - 新的配置
   */
  updateNoteConfig(noteInfo: NoteInfo, config: NoteConfig): void {
    if (!this.validateConfig(config)) {
      throw new Error(`Invalid config for note: ${noteInfo.dirName}`)
    }

    config.updated_at = Date.now()
    this.writeNoteConfig(noteInfo.configPath, config)
    logger.info(`Updated config for note: ${noteInfo.dirName}`)
  }

  /**
   * 获取笔记信息（通过索引）- 优化版本，直接查找不扫描所有笔记
   * @param noteIndex - 笔记索引
   * @returns 笔记信息，未找到时返回 undefined
   */
  getNoteByIndex(noteIndex: string): NoteInfo | undefined {
    if (!existsSync(NOTES_PATH)) {
      return undefined
    }

    // 直接遍历目录查找匹配的笔记，而不是扫描所有笔记
    const noteDirs = readdirSync(NOTES_PATH)

    for (const dirName of noteDirs) {
      const fullPath = join(NOTES_PATH, dirName)

      // 跳过非目录、隐藏目录、不符合笔记命名规范的目录
      if (
        !statSync(fullPath).isDirectory() ||
        dirName.startsWith('.') ||
        !/^\d{4}\./.test(dirName)
      ) {
        continue
      }

      // 提取笔记索引
      const id = this.getNoteIndexFromDir(dirName)

      // 找到匹配的笔记
      if (id === noteIndex) {
        const notePath = fullPath
        const readmePath = join(notePath, 'README.md')
        const configPath = join(notePath, '.tnotes.json')

        if (!existsSync(readmePath)) {
          return undefined
        }

        let config: NoteConfig | undefined
        if (existsSync(configPath)) {
          try {
            config = this.validateAndFixConfig(configPath) || undefined
          } catch (error) {
            logger.error(
              `Failed to validate config for note: ${dirName}`,
              error,
            )
          }
        }

        return {
          index: id,
          path: notePath,
          dirName,
          readmePath,
          configPath,
          config,
        }
      }
    }

    return undefined
  }
}
