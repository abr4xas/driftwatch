import { readFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'

/**
 * The version is read from package.json at runtime instead of being injected at
 * build time so that `--version` does not depend on the bundler and stays
 * correct when running from `src/` in development. The upward search is bounded
 * by the filesystem root.
 *
 * If it finds nothing, it throws. Returning a placeholder like '0.0.0' would
 * make a read failure indistinguishable from a real version.
 */
export function readVersion(from: string = import.meta.dirname): string {
  const { root } = parse(from)
  let dir = from
  while (true) {
    const found = versionIn(dir)
    if (found !== undefined) return found
    if (dir === root) {
      throw new Error(`no package.json with a version found walking up from ${from}`)
    }
    dir = dirname(dir)
  }
}

function versionIn(dir: string): string | undefined {
  let raw: string
  try {
    raw = readFileSync(join(dir, 'package.json'), 'utf8')
  } catch {
    // This directory has no package.json; the caller keeps walking up.
    return undefined
  }
  const parsed: unknown = JSON.parse(raw)
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    typeof parsed.version === 'string'
  ) {
    return parsed.version
  }
  return undefined
}
