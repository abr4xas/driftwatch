/**
 * Blocking and capping the wild findings before any pair is asked about.
 *
 * The first run of this pass produced zero groups out of 4950 pairs, and the
 * fault was here rather than in the question: one finding per repository,
 * evenly spread, is a pool built to have nothing in common. What replaced it
 * is arithmetic picking the neighbourhoods and the judgement working inside
 * them, so what these tests pin is the arithmetic.
 */
import { describe, expect, it } from 'vitest'
import { blocked, blockOf, eligible, pairStateOf, type Wild } from '../scripts/jev/findings.ts'

const wild = (id: number, check: string, text: string): Wild => ({
  id,
  repo: 'a/b',
  path: 'AGENTS.md',
  check,
  text,
  line: 1,
})

const result = (repo: string, findings: unknown[], ok = true): unknown => ({ repo, ok, findings })
const found = (path: string, text: string, check = 'path/missing'): unknown => ({
  check,
  path,
  text,
  line: 2,
})

describe('which findings are eligible', () => {
  it('skips a repository whose run failed', () => {
    const rows = eligible([result('a/b', [found('A.md', 'x')], false)], new Map(), 5)
    expect(rows).toEqual([])
  })

  it('skips a finding missing the fields the question needs', () => {
    const rows = eligible([result('a/b', [{ check: 'path/missing', path: 'A.md' }])], new Map(), 5)
    expect(rows).toEqual([])
  })

  it('caps a repository, whatever it produced', () => {
    const many = Array.from({ length: 9 }, (_, i) => found('A.md', `x${i}`))
    expect(eligible([result('farm/skills', many)], new Map(), 2)).toHaveLength(2)
  })

  it('takes one finding per template family, not one per copy', () => {
    const families = new Map([
      ['a/one|SKILL.md', 'family-3'],
      ['b/two|SKILL.md', 'family-3'],
    ])
    const rows = eligible(
      [
        result('a/one', [found('SKILL.md', 'helper')]),
        result('b/two', [found('SKILL.md', 'helper')]),
      ],
      families,
      5,
    )
    expect(rows).toHaveLength(1)
  })

  it('numbers what it keeps from one, so a pair can name itself', () => {
    const rows = eligible([result('a/b', [found('A.md', 'x'), found('A.md', 'y')])], new Map(), 5)
    expect(rows.map((row) => row.id)).toEqual([1, 2])
  })
})

describe('the neighbourhood a finding belongs to', () => {
  it('separates a directory from a file', () => {
    expect(blockOf(wild(1, 'path/missing', 'src/'))).toBe('path/missing|directory')
  })

  it('separates one extension from another', () => {
    expect(blockOf(wild(1, 'path/missing', 'a/b.md'))).toBe('path/missing|md')
    expect(blockOf(wild(2, 'path/missing', 'a/b.ts'))).toBe('path/missing|ts')
  })

  it('puts a bare word in its own neighbourhood', () => {
    expect(blockOf(wild(1, 'path/missing', 'helper'))).toBe('path/missing|no-extension')
  })

  it('never puts two checks together', () => {
    expect(blockOf(wild(1, 'link/broken', 'a/b.md'))).not.toBe(
      blockOf(wild(2, 'path/missing', 'a/b.md')),
    )
  })
})

describe('the blocks that get asked about', () => {
  const pool = [
    ...Array.from({ length: 6 }, (_, i) => wild(i + 1, 'path/missing', `a${i}.md`)),
    ...Array.from({ length: 4 }, (_, i) => wild(i + 10, 'path/missing', `b${i}.ts`)),
    wild(99, 'link/broken', 'c.md'),
  ]

  it('keeps only the largest, and only up to the cap', () => {
    const blocks = blocked(pool, 2, 3)
    expect([...blocks.keys()]).toEqual(['path/missing|md', 'path/missing|ts'])
    expect([...blocks.values()].map((found_) => found_.length)).toEqual([3, 3])
  })

  it('leaves a block whole when it is under the cap', () => {
    expect(blocked(pool, 3, 100).get('link/broken|md')).toHaveLength(1)
  })
})

describe('the pair the model is handed', () => {
  it('puts the two findings side by side and nothing else', () => {
    const state = pairStateOf(wild(1, 'path/missing', 'x.md'), wild(2, 'path/missing', 'y.md'))
    expect(Object.keys(state)).toEqual(['first', 'second'])
    expect(state.first.check).toBe('path/missing')
    expect(JSON.stringify(state)).not.toContain('"id"')
  })
})
