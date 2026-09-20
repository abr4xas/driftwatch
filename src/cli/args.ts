import { parseArgs } from 'node:util'
import { codeOf, messageOf, UserError } from '../core/errors.ts'

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
  watch: boolean
  init: boolean
  migrateConfig: boolean
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
  watch: { type: 'boolean' },
  init: { type: 'boolean' },
  'migrate-config': { type: 'boolean' },
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
      throw new UserError(`unknown format: ${explicit}`, `valid formats are ${FORMATS.join(', ')}`)
    }
    return explicit
  }
  return values.json === true ? 'json' : 'pretty'
}

/**
 * parseArgs throws fairly long messages ("place it at the end of the command
 * after '--'"). We rewrite them short: the error message is part of the
 * interface, not an implementation detail.
 */
function asUserError(cause: unknown): UserError {
  const flag = /'(-{1,2}[^']+)'/u.exec(messageOf(cause))?.[1]

  switch (codeOf(cause)) {
    case 'ERR_PARSE_ARGS_UNKNOWN_OPTION':
      return new UserError(`unknown option: ${flag ?? 'the one you passed'}`, 'run --help')
    case 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE':
      return new UserError(`the option ${flag ?? 'you passed'} has an invalid value`, 'run --help')
    default:
      return new UserError(messageOf(cause), 'run --help')
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
    throw new UserError('--config and --no-config contradict each other', 'pick one of the two')
  }

  // There is nothing else in the tool a dry run could be dry about. Accepting
  // it alone would mean a flag that silently does nothing, which is the shape
  // `notYetImplemented` exists to refuse.
  if (values['dry-run'] === true && values.fix !== true) {
    throw new UserError(
      '--dry-run only means something with --fix',
      'run driftwatch --fix --dry-run',
    )
  }

  return {
    paths: positionals,
    format: resolveFormat(values),
    fix: values.fix === true,
    dryRun: values['dry-run'] === true,
    strict: values.strict === true,
    quiet: values.quiet === true,
    watch: values.watch === true,
    init: values.init === true,
    migrateConfig: values['migrate-config'] === true,
    help: values.help === true,
    version: values.version === true,
    tier2: values['no-tier2'] !== true,
    config: values['no-config'] === true ? false : values.config,
    only: splitList(values.only),
    skip: splitList(values.skip),
  }
}
