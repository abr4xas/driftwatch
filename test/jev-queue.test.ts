/**
 * The ordering in front of a person's rulings.
 *
 * Condition 6 counts repositories, so one false positive settles a repository
 * however many findings it has. The value of this pass is entirely in the
 * order: put the most doubtful finding of the cheapest repository first and
 * 301 readings become 31. Everything below tests the arithmetic that produces
 * that order — none of it asks a model, and none of it decides anything.
 */
import { describe, expect, it } from 'vitest'
import {
  classTableOf,
  itemsIn,
  queueOf,
  stateOf,
  windowAround,
  type Item,
} from '../scripts/jev/queue.ts'

const outcome = (repo: string, findings: unknown[]) => JSON.stringify({ repo, findings })
const finding = (path: string, text: string, line = 3, check = 'path/missing') => ({
  check,
  path,
  text,
  line,
})

const DOC = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].join('\n')
const read = (_repo: string, path: string) => (path === 'AGENTS.md' ? DOC : undefined)

describe('the window a person reads', () => {
  it('centres on the claim and carries two lines either side', () => {
    expect(windowAround(DOC, 3)).toBe('one\ntwo\nthree\nfour\nfive')
  })

  it('does not run off the top of the file', () => {
    expect(windowAround(DOC, 1)).toBe('one\ntwo\nthree')
  })

  it('does not run off the bottom', () => {
    expect(windowAround(DOC, 7)).toBe('five\nsix\nseven')
  })
})

describe('which findings enter the queue', () => {
  it('takes path/missing and nothing else', () => {
    const text = outcome('o/a', [
      finding('AGENTS.md', 'src/x.ts'),
      finding('AGENTS.md', '#anchor', 3, 'link/broken'),
      finding('AGENTS.md', 'pnpm build', 3, 'script/missing'),
    ])
    expect(itemsIn(text, undefined, read).map((i) => i.text)).toEqual(['src/x.ts'])
  })

  it('honours a repository filter', () => {
    const text = `${outcome('o/a', [finding('AGENTS.md', 'a.ts')])}\n${outcome('o/b', [finding('AGENTS.md', 'b.ts')])}`
    expect(itemsIn(text, new Set(['o/b']), read).map((i) => i.repo)).toEqual(['o/b'])
  })

  it('drops a finding whose document cannot be read rather than inventing a window', () => {
    const text = outcome('o/a', [finding('GONE.md', 'src/x.ts')])
    expect(itemsIn(text, undefined, read)).toEqual([])
  })

  it('reads each document once however many findings it carries', () => {
    let reads = 0
    const counting = (repo: string, path: string) => {
      reads += 1
      return read(repo, path)
    }
    const text = outcome('o/a', [
      finding('AGENTS.md', 'a.ts'),
      finding('AGENTS.md', 'b.ts'),
      finding('AGENTS.md', 'c.ts'),
    ])
    expect(itemsIn(text, undefined, counting)).toHaveLength(3)
    expect(reads).toBe(1)
  })

  it('survives a torn line', () => {
    const text = `${outcome('o/a', [finding('AGENTS.md', 'a.ts')])}\n{"repo":\n`
    expect(itemsIn(text, undefined, read)).toHaveLength(1)
  })
})

describe('the state the question is asked over', () => {
  it('gives the candidate and the prose it sits in, nothing else', () => {
    const [item] = itemsIn(outcome('o/a', [finding('AGENTS.md', 'src/x.ts')]), undefined, read)
    expect(stateOf(item as Item)).toEqual({
      repo: 'o/a',
      file: 'AGENTS.md',
      candidate: 'src/x.ts',
      sentence: 'one\ntwo\nthree\nfour\nfive',
    })
  })
})

const answered = (repo: string, text: string, jevClass: string, isReal = 0.5) => ({
  repo,
  path: 'AGENTS.md',
  check: 'path/missing',
  text,
  line: 3,
  window: 'w',
  named: jevClass !== 'new',
  jevClass,
  isReal,
})

describe('the order, which is the whole point', () => {
  it('puts a repository with a named class before one without', () => {
    const out = queueOf([
      answered('o/unnamed', 'a', 'new'),
      answered('o/named', 'b', 'placeholder'),
    ])
    expect(out.indexOf('o/named')).toBeLessThan(out.indexOf('o/unnamed'))
  })

  it('breaks the tie between two unnamed repositories by size, cheapest first', () => {
    const out = queueOf([
      answered('o/big', 'a', 'new'),
      answered('o/big', 'b', 'new'),
      answered('o/small', 'c', 'new'),
    ])
    expect(out.indexOf('o/small')).toBeLessThan(out.indexOf('o/big'))
  })

  it('sorts a named class above an unnamed one inside a repository', () => {
    const out = queueOf([
      answered('o/a', 'plain', 'new', 0.1),
      answered('o/a', 'classed', 'runtime-log'),
    ])
    expect(out.indexOf('classed')).toBeLessThan(out.indexOf('plain'))
  })

  it('a repository of 245 findings is one block, not 245 lines', () => {
    const rows = Array.from({ length: 245 }, (_, i) => answered('o/big', `t${i}`, 'new', i / 245))
    const out = queueOf(rows)
    expect(out).toContain('245 finding(s)')
    expect(out).toContain('… and 240 more, higher up')
  })
})

describe('the per-repository cap, for ticket 37 table', () => {
  const text = [
    outcome('o/hoarder', [
      finding('AGENTS.md', 'a.ts'),
      finding('AGENTS.md', 'b.ts'),
      finding('AGENTS.md', 'c.ts'),
    ]),
    outcome('o/quiet', [finding('AGENTS.md', 'd.ts')]),
  ].join('\n')

  it('takes at most the cap from each repository', () => {
    expect(itemsIn(text, undefined, read, 2).map((i) => i.text)).toEqual(['a.ts', 'b.ts', 'd.ts'])
  })

  it('takes everything when no cap is given, which is what the queue wants', () => {
    expect(itemsIn(text, undefined, read)).toHaveLength(4)
  })
})

const answer = (repo: string, jevClass: string, isReal = 0.5) => ({
  repo,
  path: 'AGENTS.md',
  check: 'path/missing',
  text: 'x.ts',
  line: 1,
  window: 'w',
  named: jevClass !== 'new',
  jevClass,
  isReal,
})

describe('the class table', () => {
  it('counts items and repositories per class, largest first', () => {
    const out = classTableOf([
      answer('o/a', 'placeholder'),
      answer('o/b', 'placeholder'),
      answer('o/b', 'runtime-log'),
    ])
    expect(out).toContain('placeholder')
    expect(out.indexOf('placeholder')).toBeLessThan(out.indexOf('runtime-log'))
    expect(out).toContain('3 findings, 2 repositories')
  })

  it('counts an unnamed answer as the new control rather than dropping it', () => {
    expect(classTableOf([answer('o/a', 'new')])).toMatch(/new\s+1\s+1/u)
  })

  it('says it is neither a precision nor a false-positive count', () => {
    const out = classTableOf([answer('o/a', 'new')])
    expect(out).toContain('Nothing here is a precision')
    expect(out).toContain('written by hand in')
  })
})
