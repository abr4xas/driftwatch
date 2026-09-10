/**
 * Which checks run (`docs/spec/SPEC.md` § 5 for the flags, § 7 for the config
 * key). Nothing here can produce a finding; what it can do is leave the tool
 * with nothing to verify, which is why the empty selection is an error.
 */
import type { CheckSeverity } from '../core/config.ts'
import { UserError } from '../core/errors.ts'
import type { Check } from './check.ts'

export type CheckSelection = {
  /** `--only`. Absent means every check. */
  only?: readonly string[]
  /** `--skip`. Absent means none. */
  skip?: readonly string[]
  /** `false` when `--no-tier2` was passed. */
  tier2: boolean
  /** The config's `checks` key. Only `'off'` is acted on today. */
  configured?: Readonly<Record<string, CheckSeverity>>
}

/**
 * A selector matches an id exactly, or as a **namespace prefix**: `path`
 * matches `path/missing`. Deliberately not an arbitrary string prefix, so
 * `--only pat` matches nothing and gets told so.
 */
function matches(selector: string, id: string): boolean {
  return id === selector || id.startsWith(`${selector}/`)
}

/**
 * A selector that matches nothing is a user error, not a silent no-op. Same
 * rule `matchConfiguredSources` applies to a glob in `sources`: a typo that
 * quietly narrows an audit is worse than a red run.
 */
function assertKnown(
  selectors: readonly string[] | undefined,
  flag: string,
  checks: readonly Check[],
): void {
  if (selectors === undefined) return
  for (const selector of selectors) {
    if (checks.some((check) => matches(selector, check.id))) continue
    throw new UserError(
      `${flag}: unknown check '${selector}'`,
      `the known checks are ${checks.map((check) => check.id).join(', ')}`,
    )
  }
}

function selected(selectors: readonly string[], id: string): boolean {
  return selectors.some((selector) => matches(selector, id))
}

export function selectChecks(
  checks: readonly Check[],
  selection: CheckSelection,
): readonly Check[] {
  assertKnown(selection.only, '--only', checks)
  assertKnown(selection.skip, '--skip', checks)

  const { only, skip, configured } = selection
  const enabled = checks.filter((check) => {
    // A flag beats the config: the config is the repo's standing preference,
    // the flag is this invocation.
    const namedByFlag = only !== undefined && selected(only, check.id)
    if (only !== undefined && !namedByFlag) return false
    if (skip !== undefined && selected(skip, check.id)) return false
    // --no-tier2 wins even over an explicit --only: it reads as an
    // unconditional switch, and a blanket off losing to an incidental name in
    // a list is the surprising direction.
    if (!selection.tier2 && check.tier === 2) return false
    if (!namedByFlag && configured?.[check.id] === 'off') return false
    return true
  })

  if (enabled.length === 0) {
    throw new UserError(
      'the selection leaves no checks enabled',
      'reporting no drift after running nothing would be a lie; widen --only, --skip, --no-tier2 or the config checks key',
    )
  }
  return enabled
}
