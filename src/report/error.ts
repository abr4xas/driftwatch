/**
 * How a run that never produced a report says so: on stderr, exit 2.
 *
 * Two shapes. A person gets a headline, the detail under it, and the one
 * command that gets them out. A consumer that asked for `--json` or
 * `--format sarif` gets one line of JSON instead, because a parser reading
 * stderr for the reason cannot be asked to scrape English. stdout stays empty
 * in both: there is no answer to print.
 */
import { isUserError, messageOf, type ErrorNext, type ErrorReason } from '../core/errors.ts'

const ISSUES = 'https://github.com/abr4xas/driftwatch/issues'

export type ErrorReport = {
  reason: ErrorReason
  message: string
  hint?: string
  next?: ErrorNext
}

/** Whatever was thrown, as something both renderers can print. */
export function errorReportOf(error: unknown): ErrorReport {
  if (isUserError(error)) {
    return {
      reason: error.reason,
      message: error.message,
      ...(error.hint === undefined ? {} : { hint: error.hint }),
      ...(error.next === undefined ? {} : { next: error.next }),
    }
  }
  // A bug of ours. Say so, with the message but without dumping the stack on
  // someone who only wanted to run a linter. The report link carries nothing
  // from argv: a path or a value in a bug report is somebody's private repo.
  return {
    reason: 'internal_error',
    message: `Unexpected error in driftwatch: ${messageOf(error)}`,
    hint: 'This is a driftwatch bug. Include the command that produced it, without private paths.',
    next: { label: 'Report it', command: ISSUES },
  }
}

/**
 * `Error:` and not `✗`: on stdout `✗` marks a finding of severity error, and
 * the whole point of exit 1 versus exit 2 is that those two are never confused.
 */
export function renderErrorText(report: ErrorReport): string {
  const detail =
    report.hint === undefined
      ? ''
      : report.hint
          .split('\n')
          .map((line) => `  ${line}\n`)
          .join('')
  const next =
    report.next === undefined ? '' : `\n${report.next.label}:\n    ${report.next.command}\n`
  return `Error: ${report.message}\n${detail}${next}`
}

/** One line, always, so the document is the last line of stderr and nothing has to be reassembled. */
export function renderErrorJson(report: ErrorReport): string {
  const error = {
    reason: report.reason,
    message: report.message,
    ...(report.hint === undefined ? {} : { hint: report.hint }),
    ...(report.next === undefined ? {} : { command: report.next.command }),
  }
  return `${JSON.stringify({ error })}\n`
}

/** A condition worth knowing that stops nothing: it is not a finding and it does not move the exit code. */
export function renderWarningText(message: string): string {
  return `Warning: ${message}\n`
}
