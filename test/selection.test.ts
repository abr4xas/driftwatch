import { describe, expect, it } from 'vitest'
import { isUserError } from '../src/core/errors.ts'
import type { Check } from '../src/verify/check.ts'
import { selectChecks, severityOf, type CheckSelection } from '../src/verify/selection.ts'

/**
 * A synthetic registry. The real one has a single tier 1 check, which cannot
 * exercise prefixes, tiers or partial selections — and the point of this
 * module is what happens when there are eight.
 */
const REGISTRY: readonly Check[] = [
  fake('path/missing', 1),
  fake('link/broken', 1),
  fake('script/missing', 1),
  fake('stale/churn', 2),
]

function fake(id: string, tier: 1 | 2): Check {
  return {
    id,
    title: id,
    description: id,
    tier,
    defaultSeverity: 'error',
    claimKinds: ['path'],
    run: () => null,
  }
}

function ids(selection: CheckSelection): string[] {
  return selectChecks(REGISTRY, selection).map((check) => check.id)
}

/** The message and hint of the UserError a selection throws. */
function refusal(selection: CheckSelection): string {
  try {
    selectChecks(REGISTRY, selection)
  } catch (error) {
    if (!isUserError(error)) throw error
    return `${error.message} ${error.hint ?? ''}`
  }
  throw new Error('the selection was expected to be refused and was not')
}

describe('check selection', () => {
  it('with no flags every check runs', () => {
    expect(ids({ tier2: true })).toEqual([
      'path/missing',
      'link/broken',
      'script/missing',
      'stale/churn',
    ])
  })

  it('--only takes an exact id', () => {
    expect(ids({ tier2: true, only: ['link/broken'] })).toEqual(['link/broken'])
  })

  it('--only takes a namespace prefix', () => {
    expect(ids({ tier2: true, only: ['path'] })).toEqual(['path/missing'])
  })

  it('a prefix is a namespace, not any leading substring', () => {
    // `pat` would match `path/missing` under startsWith. It must not: a
    // selector that silently matches a check the user did not name is the
    // same class of mistake as one that silently matches nothing.
    expect(refusal({ tier2: true, only: ['pat'] })).toContain("unknown check 'pat'")
  })

  it('a selector matching nothing is refused, and the known ids are listed', () => {
    const message = refusal({ tier2: true, skip: ['dep/missing'] })
    expect(message).toContain('--skip')
    expect(message).toContain("unknown check 'dep/missing'")
    expect(message).toContain('path/missing')
  })

  it('--skip subtracts from what --only selected, with no contradiction', () => {
    expect(ids({ tier2: true, only: ['path', 'link'], skip: ['link/broken'] })).toEqual([
      'path/missing',
    ])
  })

  it('--no-tier2 drops tier 2', () => {
    expect(ids({ tier2: false })).toEqual(['path/missing', 'link/broken', 'script/missing'])
  })

  it('--no-tier2 wins over an --only that named a tier 2 check', () => {
    // Not an error: --only is a filter, and the blanket switch losing to an
    // incidental name in a list is the surprising direction.
    expect(refusal({ tier2: false, only: ['stale/churn'] })).toContain('no checks enabled')
  })

  it("the config's checks key turns a check off", () => {
    expect(ids({ tier2: true, configured: { 'stale/churn': 'off' } })).toEqual([
      'path/missing',
      'link/broken',
      'script/missing',
    ])
  })

  it('--only beats a config that turned that check off', () => {
    const configured = { 'stale/churn': 'off' } as const
    expect(ids({ tier2: true, only: ['stale/churn'], configured })).toEqual(['stale/churn'])
  })

  it("the config's other severities are carried but not acted on yet", () => {
    const configured = { 'stale/churn': 'error' } as const
    expect(ids({ tier2: true, configured })).toHaveLength(4)
  })

  it('a selection that leaves nothing enabled is refused instead of reporting no drift', () => {
    expect(refusal({ tier2: true, skip: ['path', 'link', 'script', 'stale'] })).toContain(
      'no checks enabled',
    )
  })
})

describe('the severity a check reports at', () => {
  const check = fake('path/missing', 1)

  it('with no config it is the check default', () => {
    expect(severityOf(check, undefined)).toBe('error')
  })

  it('the config overrides it', () => {
    expect(severityOf(check, { 'path/missing': 'warning' })).toBe('warning')
  })

  it('another check id does not reach it', () => {
    expect(severityOf(check, { 'link/broken': 'warning' })).toBe('error')
  })

  /**
   * `'off'` deselects, so it cannot reach here — except through a `--only`
   * naming the check, where the flag beats the config and the check runs.
   */
  it("'off' on a check a flag turned back on falls back to the default", () => {
    expect(severityOf(check, { 'path/missing': 'off' })).toBe('error')
  })
})
