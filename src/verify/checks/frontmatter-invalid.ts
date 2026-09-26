import { frontmatterFactOf } from '../../extract/frontmatter.ts'
import type { Check } from '../check.ts'

/**
 * Frontmatter that is not YAML.
 *
 * This used to be two checks wearing one id. The other one needed a **schema**
 * — a table of keys whose type the format fixes — and round twenty-eight took
 * it out with `skill/frontmatter`, for the reason Angel gave twice: driftwatch
 * checks whether the paths a document names are still there, not whether the
 * document is well formed. A `description` that is a list is malformed on the
 * day it is written and nothing about the repository made it so.
 *
 * What is left is a fact rather than a judgement: the block either is YAML or
 * it is not, and a parser we did not write says which. It is kept for the one
 * case that *is* a claim going wrong silently — a duplicate key, where one of
 * the two values is dropped and nothing tells the author.
 */

export const frontmatterInvalid: Check = {
  id: 'frontmatter/invalid',
  title: 'Frontmatter is not valid YAML',
  description:
    'The YAML block at the top of the file does not parse, so whatever it ' +
    "declares is not what a reader gets. The block's contents are not " +
    "otherwise checked: a field's type is the author's business.",
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['frontmatter'],

  run(claim) {
    const fact = frontmatterFactOf(claim)
    if (fact === undefined) return null

    if (fact.subject === 'parse') {
      return {
        claim,
        // The parser's own reason. `Map keys must be unique` and `Tabs are not
        // allowed as indentation` say more than any rewording of ours, and a
        // duplicate key is real drift: one of the two values is lost silently.
        message: `invalid YAML: ${fact.reason}`,
      }
    }

    // Everything else a block holds is the author's business. The type table
    // that used to live here went the way of `skill/frontmatter`'s four lint
    // rules: a `description` that is a list is malformed, not false, and this
    // tool reports what a repository has since made untrue.
    return null
  },
}
