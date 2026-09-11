/**
 * What a `--fix` run is, in one place: plan, write, and ask again.
 *
 * It lives here rather than in `cli/main.ts` because the second run is the
 * interesting decision, and a decision buried in a branch of the CLI is one
 * nobody reads before changing it.
 */
import type { FixOutcome } from '../report/pretty.ts'
import { run, type RunOptions, type RunResult } from '../run.ts'
import { planFixes } from './apply.ts'
import { writePlans } from './write.ts'

export type FixSession = {
  /** The state the exit code and the report come from. */
  after: RunResult
  outcome: FixOutcome
}

/**
 * Applies every placeable fix and returns the run that describes what is left.
 *
 * `SPEC.md` § 4: "With `--fix`, the exit code reflects what **remains** after
 * fixing." That is a second full run and not a subtraction of what was applied.
 * Subtracting is fast and goes wrong the moment a fix changes what another
 * check sees; re-running is honest by construction — what remains is what a
 * fresh run reports — and it makes every real invocation exercise the
 * idempotence the fixture asserts.
 *
 * The cost is a second pass over a repo that was just written to. Nothing was
 * written means nothing changed, so that case keeps the first run and pays
 * nothing.
 */
export async function applyFixes(result: RunResult, options: RunOptions): Promise<FixSession> {
  const { plans } = planFixes(result.findings)
  const writes = await writePlans(result.root, plans)
  const applied = writes.reduce((total, write) => total + write.plan.edits.length, 0)

  return {
    after: writes.length === 0 ? result : await run(options),
    outcome: { applied, files: writes.length },
  }
}
