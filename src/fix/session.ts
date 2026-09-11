/**
 * What a `--fix` run is, in one place: plan, write, and ask again.
 *
 * It lives here rather than in `cli/main.ts` because the second run is the
 * interesting decision, and a decision buried in a branch of the CLI is one
 * nobody reads before changing it.
 */
import type { FixEntry, FixOutcome } from '../report/types.ts'
import { run, type RunOptions, type RunResult } from '../run.ts'
import { gitDirtyPaths } from '../verify/git.ts'
import { planFixes, type FixPlan } from './apply.ts'
import { writePlans } from './write.ts'

/**
 * One line of the diff per edit: where it lands and what it replaces.
 *
 * It is built here and not in the reporter because only the plan knows which
 * finding each edit came from, and the line number is the finding's.
 */
function entriesOf(plan: FixPlan): FixEntry[] {
  return plan.edits.flatMap((edit, i) => {
    const finding = plan.findings[i]
    // The pairing is the contract `planFixes` keeps; an entry without its
    // finding would be an edit no format could attribute, so drop it rather
    // than report one with a fabricated line number.
    if (finding === undefined) return []
    return [
      {
        file: plan.source.path,
        line: finding.claim.range.line,
        before: plan.source.content.slice(edit.range[0], edit.range[1]),
        after: edit.replacement,
        range: edit.range,
        finding,
      },
    ]
  })
}

export type FixSessionOptions = {
  /** `--dry-run`: plan and report, write nothing. */
  dryRun: boolean
  /**
   * Where a warning goes. It is a callback and not an `Io`, because the one
   * warning this module has is about the user's git state and not about the
   * audit, and passing the whole output surface in would invite more.
   */
  warn: (message: string) => void
}

/**
 * `SPEC.md` § 8: "If the working tree has uncommitted changes in a file to be
 * modified, it warns but proceeds (this is not a git tool)."
 *
 * Before the edits and not after: afterwards it is a fact about the past. The
 * value is that `git checkout -- .` is the one real way back from a bad `--fix`
 * and it only exists if the file was clean.
 */
async function warnAboutDirty(
  root: string,
  plans: readonly FixPlan[],
  warn: (message: string) => void,
): Promise<void> {
  const paths = plans.flatMap((plan) => [plan.source.path, ...plan.source.aliases])
  const dirty = await gitDirtyPaths(root, paths)
  if (dirty.size === 0) return
  warn(`uncommitted changes in ${[...dirty].toSorted((a, b) => a.localeCompare(b)).join(', ')}`)
}

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
export async function applyFixes(
  result: RunResult,
  options: RunOptions,
  { dryRun, warn }: FixSessionOptions,
): Promise<FixSession> {
  const { plans } = planFixes(result.findings)
  const entries = plans.flatMap((plan) => entriesOf(plan))
  await warnAboutDirty(result.root, plans, warn)

  /**
   * A dry run stops here, before the only irreversible step. It also keeps the
   * first run's findings: re-running would report the same ones, since nothing
   * changed, and paying for a second pass to prove it is waste.
   */
  if (dryRun) {
    const applied = plans.reduce((total, plan) => total + plan.edits.length, 0)
    return { after: result, outcome: { applied, files: plans.length, dryRun, entries } }
  }

  const writes = await writePlans(result.root, plans)
  const applied = writes.reduce((total, write) => total + write.plan.edits.length, 0)

  return {
    after: writes.length === 0 ? result : await run(options),
    outcome: { applied, files: writes.length, dryRun, entries },
  }
}
