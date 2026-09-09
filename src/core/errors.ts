/**
 * A problem attributable to whoever invoked the tool: a misspelled flag, an
 * invalid config, a path that does not exist. It prints as a single line and
 * exits with 2. Any other exception is a bug of ours and is reported as such.
 */
export class UserError extends Error {
  /** Optional one-line hint: what to do next. */
  readonly hint: string | undefined

  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'UserError'
    this.hint = hint
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

/**
 * A flag the parser accepts because it is in the SPEC.md § 4 contract, but
 * whose behaviour does not exist yet. It fails instead of being silently
 * ignored: a `--json` that promises a document and returns an empty 0 is a lie
 * worse than an explicit error.
 */
export function notYetImplemented(flag: string): UserError {
  return new UserError(
    `${flag} is not implemented yet`,
    'it lands in a later milestone; see docs/spec/ROADMAP.md',
  )
}
