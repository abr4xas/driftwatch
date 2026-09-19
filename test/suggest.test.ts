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
    expect(suggestPath(index, 'src/auth.ts', 'AGENTS.md')).toBeUndefined()
  })

  it('a single candidate in a similar directory gives confidence 1 and is fixable', async () => {
    const index = await indexWith({ 'src/auth/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts', 'AGENTS.md')).toEqual({
      value: 'src/auth/auth.ts',
      confidence: 1,
      fixable: true,
    })
  })

  it('a single candidate in a different directory gives 0.6 and is not fixable', async () => {
    const index = await indexWith({ 'packages/internal/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts', 'AGENTS.md')).toEqual({
      value: 'packages/internal/auth.ts',
      confidence: 0.6,
      fixable: false,
    })
  })

  it('several namesakes give 0.3 and are never fixable', async () => {
    const index = await indexWith({ 'src/auth.ts': '', 'test/auth.ts': '' })
    const suggestion = suggestPath(index, 'src/lib/auth.ts', 'AGENTS.md')
    expect(suggestion?.confidence).toBe(0.3)
    expect(suggestion?.fixable).toBe(false)
  })

  it('with several namesakes it proposes the one in the most similar directory', async () => {
    const index = await indexWith({ 'src/auth.ts': '', 'vendor/legacy/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts', 'AGENTS.md')?.value).toBe('src/auth.ts')
  })

  it('on a similarity tie it picks the first alphabetically, to stay stable', async () => {
    const index = await indexWith({ 'b/x/auth.ts': '', 'a/y/auth.ts': '' })
    expect(suggestPath(index, 'z/auth.ts', 'AGENTS.md')?.value).toBe('a/y/auth.ts')
  })

  it('suggests for a directory, not only for a file', async () => {
    const index = await indexWith({ 'src/images/logo.png': '' })
    expect(suggestPath(index, 'public/images', 'AGENTS.md')).toBeUndefined()
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

const oneSkillRepo = (): string =>
  makeTempRepo({ files: { '.agents/skills/agentic-workflows/SKILL.md': '# router\n' } })

describe('a document is never the answer to its own claim', () => {
  /**
   * Ticket `22`. `parentSimilarity` divides by the **shorter** directory, so a
   * target sitting above the claim agrees on every segment it has and scores
   * 1.00 — the same as a target exactly where the claim said. Confidence 1 is
   * fixable.
   *
   * A claim written relative to a nested source is resolved under that source's
   * own directory, which makes the source's own siblings prefixed by it for
   * free. In a repository with a single `SKILL.md`, a skill referring to a
   * different skill gets offered **itself**:
   *
   *     source  .agents/skills/agentic-workflows/SKILL.md
   *     claim   skills/otel-queries/SKILL.md
   *     local   .agents/skills/agentic-workflows/skills/otel-queries/SKILL.md
   *
   * The guard is not about the score. A document cannot be telling you to read
   * itself under another name, whatever the arithmetic says.
   */
  it('refuses a suggestion that is the file making the claim', async () => {
    const index = await buildRepoIndex(oneSkillRepo())
    const source = '.agents/skills/agentic-workflows/SKILL.md'
    const local = '.agents/skills/agentic-workflows/skills/otel-queries/SKILL.md'
    expect(suggestPath(index, local, source)).toBeUndefined()
  })

  it('still suggests it to a different document', async () => {
    // The guard is about the claim's own file and nothing wider. Another
    // document naming the same missing path is an ordinary suggestion.
    const index = await buildRepoIndex(oneSkillRepo())
    const local = 'docs/skills/otel-queries/SKILL.md'
    expect(suggestPath(index, local, 'README.md')?.value).toBe(
      '.agents/skills/agentic-workflows/SKILL.md',
    )
  })

  it('leaves every other suggestion where it was', async () => {
    const index = await buildRepoIndex(
      makeTempRepo({ files: { 'src/helpers/date.ts': 'export const a = 1\n' } }),
    )
    expect(suggestPath(index, 'src/util/date.ts', 'AGENTS.md')).toEqual({
      value: 'src/helpers/date.ts',
      confidence: 1,
      fixable: true,
    })
  })
})
