import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every relative link in the documentation resolves to something that exists.
 *
 * Splitting the README into `docs/guide/` changed the depth of about forty
 * links, and a guide full of 404s is worse than the long README it replaced.
 * This is the cheapest thing that keeps the split from rotting — and a tool
 * whose entire subject is documents making false claims about a repository has
 * no business shipping one.
 */

const ROOT = resolve(import.meta.dirname, '..')

/** `[text](target)`, ignoring images and reference-style definitions. */
const LINK = /\[[^\]]*\]\(([^)\s]+)\)/gu

/**
 * A link **inside code** is an example of a link, not a link.
 *
 * `SPEC.md` illustrates the extractor with `` `[x](./docs/y.md)` `` and
 * ADR-0008 quotes `` `[ADR-0005](./0005-….md)` `` as a shape. Both would be
 * reported here, and both are the same mistake this whole project is about
 * refusing: the document is not asserting that the target exists. Fences first,
 * then inline spans, because a fence can contain backticks.
 */
function prose(content: string): string {
  return content.replaceAll(/^```[\s\S]*?^```/gmu, '').replaceAll(/`[^`\n]*`/gu, '')
}

function markdownFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) markdownFiles(path, found)
    else if (entry.name.endsWith('.md')) found.push(path)
  }
  return found
}

/** The documents this repo maintains. The corpus clones are somebody else's. */
function documented(): string[] {
  return [join(ROOT, 'README.md'), join(ROOT, 'AGENTS.md'), ...markdownFiles(join(ROOT, 'docs'))]
}

function brokenLinksIn(file: string): string[] {
  const content = prose(readFileSync(file, 'utf8'))
  const broken: string[] = []
  for (const [, target] of content.matchAll(LINK)) {
    if (target === undefined) continue
    if (/^(https?:|mailto:|#)/u.test(target)) continue
    const [path] = target.split('#')
    if (path === undefined || path.length === 0) continue
    const resolved = resolve(dirname(file), decodeURIComponent(path))
    if (!existsSync(resolved)) broken.push(target)
  }
  return broken
}

describe('the documentation links', () => {
  it('finds the files it points at', () => {
    const broken = new Map<string, string[]>()
    for (const file of documented()) {
      const links = brokenLinksIn(file)
      if (links.length > 0) broken.set(file.slice(ROOT.length + 1), links)
    }
    expect(Object.fromEntries(broken)).toEqual({})
  })

  it('points at directories that are directories', () => {
    const wrong: string[] = []
    for (const file of documented()) {
      for (const [, target] of prose(readFileSync(file, 'utf8')).matchAll(LINK)) {
        if (target === undefined || !target.endsWith('/')) continue
        if (/^(https?:|mailto:)/u.test(target)) continue
        const resolved = resolve(dirname(file), target)
        if (existsSync(resolved) && !statSync(resolved).isDirectory()) wrong.push(target)
      }
    }
    expect(wrong).toEqual([])
  })
})
