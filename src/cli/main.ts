import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isUserError, UserError } from '../core/errors.ts'
import { EXIT, type ExitCode } from '../core/exit-codes.ts'
import { readVersion } from '../core/version.ts'
import { parseCliArgs } from './args.ts'
import { HELP } from './help.ts'

export type Io = {
  out: (text: string) => void
  err: (text: string) => void
}

/** Flags aceptados por el parser pero todavia sin implementar. */
const NOT_YET_IMPLEMENTED: ReadonlyArray<readonly [keyof ReturnType<typeof parseCliArgs>, string]> =
  [
    ['fix', '--fix'],
    ['watch', '--watch'],
    ['init', '--init'],
  ]

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
 * El cuerpo del CLI. Devuelve el exit code en vez de llamar a process.exit para
 * que sea testeable; `cli.ts` es el unico modulo que toca `process`.
 */
export async function main(
  argv: readonly string[],
  io: Io,
  cwd: string = process.cwd(),
): Promise<ExitCode> {
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

    for (const [key, flag] of NOT_YET_IMPLEMENTED) {
      if (args[key] === true) {
        throw new UserError(`${flag} todavia no esta implementado`)
      }
    }

    assertPathsExist(args.paths, cwd)

    // El descubrimiento de fuentes y los checks llegan en los tickets 02 en
    // adelante. Hasta entonces no hay nada que reportar, y eso es un exito.
    return EXIT.ok
  } catch (error) {
    if (isUserError(error)) {
      io.err(`driftwatch: ${error.message}\n`)
      if (error.hint !== undefined) io.err(`  ${error.hint}\n`)
      return EXIT.toolFailure
    }
    // Un bug nuestro. Se dice que lo es, con el mensaje pero sin volcar el stack
    // encima de quien solo queria correr un linter.
    const message = error instanceof Error ? error.message : String(error)
    io.err(`driftwatch: fallo interno: ${message}\n`)
    io.err('  esto es un bug de driftwatch; reportalo con el comando que lo produjo\n')
    return EXIT.toolFailure
  }
}
