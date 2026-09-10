import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isUserError, messageOf, notYetImplemented, UserError } from '../core/errors.ts'
import { EXIT, exitCodeFor, type ExitCode } from '../core/exit-codes.ts'
import { readVersion } from '../core/version.ts'
import type { RunOptions } from '../run.ts'
import { parseCliArgs, type BooleanFlag, type CliArgs } from './args.ts'
import { HELP } from './help.ts'

export type Io = {
  out: (text: string) => void
  err: (text: string) => void
  /** Whether stdout is a terminal. Decides if the output carries color. */
  isTty: boolean
  env: NodeJS.ProcessEnv
}

/**
 * The boolean flags the parser accepts but that do not do anything yet. This
 * list is a to-do list the test suite watches: when a ticket implements a flag,
 * it deletes it from here and the test that demanded exit 2 fails.
 */
const UNIMPLEMENTED_BOOLEANS: ReadonlyArray<readonly [BooleanFlag, string]> = [
  ['fix', '--fix'],
  ['watch', '--watch'],
  ['init', '--init'],
  // --strict only changes something once warnings exist, and warnings are
  // tier 2, which is M5. Until then, accepting it would promise too much.
  ['strict', '--strict'],
]

function assertNotYetImplemented(args: CliArgs): void {
  for (const [key, flag] of UNIMPLEMENTED_BOOLEANS) {
    if (args[key]) throw notYetImplemented(flag)
  }
  if (args.format !== 'pretty') throw notYetImplemented(`--format ${args.format}`)
}

/**
 * `--config`/`--no-config` and `--only`/`--skip` are optional fields
 * downstream, and `exactOptionalPropertyTypes` means an absent one cannot be
 * spelled as an explicit `undefined`.
 */
function runOptionsFor(args: CliArgs, cwd: string): RunOptions {
  return {
    cwd,
    paths: args.paths,
    tier2: args.tier2,
    ...(args.config === undefined ? {} : { config: args.config }),
    ...(args.only === undefined ? {} : { only: args.only }),
    ...(args.skip === undefined ? {} : { skip: args.skip }),
  }
}

function assertPathsExist(paths: readonly string[], cwd: string): void {
  for (const path of paths) {
    try {
      statSync(resolve(cwd, path))
    } catch {
      throw new UserError(`path does not exist: ${path}`)
    }
  }
}

/**
 * The body of the CLI. It receives the environment instead of reading it and
 * returns the exit code instead of calling process.exit, so it is testable
 * without spawning processes. `cli.ts` is the only module that touches
 * `process`.
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

    // The pipeline and the reporter are imported dynamically: `--help` and
    // `--version` have no reason to pay for loading remark-parse, and the
    // 80 ms cold-start budget is part of the product.
    const [{ run }, { renderPretty }, { colorEnabled }] = await Promise.all([
      import('../run.ts'),
      import('../report/pretty.ts'),
      import('../report/colors.ts'),
    ])

    const result = await run(runOptionsFor(args, cwd))
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
    // A bug of ours. We say so, with the message but without dumping the stack
    // on someone who only wanted to run a linter.
    io.err(`driftwatch: internal failure: ${messageOf(error)}\n`)
    io.err('  this is a driftwatch bug; report it with the command that produced it\n')
    return EXIT.toolFailure
  }
}
