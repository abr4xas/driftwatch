/**
 * Reading the adjudication table back out of the prose it lives in.
 *
 * `rowsIn` is the only reader of `CLASSIFICATION.md`, which is the only
 * ground truth this project has, and two other passes are built on top of it.
 * It had no test. What can go wrong is quiet in both directions: a row shape
 * it stops matching disappears from the pass without anything failing, and a
 * table that is not the per-finding table — the nine criteria sit a hundred
 * lines above it, numbered the same way — arrives as findings.
 */
import { describe, expect, it } from 'vitest'
import { classesIn, rowsIn, stateOf, windowAround } from '../scripts/jev/classify.ts'

const FINDING =
  '| 1 | `1amageek/SwiftAgent` | `AGENTS.md:701:34` | `path/missing` | ' +
  '`docs/SECURITY.md` | **true** | — | validation, round 4 |'

describe('a per-finding row', () => {
  it('is read cell by cell', () => {
    expect(rowsIn(FINDING)).toEqual([
      {
        id: 1,
        repo: '1amageek/SwiftAgent',
        location: 'AGENTS.md:701:34',
        check: 'path/missing',
        claim: 'docs/SECURITY.md',
        ruling: 'true',
        className: '—',
      },
    ])
  })

  it('carries the class a person named', () => {
    const row =
      '| 7 | `a/b` | `CLAUDE.md:3:1` | `path/missing` | `dist/bundle.js` | ' +
      '**false** | generated-bundle | calibration |'
    expect(rowsIn(row)[0]?.className).toBe('generated-bundle')
    expect(rowsIn(row)[0]?.ruling).toBe('false')
  })

  it('keeps an empty claim, which is a cell and not an absence', () => {
    const row = '| 9 | `a/b` | `AGENTS.md:1:1` | `frontmatter/invalid` | `` | **true** | — | x |'
    expect(rowsIn(row)).toHaveLength(1)
    expect(rowsIn(row)[0]?.claim).toBe('')
  })
})

describe('what is not a per-finding row', () => {
  it('ignores the criterion table, which is numbered the same way', () => {
    const criterion = '| 1 | `false-positive-traps` fixture at zero | 0 findings | **met** |'
    expect(rowsIn(criterion)).toEqual([])
  })

  it('ignores prose, headings and the header row', () => {
    const doc = ['# Round 20', '', '| id | repo | location |', '| --- | --- | --- |', ''].join('\n')
    expect(rowsIn(doc)).toEqual([])
  })

  it('reads every row of a document and nothing between them', () => {
    const doc = ['## A heading', FINDING, '', 'Some prose about it.', FINDING].join('\n')
    expect(rowsIn(doc)).toHaveLength(2)
  })
})

describe('the class list handed to the model', () => {
  it('is every named class, sorted, without the unnamed dash', () => {
    const rows = rowsIn(
      [
        '| 1 | `a/b` | `A.md:1:1` | `path/missing` | `x` | **false** | placeholder | c |',
        '| 2 | `a/b` | `A.md:2:1` | `path/missing` | `y` | **true** | — | c |',
        '| 3 | `c/d` | `B.md:1:1` | `path/missing` | `z` | **false** | crate-nickname | c |',
        '| 4 | `c/d` | `B.md:2:1` | `path/missing` | `w` | **false** | placeholder | c |',
      ].join('\n'),
    )
    expect(classesIn(rows)).toEqual(['crate-nickname', 'placeholder'])
  })
})

describe('the window a person had', () => {
  const doc = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`).join('\n')

  it('is three lines either side of the claim', () => {
    expect(windowAround(doc, 5)).toBe(
      ['line 2', 'line 3', 'line 4', 'line 5', 'line 6', 'line 7', 'line 8'].join('\n'),
    )
  })

  it('does not run off either end', () => {
    expect(windowAround(doc, 1).split('\n')[0]).toBe('line 1')
    expect(windowAround(doc, 10).split('\n').at(-1)).toBe('line 10')
  })
})

describe('the state the model is handed', () => {
  it('splits the location into a file and a position', () => {
    const [row] = rowsIn(FINDING)
    expect(row).toBeDefined()
    expect(stateOf(row!, 'the prose')).toEqual({
      repo: '1amageek/SwiftAgent',
      file: 'AGENTS.md',
      check: 'path/missing',
      claim: 'docs/SECURITY.md',
      context: 'line 701, column 34',
      prose: 'the prose',
    })
  })
})
