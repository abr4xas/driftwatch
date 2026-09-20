/**
 * The committed contract is the contract the code has.
 *
 * `CONTRACT.md` lists what a major version is needed to remove or reshape.
 * Generated (`pnpm surface`) rather than typed, and held here, for the reason
 * `site/corpus-data.js` proved twice over: an artifact nothing recomputes is an
 * artifact that drifts, and one describing a contract drifts into a promise
 * nobody made.
 *
 * A failure here is not a bug. It means the surface moved, and the question it
 * asks is whether that was meant — regenerate, read the diff line by line, and
 * commit it if the answer is yes.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REPO_ROOT } from '../scripts/lib/paths.ts'
import { ARTIFACT, frozenSurface } from '../scripts/release/surface.ts'

// Once: it runs the pipeline twice over two temporary repositories.
const generated = await frozenSurface()
const committed = readFileSync(join(REPO_ROOT, ARTIFACT), 'utf8')

/** A blank line moving around is not a change to the contract. */
function meaningful(line: string): boolean {
  return line.trim().length > 0
}

/**
 * What changed, as lines rather than as a wall of text.
 *
 * An equality assertion says "these differ" and leaves the reader to find
 * where; this one names the flag, the key or the export that moved, which is
 * the sentence somebody needs in order to decide whether to accept it.
 */
function movedLines(before: string, after: string): string[] {
  const was = new Set(before.split('\n'))
  const is = new Set(after.split('\n'))
  return [
    ...[...was].filter((line) => !is.has(line) && meaningful(line)).map((line) => `gone: ${line}`),
    ...[...is].filter((line) => !was.has(line) && meaningful(line)).map((line) => `new:  ${line}`),
  ]
}

describe('the frozen surface', () => {
  it('is what the code emits now', () => {
    expect(movedLines(committed, generated)).toEqual([])
    // The line sets can agree while the order does not, and an order the
    // generator no longer produces would come back on the next regeneration.
    expect(committed).toBe(generated)
  })

  it('covers every surface the freeze names', () => {
    const headings = [
      'Node floor',
      'Exit codes',
      'Check ids',
      'CLI flags',
      'Output formats',
      '`--json`',
      '`--format github`',
      '`--format sarif`',
      'Config keys',
      'Exported names',
    ]
    // Against a section quietly disappearing: the artifact would still match
    // itself, and the contract would be smaller than the one that was frozen.
    for (const heading of headings) expect(committed).toContain(`\n## ${heading}\n`)
  })
})
