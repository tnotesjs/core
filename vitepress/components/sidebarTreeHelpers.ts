/**
 * vitepress/components/sidebarTreeHelpers.ts
 *
 * 将 sidebar 数据转换为目录树结构，供 FolderTree 等视图共用
 */

export type NoteStatus = 'done' | 'pending' | null

export interface SidebarItemLike {
  text: string
  link?: string
  items?: SidebarItemLike[]
}

export interface SidebarTreeNode {
  key: string
  text: string
  displayText: string
  link?: string
  fullLink?: string | null
  relativePath?: string
  status: NoteStatus
  realNumber: string
  children: SidebarTreeNode[]
}

export interface BuildSidebarTreeOptions {
  showPending?: boolean
  showDone?: boolean
  includeAll?: boolean
  base?: string
}

export function extractRealNumberFromLink(link?: string): string {
  if (!link) return '0000'
  const match = link.match(/\/notes\/(\d{4})/)
  return match ? match[1] : '0000'
}

export function extractTitleFromText(text: string): string {
  if (!text) return ''
  return text.replace(/^\d{4}\.?\s/, '')
}

export function parseSidebarItemText(
  text: string,
  showPending = true,
  showDone = true,
  includeAll = false,
): { included: boolean; status: NoteStatus; cleanText: string } {
  if (!text) {
    return { included: false, status: null, cleanText: '' }
  }
  if (text.startsWith('✅')) {
    return {
      included: includeAll || showDone,
      status: 'done',
      cleanText: text.replace('✅ ', ''),
    }
  }
  if (text.startsWith('⏰')) {
    return {
      included: includeAll || showPending,
      status: 'pending',
      cleanText: text.replace('⏰ ', ''),
    }
  }
  return {
    included: includeAll,
    status: null,
    cleanText: text,
  }
}

function mapSidebarItemToNode(
  item: SidebarItemLike,
  options: BuildSidebarTreeOptions,
): SidebarTreeNode | null {
  const {
    showPending = true,
    showDone = true,
    includeAll = false,
    base = '',
  } = options
  const hasChildren = (item.items?.length ?? 0) > 0
  const parsed = parseSidebarItemText(
    item.text,
    showPending,
    showDone,
    includeAll,
  )

  if (hasChildren) {
    const children = (item.items ?? [])
      .map((child) => mapSidebarItemToNode(child, options))
      .filter((node): node is SidebarTreeNode => node !== null)

    if (!parsed.included && children.length === 0) return null

    const realNumber = extractRealNumberFromLink(item.link)
    const title = extractTitleFromText(parsed.cleanText)

    return {
      key: item.link || item.text,
      text: title,
      displayText: parsed.cleanText,
      link: item.link,
      fullLink: item.link ? (base ? base + item.link : item.link) : null,
      relativePath: item.link,
      status: parsed.status,
      realNumber,
      children,
    }
  }

  if (!item.link || !item.text || !parsed.included) return null

  const realNumber = extractRealNumberFromLink(item.link)
  const title = extractTitleFromText(parsed.cleanText)

  return {
    key: item.link,
    text: title,
    displayText: parsed.cleanText,
    link: item.link,
    fullLink: base ? base + item.link : item.link,
    relativePath: item.link,
    status: parsed.status,
    realNumber,
    children: [],
  }
}

export function buildSidebarTree(
  items: SidebarItemLike[],
  options: BuildSidebarTreeOptions = {},
): SidebarTreeNode[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => mapSidebarItemToNode(item, options))
    .filter((node): node is SidebarTreeNode => node !== null)
}

export function collectParentKeys(
  nodes: SidebarTreeNode[],
  keys: string[] = [],
): string[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      keys.push(node.key)
      collectParentKeys(node.children, keys)
    }
  }
  return keys
}

export function formatTreeNodeName(
  node: SidebarTreeNode,
  showNumber = false,
): string {
  const emoji =
    node.status === 'done' ? '✅ ' : node.status === 'pending' ? '⏰ ' : ''
  const title =
    showNumber && node.realNumber
      ? `${node.realNumber}. ${node.text}`
      : node.text
  return `${emoji}${title}`
}
