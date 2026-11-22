/**
 * Why the tool refused to run, as a stable snake_case code. **The one registry**
 * of them: the `--json` error document carries it, `CONTRACT.md` freezes it,
 * and a consumer branches on it instead of parsing the message.
 *
 * Kept short on purpose. A reason earns its place by being something a caller
 * would handle differently from its neighbours, not by naming every message.
 */
export const ERROR_REASONS = [
  /** A flag the parser does not know. */
  'unknown_option',
  /** Flags or values that parse and do not make sense: a bad `--format`, two flags that contradict each other, a check id that does not exist. */
  'invalid_arguments',
  /** A positional path or an explicit `--config` that is not on disk. */
  'path_not_found',
  /** A config that was found and cannot be used as written. */
  'invalid_config',
  /** `--init` found a config already there, and never overwrites. */
  'config_exists',
  /** A flag accepted ahead of the milestone that implements it. */
  'not_implemented',
  /** A bug in driftwatch. Never thrown as a `UserError`; reported when anything else escapes. */
  'internal_error',
] as const

export type ErrorReason = (typeof ERROR_REASONS)[number]

/** The command that gets somebody out of the error, and what it does for them. */
export type ErrorNext = {
  /** What running it achieves, without the trailing colon: `See all options`. */
  label: string
  /** A complete command, copyable as printed: `driftwatch --help`. */
  command: string
}

export type UserErrorOptions = {
  reason?: ErrorReason
  next?: ErrorNext
}

/**
 * A problem attributable to whoever invoked the tool: a misspelled flag, an
 * invalid config, a path that does not exist. It exits with 2. Any other
 * exception is a bug of ours and is reported as such.
 *
 * `(message, hint?)` is the public constructor since `1.0.0` and stays as it
 * is; the reason and the recovery command ride in a third, optional argument.
 */
export class UserError extends Error {
  /** Optional detail under the headline: why, or what is accepted. May span lines. */
  readonly hint: string | undefined
  readonly reason: ErrorReason
  readonly next: ErrorNext | undefined

  constructor(message: string, hint?: string, options: UserErrorOptions = {}) {
    super(message)
    this.name = 'UserError'
    this.hint = hint
    // The broadest of the reasons a caller can fix: a `UserError` thrown
    // without one is still about the invocation, never about driftwatch.
    this.reason = options.reason ?? 'invalid_arguments'
    this.next = options.next
  }
}

export function isUserError(value: unknown): value is UserError {
  return value instanceof UserError
}

/** The message of something that was thrown, whether or not it is an Error. */
export function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

/** The `code` property of a Node error, if it has one. */
export function codeOf(cause: unknown): string | undefined {
  if (typeof cause !== 'object' || cause === null || !('code' in cause)) return undefined
  return typeof cause.code === 'string' ? cause.code : undefined
}

/** The recovery most usage errors share. */
export const SEE_HELP: ErrorNext = { label: 'See all options', command: 'driftwatch --help' }

/**
 * A flag the parser accepts because it is in the SPEC.md § 4 contract, but
 * whose behaviour does not exist yet. It fails instead of being silently
 * ignored: a `--json` that promises a document and returns an empty 0 is a lie
 * worse than an explicit error.
 */
export function notYetImplemented(flag: string): UserError {
  return new UserError(
    `${flag} isn't implemented yet.`,
    'It lands in a later milestone; see docs/spec/ROADMAP.md.',
    { reason: 'not_implemented' },
  )
}
