/**
 * Resolves a claim's text to a path relative to the repo root.
 *
 * Returns `undefined` when the path escapes above the root: that is not a
 * missing file in the repo, it is a claim about the filesystem of whoever wrote
 * the document, and it is not ours to verify.
 */
export function resolveInRepo(baseDir: string, text: string): string | undefined {
  // A leading slash reads as "from the repo root", not from the filesystem.
  const fromRoot = text.startsWith('/')
  const joined = fromRoot ? text.slice(1) : baseDir === '' ? text : `${baseDir}/${text}`

  const out: string[] = []
  for (const segment of joined.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (out.length === 0) return undefined
      out.pop()
      continue
    }
    out.push(segment)
  }
  return out.join('/')
}
