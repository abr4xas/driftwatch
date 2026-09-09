import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '../src/parse/markdown.ts'
import { buildLineTable, rangeFor } from '../src/parse/positions.ts'

describe('parseMarkdown', () => {
  it('el offset de un inlineCode apunta al valor, no a los backticks', () => {
    const content = 'La ruta es `src/foo.ts` aca.\n'
    const [span] = parseMarkdown(content).inlineCode
    expect(span?.value).toBe('src/foo.ts')
    expect(content.slice(span!.offset[0], span!.offset[1])).toBe('src/foo.ts')
  })

  it('funciona con backticks dobles y con backticks dentro del valor', () => {
    const content = 'Ver ``a`b/c.ts`` fin.\n'
    const [span] = parseMarkdown(content).inlineCode
    expect(span?.value).toBe('a`b/c.ts')
    expect(content.slice(span!.offset[0], span!.offset[1])).toBe('a`b/c.ts')
  })

  it('el offset de un link apunta a la url, no al texto visible', () => {
    const content = 'Mira [la spec](./docs/SPEC.md) por favor.\n'
    const [span] = parseMarkdown(content).links
    expect(span?.value).toBe('./docs/SPEC.md')
    expect(span?.label).toBe('la spec')
    expect(content.slice(span!.offset[0], span!.offset[1])).toBe('./docs/SPEC.md')
  })

  it('captura los fences con su lenguaje declarado', () => {
    const content = '```bash\npnpm run test\n```\n\n```\nsin lenguaje\n```\n'
    const { fences } = parseMarkdown(content)
    expect(fences.map((f) => f.lang)).toEqual(['bash', undefined])
    expect(fences[0]?.value).toBe('pnpm run test')
  })

  it('no confunde un inlineCode dentro de un fence con codigo inline', () => {
    const content = '```md\nesto tiene `backticks` adentro\n```\n'
    expect(parseMarkdown(content).inlineCode).toEqual([])
  })
})

describe('rangeFor', () => {
  it('convierte offsets en linea y columna 1-indexadas', () => {
    const content = 'primera\nsegunda con `x/y.ts` aca\ntercera\n'
    const table = buildLineTable(content)
    const start = content.indexOf('x/y.ts')
    const range = rangeFor(table, start, start + 'x/y.ts'.length)
    expect(range).toEqual({ line: 2, column: 14, endLine: 2, endColumn: 20 })
  })

  it('el primer caracter del archivo es linea 1 columna 1', () => {
    expect(rangeFor(buildLineTable('abc\n'), 0, 1)).toEqual({
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 2,
    })
  })
})
