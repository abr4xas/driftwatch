import type { ClaimKind, Finding, SkipReason } from '../core/types.ts'
import type { RunResult } from '../run.ts'
import { colorsFor, type Colors } from './colors.ts'
import { sanitize } from './sanitize.ts'
import type { FixEntry, FixOutcome } from './types.ts'

export type PrettyOptions = {
  color: boolean
  /** SPEC.md § 5: show findings only, no summary. */
  quiet: boolean
  /** What `--fix` did, when it ran. Absent on an ordinary run. */
  fixes?: FixOutcome
  /**
   * The `--fix` command the summary suggests, carrying the paths, the check
   * selection and the config the run used. Built by the CLI, which is the one
   * that knows the invocation; `driftwatch --fix` when absent.
   */
  fixCommand?: string
}

/** SPEC.md § 5: prose is truncated to 40 characters with '…'. */
const MAX_TEXT = 40

/**
 * The claims whose text is the thing to act on: a path to create or fix, a
 * script to look up, a link to follow. Truncating one leaves the reader with
 * the only copy of it cut short, so these are printed whole and the column
 * makes room.
 */
const VERBATIM: ReadonlySet<ClaimKind> = new Set(['path', 'script', 'link'])

/** A claim's text as the row shows it: one line, sanitised, cut only if it is prose. */
function claimText(finding: Finding): string {
  const flat = sanitize(finding.claim.text).replaceAll(/\s+/gu, ' ').trim()
  return VERBATIM.has(finding.claim.kind) ? flat : truncate(flat)
}

/** `file:line` for an applied edit, which carries no column. */
function fixLocation(entry: FixEntry): string {
  return `${sanitize(entry.file)}:${entry.line}`
}

/** `file:line:col`, the shape a terminal or an editor recognises and opens. */
function locationOf(finding: Finding): string {
  const { claim } = finding
  return `${sanitize(claim.source.path)}:${claim.range.line}:${claim.range.column}`
}

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
  const file = sanitize(source?.path ?? '')
  const aliases = (source?.aliases ?? []).map(sanitize)
  if (aliases.length === 0) return c.bold(file)
  return `${c.bold(file)} ${c.dim(`(and ${aliases.join(', ')}, identical)`)}`
}

/**
 * The column the messages line up on. Measured over the texts that fit in
 * `MAX_TEXT`: a long path printed whole overflows its own row rather than
 * pushing every message in the group off to the right.
 */
function textColumn(texts: readonly string[]): number {
  const fitting = texts.filter((text) => text.length <= MAX_TEXT).map((text) => text.length)
  return fitting.length === 0 ? 0 : Math.max(...fitting)
}

