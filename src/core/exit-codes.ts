/**
 * The three exit codes of the CLI contract (SPEC.md § 4). They are part of the
 * public API: a CI pipeline that tells "I found drift" apart from "the tool
 * broke" depends on 1 and 2 never being confused.
 */
export const EXIT = {
  ok: 0,
  findings: 1,
  toolFailure: 2,
} as const

export type ExitCode = (typeof EXIT)[keyof typeof EXIT]

export type Counts = {
  errors: number
  warnings: number
}

export function exitCodeFor(counts: Counts, strict: boolean): ExitCode {
  const failing = strict ? counts.errors + counts.warnings : counts.errors
  return failing > 0 ? EXIT.findings : EXIT.ok
}
