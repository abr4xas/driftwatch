import { describe, expect, it } from 'vitest'
import { discardReason, normalizePathText } from '../src/extract/discard.ts'
import { evaluatePathText } from '../src/extract/paths.ts'

/**
 * One rule per block, in ARCHITECTURE.md order. Every case here has its twin in
 * the `false-positive-traps` fixture: the unit tests pin the rule, the fixture
 * pins the observable result.
 */
describe('rule 1: URLs', () => {
  it.each([
    'https://example.com/docs/guide.md',
    'http://cdn.example.com/lib/app.js',
    'file:///tmp/output/report.json',
    'ftp://host/file.txt',
    '//cdn.example.com/x.js',
  ])('discards %s', (text) => {
    expect(discardReason(text)).toBe('url')
  })
})

describe('module specifiers, which start with a hash', () => {
  // Real case (vercel-labs/marketing-team-eve-template): `#lib/` is the `#*`
  // subpath declared under `imports` in package.json, not a directory.
  it.each(['#lib/', '#lib/format.ts', '#evals/run.ts', '#internal/deep/thing.ts'])(
    'discards %s',
    (text) => {
      expect(discardReason(text)).toBe('module-specifier')
    },
  )

  it('does not discard a path that merely contains a hash later on', () => {
    expect(discardReason('docs/guide.md#section')).toBeUndefined()
  })
})

describe('rule 2: globs and placeholders', () => {
  it.each([
    'src/**/*.test.ts',
    'test/fixtures/*.json',
    '.scratch/<feature>/issues/',
    '{{path}}/template.md',
    '$HOME/.config/app.json',
    'packages/[name]/src',
    'docs/page?.md',
  ])('discards %s', (text) => {
    expect(discardReason(text)).toBe('glob-or-placeholder')
  })
})

describe('rule 3: bare words', () => {
  it.each(['index.ts', 'tsconfig.json', 'pnpm', 'build', 'README.md'])(
    'discards %s, because it does not pin a location (ADR-0003)',
    (text) => {
      expect(discardReason(text)).toBe('bare-word')
    },
  )

  it('does not discard something that does have a slash', () => {
    expect(discardReason('src/index.ts')).toBeUndefined()
  })
})

describe('rule 4: looks like a file and is not', () => {
  it.each(['node.js', 'next.js', 'vue.js', 'nuxt.js', 'd.ts', '1.0', 'v2.1.3'])(
    'discards %s',
    (text) => {
      expect(discardReason(text)).not.toBeUndefined()
    },
  )

  it('discards the technology name even with a slash in front', () => {
    expect(discardReason('runtime/node.js')).toBe('not-a-file')
  })

  it('does not discard a real file with a similar name', () => {
    expect(discardReason('src/node.ts')).toBeUndefined()
  })
})

describe('rule 5: normalization', () => {
  it('strips the leading ./', () => {
    expect(normalizePathText('./src/index.ts')).toBe('src/index.ts')
  })

  it('strips a line reference, and a line-and-column one', () => {
    expect(normalizePathText('src/index.ts:12')).toBe('src/index.ts')
    expect(normalizePathText('src/index.ts:12:4')).toBe('src/index.ts')
  })

  it('strips leftover backticks', () => {
    expect(normalizePathText('`src/index.ts`')).toBe('src/index.ts')
  })

  it('strips trailing punctuation, which belongs to the sentence not the path', () => {
    expect(normalizePathText('src/index.ts.')).toBe('src/index.ts')
    expect(normalizePathText('src/index.ts,')).toBe('src/index.ts')
    expect(normalizePathText('(src/index.ts)')).toBe('(src/index.ts')
  })

  it('leaves an already clean path alone', () => {
    expect(normalizePathText('src/index.ts')).toBe('src/index.ts')
    expect(normalizePathText('src/lib/')).toBe('src/lib/')
  })
})

describe('evaluatePathText', () => {
  it('returns the normalized path when it survives everything', () => {
    expect(evaluatePathText('./src/index.ts:12')).toEqual({
      kind: 'path',
      text: 'src/index.ts',
    })
  })

  it('discards what is no longer path-shaped after normalizing', () => {
    expect(evaluatePathText('a/b:1')).toEqual({ kind: 'discarded', reason: 'not-path-shaped' })
  })

  it('order matters: a URL is discarded before being normalized', () => {
    expect(evaluatePathText('https://x.com/a.md.')).toEqual({ kind: 'discarded', reason: 'url' })
  })
})
