import type { RunResult } from '../run.ts'
import { colorsFor, type Colors } from './colors.ts'

export type PrettyOptions = {
  color: boolean
  /** SPEC.md § 5: solo muestra problemas, sin resumen. */
  quiet: boolean
}

/** Plural del castellano para los contadores del resumen. */
function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

function breakdown(errors: number, warnings: number): string {
  const parts: string[] = []
  if (errors > 0) parts.push(count(errors, 'error', 'errores'))
  if (warnings > 0) parts.push(count(warnings, 'aviso', 'avisos'))
  return parts.length > 0 ? ` (${parts.join(', ')})` : ''
}

function summary(result: RunResult, c: Colors): string {
  const files = count(result.sources.length, 'archivo', 'archivos')
  const ms = `${Math.round(result.durationMs)}ms`
  const { errors, warnings } = result.counts
  const problems = errors + warnings

  if (problems === 0) {
    return `${c.green('✓')} ${files} · sin drift · ${ms}\n`
  }
  const total = count(problems, 'problema', 'problemas')
  return `${files} · ${total}${breakdown(errors, warnings)} · ${ms}\n`
}

/**
 * Mientras no haya ningun check registrado, lo unico observable que la
 * herramienta puede decir es que fuentes encontro. Este bloque desaparece solo
 * en cuanto el primer check entra al registro.
 */
function sourceListing(result: RunResult, c: Colors): string {
  if (result.sources.length === 0) return ''
  const width = Math.max(...result.sources.map((source) => source.kind.length))
  const rows = result.sources
    .map((source) => `  ${c.dim(source.kind.padEnd(width))}  ${source.path}\n`)
    .join('')
  return `${c.bold('fuentes descubiertas')}\n${rows}${c.dim('  sin checks registrados todavia\n')}\n`
}

export function renderPretty(result: RunResult, options: PrettyOptions): string {
  const c = colorsFor(options.color)
  const body = result.checks.length === 0 ? sourceListing(result, c) : ''
  return options.quiet ? body : `${body}${summary(result, c)}`
}
