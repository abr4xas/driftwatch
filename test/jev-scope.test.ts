/**
 * The arithmetic in front of the scope question, which is where this pass can
 * lie without failing.
 *
 * Two things carry the weight and neither involves the model. The marker has to
 * be recovered the way `markerReason` decided it, because a table by cause
 * cannot say the thing ticket `16` needed to say. And the budget has to be per
 * marker, because `optional` was a third of `hedged` and a sample that lets it
 * stay a third measures one word under the name of a gate.
 */
import { describe, expect, it } from 'vitest'
import {
  CLAIMS_AT,
  choose,
  CONTROL_CAUSES,
  FAMILIES_OF_GATE,
  LOOSE_AT,
  markerIn,
  scopeMain,
  scopeTable,
  stateOf,
  type AskScope,
} from '../scripts/jev/scope.ts'
import type { Candidate } from '../scripts/jev/claims.ts'

const record = (
  repo: string,
  text: string,
  window: string,
  extra: { cause?: string; path?: string; exists?: boolean } = {},
): Candidate & { exists?: boolean } => ({
  repo,
  path: extra.path ?? 'CLAUDE.md',
  cause: extra.cause ?? 'hedged',
  text,
  line: 1,
  window,
  ...(extra.exists === undefined ? {} : { exists: extra.exists }),
})

describe('recovering which marker fired', () => {
  it('finds the hedge the gate read', () => {
    expect(markerIn('hedged', 'see `docs/x.md` (if exists)')).toBe('if exists')
  })

  it('prefers the longest match, so a prefix does not shadow it', () => {
    expect(markerIn('hedged', 'use `a.md` if it exists, and `b.md` if present')).toBe(
      'if it exists',
    )
  })

  it('keeps (optional) and the bare optional apart, because they are not one risk', () => {
    expect(markerIn('hedged', '`a.md` (optional)')).toBe('(optional)')
    expect(markerIn('hedged', 'the optional profile lives in `a.md`')).toBe('optional')
  })

  it('reads the split hedge that no literal marker matches', () => {
    expect(markerIn('hedged', 'If `.github/aw/instructions.md` exists, read it')).toBe(
      'if…exists (split)',
    )
  })

  it('finds an example marker and a create imperative', () => {
    expect(markerIn('example', 'such as `auth/test.py`')).toBe('such as')
    expect(markerIn('create-instruction', 'Create `perf/profile.rs` implementing it')).toBe(
      'create',
    )
  })

  it('returns nothing for a section-scoped gate, whose marker is not in the window', () => {
    expect(markerIn('creation-target', 'the file `scripts/whats-changed.md` is read here')).toBe(
      undefined,
    )
  })

  it('returns nothing for a shape rule, which has no marker at all', () => {
    expect(markerIn('bare-word', 'mentions `index.ts` plainly')).toBe(undefined)
  })
})

describe('the state the question is asked over', () => {
  it('names the marker rather than the gate when it can', () => {
    const state = stateOf(record('o/r', 'docs/x.md', 'see `docs/x.md` (if exists)'))
    expect(state.marker).toBe('if exists')
  })

  it('falls back to the cause when no marker sits in the window', () => {
    const state = stateOf(
      record('o/r', 'docs/x.md', 'plainly `docs/x.md`', { cause: 'creation-target' }),
    )
    expect(state.marker).toBe('creation-target')
  })

  it('carries the window uncut, because that is the text the gate acted on', () => {
    const window = `${'a'.repeat(400)} \`docs/x.md\` (if exists)`
    expect(stateOf(record('o/r', 'docs/x.md', window)).window).toBe(window)
  })
})

