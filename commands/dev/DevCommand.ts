/**
 * .vitepress/tnotes/commands/dev/DevCommand.ts
 *
 * 开发服务器命令 - 使用 VitepressService 和 FileWatcherService
 */

import { BaseCommand } from '../BaseCommand'
import { NoteManager } from '../../core'
import { VitepressService, serviceManager } from '../../services'

export class DevCommand extends BaseCommand {
  private vitepressService: VitepressService
  private noteManager: NoteManager

  constructor() {
    super('dev')
    this.vitepressService = new VitepressService()
    this.noteManager = NoteManager.getInstance()
  }

  protected async run(): Promise<void> {
    // 1. 扫描笔记目录并校验完整性（noteIndex 冲突 + config id 缺失/重复）
    this.logger.info('扫描笔记目录...')
    const notes = this.noteManager.scanNotes()
    this.logger.info(`扫描到 ${notes.length} 篇笔记`)

    // 2. 启动 VitePress 服务器（会等待服务就绪后返回）
    const pid = await this.vitepressService.startServer(notes.length)

    if (pid) {
      this.logger.success(`PID: ${pid}`)

      // 3. 启动 TNotes 监听服务（复用已有的扫描结果）
      await serviceManager.initialize(notes)
    } else {
      this.logger.error('启动服务器失败')
    }
  }
}
