import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it, afterEach } from 'vitest'

import {
  buildInitContext,
  buildRepoName,
  buildPackageJsonTemplate,
  defaultDisplayName,
  isAlreadyInitialized,
  mergePackageJson,
  renderTocMd,
  resolvePackageJsonMerge,
  validatePort,
  validateTopic,
} from './initSubRepoLogic'
import { InitSubRepoService } from './service'

describe('initSubRepoLogic', () => {
  const baseInput = {
    topic: 'react',
    displayName: 'React 笔记',
    port: 8000,
    description: '这是一个基于 tnotesjs/core 搭建的 TNotes 知识库。',
    repoUuid: 'repo-uuid',
    noteUuid: 'note-uuid',
    coreVersion: '0.1.28',
  }

  it('buildRepoName 前缀 TNotes.', () => {
    expect(buildRepoName('react')).toBe('TNotes.react')
  })

  it('defaultDisplayName 首字母大写', () => {
    expect(defaultDisplayName('react')).toBe('React 笔记')
  })

  it('validateTopic 校验 slug', () => {
    expect(validateTopic('react')).toBeNull()
    expect(validateTopic('React')).not.toBeNull()
    expect(validateTopic('')).not.toBeNull()
    expect(validateTopic('1bad')).not.toBeNull()
  })

  it('validatePort 默认值与范围', () => {
    expect(validatePort('')).toEqual({ port: 8000 })
    expect(validatePort('9000')).toEqual({ port: 9000 })
    expect(validatePort('abc').error).toBeTruthy()
  })

  it('renderTocMd 单行格式', () => {
    const ctx = buildInitContext(baseInput)
    expect(renderTocMd(ctx)).toBe('- [ ] 0001. TNotes.react\n')
  })

  it('mergePackageJson 保留额外字段', () => {
    const template = buildPackageJsonTemplate('0.1.28')
    const merged = mergePackageJson(
      { name: 'my-repo', license: 'MIT', scripts: { old: 'x' } },
      template,
    )
    expect(merged.name).toBe('my-repo')
    expect(merged.license).toBe('MIT')
    expect(merged.scripts).toEqual(template.scripts)
    expect(merged.dependencies).toEqual(template.dependencies)
  })

  it('resolvePackageJsonMerge 新建与合并', () => {
    const dir = mkdtempSync(join(tmpdir(), 'init-sub-repo-'))
    const pkgPath = join(dir, 'package.json')
    const template = buildPackageJsonTemplate('0.1.28')

    const created = resolvePackageJsonMerge(pkgPath, template)
    expect(created.action).toBe('created')

    writeFileSync(pkgPath, JSON.stringify({ name: 'keep-me' }), 'utf-8')
    const updated = resolvePackageJsonMerge(pkgPath, template)
    expect(updated.action).toBe('updated')
    const parsed = JSON.parse(updated.content) as { name: string }
    expect(parsed.name).toBe('keep-me')

    rmSync(dir, { recursive: true, force: true })
  })

  it('isAlreadyInitialized 检测 .tnotes.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'init-sub-repo-'))
    expect(isAlreadyInitialized(dir)).toBe(false)

    writeFileSync(join(dir, '.tnotes.json'), '{}', 'utf-8')
    expect(isAlreadyInitialized(dir)).toBe(true)

    rmSync(dir, { recursive: true, force: true })
  })
})

describe('InitSubRepoService', () => {
  let tempRoot = ''
  const templateRoot = join(process.cwd(), 'templates', 'sub-repo')

  afterEach(() => {
    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true })
      tempRoot = ''
    }
  })

  it('writeScaffold 创建文件并跳过已存在项', () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'init-sub-repo-svc-'))
    writeFileSync(join(tempRoot, 'README.md'), '# existing', 'utf-8')

    const service = new InitSubRepoService(tempRoot, templateRoot)
    const result = service.writeScaffold({
      topic: 'demo',
      displayName: 'Demo 笔记',
      port: 8000,
      description: 'desc',
      repoUuid: 'repo-id',
      noteUuid: 'note-id',
      coreVersion: '0.1.28',
    })

    expect(result.created).toContain('.tnotes.json')
    expect(result.created).toContain('TOC.md')
    expect(result.skipped).toContain('README.md')
    expect(existsSync(join(tempRoot, '.tnotes.json'))).toBe(true)

    const config = JSON.parse(
      readFileSync(join(tempRoot, '.tnotes.json'), 'utf-8'),
    ) as { repoName: string; port: number }
    expect(config.repoName).toBe('TNotes.demo')
    expect(config.port).toBe(8000)
  })

  it('writeScaffold 合并已有 package.json', () => {
    tempRoot = mkdtempSync(join(tmpdir(), 'init-sub-repo-svc-'))
    writeFileSync(
      join(tempRoot, 'package.json'),
      JSON.stringify({ name: 'custom-name', private: true }),
      'utf-8',
    )

    const service = new InitSubRepoService(tempRoot, templateRoot)
    const result = service.writeScaffold({
      topic: 'vue',
      displayName: 'Vue 笔记',
      port: 8100,
      description: 'desc',
      repoUuid: 'repo-id',
      noteUuid: 'note-id',
      coreVersion: '0.1.28',
    })

    expect(result.updated).toContain('package.json')
    const pkg = JSON.parse(
      readFileSync(join(tempRoot, 'package.json'), 'utf-8'),
    ) as { name: string; private: boolean; scripts: Record<string, string> }
    expect(pkg.name).toBe('custom-name')
    expect(pkg.private).toBe(true)
    expect(pkg.scripts['tn:dev']).toBe('tnotes --dev')
  })
})
