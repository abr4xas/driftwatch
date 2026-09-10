import { describe, expect, it } from 'vitest'
import type { Claim, Source, SourceKind } from '../src/core/types.ts'
import { proseGatesFor } from '../src/extract/context-prose.ts'
import { extractFrontmatterClaims, frontmatterFactOf } from '../src/extract/frontmatter.ts'
import { parseFrontmatter } from '../src/parse/frontmatter.ts'
import { parseMarkdown } from '../src/parse/markdown.ts'
import { buildLineTable } from '../src/parse/positions.ts'

describe('parseFrontmatter', () => {
  it('returns undefined with no leading block', () => {
    expect(parseFrontmatter('# Just a heading\n')).toBeUndefined()
  })

  it('a `---` that is not at the start is not frontmatter', () => {
    expect(parseFrontmatter('text\n\n---\nname: x\n---\n')).toBeUndefined()
  })

  it('parses the block and exposes the data', () => {
    const fm = parseFrontmatter(
      '---\nname: deploy\ndescription: ships to production\n---\n\nbody\n',
    )
    expect(fm?.error).toBeUndefined()
    expect(fm?.data).toEqual({ name: 'deploy', description: 'ships to production' })
  })

  it('each value offset points at the value inside the file', () => {
    const content = '---\nscript: ./scripts/release.sh\n---\n'
    const fm = parseFrontmatter(content)
    const value = fm?.values.find((v) => v.key === 'script')
    expect(value?.value).toBe('./scripts/release.sh')
    expect(content.slice(value!.offset[0], value!.offset[1])).toBe('./scripts/release.sh')
  })

  it('collects nested values in dot notation', () => {
    const fm = parseFrontmatter('---\nmeta:\n  path: src/index.ts\n---\n')
    expect(fm?.values.map((v) => v.key)).toEqual(['meta.path'])
  })

  it('collects list items with their index', () => {
    const fm = parseFrontmatter('---\nsources:\n  - a/one.md\n  - a/two.md\n---\n')
    expect(fm?.values.map((v) => v.key)).toEqual(['sources[0]', 'sources[1]'])
  })

  it('ignores values that are not strings', () => {
    const fm = parseFrontmatter('---\nname: x\nversion: 3\nactive: true\n---\n')
    expect(fm?.values.map((v) => v.key)).toEqual(['name'])
  })

  it('broken YAML is reported as an error instead of taking down the parse', () => {
    const fm = parseFrontmatter('---\nname: [unclosed\n---\n')
    expect(fm?.error).toBeDefined()
    expect(fm?.values).toEqual([])
    expect(fm?.keys).toEqual([])
  })

  it('the error offset points inside the block, at the offending token', () => {
    const content = '---\nname: ok\nname: again\n---\n'
    const fm = parseFrontmatter(content)
    expect(fm?.error?.reason).toBe('Map keys must be unique')
    const at = fm?.error?.offset[0] ?? 0
    expect(content.slice(at, at + 4)).toBe('name')
  })

  it('a duplicate key is an error and not a silent overwrite', () => {
    expect(parseFrontmatter('---\na: 1\na: 2\n---\n')?.error).toBeDefined()
  })

  it('the top-level keys carry the exact range of the key token', () => {
    const content = '---\nname: deploy\nallowed-tools: [Read]\n---\n'
    const fm = parseFrontmatter(content)
    const tools = fm?.keys.find((key) => key.key === 'allowed-tools')
    expect(content.slice(tools!.offset[0], tools!.offset[1])).toBe('allowed-tools')
  })

  it('the observed type names the YAML shape', () => {
    const fm = parseFrontmatter(
      ['---', 'a: text', 'b: 3', 'c: true', 'd: [one]', 'e:', '  f: g', 'h:', '---', ''].join('\n'),
    )
    expect(fm?.keys.map((key) => [key.key, key.type])).toEqual([
      ['a', 'string'],
      ['b', 'number'],
      ['c', 'boolean'],
      ['d', 'list'],
      ['e', 'mapping'],
      ['h', 'empty'],
    ])
  })

  it('only top-level pairs are keys', () => {
    const fm = parseFrontmatter('---\nmeta:\n  description: [nested]\n---\n')
    expect(fm?.keys.map((key) => key.key)).toEqual(['meta'])
  })

  it('two identical values do not collapse onto the same offset', () => {
    const content = '---\none: src/a.ts\ntwo: src/a.ts\n---\n'
    const fm = parseFrontmatter(content)
    expect(fm?.values).toHaveLength(2)
    expect(fm?.values[0]?.offset[0]).not.toBe(fm?.values[1]?.offset[0])
  })
})

