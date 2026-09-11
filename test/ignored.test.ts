import { describe, expect, it } from 'vitest'
import type { Claim, Source } from '../src/core/types.ts'
import { gitQueriesFor, ignoredByGit, resolutionsOf } from '../src/verify/ignored.ts'

function claim(text: string, baseDir = ''): Claim {
  const source: Source = {
    path: baseDir === '' ? 'AGENTS.md' : `${baseDir}/AGENTS.md`,
    absPath: '/repo/AGENTS.md',
    kind: 'agents-md',
    content: '',
    baseDir,
    aliases: [],
  }
  return {
    kind: 'path',
    source,
    text,
    raw: text,
    range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
    offset: [0, 0],
    context: 'inline-code',
  }
}

describe('the two resolutions of a path claim', () => {
  it('at the root there is only one', () => {
    expect(resolutionsOf(claim('src/x.ts'))).toEqual(['src/x.ts'])
  })

  it('a nested source is resolved against its directory and against the root', () => {
    expect(resolutionsOf(claim('src/x.ts', 'packages/api'))).toEqual([
      'packages/api/src/x.ts',
      'src/x.ts',
    ])
  })

  it('a path escaping above the root contributes nothing', () => {
    expect(resolutionsOf(claim('../../outside.ts'))).toEqual([])
  })
})

describe('the git-ignore queries', () => {
  it('a directory claim also asks about its contents', () => {
    expect(gitQueriesFor([claim('dist/')])).toEqual(['dist', 'dist/__driftwatch_probe__'])
  })

  it('a file claim asks only about itself', () => {
    expect(gitQueriesFor([claim('dist/x.ts')])).toEqual(['dist/x.ts'])
  })

  it('claims of another kind are not asked about', () => {
    expect(gitQueriesFor([{ ...claim('dist/'), kind: 'script' }])).toEqual([])
  })

  /**
   * The invariant this module exists for. The prefetch runs in `run.ts` and the
   * lookup in `path/missing`, and they used to be two copies of a probe name in
   * two directories: a rename on one side silenced the suppression on the other
   * with no test failing.
   */
  it('every path the check looks up was asked of git', () => {
    const claims = [claim('dist/'), claim('build/', 'packages/api'), claim('src/x.ts', 'docs')]
    const asked = new Set(gitQueriesFor(claims))
    for (const one of claims) {
      for (const rel of resolutionsOf(one)) {
        // Anything `ignoredByGit` can answer true to has to be in the batch.
        expect(ignoredByGit(asked, one, rel)).toBe(true)
      }
    }
  })
})

describe('the ignore lookup', () => {
  it('a directory is ignored when git ignores what is inside it', () => {
    const ignored = new Set(['scripts/pr-status/__driftwatch_probe__'])
    expect(ignoredByGit(ignored, claim('scripts/pr-status/'), 'scripts/pr-status')).toBe(true)
  })

  it('the probe is not asked about for a file claim', () => {
    const ignored = new Set(['dist/x.ts/__driftwatch_probe__'])
    expect(ignoredByGit(ignored, claim('dist/x.ts'), 'dist/x.ts')).toBe(false)
  })
})
