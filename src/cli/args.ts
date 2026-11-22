import { parseArgs } from 'node:util'
import { codeOf, messageOf, SEE_HELP, UserError } from '../core/errors.ts'

export const FORMATS = ['pretty', 'json', 'github', 'sarif'] as const
export type Format = (typeof FORMATS)[number]

function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value)
}

export type CliArgs = {
  paths: string[]
  format: Format
  fix: boolean
  /** `--dry-run`: with `--fix`, show what it would change and write nothing. */
  dryRun: boolean
  strict: boolean
  quiet: boolean
  init: boolean
  help: boolean
  version: boolean
  tier2: boolean
  /** Explicit path to the config, or `false` to ignore any config. */
  config: string | false | undefined
  only: string[] | undefined
  skip: string[] | undefined
}

/** The keys of `CliArgs` that are boolean flags. */
export type BooleanFlag = {
  [K in keyof CliArgs]: CliArgs[K] extends boolean ? K : never
}[keyof CliArgs]

/**
 * What the parser accepts. Exported because `scripts/release/surface.ts` reads
 * it: the flags are part of the frozen contract, and an artifact that listed
 * the ones `--help` advertises would miss exactly the flags where the two
 * disagree.
 */
export const OPTIONS = {
  fix: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  json: { type: 'boolean' },
  format: { type: 'string' },
  only: { type: 'string' },
  skip: { type: 'string' },
  strict: { type: 'boolean' },
  'no-tier2': { type: 'boolean' },
  config: { type: 'string' },
  'no-config': { type: 'boolean' },
  quiet: { type: 'boolean' },
  init: { type: 'boolean' },
  version: { type: 'boolean', short: 'v' },
  help: { type: 'boolean', short: 'h' },
} as const

/** A comma-separated list, tolerant of extra commas: `path,,script`. */
function splitList(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  return entries
}

function resolveFormat(values: { format?: string; json?: boolean }): Format {
  const explicit = values.format
  if (explicit !== undefined) {
    if (!isFormat(explicit)) {
      throw new UserError(`Unknown format ${explicit}.`, `Use ${FORMATS.join(', ')}.`, {
        next: SEE_HELP,
      })
    }
    return explicit
  }
  return values.json === true ? 'json' : 'pretty'
}

/**
 * Whether the caller asked for a machine format, decided without the strict
 * parse: the error that needs to know is often the parse failing. Lenient
 * parsing reads the same option table, so `--format=json`, `--format json` and
 * `--json` are all seen the way the real parse would see them.
 */
export function wantsMachineError(argv: readonly string[]): boolean {
  const { values } = parseArgs({
    args: [...argv],
    options: OPTIONS,
    allowPositionals: true,
    strict: false,
  })
  const format = values.format
  if (typeof format === 'string') return format === 'json' || format === 'sarif'
  return values.json === true
}

/** Edit distance, for the one suggestion an unknown flag gets. */
function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      current.push(Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, substitution))
    }
    previous = current
  }
  return previous[b.length] ?? 0
}

/**
 * The closest known flag, or nothing. **At most one**, and only when it is
 * unambiguous: two equally close candidates mean the tool would be guessing,
 * and a wrong "did you mean" costs more than none.
 */
export function closestOption(flag: string): string | undefined {
  const typed = flag.replace(/^-{1,2}/u, '').split('=')[0] ?? ''
  if (typed.length < 2) return undefined
  // Two edits covers a transposition and a dropped letter; beyond that the
  // "suggestion" for `--turbo` would be whatever flag happens to be shortest.
  const limit = typed.length <= 4 ? 1 : 2
  let best: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY
  let tied = false
  for (const name of Object.keys(OPTIONS)) {
    const d = distance(typed, name)
    if (d < bestDistance) {
      best = name
      bestDistance = d
      tied = false
    } else if (d === bestDistance) {
      tied = true
    }
  }
  if (best === undefined || bestDistance === 0 || bestDistance > limit || tied) return undefined
  return `--${best}`
}

/**
 * parseArgs throws fairly long messages ("place it at the end of the command
 * after '--'"). We rewrite them short: the error message is part of the
 * interface, not an implementation detail.
 */
function asUserError(cause: unknown): UserError {
  const flag = /'(-{1,2}[^']+)'/u.exec(messageOf(cause))?.[1]

  switch (codeOf(cause)) {
    case 'ERR_PARSE_ARGS_UNKNOWN_OPTION': {
      const named = flag ?? 'the one you passed'
      const suggestion = flag === undefined ? undefined : closestOption(flag)
      const headline =
        suggestion === undefined
          ? `Unknown option ${named}.`
          : `Unknown option ${named}. Did you mean ${suggestion}?`
      return new UserError(headline, undefined, { reason: 'unknown_option', next: SEE_HELP })
    }
    case 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE':
      return new UserError(`Invalid value for ${flag ?? 'an option'}.`, undefined, {
        next: SEE_HELP,
      })
    default:
      return new UserError(messageOf(cause), undefined, { next: SEE_HELP })
  }
}

/** Isolates the only place parseArgs can throw, so inference survives. */
function runParse(argv: readonly string[]) {
  try {
    return parseArgs({
      args: [...argv],
      options: OPTIONS,
      allowPositionals: true,
      strict: true,
    })
  } catch (cause) {
    throw asUserError(cause)
  }
}

export function parseCliArgs(argv: readonly string[]): CliArgs {
  const { values, positionals } = runParse(argv)

  if (values.config !== undefined && values['no-config'] === true) {
    throw new UserError("Can't use --config with --no-config.", 'Pick one of the two.', {
      next: SEE_HELP,
    })
  }

  // There is nothing else in the tool a dry run could be dry about. Accepting
  // it alone would mean a flag that silently does nothing, which is the shape
  // `notYetImplemented` exists to refuse.
  if (values['dry-run'] === true && values.fix !== true) {
    throw new UserError("Can't use --dry-run without --fix.", undefined, {
      next: { label: 'Preview the fixes', command: 'driftwatch --fix --dry-run' },
    })
  }

  return {
    paths: positionals,
    format: resolveFormat(values),
    fix: values.fix === true,
    dryRun: values['dry-run'] === true,
    strict: values.strict === true,
    quiet: values.quiet === true,
    init: values.init === true,
    help: values.help === true,
    version: values.version === true,
    tier2: values['no-tier2'] !== true,
    config: values['no-config'] === true ? false : values.config,
    only: splitList(values.only),
    skip: splitList(values.skip),
  }
}
