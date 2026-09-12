import { suggestPath } from '../../fix/suggest.ts'
import type { Check } from '../check.ts'
import { verifyPathClaim } from '../path-claim.ts'

export const pathMissing: Check = {
  id: 'path/missing',
  title: 'A claimed path does not exist',
  description:
    'A context file names a file or directory that is not in the repository. ' +
    'An agent reads the claim, believes it, looks for what is not there, and ' +
    'then guesses. Only fragments that assert existence are reported: a path ' +
    'inside a URL, a glob, a placeholder, a hedged sentence or another ' +
    "assistant's configuration root are all discarded before this check runs.",
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],

  run(claim, ctx) {
    // Every rule that can decline the question lives behind this one call. What
    // is left here is the finding: the message, and the candidate to suggest.
    const verdict = verifyPathClaim(claim, ctx)
    if (verdict.kind !== 'missing') return null

    const suggestion = suggestPath(ctx.index, verdict.local)
    return {
      claim,
      message: 'path does not exist',
      ...(suggestion === undefined ? {} : { suggestion }),
    }
  },
}
