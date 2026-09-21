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
import { itemsIn, queueOf, stateOf, windowAround, type Item } from '../scripts/jev/queue.ts'

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

const answered = (repo: string, text: string, claimsAPath: number) => ({
  repo,
  path: 'AGENTS.md',
  check: 'path/missing',
  text,
  line: 3,
  window: 'w',
  claimsAPath,
})

describe('the order, which is the whole point', () => {
  it('puts the repository with the most doubtful finding first', () => {
    const out = queueOf([
      answered('o/solid', 'a', 0.9),
      answered('o/doubtful', 'b', 0.05),
      answered('o/middling', 'c', 0.5),
    ])
    expect(out.indexOf('o/doubtful')).toBeLessThan(out.indexOf('o/middling'))
    expect(out.indexOf('o/middling')).toBeLessThan(out.indexOf('o/solid'))
  })

  it('sorts within a repository worst first', () => {
    const out = queueOf([answered('o/a', 'high', 0.9), answered('o/a', 'low', 0.1)])
    expect(out.indexOf('low')).toBeLessThan(out.indexOf('high'))
  })

  it('a repository of 245 findings is one block, not 245 lines', () => {
    const rows = Array.from({ length: 245 }, (_, i) => answered('o/big', `t${i}`, i / 245))
    const out = queueOf(rows)
    expect(out).toContain('245 finding(s)')
    expect(out).toContain('… and 240 more, higher up')
  })
})
