import { describe, expect, it } from 'vitest'
import { UserError } from '../src/core/errors.ts'
import { parseCliArgs } from '../src/cli/args.ts'

describe('parseCliArgs', () => {
  it('sin argumentos audita el cwd con los defaults', () => {
    const args = parseCliArgs([])
    expect(args.paths).toEqual([])
    expect(args.format).toBe('pretty')
    expect(args.fix).toBe(false)
    expect(args.strict).toBe(false)
    expect(args.help).toBe(false)
    expect(args.version).toBe(false)
  })

  it('acepta rutas posicionales', () => {
    expect(parseCliArgs(['AGENTS.md', 'docs/']).paths).toEqual(['AGENTS.md', 'docs/'])
  })

  it('--json es azucar de --format json', () => {
    expect(parseCliArgs(['--json']).format).toBe('json')
  })

  it('--format explicito gana sobre el default', () => {
    expect(parseCliArgs(['--format', 'sarif']).format).toBe('sarif')
  })

  it('rechaza un formato desconocido con UserError', () => {
    expect(() => parseCliArgs(['--format', 'yaml'])).toThrow(UserError)
  })

  it('rechaza un flag desconocido con UserError', () => {
    expect(() => parseCliArgs(['--turbo'])).toThrow(UserError)
  })

  it('parsea las listas separadas por coma de --only y --skip', () => {
    const args = parseCliArgs(['--only', 'path,script', '--skip', 'dep/missing'])
    expect(args.only).toEqual(['path', 'script'])
    expect(args.skip).toEqual(['dep/missing'])
  })

  it('descarta las entradas vacias de una lista mal escrita', () => {
    expect(parseCliArgs(['--only', 'path,,']).only).toEqual(['path'])
  })

  it('reconoce los alias cortos -h y -v', () => {
    expect(parseCliArgs(['-h']).help).toBe(true)
    expect(parseCliArgs(['-v']).version).toBe(true)
  })

  it('--no-tier2 y --no-config se leen como booleanos', () => {
    const args = parseCliArgs(['--no-tier2', '--no-config'])
    expect(args.tier2).toBe(false)
    expect(args.config).toBe(false)
  })

  it('--config con ruta guarda la ruta', () => {
    expect(parseCliArgs(['--config', './dw.config.ts']).config).toBe('./dw.config.ts')
  })

  it('rechaza --config y --no-config juntos, porque se contradicen', () => {
    expect(() => parseCliArgs(['--config', 'a.ts', '--no-config'])).toThrow(UserError)
  })
})
