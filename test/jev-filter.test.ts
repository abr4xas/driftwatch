/**
 * The acquisition filter's decidable parts, with no clone and no model.
 *
 * What can go wrong is not that a judgement is wrong — nothing here is a
 * ruling. It is that the model is handed the wrong question, or that one
 * monorepo's four hundred skills become most of a run and the table then
 * describes that repository rather than the ecosystem.
 */
import { describe, expect, it } from 'vitest'
import { answersIn, QUESTIONS, tabulate, type Answer } from '../scripts/jev/filter.ts'

const row = (repo: string, path: string, kind: string, about = 0.9): Answer => ({
  repo,
  path,
  aboutThisRepo: about,
  repoKind: kind,
  confidence: 0.8,
})

describe('the questions', () => {
  it('asks ADR-0008 as ADR-0008 states it', () => {
    // A context file instructs; a specification argues, and arguing means
    // quoting paths that belong elsewhere. Forty-three findings and every one
    // a false positive is what that distinction costs when nobody asks it.
    expect(QUESTIONS['aboutThisRepo']?.type).toBe('boolean')
    const criteria = QUESTIONS['aboutThisRepo']?.criteria
    expect(JSON.stringify(criteria)).toMatch(/argues|specif/u)
    expect(JSON.stringify(criteria)).toMatch(/reader/u)
  })

  it('offers the four kinds the spec names, and dotfiles', () => {
    const kind = QUESTIONS['repoKind']
    expect(kind?.type).toBe('choice')
    expect(Object.keys(kind?.criteria ?? {})).toEqual([
      'skills-repo',
      'product-with-skills',
      'template-clone',
      'fork-or-vendored',
      'dotfiles',
    ])
  })
})

describe('the table', () => {
  it('counts repositories, not documents', () => {
    // The lesson of ticket 11: a file count cannot tell a convention from a
    // project, and one monorepo would otherwise be most of any row.
    const out = tabulate([
      row('a/one', 'AGENTS.md', 'skills-repo'),
      row('a/one', 'x/SKILL.md', 'skills-repo'),
      row('a/one', 'y/SKILL.md', 'skills-repo'),
      row('b/two', 'AGENTS.md', 'dotfiles'),
    ])
    expect(out).toContain('4 documents in 2 repositories')
    expect(out).toMatch(/skills-repo\s+1 repos/u)
    expect(out).toMatch(/dotfiles\s+1 repos/u)
  })

  it('takes what most of a repository says it is', () => {
    const out = tabulate([
      row('a/one', 'AGENTS.md', 'product-with-skills'),
      row('a/one', 'x/SKILL.md', 'skills-repo'),
      row('a/one', 'y/SKILL.md', 'skills-repo'),
    ])
    expect(out).toMatch(/skills-repo\s+1 repos/u)
  })

  it('says how much of it is off-subject', () => {
    const out = tabulate([
      row('a/one', 'AGENTS.md', 'skills-repo', 0.2),
      row('b/two', 'A.md', 'dotfiles'),
    ])
    expect(out).toContain('1 judged not to be about the repository they sit in')
  })

  it('says what it is not, because a table of counts reads like a measurement', () => {
    expect(tabulate([row('a/one', 'A.md', 'dotfiles')])).toContain(
      'Not a measurement of driftwatch',
    )
  })
})

describe('reading a previous run back', () => {
  it('skips a torn line and anything not shaped like an answer', () => {
    const text = `${JSON.stringify(row('a/one', 'A.md', 'dotfiles'))}\n{"repo":"b/tw\n{"repo":"c"}\n`
    expect(answersIn(text)).toHaveLength(1)
  })
})
