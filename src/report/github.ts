/**
 * Native GitHub Actions annotations, so a run marks up the diff in the pull
 * request instead of printing into a log nobody expands.
 *
 * The log **is** the transport: the runner scans stdout for lines beginning
 * with `::`. So this format emits annotations and nothing else — no summary, no
 * file headers, no fix diff. A line that is not a workflow command is a line
 * that shows up as noise in the job output.
 */
import type { Finding } from '../core/types.ts'
import type { RunResult } from '../run.ts'

/**
 * The runner reads these lines out of a stream, which is the whole reason
 * escaping is not cosmetic here: a raw newline in a message ends the annotation
 * and turns the rest into log noise, and a raw `,` inside a property value ends
 * the property and eats the next one.
 */
function escapeData(value: string): string {
  return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(':', '%3A').replaceAll(',', '%2C')
}

/**
 * The suggestion rides in the message rather than in a second annotation: one
 * finding is one annotation, and the suggestion is the half a reviewer acts on.
 */
function messageOf(finding: Finding): string {
  const { suggestion } = finding
  return suggestion === undefined ? finding.message : `${finding.message} → ${suggestion.value}?`
}

function annotationOf(finding: Finding): string {
  const { claim } = finding
  const kind = finding.severity === 'error' ? 'error' : 'warning'
  const properties = [
    `file=${escapeProperty(claim.source.path)}`,
    `line=${claim.range.line}`,
    `col=${claim.range.column}`,
    `endColumn=${claim.range.endColumn}`,
    // The check id is the only stable label, and it is what somebody searches
    // for when the same annotation shows up on three repositories.
    `title=${escapeProperty(finding.check)}`,
  ].join(',')
  return `::${kind} ${properties}::${escapeData(messageOf(finding))}\n`
}

/** No findings means no output at all, not a blank line. */
export function renderGithub(result: RunResult): string {
  return result.findings.map(annotationOf).join('')
}
