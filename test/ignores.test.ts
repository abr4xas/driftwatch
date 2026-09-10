import { describe, expect, it } from 'vitest'
import { isIgnored, parseIgnores, type IgnoreIndex } from '../src/core/ignores.ts'
import { parseMarkdown } from '../src/parse/markdown.ts'
import { buildLineTable } from '../src/parse/positions.ts'

function indexOf(...lines: readonly string[]): IgnoreIndex {
  const content = lines.join('\n')
  return parseIgnores(parseMarkdown(content), buildLineTable(content))
}

describe('inline ignore directives', () => {
  it('a document with no HTML at all has nothing to parse', () => {
    const index = indexOf('# Title', '', 'The entry is `src/index.ts`.')
    expect(index.file).toEqual([])
    expect(index.byLine.size).toBe(0)
  })

  it('a bare directive covers the line it sits on, for every check', () => {
    const index = indexOf('A claim <!-- driftwatch-ignore -->')
    expect(isIgnored(index, 'path/missing', 1)).toBe(true)
    expect(isIgnored(index, 'dep/missing', 1)).toBe(true)
    expect(isIgnored(index, 'path/missing', 2)).toBe(false)
  })

  it('-next-line covers the line below and not its own', () => {
    const index = indexOf('<!-- driftwatch-ignore-next-line -->', 'A claim')
    expect(isIgnored(index, 'path/missing', 1)).toBe(false)
    expect(isIgnored(index, 'path/missing', 2)).toBe(true)
  })

  it('-next-line is literal: a blank line in between silences the blank line', () => {
    // Strict and explainable beats convenient and fuzzy.
    const index = indexOf('<!-- driftwatch-ignore-next-line -->', '', 'A claim')
    expect(isIgnored(index, 'path/missing', 2)).toBe(true)
    expect(isIgnored(index, 'path/missing', 3)).toBe(false)
  })

  it('-file covers every line, wherever the directive appears', () => {
    const index = indexOf('# Title', '', '<!-- driftwatch-ignore-file -->', '', 'A claim')
    expect(index.file).toHaveLength(1)
    expect(isIgnored(index, 'path/missing', 1)).toBe(true)
    expect(isIgnored(index, 'path/missing', 900)).toBe(true)
  })

  it('-file takes an id too, and then covers only that check', () => {
    const index = indexOf('<!-- driftwatch-ignore-file path/missing -->', '', 'A claim')
    expect(isIgnored(index, 'path/missing', 3)).toBe(true)
    expect(isIgnored(index, 'dep/missing', 3)).toBe(false)
  })

  it('a misspelled form degrades to a line directive for a check that does not exist', () => {
    // `-nextline` is not one of the two suffixes, so it reads as an id. It
    // matches no check, so it silences nothing: the failure is open, which is
    // the direction a silencing mechanism should fail in.
    const index = indexOf('<!-- driftwatch-ignore-nextline -->', 'A claim')
    expect(isIgnored(index, 'path/missing', 1)).toBe(false)
    expect(isIgnored(index, 'path/missing', 2)).toBe(false)
  })

  it('an id restricts the directive to that check', () => {
    const index = indexOf('A claim <!-- driftwatch-ignore path/missing -->')
    expect(isIgnored(index, 'path/missing', 1)).toBe(true)
    expect(isIgnored(index, 'dep/missing', 1)).toBe(false)
  })

  it('an id can be a namespace, like --only', () => {
    const index = indexOf('A claim <!-- driftwatch-ignore path -->')
    expect(isIgnored(index, 'path/missing', 1)).toBe(true)
    expect(isIgnored(index, 'pathological/thing', 1)).toBe(false)
  })

  it('several ids read the same separated by commas or by spaces', () => {
    const commas = indexOf('x <!-- driftwatch-ignore dep/missing,path/missing -->')
    const spaces = indexOf('x <!-- driftwatch-ignore dep/missing path/missing -->')
    for (const index of [commas, spaces]) {
      expect(isIgnored(index, 'path/missing', 1)).toBe(true)
      expect(isIgnored(index, 'dep/missing', 1)).toBe(true)
      expect(isIgnored(index, 'link/broken', 1)).toBe(false)
    }
  })

  it('an id naming no known check silences nothing, and is not an error', () => {
    // The asymmetry with --only is deliberate: a directive lives in a repo and
    // is read by versions of driftwatch that have not shipped yet.
    const index = indexOf('A claim <!-- driftwatch-ignore future/check -->')
    expect(isIgnored(index, 'path/missing', 1)).toBe(false)
  })

  it('an unrelated HTML comment is not a directive', () => {
    const index = indexOf('<!-- prettier-ignore -->', '<!-- driftwatchignore -->', '<!-- TODO -->')
    expect(index.file).toEqual([])
    expect(index.byLine.size).toBe(0)
  })

  it('a directive inside a code fence is an example, not a directive', () => {
    const index = indexOf('```markdown', '<!-- driftwatch-ignore-file -->', '```')
    expect(index.file).toEqual([])
  })

  it('a directive inside an indented code block is an example too', () => {
    const index = indexOf('Text:', '', '    <!-- driftwatch-ignore-file -->', '')
    expect(index.file).toEqual([])
  })

  it('two directives on one line both apply', () => {
    const index = indexOf('x <!-- driftwatch-ignore dep -->  <!-- driftwatch-ignore path -->')
    expect(isIgnored(index, 'path/missing', 1)).toBe(true)
    expect(isIgnored(index, 'dep/missing', 1)).toBe(true)
  })
})
