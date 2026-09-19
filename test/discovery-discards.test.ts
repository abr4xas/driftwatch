/**
 * The discard table's decidable parts: what the file holds and how it is
 * counted, with no clone and no disk.
 *
 * The risk in `discovery-discards.ts` is not that it misses a discard, it is
 * that the table says something a reader will take for a measurement. Each
 * function here is one of the places that could go wrong quietly: a torn line
 * costing the file, a sample that is really one document's habits, a column
 * that asserts a repository lacks a file nobody called a file.
 */
import { describe, expect, it } from 'vitest'
import {
  collapseToFamilies,
  discardsIn,
  familyIndex,
  sampleOf,
  tabulate,
} from '../scripts/discovery-discards.ts'

const record = (cause: string, repo: string, text: string, exists = false): string =>
  JSON.stringify({
    repo,
    path: 'CLAUDE.md',
    kind: 'path',
    cause,
    text,
    line: 1,
    offset: [0, 1],
    window: '',
    exists,
  })

/** A candidate the `exists` question does not apply to: a script, an anchor. */
const unasked = (cause: string, repo: string, text: string): string =>
  JSON.stringify({ repo, path: 'CLAUDE.md', kind: 'script', cause, text, line: 1, window: '' })

describe('the discard table', () => {
  it('counts, and counts three ways because they disagree', () => {
    // A rule that fires a thousand times over one string in one repository is
    // a different object from one that fires a thousand times over a thousand.
    // A table with only the first column cannot tell them apart.
    const records = discardsIn(
      [
        record('bare-word', 'a/one', 'pnpm'),
        record('bare-word', 'a/one', 'pnpm'),
        // The repository has this one, so the rule cost nothing by refusing it.
        record('bare-word', 'b/two', 'index.ts', true),
        record('conditional', 'b/two', 'dist/out.json'),
      ].join('\n'),
    )
    expect(tabulate(records)).toEqual([
      { cause: 'bare-word', count: 3, distinct: 2, repos: 2, absent: 2 },
      { cause: 'conditional', count: 1, distinct: 1, repos: 1, absent: 1 },
    ])
  })

  it('puts the most discarded first, and breaks a tie by name', () => {
    const records = discardsIn(
      [record('url', 'a/one', 'https://x.dev'), record('hedged', 'a/one', 'docs/x.md')].join('\n'),
    )
    expect(tabulate(records).map((row) => row.cause)).toEqual(['hedged', 'url'])
  })

  it('survives a torn last line, like every other JSONL file here', () => {
    expect(discardsIn(`${record('url', 'a/one', 'x')}\n{"repo":"b/tw`)).toHaveLength(1)
  })

  it('skips a line that parses and is not a record', () => {
    // The file is written by one version of the runner and read by another.
    // Without the shape check a record missing `cause` becomes a row called
    // `undefined`.
    expect(discardsIn(`{"repo":"a/one"}\n${record('url', 'a/one', 'x')}\n`)).toHaveLength(1)
  })

  it('counts a candidate nobody asked the question about as worth reading', () => {
    // `pnpm build` is not a path, so nothing is asserted about whether the
    // repository has it — and it still belongs in the column a person reads.
    const records = discardsIn(
      [record('conditional', 'a/one', 'here.ts', true), unasked('conditional', 'a/one', 'x')].join(
        '\n',
      ),
    )
    expect(tabulate(records)).toEqual([
      { cause: 'conditional', count: 2, distinct: 2, repos: 1, absent: 1 },
    ])
  })
})

describe('the sample a person reads', () => {
  const many = (n: number): ReturnType<typeof discardsIn> =>
    discardsIn(
      Array.from({ length: n }, (_, i) => record('bare-word', `r/${i}`, `t${i}`)).join('\n'),
    )

  it('spreads through the file rather than taking its head', () => {
    // The file is written repository by repository, so the first twenty
    // discards of a rule are one or two documents. Reading them would be
    // reading their habits and calling it a rule's behaviour.
    expect(sampleOf(many(100), 'bare-word', 4).map((discard) => discard.text)).toEqual([
      't0',
      't25',
      't50',
      't75',
    ])
  })

  it('gives everything there is when there is less than asked for', () => {
    expect(sampleOf(many(3), 'bare-word', 20)).toHaveLength(3)
    expect(sampleOf(many(3), 'conditional', 20)).toEqual([])
  })

  it('leaves out the discards the repository turns out to have', () => {
    // Those cost nothing, and they are the majority of every broad rule.
    const records = discardsIn(
      [record('bare-word', 'a/one', 'gone.ts'), record('bare-word', 'a/one', 'here.ts', true)].join(
        '\n',
      ),
    )
    expect(sampleOf(records, 'bare-word', 20).map((discard) => discard.text)).toEqual(['gone.ts'])
  })
})

const inTwo = (repo: string): string =>
  JSON.stringify({
    repo,
    path: '.agents/skills/teach/SKILL.md',
    kind: 'path',
    cause: 'conditional',
    text: './assets/',
    line: 65,
    offset: [0, 9],
    window: '',
    exists: false,
  })

describe('reading documents instead of copies', () => {
  /**
   * Ticket `17`, and it exists because `07` counted one
   * `.agents/skills/teach/SKILL.md` four times: two repositories carrying the
   * same skill, and a reader asking how often a rule misfires got four votes
   * from one document.
   */
  const FAMILY = JSON.stringify([
    ['a/one|.agents/skills/teach/SKILL.md', 'b/two|.agents/skills/teach/SKILL.md'],
  ])

  it('counts one document once, however many repositories carry it', () => {
    const records = discardsIn([inTwo('a/one'), inTwo('b/two')].join('\n'))
    expect(records).toHaveLength(2)
    expect(collapseToFamilies(records, familyIndex(FAMILY))).toHaveLength(1)
  })

  it('leaves a discard belonging to no family alone', () => {
    const records = discardsIn([inTwo('a/one'), record('url', 'c/three', 'x')].join('\n'))
    expect(collapseToFamilies(records, familyIndex(FAMILY))).toHaveLength(2)
  })

  it('keeps two different rules firing on one document', () => {
    // The same rule on two copies is one observation. Two rules on one
    // document are two, and collapsing those would lose the thing being read.
    const other = inTwo('b/two').replace('"conditional"', '"hedged"')
    const records = discardsIn([inTwo('a/one'), other].join('\n'))
    expect(collapseToFamilies(records, familyIndex(FAMILY))).toHaveLength(2)
  })

  it('reads the records untouched when no family table has been built', () => {
    const records = discardsIn([inTwo('a/one'), inTwo('b/two')].join('\n'))
    expect(collapseToFamilies(records, new Map())).toHaveLength(2)
  })

  it('survives a family file that is not what it expects', () => {
    expect(familyIndex('not json').size).toBe(0)
    expect(familyIndex('{"a":1}').size).toBe(0)
    expect(familyIndex('[["only-one"]]').size).toBe(0)
  })
})
