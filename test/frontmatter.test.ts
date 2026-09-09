import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../src/parse/frontmatter.ts'

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
  })

  it('two identical values do not collapse onto the same offset', () => {
    const content = '---\none: src/a.ts\ntwo: src/a.ts\n---\n'
    const fm = parseFrontmatter(content)
    expect(fm?.values).toHaveLength(2)
    expect(fm?.values[0]?.offset[0]).not.toBe(fm?.values[1]?.offset[0])
  })
})
