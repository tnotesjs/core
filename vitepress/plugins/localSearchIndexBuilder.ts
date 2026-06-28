/**
 * localSearchIndexBuilder.ts
 *
 * dev 下全量重建 VitePress Local Search 索引（删除笔记后移除 stale 条目）
 */

import MiniSearch from 'minisearch'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  createMarkdownRenderer,
  resolvePages,
  type SiteConfig,
} from 'vitepress'

import { getDocIdFromFile } from './localSearchReindexLogic'

import type { DefaultTheme } from 'vitepress'

const headingRegex =
  /<h(\d*).*?>(.*?<a.*? href="#.*?".*?>.*?<\/a>)<\/h\1>/gi
const headingContentRegex = /(.*?)<a.*? href="#(.*?)".*?>.*?<\/a>/i

export type LocalSearchIndexSnapshot = Map<string, string>

type LocalSearchConfig = DefaultTheme.LocalSearchOptions & {
  options?: {
    _render?: (
      mdRaw: string,
      env: Record<string, unknown>,
      mdRenderer: Awaited<ReturnType<typeof createMarkdownRenderer>>,
    ) => Promise<string>
    miniSearch?: { options?: Record<string, unknown> }
  }
}

export type LocalSearchIndexBuildResult = {
  snapshot: LocalSearchIndexSnapshot
  pageCount: number
}

function slash(value: string): string {
  return value.replace(/\\/g, '/')
}

function clearHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

function getSearchableText(content: string): string {
  return clearHtmlTags(content)
}

function* splitPageIntoSections(html: string) {
  const result = html.split(headingRegex)
  result.shift()
  let parentTitles: string[] = []

  for (let i = 0; i < result.length; i += 3) {
    const level = parseInt(result[i], 10) - 1
    const heading = result[i + 1]
    const headingResult = headingContentRegex.exec(heading)
    const title = clearHtmlTags(headingResult?.[1] ?? '').trim()
    const anchor = headingResult?.[2] ?? ''
    const content = result[i + 2]
    if (!title || !content) continue

    let titles = parentTitles.slice(0, level)
    titles[level] = title
    titles = titles.filter(Boolean)
    yield { anchor, titles, text: getSearchableText(content) }

    if (level === 0) {
      parentTitles = [title]
    } else {
      parentTitles[level] = title
    }
  }
}

function getLocaleForPath(site: SiteConfig['site'], page: string): string {
  const normalizedPage = slash(page)
  for (const [localePath, localeConfig] of Object.entries(site.locales ?? {})) {
    const prefix = localePath.replace(/\\/g, '/')
    if (prefix === 'root') continue
    const normalizedPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`
    if (normalizedPage.startsWith(normalizedPrefix)) {
      return localePath
    }
    if (localeConfig?.lang && normalizedPage === prefix.replace(/\/$/, '')) {
      return localePath
    }
  }
  return 'root'
}

export async function createLocalSearchMarkdownRenderer(
  siteConfig: SiteConfig,
): Promise<Awaited<ReturnType<typeof createMarkdownRenderer>>> {
  return createMarkdownRenderer(
    siteConfig.srcDir,
    siteConfig.markdown,
    siteConfig.site.base,
    siteConfig.logger,
  )
}

async function renderPageHtml(
  siteConfig: SiteConfig,
  md: Awaited<ReturnType<typeof createMarkdownRenderer>>,
  absoluteFile: string,
): Promise<string> {
  if (!(await fs.stat(absoluteFile).catch(() => null))) return ''

  const srcDir = siteConfig.srcDir
  const relativePath = slash(path.relative(srcDir, absoluteFile))
  const env = {
    path: absoluteFile,
    relativePath,
    cleanUrls: siteConfig.cleanUrls ?? false,
    frontmatter: {},
  }
  const options =
    (siteConfig.site.themeConfig?.search as LocalSearchConfig | undefined)
      ?.options ?? {}
  const mdRaw = await fs.readFile(absoluteFile, 'utf-8')

  if (options._render) {
    return await options._render(mdRaw, env, md)
  }

  const html = md.render(mdRaw, env)
  return (env as { frontmatter?: { search?: boolean } }).frontmatter?.search ===
    false
    ? ''
    : html
}

async function indexPage(
  siteConfig: SiteConfig,
  md: Awaited<ReturnType<typeof createMarkdownRenderer>>,
  page: string,
  index: MiniSearch,
): Promise<void> {
  const absoluteFile = path.join(siteConfig.srcDir, page)
  const fileId = getDocIdFromFile({
    srcDir: siteConfig.srcDir,
    base: siteConfig.site.base,
    cleanUrls: siteConfig.cleanUrls ?? false,
    rewrites: siteConfig.rewrites.map,
    absoluteOrRelativeFile: absoluteFile,
  })
  const html = await renderPageHtml(siteConfig, md, absoluteFile)
  const sections = splitPageIntoSections(html)

  for (const section of sections) {
    if (!section || !(section.text || section.titles)) break
    const { anchor, text, titles } = section
    const id = anchor ? [fileId, anchor].join('#') : fileId
    if (index.has(id)) index.discard(id)
    index.add({
      id,
      text,
      title: titles[titles.length - 1]!,
      titles: titles.slice(0, -1),
    })
  }
}

/**
 * 全量重建 local search 索引快照（locale -> double-stringified MiniSearch JSON）
 *
 * 使用运行中 dev server 的 SiteConfig，避免二次 resolveConfig 挂死/崩溃。
 */
export async function buildLocalSearchIndexSnapshot(
  siteConfig: SiteConfig,
  md: Awaited<ReturnType<typeof createMarkdownRenderer>>,
): Promise<LocalSearchIndexBuildResult> {
  const { pages } = await resolvePages(
    siteConfig.srcDir,
    siteConfig.userConfig,
    siteConfig.logger,
  )
  const options =
    (siteConfig.site.themeConfig?.search as LocalSearchConfig | undefined)
      ?.options ?? {}
  const indexByLocale = new Map<string, MiniSearch>()

  for (const page of pages) {
    const locale = getLocaleForPath(siteConfig.site, page)
    let index = indexByLocale.get(locale)
    if (!index) {
      index = new MiniSearch({
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        ...options.miniSearch?.options,
      })
      indexByLocale.set(locale, index)
    }
    await indexPage(siteConfig, md, page, index)
  }

  const snapshot: LocalSearchIndexSnapshot = new Map()
  for (const [locale, index] of indexByLocale) {
    snapshot.set(locale, JSON.stringify(JSON.stringify(index)))
  }

  return { snapshot, pageCount: pages.length }
}
