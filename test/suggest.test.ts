import { describe, expect, it } from 'vitest'
import { editDistance, parentSimilarity, suggestAnchor, suggestPath } from '../src/fix/suggest.ts'
import { buildRepoIndex } from '../src/verify/repo-index.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

describe('parentSimilarity', () => {
  it('two equal directories are identical', () => {
    expect(parentSimilarity('src/lib', 'src/lib')).toBe(1)
    expect(parentSimilarity('', '')).toBe(1)
  })

  it('measures the common prefix over the shorter directory', () => {
    expect(parentSimilarity('src/lib', 'src/auth')).toBe(0.5)
    expect(parentSimilarity('src', 'src/auth')).toBe(1)
    expect(parentSimilarity('a/b/c', 'x/y/z')).toBe(0)
  })

  it('does not confuse two monorepo packages for agreeing after diverging', () => {
    // They share `packages` and `src`, but diverge on the segment that
    // identifies the package. As a set they would score 0.667; as a prefix they
    // score 0.333, which is right: proposing the other package's file is not
    // unambiguous.
    expect(parentSimilarity('packages/web/src', 'packages/api/src')).toBeCloseTo(1 / 3)
  })

  it('the root resembles no subdirectory', () => {
    expect(parentSimilarity('', 'src')).toBe(0)
    expect(parentSimilarity('src', '')).toBe(0)
  })
})

async function indexWith(files: Record<string, string>) {
  return buildRepoIndex(makeTempRepo({ files }))
}

describe('suggestPath', () => {
  it('suggests nothing without namesakes', async () => {
    const index = await indexWith({ 'src/other.ts': '' })
    expect(suggestPath(index, 'src/auth.ts')).toBeUndefined()
  })

  it('a single candidate in a similar directory gives confidence 1 and is fixable', async () => {
    const index = await indexWith({ 'src/auth/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts')).toEqual({
      value: 'src/auth/auth.ts',
      confidence: 1,
      fixable: true,
    })
  })

  it('a single candidate in a different directory gives 0.6 and is not fixable', async () => {
    const index = await indexWith({ 'packages/internal/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts')).toEqual({
      value: 'packages/internal/auth.ts',
      confidence: 0.6,
      fixable: false,
    })
  })

  it('several namesakes give 0.3 and are never fixable', async () => {
    const index = await indexWith({ 'src/auth.ts': '', 'test/auth.ts': '' })
    const suggestion = suggestPath(index, 'src/lib/auth.ts')
    expect(suggestion?.confidence).toBe(0.3)
    expect(suggestion?.fixable).toBe(false)
  })

  it('with several namesakes it proposes the one in the most similar directory', async () => {
    const index = await indexWith({ 'src/auth.ts': '', 'vendor/legacy/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts')?.value).toBe('src/auth.ts')
  })

  it('on a similarity tie it picks the first alphabetically, to stay stable', async () => {
    const index = await indexWith({ 'b/x/auth.ts': '', 'a/y/auth.ts': '' })
    expect(suggestPath(index, 'z/auth.ts')?.value).toBe('a/y/auth.ts')
  })

  it('suggests for a directory, not only for a file', async () => {
    const index = await indexWith({ 'src/images/logo.png': '' })
    expect(suggestPath(index, 'public/images')).toBeUndefined()
  })
})

describe('editDistance', () => {
  it('counts substitutions, insertions and deletions', () => {
    expect(editDistance('instal', 'install')).toBe(1)
    expect(editDistance('setup', 'setup')).toBe(0)
    expect(editDistance('nope', 'notes')).toBe(2)
  })

  it('gives up as soon as the lengths cannot meet the budget', () => {
    // The value past the budget is never compared, only rejected, so all it
    // has to be is "more than two".
    expect(editDistance('a', 'abcdefgh')).toBeGreaterThan(2)
  })
})

describe('suggestAnchor', () => {
  const anchors = new Map([
    ['install', 'install'],
    ['rationale', 'rationale'],
    ['thefixflag', 'the-fix-flag'],
  ])

  it('proposes the single anchor within two edits, with its readable form', () => {
    expect(suggestAnchor(anchors, 'instal')).toEqual({
      value: '#install',
      confidence: 0.6,
      fixable: false,
    })
  })

  it('says nothing when nothing is close', () => {
    expect(suggestAnchor(anchors, 'teardown')).toBeUndefined()
  })

  it('says nothing when two anchors are equally plausible', () => {
    // Two candidates is no candidate: "did you mean one of these" is how a
    // reader learns to skim past the suggestion column.
    const twins = new Map([
      ['setup', 'setup'],
      ['setups', 'setups'],
    ])
    expect(suggestAnchor(twins, 'setupz')).toBeUndefined()
  })

  it('is never fixable, whatever the confidence', () => {
    // ADR-0006's hard floor. Every case where the fix is obvious is one the
    // canonical key already accepts and never reports.
    expect(suggestAnchor(anchors, 'installl')?.fixable).toBe(false)
  })
})