describe('the budget, which is per marker and not per cause', () => {
  it('does not let one marker take the whole sample of its gate', () => {
    const records = [
      ...Array.from({ length: 20 }, (_, i) =>
        record(`o/r${i}`, `a${i}.md`, `the optional step writes \`a${i}.md\``),
      ),
      ...Array.from({ length: 20 }, (_, i) =>
        record(`o/s${i}`, `b${i}.md`, `\`b${i}.md\` (if exists)`),
      ),
    ]
    const chosen = choose(records, ['hedged'], new Map(), 3, 2)
    const markers = chosen.map((c) => markerIn(c.cause, c.window))
    expect(markers.filter((m) => m === 'optional')).toHaveLength(3)
    expect(markers.filter((m) => m === 'if exists')).toHaveLength(3)
  })

  it('keeps the caps claims.ts established: one per family, N per repository', () => {
    const families = new Map([
      ['o/a|CLAUDE.md', 'fam'],
      ['o/b|CLAUDE.md', 'fam'],
    ])
    const records = [
      record('o/a', 'x.md', '`x.md` (if exists)'),
      record('o/b', 'x.md', '`x.md` (if exists)'),
    ]
    expect(choose(records, ['hedged'], families, 10, 10)).toHaveLength(1)

    const many = Array.from({ length: 5 }, (_, i) =>
      record('o/a', `x${i}.md`, `\`x${i}.md\` (if exists)`),
    )
    expect(choose(many, ['hedged'], new Map(), 10, 2)).toHaveLength(2)
  })

  it('drops a discard already known to be satisfied', () => {
    const records = [record('o/a', 'x.md', '`x.md` (if exists)', { exists: true })]
    expect(choose(records, ['hedged'], new Map(), 10, 10)).toHaveLength(0)
  })

  it('takes only the causes it was asked for', () => {
    const records = [
      record('o/a', 'x.md', '`x.md` (if exists)'),
      record('o/b', 'y.md', 'such as `y.md`', { cause: 'example' }),
    ]
    expect(choose(records, ['example'], new Map(), 10, 10)).toHaveLength(1)
  })
})

describe('the families the gates are split into', () => {
  it('leaves elsewhere out, on the evidence in ticket 27', () => {
    const all = [...FAMILIES_OF_GATE.sentence, ...FAMILIES_OF_GATE.section]
    expect(all).not.toContain('elsewhere')
  })

  it('does not put a gate in both families', () => {
    for (const gate of FAMILIES_OF_GATE.sentence) {
      expect(FAMILIES_OF_GATE.section).not.toContain(gate)
    }
  })

  it('keeps the controls out of the gate families, so they cannot be scored as one', () => {
    const all: readonly string[] = [...FAMILIES_OF_GATE.sentence, ...FAMILIES_OF_GATE.section]
    for (const cause of CONTROL_CAUSES) expect(all).not.toContain(cause)
  })
})

describe('the table', () => {
  const answered = (claimsAPath: number, qualifies: number, marker = 'if exists') => ({
    ...record('o/r', 'x.md', '`x.md` (if exists)'),
    marker,
    claimsAPath,
    qualifies,
  })

  it('counts over-reach only among the rows that read as a claim', () => {
    // Low claims and low qualifies is a discard nobody wanted anyway, and
    // counting it as over-reach would make the riskiest column the noisiest.
    const table = scopeTable([answered(0.9, 0.05), answered(0.1, 0.05)])
    const row = table.split('\n')[1] ?? ''
    // n=2, claims=1, over-reach=1, unsure=0: the low-claims row is counted in
    // n and nowhere else.
    expect(row.trimEnd().split(/\s+/u).slice(-4)).toEqual(['2', '1', '1', '0'])
  })

  it('reports the ambiguous band apart instead of as a governed row', () => {
    const table = scopeTable([answered(0.9, 0.5)])
    const row = table.split('\n')[1] ?? ''
    // n=1, claims=1, over-reach=0, unsure=1: a Noul at 0.5 is not a governed row
    expect(row.trimEnd().split(/\s+/u).slice(-4)).toEqual(['1', '1', '0', '1'])
  })

  it('gives each marker its own row', () => {
    const table = scopeTable([answered(0.9, 0.9, 'if exists'), answered(0.9, 0.9, 'optional')])
    expect(table.split('\n')).toHaveLength(3)
  })
})

describe('the thresholds', () => {
  it('are strict in both directions, because the shortlist buys an experiment', () => {
    expect(CLAIMS_AT).toBe(0.8)
    expect(LOOSE_AT).toBe(0.2)
  })
})

describe('the pass end to end, driven by a fake', () => {
  // The exit code depends on whether this machine has a discovery corpus, and
  // that is the point of accepting both: 0 with one, 2 without. What the test
  // pins is the half that must hold either way — a dry run reaches no model.
  // CI never has the clones, so asserting 0 here would assert nothing there.
  it('asks nothing on a dry run, corpus or no corpus', async () => {
    let asked = 0
    const ask: AskScope = async () => {
      asked += 1
      return { claimsAPath: 1, qualifies: 0 }
    }
    expect([0, 2]).toContain(await scopeMain('sentence', 1, 1, 1, true, ask))
    expect(asked).toBe(0)
  }, 30_000)
})