function renderGroup(findings: readonly Finding[], c: Colors): string {
  const locationWidth = Math.max(...findings.map((f) => locationOf(f).length))
  const textWidth = textColumn(findings.map(claimText))

  const rows = findings
    .map((finding) => {
      const location = locationOf(finding).padEnd(locationWidth)
      const text = claimText(finding).padEnd(textWidth)
      const suggestion = finding.suggestion
      const tail = suggestion === undefined ? '' : c.dim(`  → ${sanitize(suggestion.value)}?`)
      const message = sanitize(finding.message)
      return `  ${symbolFor(finding, c)} ${location}  ${text}  ${message}${tail}\n`
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
  const where = count(outcome.files, 'file', 'files')
  if (outcome.dryRun) {
    if (outcome.applied === 0) return c.dim('nothing to fix\n')
    return c.dim(`${count(outcome.applied, 'fix', 'fixes')} would apply in ${where}\n`)
  }
  if (outcome.applied === 0) return c.dim('nothing applied\n')
  return c.dim(`${count(outcome.applied, 'fix', 'fixes')} applied in ${where}\n`)
}

/**
 * The diff: one line per edit, grouped by file, in the order they appear in it.
 *
 * Summarized and not unified, because the three lines around a claim in an
 * `AGENTS.md` carry no information. What a reader wants is where it lands and
 * what it becomes.
 *
 * A dry run prints **no symbol**, and the header says `would fix`: a `✓` on a
 * line describing something that has not happened is how somebody applies a fix
 * twice. SPEC.md § 5 allows three symbols and this adds none.
 */
function renderFixes(outcome: FixOutcome, c: Colors): string {
  if (outcome.entries.length === 0) return ''

  const groups = new Map<string, FixEntry[]>()
  for (const entry of outcome.entries) {
    const existing = groups.get(entry.file)
    if (existing === undefined) groups.set(entry.file, [entry])
    else existing.push(entry)
  }

  const mark = outcome.dryRun ? ' ' : c.green('✓')
  const body = [...groups]
    .map(([file, entries]) => {
      // Every fix rewrites a path, a script or a link, so neither side is ever
      // truncated: the same rule as the findings, and the same reason.
      const locationWidth = Math.max(...entries.map((entry) => fixLocation(entry).length))
      // The same column discipline the findings use: the arrows line up, so
      // the eye reads down the replacements rather than hunting for them.
      const textWidth = textColumn(entries.map((entry) => sanitize(entry.before)))
      const rows = entries
        .map((entry) => {
          const where = fixLocation(entry).padEnd(locationWidth)
          const before = sanitize(entry.before).padEnd(textWidth)
          return `  ${mark} ${where}  ${before}  ${c.dim('→')}  ${sanitize(entry.after)}\n`
        })
        .join('')
      return `${c.bold(sanitize(file))}\n${rows}`
    })
    .join('')

  return `${c.dim(outcome.dryRun ? 'would fix' : 'fixed')}\n${body}\n`
}

/** What each `SkipReason` means to somebody who has to go and fix it. */
const SKIP_MESSAGE: Record<SkipReason, string> = {
  'dangling-symlink': 'a symlink whose target is not in the working tree',
  'absent-from-worktree': 'listed by git, absent from the working tree',
}

/**
 * The documents that were found and could not be opened. See `SkipReason`.
 *
 * Above the summary rather than beside it, because it qualifies everything the
 * summary says: `no drift` means "in the files I could open". Dim, and with no
 * symbol — `✗ ⚠ ✓` are the three SPEC.md § 5 allows, and none of them fits
 * something that is not a finding.
 */
function skippedLines(result: RunResult, c: Colors): string {
  if (result.skipped.length === 0) return ''
  const rows = result.skipped
    .map((source) => c.dim(`skipped ${sanitize(source.path)}: ${SKIP_MESSAGE[source.reason]}\n`))
    .join('')
  return `${rows}\n`
}

/**
 * The next step, when there is one: what it does, then the command, whole and
 * on its own line so it can be copied as printed.
 */
function nextStep(fixable: number, command: string, c: Colors): string {
  return `\nApply ${count(fixable, 'fix', 'fixes')}:\n    ${c.cyan(command)}\n`
}

function summary(
  result: RunResult,
  c: Colors,
  fixes: FixOutcome | undefined,
  fixCommand: string,
): string {
  const files = count(result.sources.length, 'file', 'files')
  const ms = `${Math.round(result.durationMs)}ms`
  const { errors, warnings } = result.counts
  const found = errors + warnings

  if (found === 0) {
    const clean = `${c.green('✓')} ${files} · no drift · ${ms}\n`
    return fixes === undefined ? clean : `${clean}${fixLine(fixes, c)}`
  }

  const total = count(found, 'finding', 'findings')
  const head = `${files} · ${total}${breakdown(errors, warnings)} · ${ms}\n`
  if (fixes !== undefined) return `${head}${fixLine(fixes, c)}`
  if (result.fixable === 0) return head
  return `${head}${nextStep(result.fixable, fixCommand, c)}`
}

export function renderPretty(result: RunResult, options: PrettyOptions): string {
  const c = colorsFor(options.color)
  const body = [...groupByFile(result.findings)]
    .map(([, findings]) => renderGroup(findings, c))
    .join('')
  // `--quiet` drops the summary, not this. SPEC.md § 5 calls it "problems
  // only", and a document that was found and not opened is nearer a problem
  // than it is to the summary: it is the one line that changes how the list
  // above should be read, and a reader who asked for less still has to have it.
  if (options.quiet) return `${body}${skippedLines(result, c)}`
  const fixes = options.fixes === undefined ? '' : renderFixes(options.fixes, c)
  const tail = summary(result, c, options.fixes, options.fixCommand ?? 'driftwatch --fix')
  return `${body}${fixes}${skippedLines(result, c)}${tail}`
}
