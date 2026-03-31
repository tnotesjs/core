/**
 * @tnotes/core 公共 API 入口
 *
 * 导出核心类型、配置管理器等供外部使用。
 */

// 类型导出
export type { TNotesConfig, NoteConfig, NoteInfo } from '../types'

// 配置管理器
export { ConfigManager, getConfigManager } from '../config/ConfigManager'
