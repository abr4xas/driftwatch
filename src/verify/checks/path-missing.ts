import { suggestPath } from '../../fix/suggest.ts'
import type { Check } from '../check.ts'
import { verifyPathClaim } from '../path-claim.ts'

export const pathMissing: Check = {
  id: 'path/missing',
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
