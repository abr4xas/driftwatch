import { describe, expect, it } from 'vitest'
import { splitAnchor } from '../src/extract/links.ts'

describe('splitAnchor', () => {
  it('splits a cross-file anchor', () => {
    expect(splitAnchor('./docs/SPEC.md#configuration')).toEqual({
      path: './docs/SPEC.md',
      anchor: 'configuration',
    })
  })

  it('a bare fragment is a same-file anchor', () => {
    expect(splitAnchor('#closing')).toEqual({ path: '', anchor: 'closing' })
  })

  it('decodes both halves', () => {
    expect(splitAnchor('./Guide%20X.md#secci%C3%B3n')).toEqual({
      path: './Guide X.md',
      anchor: 'sección',
    })
  })

  it('a link with no fragment claims nothing here', () => {
    // The path half is `path/missing`'s finding. One link, one finding.
    expect(splitAnchor('./docs/SPEC.md')).toBeUndefined()
  })

  it('an empty fragment is a link to the top of the file', () => {
    expect(splitAnchor('./docs/SPEC.md#')).toBeUndefined()
  })

  it('refuses anything carrying a scheme', () => {
    expect(splitAnchor('https://example.com/a.md#x')).toBeUndefined()
    expect(splitAnchor('mailto:someone@example.com#x')).toBeUndefined()
    expect(splitAnchor('//example.com/a.md#x')).toBeUndefined()
  })

  it('refuses a target whose headings we cannot parse', () => {
    expect(splitAnchor('./src/cli.ts#L40')).toBeUndefined()
    expect(splitAnchor('./package.json#scripts')).toBeUndefined()
  })

  it('refuses the fragments GitHub synthesizes', () => {
    expect(splitAnchor('./README.md#top')).toBeUndefined()
    expect(splitAnchor('./README.md#readme')).toBeUndefined()
  })

  it('refuses a line reference even on a Markdown target', () => {
    expect(splitAnchor('./docs/SPEC.md#L12')).toBeUndefined()
    expect(splitAnchor('./docs/SPEC.md#L12-L20')).toBeUndefined()
  })

  it("refuses the column form GitHub's Copy permalink writes", () => {
    // Without the columns this reaches the check and every permalink is a
    // finding.
    expect(splitAnchor('./docs/SPEC.md#L12C5-L20C9')).toBeUndefined()
    expect(splitAnchor('./docs/SPEC.md#L12C5')).toBeUndefined()
  })

  it('refuses a browser text fragment', () => {
    // A scroll instruction the renderer answers, not a name a heading makes.
    expect(splitAnchor('./docs/SPEC.md#:~:text=configuration')).toBeUndefined()
  })

  it('accepts Markdown, and refuses MDX', () => {
    for (const ext of ['md', 'markdown', 'MD']) {
      expect(splitAnchor(`./a.${ext}#x`)?.anchor).toBe('x')
    }
    // remark reads these without complaining and sees none of the headings a
    // JSX component or an imported partial emits, so the anchors we collect
    // are a subset of the real ones.
    for (const ext of ['mdx', 'mdc']) {
      expect(splitAnchor(`./a.${ext}#x`)).toBeUndefined()
    }
  })
})
