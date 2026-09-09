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
  strict: boolean
  quiet: boolean
  watch: boolean
  init: boolean
  help: boolean
  version: boolean
  tier2: boolean
  /** Ruta explícita al config, o `false` para ignorar cualquier config. */
  config: string | false | undefined
  only: string[] | undefined
  skip: string[] | undefined
}

/** Las claves de `CliArgs` que son banderas booleanas. */
export type BooleanFlag = {
  [K in keyof CliArgs]: CliArgs[K] extends boolean ? K : never
}[keyof CliArgs]

const OPTIONS = {
  fix: { type: 'boolean' },
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

/** Una lista separada por coma, tolerante con comas de más: `path,,script`. */
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
      throw new UserError(
        `formato desconocido: ${explicit}`,
        `los formatos válidos son ${FORMATS.join(', ')}`,
      )
    }
    return explicit
  }
  return values.json === true ? 'json' : 'pretty'
}

/**
 * parseArgs lanza mensajes en inglés y bastante largos ("place it at the end of
 * the command after '--'"). Los reescribimos cortos y en el idioma del CLI: el
 * mensaje de error es parte de la interfaz, no un detalle de implementación.
 */
function asUserError(cause: unknown): UserError {
  const flag = /'(-{1,2}[^']+)'/u.exec(messageOf(cause))?.[1]

  switch (codeOf(cause)) {
    case 'ERR_PARSE_ARGS_UNKNOWN_OPTION':
      return new UserError(`opción desconocida: ${flag ?? 'la que pasaste'}`, 'corré --help')
    case 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE':
      return new UserError(
        `la opción ${flag ?? 'que pasaste'} tiene un valor inválido`,
        'corré --help',
      )
    default:
      return new UserError(messageOf(cause), 'corré --help')
  }
}

/** Aísla el único punto donde parseArgs puede lanzar, para no perder inferencia. */
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
