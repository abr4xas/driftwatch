/**
 * The sampler in front of the recall probe, which decides what gets asked.
 *
 * Nothing here is a ruling, and that is exactly why the sampler matters more
 * than the question: twelve repositories hold 35% of the discovery corpus's
 * documents and one skill farm holds 10 293 of them. A cap that does not hold
 * turns "what does the `bare-word` rule throw away" into a survey of one
 * repository's prose style, reported under the first title.
 */
import { describe, expect, it } from 'vitest'
import { bandTable, chooser, spread, stateOf, type Candidate } from '../scripts/jev/claims.ts'

const record = (
  repo: string,
  path: string,
  text: string,
  extra: { cause?: string; exists?: boolean } = {},
): Candidate & { exists?: boolean } => ({
  repo,
  path,
  cause: extra.cause ?? 'bare-word',
  text,
  line: 1,
  window: `a sentence mentioning ${text}`,
  ...(extra.exists === undefined ? {} : { exists: extra.exists }),
})

describe('what the chooser refuses', () => {
  it('ignores a discard thrown away by another rule', () => {
    const pick = chooser('bare-word', new Map(), 10)
    pick.offer(record('a/b', 'A.md', 'foo', { cause: 'placeholder' }))
    expect(pick.kept()).toEqual([])
    expect(pick.considered()).toBe(0)
  })

  it('ignores one the repository already satisfies', () => {
    const pick = chooser('bare-word', new Map(), 10)
    pick.offer(record('a/b', 'A.md', 'foo', { exists: true }))
    expect(pick.kept()).toEqual([])
    // Not counted as considered either: it was never a question.
    expect(pick.considered()).toBe(0)
  })

  it('caps a repository however many it offers', () => {
    const pick = chooser('bare-word', new Map(), 2)
    for (const text of ['a', 'b', 'c', 'd']) pick.offer(record('farm/skills', 'S.md', text))
    expect(pick.kept()).toHaveLength(2)
    expect(pick.considered()).toBe(4)
  })

  it('takes one document per template family, not one per copy', () => {
    const families = new Map([
      ['a/one|SKILL.md', 'family-7'],
      ['b/two|SKILL.md', 'family-7'],
    ])
    const pick = chooser('bare-word', families, 10)
    pick.offer(record('a/one', 'SKILL.md', 'helper'))
    pick.offer(record('b/two', 'SKILL.md', 'helper'))
    expect(pick.kept()).toHaveLength(1)
  })

  it('keeps two different words from one family, which are two questions', () => {
    const families = new Map([['a/one|SKILL.md', 'family-7']])
    const pick = chooser('bare-word', families, 10)
    pick.offer(record('a/one', 'SKILL.md', 'helper'))
    pick.offer(record('a/one', 'SKILL.md', 'other'))
    expect(pick.kept()).toHaveLength(2)
  })

  it('leaves a document belonging to no family alone', () => {
    const pick = chooser('bare-word', new Map(), 10)
    pick.offer(record('a/one', 'A.md', 'helper'))
    pick.offer(record('b/two', 'B.md', 'helper'))
    expect(pick.kept()).toHaveLength(2)
  })
})

describe('the sample', () => {
  it('is evenly spaced, so a rerun asks the same questions', () => {
    const items = [...Array.from({ length: 10 }).keys()]
    expect(spread(items, 5)).toEqual([0, 2, 4, 6, 8])
    expect(spread(items, 5)).toEqual(spread(items, 5))
  })

  it('takes everything when there is less than was asked for', () => {
    expect(spread([1, 2, 3], 10)).toEqual([1, 2, 3])
  })
})

describe('the distribution, which is what the pass is for', () => {
  it('counts each band once and no probability twice', () => {
    const table = bandTable([0.05, 0.1, 0.45, 0.55, 0.95, 1])
    const counted = [...table.matchAll(/^ {2}\d\.\d{2}-\d\.\d{2}\s+(\d+)/gmu)].map((m) =>
      Number(m[1]),
    )
    expect(counted.reduce((sum, n) => sum + n, 0)).toBe(6)
  })

  it('survives being asked about nothing', () => {
    expect(bandTable([])).toContain('P(claims a path)')
  })
})

describe('the state the model is handed', () => {
  it('is the sentence and the word, and says nothing about the filesystem', () => {
    const state = stateOf(record('a/b', 'AGENTS.md', 'helper'))
    expect(state).toEqual({
      repo: 'a/b',
      file: 'AGENTS.md',
      candidate: 'helper',
      sentence: 'a sentence mentioning helper',
    })
    expect(JSON.stringify(state)).not.toContain('exists')
  })
})
