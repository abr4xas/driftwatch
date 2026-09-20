/**
 * Flag reading, shared by every script in here.
 *
 * There were three copies of this, and they had already diverged: two demanded
 * a positive integer, the third accepted any positive number because
 * `--show-at 0.7` is a probability. Both are real; they are two functions
 * rather than one with a mode, so the call site says which one it means.
 */

/** `--flag <value>`, or `undefined` when the flag is absent. */
export function stringFlag(argv: readonly string[], flag: string): string | undefined {
  const at = argv.indexOf(flag)
  if (at === -1) return undefined
  const value = argv[at + 1]
  if (value === undefined || value.startsWith('--')) throw new Error(`${flag} wants a value`)
  return value
}

/** A flag counting things: how many repos, how many requests at a time. */
export function countFlag(argv: readonly string[], flag: string): number | undefined {
  const at = argv.indexOf(flag)
  if (at === -1) return undefined
  const value = Number(argv[at + 1])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} wants a positive integer`)
  return value
}

/** A flag carrying a measurement: a threshold, a probability. */
export function numberFlag(argv: readonly string[], flag: string): number | undefined {
  const at = argv.indexOf(flag)
  if (at === -1) return undefined
  const value = Number(argv[at + 1])
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${flag} wants a positive number`)
  return value
}
