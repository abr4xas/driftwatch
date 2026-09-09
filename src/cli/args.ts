import { parseArgs } from 'node:util'
import { UserError } from '../core/errors.ts'

export const FORMATS = ['pretty', 'json', 'github', 'sarif'] as const
export type Format = (typeof FORMATS)[number]

export type CliArgs = {
  paths: string[]
  format: Format
  fix: boolean
  dryRun: boolean
  strict: boolean
  quiet: boolean
  watch: boolean
  init: boolean
  help: boolean
  version: boolean
  tier2: boolean
  /** Ruta explicita al config, o `false` para ignorar cualquier config. */
  config: string | false | undefined
  only: string[] | undefined
  skip: string[] | undefined
}

const OPTIONS = {
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
  version: { type: 'boolean', short: 'v' },
  help: { type: 'boolean', short: 'h' },
} as const

/** Una lista separada por coma, tolerante con comas de mas: `path,,script`. */
function splitList(raw: string | undefined): string[] | undefined {
  if (raw === undefined) return undefined
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function resolveFormat(values: { format?: string; json?: boolean }): Format {
  if (values.format !== undefined) {
    if (!(FORMATS as readonly string[]).includes(values.format)) {
      throw new UserError(
        `formato desconocido: ${values.format}`,
        `los formatos validos son ${FORMATS.join(', ')}`,
      )
    }
    return values.format as Format
  }
  return values.json === true ? 'json' : 'pretty'
}

/**
 * parseArgs lanza mensajes en ingles y bastante largos ("place it at the end of
 * the command after '--'"). Los reescribimos cortos y en el idioma del CLI: el
 * mensaje de error es parte de la interfaz, no un detalle de implementacion.
 */
function asUserError(cause: unknown): UserError {
  const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : undefined
  const flag =
    typeof cause === 'object' && cause !== null && 'message' in cause && typeof cause.message === 'string'
      ? (/'(-{1,2}[^']+)'/u.exec(cause.message)?.[1] ?? null)
      : null

  switch (code) {
    case 'ERR_PARSE_ARGS_UNKNOWN_OPTION':
      return new UserError(`opcion desconocida: ${flag ?? 'la que pasaste'}`, 'corre --help')
    case 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE':
      return new UserError(`la opcion ${flag ?? 'que pasaste'} tiene un valor invalido`, 'corre --help')
    default:
      return new UserError(
        cause instanceof Error ? cause.message : String(cause),
        'corre --help',
      )
  }
}

/** Aisla el unico punto donde parseArgs puede lanzar, para no perder inferencia. */
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
    throw new UserError('--config y --no-config se contradicen', 'elegí uno de los dos')
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
    help: values.help === true,
    version: values.version === true,
    tier2: values['no-tier2'] !== true,
    config: values['no-config'] === true ? false : values.config,
    only: splitList(values.only),
    skip: splitList(values.skip),
  }
}
