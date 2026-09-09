import { describe, expect, it } from 'vitest'
import { colorEnabled } from '../src/report/colors.ts'
import { renderPretty } from '../src/report/pretty.ts'
import type { RunResult } from '../src/run.ts'
import type { Source } from '../src/core/types.ts'

/** El caracter de escape ANSI, para detectar color sin escribirlo literal. */
const ESC = '['

function source(path: string, kind: Source['kind'] = 'claude-md'): Source {
  return { path, absPath: `/repo/${path}`, kind, content: '', baseDir: '' }
}

function result(over: Partial<RunResult> = {}): RunResult {
  return {
    root: '/repo',
    sources: [source('CLAUDE.md')],
    checks: [],
    counts: { errors: 0, warnings: 0 },
    fixable: 0,
    durationMs: 210,
    ...over,
  }
}

const plain = { color: false, quiet: false }

describe('renderPretty', () => {
  it('sin problemas cierra con la linea de SPEC.md § 5', () => {
    const sources = Array.from({ length: 14 }, (_, i) => source(`d${i}/CLAUDE.md`))
    expect(renderPretty(result({ sources }), plain)).toContain('✓ 14 archivos · sin drift · 210ms')
  })

  it('singulariza cuando hay una sola fuente', () => {
    expect(renderPretty(result(), plain)).toContain('✓ 1 archivo · sin drift · 210ms')
  })

  it('desglosa errores y avisos cuando hay problemas', () => {
    const out = renderPretty(
      result({
        counts: { errors: 4, warnings: 1 },
        durationMs: 340,
        sources: [source('a'), source('b')],
      }),
      plain,
    )
    expect(out).toContain('2 archivos · 5 problemas (4 errores, 1 aviso) · 340ms')
  })

  it('omite la parte del desglose que es cero', () => {
    const out = renderPretty(result({ counts: { errors: 1, warnings: 0 } }), plain)
    expect(out).toContain('1 problema (1 error) ·')
    expect(out).not.toContain('aviso')
  })

  it('--quiet suprime el resumen', () => {
    expect(renderPretty(result(), { color: false, quiet: true })).not.toContain('sin drift')
  })

  it('mientras no haya checks registrados, lista las fuentes', () => {
    const out = renderPretty(result({ sources: [source('AGENTS.md', 'agents-md')] }), plain)
    expect(out).toContain('fuentes descubiertas')
    expect(out).toContain('agents-md')
    expect(out).toContain('AGENTS.md')
    expect(out).toContain('sin checks registrados todavia')
  })

  it('en cuanto hay un check registrado, el listado desaparece solo', () => {
    expect(renderPretty(result({ checks: ['path/missing'] }), plain)).not.toContain(
      'fuentes descubiertas',
    )
  })

  it('sin color no emite secuencias de escape', () => {
    expect(renderPretty(result({ counts: { errors: 1, warnings: 0 } }), plain)).not.toContain(ESC)
  })

  it('con color si las emite', () => {
    expect(renderPretty(result(), { color: true, quiet: false })).toContain(ESC)
  })

  it('no usa emojis: solo los tres simbolos de SPEC.md § 5', () => {
    const out = renderPretty(result(), plain) + renderPretty(result({ checks: ['x'] }), plain)
    expect(out).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('colorEnabled', () => {
  it('apaga el color si NO_COLOR esta seteado, incluso en una tty', () => {
    expect(colorEnabled({ NO_COLOR: '1' } as NodeJS.ProcessEnv, true)).toBe(false)
  })

  it('un NO_COLOR vacio no cuenta como seteado', () => {
    expect(colorEnabled({ NO_COLOR: '' } as NodeJS.ProcessEnv, true)).toBe(true)
  })

  it('apaga el color si stdout no es una tty', () => {
    expect(colorEnabled({} as NodeJS.ProcessEnv, false)).toBe(false)
  })

  it('lo enciende en una tty sin NO_COLOR', () => {
    expect(colorEnabled({} as NodeJS.ProcessEnv, true)).toBe(true)
  })
})
