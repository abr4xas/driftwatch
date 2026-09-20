/**
 * Reading what the model answered, with no key and no request.
 *
 * Seven passes each carried their own copy of these checks and each phrased
 * the failure differently; one of them read a choice answer's confidence with
 * a three-line idiom repeated verbatim. What can go wrong here is quiet: a
 * question declared `boolean` that comes back as something else must throw, not
 * produce a number a pass will happily average into a table.
 */
import { describe, expect, it } from 'vitest'
import { answersOf } from '../scripts/jev/ask.ts'

describe('a boolean answer', () => {
  it('is read as its probability', () => {
    expect(
      answersOf({ sameCause: { type: 'boolean', probability: 0.73 } }).probability('sameCause'),
    ).toBe(0.73)
  })

  it('refuses to be read as a choice', () => {
    const answers = answersOf({ sameCause: { type: 'boolean', probability: 0.73 } })
    expect(() => answers.chosen('sameCause')).toThrow(/did not come back as a choice/)
  })
})

describe('a choice answer', () => {
  it('carries the winning label and its share of the mass', () => {
    const answers = answersOf({
      repoKind: {
        type: 'choice',
        choice: 'skills-repo',
        probabilities: { 'skills-repo': 0.62, 'template-clone': 0.3, 'fork-or-vendored': 0.08 },
      },
    })
    expect(answers.chosen('repoKind')).toEqual({ choice: 'skills-repo', confidence: 0.62 })
  })

  it('is certain when the model returned no spread', () => {
    const answers = answersOf({ repoKind: { type: 'choice', choice: 'dotfiles' } })
    expect(answers.chosen('repoKind')).toEqual({ choice: 'dotfiles', confidence: 1 })
  })

  it('refuses to be read as a probability', () => {
    const answers = answersOf({ repoKind: { type: 'choice', choice: 'dotfiles' } })
    expect(() => answers.probability('repoKind')).toThrow(/did not come back as a boolean/)
  })
})

describe('an answer that is not there', () => {
  it('names the question rather than returning nothing', () => {
    const answers = answersOf({})
    expect(() => answers.probability('claimsAPath')).toThrow(/claimsAPath did not come back/)
    expect(() => answers.probability('claimsAPath')).toThrow(/got nothing/)
  })
})
