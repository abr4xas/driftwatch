import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '../src/parse/markdown.ts'
import { buildLineTable, rangeFor } from '../src/parse/positions.ts'

describe('parseMarkdown', () => {
  it('an inlineCode offset points at the value, not at the backticks', () => {
    const content = 'The path is `src/foo.ts` here.\n'
    const [span] = parseMarkdown(content).inlineCode
    expect(span?.value).toBe('src/foo.ts')
    expect(content.slice(span!.offset[0], span!.offset[1])).toBe('src/foo.ts')
  })

  it('works with double backticks and with backticks inside the value', () => {
    const content = 'See ``a`b/c.ts`` end.\n'
    const [span] = parseMarkdown(content).inlineCode
    expect(span?.value).toBe('a`b/c.ts')
    expect(content.slice(span!.offset[0], span!.offset[1])).toBe('a`b/c.ts')
  })

  it('a link offset points at the url, not at the visible text', () => {
    const content = 'See [the spec](./docs/SPEC.md) please.\n'
    const [span] = parseMarkdown(content).links
    expect(span?.value).toBe('./docs/SPEC.md')
    expect(span?.label).toBe('the spec')
    expect(content.slice(span!.offset[0], span!.offset[1])).toBe('./docs/SPEC.md')
  })

  it('captures fences with their declared language', () => {
    const content = '```bash\npnpm run test\n```\n\n```\nno language\n```\n'
    const { fences } = parseMarkdown(content)
    expect(fences.map((f) => f.lang)).toEqual(['bash', undefined])
    expect(fences[0]?.value).toBe('pnpm run test')
  })

  it('does not mistake an inlineCode inside a fence for inline code', () => {
    const content = '```md\nthis has `backticks` inside\n```\n'
    expect(parseMarkdown(content).inlineCode).toEqual([])
  })
})

describe('rangeFor', () => {
  it('turns offsets into 1-indexed line and column', () => {
    const content = 'first\nsecond with `x/y.ts` here\nthird\n'
    const table = buildLineTable(content)
    const start = content.indexOf('x/y.ts')
    const range = rangeFor(table, start, start + 'x/y.ts'.length)
    expect(range).toEqual({ line: 2, column: 14, endLine: 2, endColumn: 20 })
  })

  it('the first character of the file is line 1 column 1', () => {
    expect(rangeFor(buildLineTable('abc\n'), 0, 1)).toEqual({
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 2,
    })
  })
})
