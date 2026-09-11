import type { Finding } from '../core/types.ts'
import type { RunResult } from '../run.ts'
import { colorsFor, type Colors } from './colors.ts'

export type PrettyOptions = {
  color: boolean
  /** SPEC.md § 5: show problems only, no summary. */
  quiet: boolean
  /** What `--fix` did, when it ran. Absent on an ordinary run. */
  fixes?: FixOutcome
}

/** What a `--fix` run applied, as the summary needs to say it. */
export type FixOutcome = {
  applied: number
  files: number
}

/** SPEC.md § 5: the quoted fragment is truncated to 40 characters with '…'. */
const MAX_TEXT = 40

/** Pluralizes a counter for the summary line. */
function count(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}

function breakdown(errors: number, warnings: number): string {
  const parts: string[] = []
  if (errors > 0) parts.push(count(errors, 'error', 'errors'))
  if (warnings > 0) parts.push(count(warnings, 'warning', 'warnings'))
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

/** The group header, naming the identical copies if there are any. */
function headerFor(findings: readonly Finding[], c: Colors): string {
  const source = findings[0]?.claim.source
  const file = source?.path ?? ''
  const aliases = source?.aliases ?? []
  if (aliases.length === 0) return c.bold(file)
  return `${c.bold(file)} ${c.dim(`(and ${aliases.join(', ')}, identical)`)}`
}

function renderGroup(findings: readonly Finding[], c: Colors): string {
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

  return `${headerFor(findings, c)}\n${rows}\n`
}

/**
 * The line about fixes, which replaces the "fixable with --fix" one rather
 * than joining it.
 *
 * Telling somebody who has just run `--fix` that N findings are fixable with
 * `--fix` is the output saying it did not do what it was asked. What is left
 * after a fix run is reported as what it is: the findings that remain, and a
 * count of what was applied.
 */
function fixLine(outcome: FixOutcome, c: Colors): string {
  if (outcome.applied === 0) return c.dim('nothing applied\n')
  const what = count(outcome.applied, 'fix', 'fixes')
  return c.dim(`${what} applied in ${count(outcome.files, 'file', 'files')}\n`)
}

function summary(result: RunResult, c: Colors, fixes: FixOutcome | undefined): string {
  const files = count(result.sources.length, 'file', 'files')
  const ms = `${Math.round(result.durationMs)}ms`
  const { errors, warnings } = result.counts
  const problems = errors + warnings

  if (problems === 0) {
    const clean = `${c.green('✓')} ${files} · no drift · ${ms}\n`
    return fixes === undefined ? clean : `${clean}${fixLine(fixes, c)}`
  }

  const total = count(problems, 'problem', 'problems')
  const head = `${files} · ${total}${breakdown(errors, warnings)} · ${ms}\n`
  if (fixes !== undefined) return `${head}${fixLine(fixes, c)}`
  if (result.fixable === 0) return head
  return `${head}${c.dim(`${count(result.fixable, 'fixable', 'fixable')} with --fix\n`)}`
}

export function renderPretty(result: RunResult, options: PrettyOptions): string {
  const c = colorsFor(options.color)
  const body = [...groupByFile(result.findings)]
    .map(([, findings]) => renderGroup(findings, c))
    .join('')
  return options.quiet ? body : `${body}${summary(result, c, options.fixes)}`
}
