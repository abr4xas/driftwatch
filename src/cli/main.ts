import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isUserError, messageOf, notYetImplemented, UserError } from '../core/errors.ts'
import { EXIT, exitCodeFor, type ExitCode } from '../core/exit-codes.ts'
import { readVersion } from '../core/version.ts'
import { colorEnabled } from '../report/colors.ts'
import { renderPretty } from '../report/pretty.ts'
import { run } from '../run.ts'
import { parseCliArgs, type BooleanFlag, type CliArgs } from './args.ts'
import { HELP } from './help.ts'

export type Io = {
  out: (text: string) => void
  err: (text: string) => void
  /** Si stdout es una terminal. Decide si la salida lleva color. */
  isTty: boolean
  env: NodeJS.ProcessEnv
}

/**
 * Los flags booleanos que el parser acepta pero que todavía no hacen nada. Esta
 * lista es una lista de pendientes que el test suite vigila: cuando un ticket
 * implementa un flag, lo borra de acá y el test que exigía el exit 2 se cae.
 */
const UNIMPLEMENTED_BOOLEANS: ReadonlyArray<readonly [BooleanFlag, string]> = [
  ['fix', '--fix'],
  ['watch', '--watch'],
  ['init', '--init'],
  // --strict solo cambia algo cuando existen warnings, y los warnings son
  // tier 2, que es M5. Hasta entonces aceptarlo seria prometer de mas.
  ['strict', '--strict'],
]

function assertNotYetImplemented(args: CliArgs): void {
  for (const [key, flag] of UNIMPLEMENTED_BOOLEANS) {
    if (args[key]) throw notYetImplemented(flag)
  }
  if (!args.tier2) throw notYetImplemented('--no-tier2')
  if (args.format !== 'pretty') throw notYetImplemented(`--format ${args.format}`)
  if (args.only !== undefined) throw notYetImplemented('--only')
  if (args.skip !== undefined) throw notYetImplemented('--skip')
  if (args.config !== undefined) {
    throw notYetImplemented(args.config === false ? '--no-config' : '--config')
  }
}

function assertPathsExist(paths: readonly string[], cwd: string): void {
  for (const path of paths) {
    try {
      statSync(resolve(cwd, path))
    } catch {
      throw new UserError(`la ruta no existe: ${path}`)
    }
  }
}

/**
 * El cuerpo del CLI. Recibe el entorno en vez de leerlo y devuelve el exit code
 * en vez de llamar a process.exit, para que sea testeable sin spawnear procesos.
 * `cli.ts` es el único módulo que toca `process`.
 */
export async function main(argv: readonly string[], io: Io, cwd: string): Promise<ExitCode> {
  try {
    const args = parseCliArgs(argv)

    if (args.help) {
      io.out(HELP)
      return EXIT.ok
    }

    if (args.version) {
      io.out(`${readVersion()}\n`)
      return EXIT.ok
    }

    assertNotYetImplemented(args)
    assertPathsExist(args.paths, cwd)

    const result = await run({ cwd, paths: args.paths })
    io.out(
      renderPretty(result, {
        color: colorEnabled(io.env, io.isTty),
        quiet: args.quiet,
      }),
    )
    return exitCodeFor(result.counts, args.strict)
  } catch (error) {
    if (isUserError(error)) {
      io.err(`driftwatch: ${error.message}\n`)
      if (error.hint !== undefined) io.err(`  ${error.hint}\n`)
      return EXIT.toolFailure
    }
    // Un bug nuestro. Se dice que lo es, con el mensaje pero sin volcar el stack
    // encima de quien solo quería correr un linter.
    io.err(`driftwatch: fallo interno: ${messageOf(error)}\n`)
    io.err('  esto es un bug de driftwatch; reportalo con el comando que lo produjo\n')
    return EXIT.toolFailure
  }
}
