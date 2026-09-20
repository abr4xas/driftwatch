import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { isUserError, messageOf, notYetImplemented, UserError } from '../core/errors.ts'
import { EXIT, exitCodeFor, type ExitCode } from '../core/exit-codes.ts'
import { readVersion } from '../core/version.ts'
import type { RunOptions, RunResult } from '../run.ts'
import type { PrettyOptions } from '../report/pretty.ts'
import type { FixOutcome } from '../report/types.ts'
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
 *
 * Exported for the same reason as `OPTIONS`: a flag that parses and then exits
 * 2 is part of the surface as it stands, and the frozen surface records it
 * that way rather than pretending it works.
 */
export const UNIMPLEMENTED_BOOLEANS: ReadonlyArray<readonly [BooleanFlag, string]> = [
  ['watch', '--watch'],
]

function assertNotYetImplemented(args: CliArgs): void {
  for (const [key, flag] of UNIMPLEMENTED_BOOLEANS) {
    if (args[key]) throw notYetImplemented(flag)
  }
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

/**
 * `exactOptionalPropertyTypes` again: an absent `fixes` cannot be spelled as an
 * explicit `undefined`, and the spread is the cheapest way to say it.
 */
function prettyOptions(
  args: CliArgs,
  color: boolean,
  fixes: FixOutcome | undefined,
): PrettyOptions {
  return { color, quiet: args.quiet, ...(fixes === undefined ? {} : { fixes }) }
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

/** What a format does with a result. The four of them share nothing else. */
type Render = (result: RunResult, fixes: FixOutcome | undefined) => string

/**
 * The format dispatch, with one dynamic import per branch: a `pretty` run must
 * not pay to load the SARIF builder, and a `--format sarif` run must not load
 * the colour support it will never consult.
 *
 * `--quiet` and colour are `pretty` concepts and stop here. A JSON document
 * without its summary is not quieter, it is invalid against its own contract.
 */
async function rendererFor(args: CliArgs, io: Io): Promise<Render> {
  switch (args.format) {
    case 'json': {
      const { renderJson } = await import('../report/json.ts')
      return (result, fixes) => renderJson(result, fixes === undefined ? {} : { fixes })
    }
    case 'github': {
      const { renderGithub } = await import('../report/github.ts')
      return (result) => renderGithub(result)
    }
    case 'sarif': {
      const { renderSarif } = await import('../report/sarif.ts')
      return (result, fixes) => renderSarif(result, fixes === undefined ? {} : { fixes })
    }
    case 'pretty': {
      const [{ renderPretty }, { colorEnabled }] = await Promise.all([
        import('../report/pretty.ts'),
        import('../report/colors.ts'),
      ])
      const color = colorEnabled(io.env, io.isTty)
      return (result, fixes) => renderPretty(result, prettyOptions(args, color, fixes))
    }
  }
}

/**
 * The audit itself: run, report, and — with `--fix` — write and ask again.
 *
 * The pipeline and the reporter are imported dynamically: `--help` and
 * `--version` have no reason to pay for loading remark-parse, and the 80 ms
 * cold-start budget is part of the product. `fix/session.ts` is behind a second
 * one for the same reason: a run without `--fix` never loads it.
 */
async function audit(args: CliArgs, io: Io, cwd: string): Promise<ExitCode> {
  const [{ run }, renderer] = await Promise.all([import('../run.ts'), rendererFor(args, io)])

  const options = runOptionsFor(args, cwd)
  const result = await run(options)
  const render = (of: RunResult, fixes?: FixOutcome): void => io.out(renderer(of, fixes))

  if (!args.fix) {
    render(result)
    return exitCodeFor(result.counts, args.strict)
  }

  const { applyFixes } = await import('../fix/session.ts')
  const { after, outcome } = await applyFixes(result, options, {
    dryRun: args.dryRun,
    // A warning, in the English sense: it is not a finding, it does not touch
    // the counts, and it belongs on stderr with the other things that are not
    // the report.
    warn: (message) => io.err(`driftwatch: ${message}\n`),
  })
  render(after, outcome)
  return exitCodeFor(after.counts, args.strict)
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

    // Before the audit, and instead of it. `--init` does not modify a run: it
    // writes a file and leaves. Positional paths and --config/--no-config are
    // about reading a config, and none of them redirect where this one goes.
    if (args.init) {
      const [{ writeInitConfig }, { findRepoRoot }] = await Promise.all([
        import('./init.ts'),
        import('../verify/repo-index.ts'),
      ])
      io.out(`wrote ${await writeInitConfig(findRepoRoot(cwd))}\n`)
      return EXIT.ok
    }

    assertPathsExist(args.paths, cwd)

    return await audit(args, io, cwd)
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
