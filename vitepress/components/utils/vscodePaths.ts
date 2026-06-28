/**
 * vitepress/components/utils/vscodePaths.ts
 *
 * 将站点内路径解析为本地 VS Code 可打开的文件路径。
 * NOTES_DIR 通常配置为仓库下的 notes 目录（如 .../TNotes.introduction/notes）。
 */

export function getRepoRootPath(notesDir: string): string {
  const normalized = notesDir.replace(/[/\\]+$/, '')
  if (/[/\\]notes$/i.test(normalized)) {
    return normalized.replace(/[/\\]notes$/i, '')
  }
  return normalized
}

export function resolveNoteReadmePath(
  notesDir: string,
  relativePath: string,
): string | null {
  if (!notesDir || !relativePath) return null

  let linkPath = relativePath.replace(/^\/+/, '')

  if (linkPath === 'README.md' || linkPath === 'README') {
    const repoRoot = getRepoRootPath(notesDir)
    const sep = repoRoot.includes('\\') ? '\\' : '/'
    return `${repoRoot}${sep}README.md`
  }

  if (linkPath.startsWith('notes/')) {
    linkPath = linkPath.slice('notes/'.length)
  }

  linkPath = linkPath
    .replace(/\/README\.md$/i, '')
    .replace(/\/README$/i, '')

  const decodedFolder = linkPath
    .split('/')
    .map((segment) => decodeURIComponent(segment))
    .join('/')

  const base = notesDir.replace(/[/\\]+$/, '')
  const sep = base.includes('\\') ? '\\' : '/'
  const folderPath = decodedFolder.split('/').join(sep)

  return `${base}${sep}${folderPath}${sep}README.md`
}

export function toVscodeFileUrl(filePath: string): string {
  return `vscode://file/${encodeURI(filePath)}`
}
