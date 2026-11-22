import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { notYetImplemented, UserError } from '../core/errors.ts'
import { EXIT, exitCodeFor, type ExitCode } from '../core/exit-codes.ts'
import { readVersion } from '../core/version.ts'
import type { RunOptions, RunResult } from '../run.ts'
import {
  errorReportOf,
  renderErrorJson,
  renderErrorText,
  renderWarningText,
} from '../report/error.ts'
import type { PrettyOptions } from '../report/pretty.ts'
import type { FixOutcome } from '../report/types.ts'
import { parseCliArgs, wantsMachineError, type BooleanFlag, type CliArgs } from './args.ts'
import { HELP } from './help.ts'

export type Io = {
  out: (text: string) => void
  err: (text: string) => void
  /** Whether stdout is a terminal. Decides if the output carries color. */
  isTty: boolean
  env: NodeJS.ProcessEnv
}

/**
 * The boolean flags the parser accepts but that do not do anything yet.
 *
 * **Empty since `1.0.0`, and that is the claim it makes.** It held `--strict`,
 * implemented in ticket `02`, and `--watch`, which ticket `03` took out of the
 * parser altogether rather than leave advertised and broken — a flag we do not
 * have should fail the way any unknown flag fails. Nothing the tool accepts
 * refuses to run.
 *
 * It is kept because that claim needs somewhere to be false: a flag added
 * ahead of its milestone goes here, and `CONTRACT.md` records it as refused
 * rather than as working. Exported for the same reason as `OPTIONS` — the
 * frozen surface reads it.
 */
export const UNIMPLEMENTED_BOOLEANS: ReadonlyArray<readonly [BooleanFlag, string]> = []

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
  return {
    color,
    quiet: args.quiet,
    fixCommand: fixCommandFor(args),
    ...(fixes === undefined ? {} : { fixes }),
  }
}

/** Characters a POSIX shell reads as themselves, so the value needs no quotes. */
const SHELL_SAFE = /^[\w@%+=:,./-]+$/u

function shellQuote(value: string): string {
  return SHELL_SAFE.test(value) ? value : `'${value.replaceAll("'", `'\\''`)}'`
}

/**
 * The `--fix` the summary suggests, carrying everything that decided which
 * findings this run reported: the paths, the check selection and the config.
 * Dropping any of them would apply fixes the reader never saw — the whole repo
 * instead of one file, or a check they had just skipped.
 */
function fixCommandFor(args: CliArgs): string {
  const parts = ['driftwatch', '--fix', ...args.paths.map(shellQuote)]
  if (args.only !== undefined) parts.push('--only', shellQuote(args.only.join(',')))
  if (args.skip !== undefined) parts.push('--skip', shellQuote(args.skip.join(',')))
  if (!args.tier2) parts.push('--no-tier2')
  if (args.config === false) parts.push('--no-config')
  else if (args.config !== undefined) parts.push('--config', shellQuote(args.config))
  return parts.join(' ')
}

/** How many missing paths the error names before it counts the rest. */
const MAX_LISTED = 5

/**
 * Every missing path at once, not the first: somebody who mistyped two paths
 * should not have to run the tool twice to find out about the second.
 */
function assertPathsExist(paths: readonly string[], cwd: string): void {
  const missing = paths.filter((path) => {
    try {
      statSync(resolve(cwd, path))
      return false
    } catch {
      return true
    }
  })
  const [first] = missing
  if (first === undefined) return
  if (missing.length === 1) {
    throw new UserError(`Couldn't find ${first}.`, undefined, { reason: 'path_not_found' })
  }
  const listed = missing.slice(0, MAX_LISTED)
  const rest = missing.length - listed.length
  const lines = rest > 0 ? [...listed, `and ${rest} more`] : listed
  throw new UserError(`Couldn't find ${missing.length} paths.`, lines.join('\n'), {
    reason: 'path_not_found',
  })
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
    warn: (message) => io.err(renderWarningText(message)),
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
    const report = errorReportOf(error)
    io.err(wantsMachineError(argv) ? renderErrorJson(report) : renderErrorText(report))
    return EXIT.toolFailure
  }
}
