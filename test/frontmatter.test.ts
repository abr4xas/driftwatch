import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../src/parse/frontmatter.ts'

describe('parseFrontmatter', () => {
  it('sin bloque inicial devuelve undefined', () => {
    expect(parseFrontmatter('# Solo un titulo\n')).toBeUndefined()
  })

  it('un `---` que no esta al principio no es frontmatter', () => {
    expect(parseFrontmatter('texto\n\n---\nname: x\n---\n')).toBeUndefined()
  })

  it('parsea el bloque y expone los datos', () => {
    const fm = parseFrontmatter(
      '---\nname: deploy\ndescription: manda a produccion\n---\n\ncuerpo\n',
    )
    expect(fm?.error).toBeUndefined()
    expect(fm?.data).toEqual({ name: 'deploy', description: 'manda a produccion' })
  })

  it('el offset de cada valor apunta al valor dentro del archivo', () => {
    const content = '---\nscript: ./scripts/release.sh\n---\n'
    const fm = parseFrontmatter(content)
    const value = fm?.values.find((v) => v.key === 'script')
    expect(value?.value).toBe('./scripts/release.sh')
    expect(content.slice(value!.offset[0], value!.offset[1])).toBe('./scripts/release.sh')
  })

  it('recolecta valores anidados con notacion de punto', () => {
    const fm = parseFrontmatter('---\nmeta:\n  ruta: src/index.ts\n---\n')
    expect(fm?.values.map((v) => v.key)).toEqual(['meta.ruta'])
  })

  it('recolecta los elementos de una lista con su indice', () => {
    const fm = parseFrontmatter('---\nfuentes:\n  - a/uno.md\n  - a/dos.md\n---\n')
    expect(fm?.values.map((v) => v.key)).toEqual(['fuentes[0]', 'fuentes[1]'])
  })

  it('ignora los valores que no son cadenas', () => {
    const fm = parseFrontmatter('---\nname: x\nversion: 3\nactivo: true\n---\n')
    expect(fm?.values.map((v) => v.key)).toEqual(['name'])
  })

  it('un YAML roto se reporta como error en vez de tumbar el parseo', () => {
    const fm = parseFrontmatter('---\nname: [sin cerrar\n---\n')
    expect(fm?.error).toBeDefined()
    expect(fm?.values).toEqual([])
  })

  it('dos valores identicos no colapsan en el mismo offset', () => {
    const content = '---\nuno: src/a.ts\ndos: src/a.ts\n---\n'
    const fm = parseFrontmatter(content)
    expect(fm?.values).toHaveLength(2)
    expect(fm?.values[0]?.offset[0]).not.toBe(fm?.values[1]?.offset[0])
  })
})