function sourceOf(content: string, kind: SourceKind): Source {
  return {
    path: '.claude/skills/deploy/SKILL.md',
    absPath: `/tmp/.claude/skills/deploy/SKILL.md`,
    kind,
    content,
    baseDir: '.claude/skills/deploy',
    aliases: [],
  }
}

function claimsOf(content: string, kind: SourceKind = 'skill'): Claim[] {
  const source = sourceOf(content, kind)
  return extractFrontmatterClaims({
    source,
    doc: parseMarkdown(content),
    frontmatter: parseFrontmatter(content),
    table: buildLineTable(content),
    prose: proseGatesFor(content, undefined),
  })
}

function block(...lines: readonly string[]): string {
  return ['---', ...lines, '---', '', '# Title', ''].join('\n')
}

describe('extractFrontmatterClaims', () => {
  it('a source with no frontmatter claims nothing', () => {
    expect(claimsOf('# Title\n')).toEqual([])
  })

  it('a block that does not parse produces one claim, spanning its line', () => {
    const content = block('name: [unclosed')
    const claims = claimsOf(content)
    expect(claims).toHaveLength(1)
    expect(claims[0]?.text).toBe('name: [unclosed')
    expect(claims[0]?.range.line).toBe(2)
    // `Claim.text` has to be the fragment `Claim.offset` covers: the parser's
    // own offset is a single character and would break that.
    const [start, end] = claims[0]?.offset ?? [0, 0]
    expect(content.slice(start, end)).toBe('name: [unclosed')
    expect(frontmatterFactOf(claims[0]!)).toEqual({
      subject: 'parse',
      reason: 'Flow sequence in block collection must be sufficiently indented and end with a ]',
    })
  })

  it('a leading block holding prose is not frontmatter', () => {
    expect(claimsOf(block('Not frontmatter: prose with an [unclosed bracket'))).toEqual([])
  })

  it('a comment before the first key does not disqualify the block', () => {
    expect(claimsOf(block('# a comment', 'name: deploy')).map((claim) => claim.text)).toEqual([
      'name',
    ])
  })

  it('a template placeholder silences the whole block', () => {
    for (const value of ['{{name}}', '{% raw %}', '${NAME}', '<% name %>']) {
      expect(claimsOf(block(`name: ${value}`)), value).toEqual([])
    }
  })

  it('an empty value is still claimed, because another check reads it', () => {
    const claims = claimsOf(block('name: deploy', 'description:'))
    expect(claims.map((claim) => claim.text)).toEqual(['name', 'description'])
    expect(frontmatterFactOf(claims[1]!)).toEqual({
      subject: 'key',
      key: 'description',
      type: 'empty',
      scalar: undefined,
    })
  })

  it('one claim per top-level key, pointing at the key', () => {
    const content = block('name: deploy', 'tools:', '  - Read')
    const claims = claimsOf(content)
    expect(claims.map((claim) => claim.text)).toEqual(['name', 'tools'])
    expect(claims.map((claim) => claim.range.line)).toEqual([2, 3])
    expect(claims.every((claim) => claim.kind === 'frontmatter')).toBe(true)
    expect(frontmatterFactOf(claims[1]!)).toEqual({
      subject: 'key',
      key: 'tools',
      type: 'list',
      scalar: undefined,
    })
  })

  it('the string value travels with the fact, which is what keeps a `yes` a boolean', () => {
    const claims = claimsOf(block('alwaysApply: yes'), 'cursor-rule')
    expect(frontmatterFactOf(claims[0]!)).toEqual({
      subject: 'key',
      key: 'alwaysApply',
      type: 'string',
      scalar: 'yes',
    })
  })
})
