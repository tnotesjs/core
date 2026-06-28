/**
 * services/init-sub-repo/service.ts
 *
 * 子知识库初始化服务
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  buildDynamicFiles,
  buildInitContext,
  buildPackageJsonTemplate,
  resolvePackageJsonMerge,
  STATIC_TEMPLATE_FILES,
} from './initSubRepoLogic'

import type { InitSubRepoInput, InitSubRepoWriteResult } from './initSubRepoLogic'

export function getCorePackageRoot(fromModuleUrl: string): string {
  let dir = dirname(fileURLToPath(fromModuleUrl))

  while (dir !== dirname(dir)) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { name?: string }
      if (pkg.name === '@tnotesjs/core') return dir
    }
    dir = dirname(dir)
  }

  throw new Error('无法定位 @tnotesjs/core 包根目录')
}

export function getTemplateRoot(fromModuleUrl: string): string {
  return join(getCorePackageRoot(fromModuleUrl), 'templates', 'sub-repo')
}

export class InitSubRepoService {
  private rootPath: string
  private templateRoot: string

  constructor(rootPath: string, templateRoot: string) {
    this.rootPath = rootPath
    this.templateRoot = templateRoot
  }

  static fromModuleUrl(moduleUrl: string, rootPath = process.cwd()): InitSubRepoService {
    return new InitSubRepoService(rootPath, getTemplateRoot(moduleUrl))
  }

  writeScaffold(input: InitSubRepoInput): InitSubRepoWriteResult {
    const ctx = buildInitContext(input)
    const created: string[] = []
    const skipped: string[] = []
    const updated: string[] = []

    for (const relativePath of STATIC_TEMPLATE_FILES) {
      const targetPath = resolve(this.rootPath, relativePath)
      if (existsSync(targetPath)) {
        skipped.push(relativePath)
        continue
      }

      const sourcePath = join(this.templateRoot, relativePath)
      mkdirSync(dirname(targetPath), { recursive: true })
      copyFileSync(sourcePath, targetPath)
      created.push(relativePath)
    }

    const packageTemplate = buildPackageJsonTemplate(input.coreVersion)

    for (const file of buildDynamicFiles(ctx)) {
      const targetPath = resolve(this.rootPath, file.relativePath)

      if (file.relativePath === 'package.json') {
        const { content, action } = resolvePackageJsonMerge(
          targetPath,
          packageTemplate,
        )
        mkdirSync(dirname(targetPath), { recursive: true })
        writeFileSync(targetPath, content, 'utf-8')
        if (action === 'created') created.push(file.relativePath)
        else updated.push(file.relativePath)
        continue
      }

      if (existsSync(targetPath)) {
        skipped.push(file.relativePath)
        continue
      }

      mkdirSync(dirname(targetPath), { recursive: true })
      writeFileSync(targetPath, file.content, 'utf-8')
      created.push(file.relativePath)
    }

    return { created, skipped, updated }
  }
}
