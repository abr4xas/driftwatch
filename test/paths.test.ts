import { describe, expect, it } from 'vitest'
import { looksLikePath } from '../src/extract/paths.ts'
import { discardReason } from '../src/extract/discard.ts'
import { resolveInRepo } from '../src/verify/resolve.ts'

describe('looksLikePath', () => {
  it('accepts what has a slash and a known extension', () => {
    for (const text of ['src/foo.ts', 'a/b/c.json', 'docs/spec/SPEC.md']) {
      expect(looksLikePath(text), text).toBe(true)
    }
  })

  it('accepts what starts with a path marker', () => {
    for (const text of ['./scripts/release.sh', '../package/src/x', '/src/index.ts']) {
      expect(looksLikePath(text), text).toBe(true)
    }
  })

  it('accepts what ends in a slash, which is a directory', () => {
    for (const text of ['test/', 'src/lib/', 'node_modules/']) {
      expect(looksLikePath(text), text).toBe(true)
    }
  })

  it('rejects a single word, with or without a dot', () => {
    for (const text of ['foo', 'build', 'pnpm', 'index.ts', 'v1.2.3', '']) {
      expect(looksLikePath(text), text).toBe(false)
    }
  })

  it('rejects a slash whose last segment has no known extension', () => {
    for (const text of ['npm run build', 'foo/bar', 'a/b.unknown']) {
      expect(looksLikePath(text), text).toBe(false)
    }
  })
})

describe('discardReason', () => {
  it('discards URLs with a protocol', () => {
    for (const text of ['https://example.com/a.md', 'http://x/y', 'file:///tmp/a.ts']) {
      expect(discardReason(text), text).toBe('url')
    }
  })

  it('discards URLs with no protocol but a double slash', () => {
    expect(discardReason('//cdn.example.com/lib.js')).toBe('url')
  })

  it('does not discard an ordinary path', () => {
    expect(discardReason('src/index.ts')).toBeUndefined()
  })
})

describe('resolveInRepo', () => {
  it('resolves against the source baseDir', () => {
    expect(resolveInRepo('packages/api', 'src/db.ts')).toBe('packages/api/src/db.ts')
    expect(resolveInRepo('', 'src/db.ts')).toBe('src/db.ts')
  })

  it('a leading slash reads from the repo root, not the filesystem', () => {
    expect(resolveInRepo('packages/api', '/src/db.ts')).toBe('src/db.ts')
  })

  it('normalizes ./ and ../', () => {
    expect(resolveInRepo('packages/api', './src/db.ts')).toBe('packages/api/src/db.ts')
    expect(resolveInRepo('packages/api', '../web/app.ts')).toBe('packages/web/app.ts')
  })

  it('strips a directory trailing slash', () => {
    expect(resolveInRepo('', 'src/lib/')).toBe('src/lib')
  })

  it('returns undefined if the path escapes above the root', () => {
    expect(resolveInRepo('', '../outside/x.ts')).toBeUndefined()
    expect(resolveInRepo('packages/api', '../../../x.ts')).toBeUndefined()
  })
})
