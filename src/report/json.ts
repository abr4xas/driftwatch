/**
 * The stable JSON contract of `SPEC.md` § 6.
 *
 * "Stable" is the whole feature: a script reading `findings[].check` today has
 * to read it after the next minor. New optional fields are additive; a removal
 * or a rename is a major. `version` is what a consumer branches on, and it is
 * `1`.
 */
import type { Finding } from '../core/types.ts'
import type { RunResult } from '../run.ts'
import type { FixEntry, FixOutcome } from './types.ts'

export type JsonOptions = {
  /** What `--fix` did, when it ran. Absent on an ordinary run. */
  fixes?: FixOutcome
}

type JsonFix = {
  /** Absolute byte offsets into the file as it is on disk right now. */
  start: number
  end: number
  replacement: string
}

function fixOf(entry: FixEntry): JsonFix {
  return { start: entry.range[0], end: entry.range[1], replacement: entry.after }
}

function findingOf(finding: Finding, fix: JsonFix | undefined): Record<string, unknown> {
  const { claim, suggestion } = finding
  return {
    check: finding.check,
    severity: finding.severity,
    file: claim.source.path,
    line: claim.range.line,
    column: claim.range.column,
    // `endLine` is not in § 6's example and is emitted anyway: an `endColumn`
    // without it is ambiguous the moment a claim spans two lines, which a
    // fenced block can.
    endLine: claim.range.endLine,
    endColumn: claim.range.endColumn,
    text: claim.text,
    message: finding.message,
    ...(suggestion === undefined
      ? {}
      : {
          suggestion: {
            value: suggestion.value,
            confidence: suggestion.confidence,
            fixable: suggestion.fixable,
          },
        }),
    ...(fix === undefined ? {} : { fix }),
  }
}

/**
 * The edits, keyed by the finding they answer.
 *
 * **Only for a dry run.** After a real `--fix` the findings being reported come
 * from a second full run over files that have already been rewritten, so an
 * offset from the plan indexes a file that no longer exists in that form. The
 * top-level `fixes` block still describes what was applied; what is withheld is
 * the per-finding offer, because there is nothing left to offer.
 */
function plannedBy(fixes: FixOutcome | undefined): Map<Finding, JsonFix> {
  if (fixes === undefined || !fixes.dryRun) return new Map()
  return new Map(fixes.entries.map((entry) => [entry.finding, fixOf(entry)]))
}

function fixesOf(fixes: FixOutcome): Record<string, unknown> {
  return {
    applied: fixes.applied,
    files: fixes.files,
    dryRun: fixes.dryRun,
    edits: fixes.entries.map((entry) => ({
      file: entry.file,
      line: entry.line,
      start: entry.range[0],
      end: entry.range[1],
      before: entry.before,
      after: entry.after,
    })),
  }
}

export function renderJson(result: RunResult, options: JsonOptions = {}): string {
  const planned = plannedBy(options.fixes)
  const document = {
    version: 1,
    root: result.root,
    // Rounded, because a float with fourteen decimals in a contract is noise in
    // every diff a consumer commits.
    durationMs: Math.round(result.durationMs),
    summary: {
      sources: result.sources.length,
      claims: result.claims,
      errors: result.counts.errors,
      warnings: result.counts.warnings,
      fixable: result.fixable,
    },
    findings: result.findings.map((finding) => findingOf(finding, planned.get(finding))),
    ...(options.fixes === undefined ? {} : { fixes: fixesOf(options.fixes) }),
  }
  return `${JSON.stringify(document, null, 2)}\n`
}
