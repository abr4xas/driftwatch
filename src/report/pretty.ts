import type { Finding } from '../core/types.ts'
import type { RunResult } from '../run.ts'
import { colorsFor, type Colors } from './colors.ts'

export type PrettyOptions = {
  color: boolean
  /** SPEC.md § 5: solo muestra problemas, sin resumen. */
  quiet: boolean
}

/** SPEC.md § 5: el fragmento citado se trunca a 40 caracteres con '…'. */
const MAX_TEXT = 40

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

export function truncate(text: string, max: number = MAX_TEXT): string {
  const flat = text.replaceAll(/\s+/gu, ' ').trim()
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`
}

function symbolFor(finding: Finding, c: Colors): string {
  return finding.severity === 'error' ? c.red('✗') : c.yellow('⚠')
}

function groupByFile(findings: readonly Finding[]): Map<string, Finding[]> {
  const groups = new Map<string, Finding[]>()
  for (const finding of findings) {
    const key = finding.claim.source.path
    const existing = groups.get(key)
    if (existing === undefined) groups.set(key, [finding])
    else existing.push(finding)
  }
  return groups
}

function renderGroup(file: string, findings: readonly Finding[], c: Colors): string {
  const lineWidth = Math.max(...findings.map((f) => String(f.claim.range.line).length))
  const textWidth = Math.max(...findings.map((f) => truncate(f.claim.text).length))

  const rows = findings
    .map((finding) => {
      const line = String(finding.claim.range.line).padStart(lineWidth)
      const text = truncate(finding.claim.text).padEnd(textWidth)
      const suggestion = finding.suggestion
      const tail = suggestion === undefined ? '' : c.dim(`  → ${suggestion.value}?`)
      return `  ${symbolFor(finding, c)} ${line}  ${text}  ${finding.message}${tail}\n`
    })
    .join('')

  return `${c.bold(file)}\n${rows}\n`
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
  const head = `${files} · ${total}${breakdown(errors, warnings)} · ${ms}\n`
  if (result.fixable === 0) return head
  return `${head}${c.dim(`${count(result.fixable, 'corregible', 'corregibles')} con --fix\n`)}`
}

export function renderPretty(result: RunResult, options: PrettyOptions): string {
  const c = colorsFor(options.color)
  const body = [...groupByFile(result.findings)]
    .map(([file, findings]) => renderGroup(file, findings, c))
    .join('')
  return options.quiet ? body : `${body}${summary(result, c)}`
}
