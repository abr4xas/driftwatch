import { describe, expect, it } from 'vitest'
import { colorEnabled } from '../src/report/colors.ts'
import { renderPretty } from '../src/report/pretty.ts'
import type { RunResult } from '../src/run.ts'
import type { Claim, Finding, Source } from '../src/core/types.ts'

/** El caracter de escape ANSI, para detectar color sin escribirlo literal. */
const ESC = '['

function source(path: string, kind: Source['kind'] = 'claude-md'): Source {
  return { path, absPath: `/repo/${path}`, kind, content: '', baseDir: '' }
}

function claim(file: string, line: number, text: string): Claim {
  return {
    kind: 'path',
    source: source(file),
    text,
    raw: text,
    range: { line, column: 1, endLine: line, endColumn: 1 + text.length },
    offset: [0, text.length],
    context: 'inline-code',
  }
}

function finding(file: string, line: number, text: string): Finding {
  return {
    check: 'path/missing',
    severity: 'error',
    claim: claim(file, line, text),
    message: 'ruta no existe',
  }
}

function result(over: Partial<RunResult> = {}): RunResult {
  return {
    root: '/repo',
    sources: [source('CLAUDE.md')],
    checks: ['path/missing'],
    findings: [],
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

  it('agrupa los findings por archivo y los ordena por linea', () => {
    const out = renderPretty(
      result({
        findings: [
          finding('CLAUDE.md', 12, 'src/lib/auth.ts'),
          finding('CLAUDE.md', 34, 'src/otro.ts'),
          finding('AGENTS.md', 3, 'scripts/x.sh'),
        ],
        counts: { errors: 3, warnings: 0 },
      }),
      plain,
    )
    const lines = out.split('\n')
    expect(lines[0]).toBe('CLAUDE.md')
    expect(lines[1]).toContain('12  src/lib/auth.ts')
    expect(lines[2]).toContain('34  src/otro.ts')
    expect(lines.find((l) => l === 'AGENTS.md')).toBeDefined()
  })

  it('alinea el numero de linea y el fragmento dentro del grupo', () => {
    const out = renderPretty(
      result({
        findings: [finding('CLAUDE.md', 5, 'a/b.ts'), finding('CLAUDE.md', 120, 'c/d/e.ts')],
        counts: { errors: 2, warnings: 0 },
      }),
      plain,
    )
    expect(out).toContain('  ✗   5  a/b.ts    ruta no existe')
    expect(out).toContain('  ✗ 120  c/d/e.ts  ruta no existe')
  })

  it('trunca el fragmento a 40 caracteres con puntos suspensivos', () => {
    const largo = `src/${'x'.repeat(60)}.ts`
    const out = renderPretty(
      result({ findings: [finding('CLAUDE.md', 1, largo)], counts: { errors: 1, warnings: 0 } }),
      plain,
    )
    expect(out).toContain('…')
    const cited = out.split('\n')[1]?.split('  ')[2] ?? ''
    expect(cited.length).toBe(40)
  })

  it('renderiza la sugerencia cuando el finding la trae', () => {
    const base = finding('CLAUDE.md', 12, 'src/lib/auth.ts')
    const out = renderPretty(
      result({
        findings: [
          { ...base, suggestion: { value: 'src/auth/index.ts', confidence: 0.86, fixable: true } },
        ],
        counts: { errors: 1, warnings: 0 },
        fixable: 1,
      }),
      plain,
    )
    expect(out).toContain('→ src/auth/index.ts?')
    expect(out).toContain('1 corregible con --fix')
  })

  it('un warning usa el simbolo de aviso y no el de error', () => {
    const out = renderPretty(
      result({
        findings: [{ ...finding('CLAUDE.md', 1, 'x/y.ts'), severity: 'warning' }],
        counts: { errors: 0, warnings: 1 },
      }),
      plain,
    )
    expect(out).toContain('⚠')
    expect(out).not.toContain('✗')
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
