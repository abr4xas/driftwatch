/**
 * The package can be written against, not only read from.
 *
 * `CONTRACT.md` lists the exported names and `test/surface.test.ts` holds that
 * list to the code, but a name being listed does not mean a consumer can use
 * it: the values are checked at runtime and the types vanish before anything
 * runs. So this file is mostly a **compile-time** test — it imports each type
 * and writes the function signature a consumer would write. If one of them
 * stops being exported, `pnpm typecheck` fails here rather than in somebody
 * else's repository.
 *
 * The three that needed it were `Finding`, `SkippedSource` and `DiscardSink`:
 * reachable through `RunResult` and `RunOptions` since M1, and unnameable
 * until `1.0.0`.
 */
import { describe, expect, it } from 'vitest'
import {
  EXIT,
  exitCodeFor,
  run,
  UserError,
  type Config,
  type DiscardSink,
  type Finding,
  type RunOptions,
  type RunResult,
  type SkippedSource,
  type Source,
} from '../src/index.ts'

/** What a consumer reading a report writes. It needed `Finding` to exist. */
function describeFinding(finding: Finding): string {
  return `${finding.claim.source.path}:${finding.claim.range.line} ${finding.check}`
}

/** And what one reading the other half writes. */
function describeSkip(skipped: SkippedSource): string {
  return `${skipped.path} (${skipped.reason})`
}

/** A sink is a field on the options, so naming its type is naming a callback. */
const countingSink: DiscardSink = () => {}

function optionsFor(cwd: string): RunOptions {
  return { cwd, config: false, discards: countingSink }
}

function pathsOf(sources: readonly Source[]): string[] {
  return sources.map((source) => source.path)
}

function severitiesIn(config: Config): string[] {
  return Object.values(config.checks ?? {})
}

describe('the published API', () => {
  it('exports the values it says it does', () => {
    expect(typeof run).toBe('function')
    expect(typeof exitCodeFor).toBe('function')
    expect(typeof UserError).toBe('function')
    expect(EXIT).toEqual({ ok: 0, findings: 1, toolFailure: 2 })
  })

  it('names the shapes a consumer of a result has to handle', async () => {
    const result: RunResult = await run(optionsFor(process.cwd()))

    // The functions above are the test; calling them is what keeps the type
    // checker from deciding they are unused.
    expect(result.findings.map(describeFinding)).toHaveLength(result.findings.length)
    expect(result.skipped.map(describeSkip)).toHaveLength(result.skipped.length)
    expect(pathsOf(result.sources)).toContain('AGENTS.md')
    expect(severitiesIn(result.config)).toBeInstanceOf(Array)
  })
})
