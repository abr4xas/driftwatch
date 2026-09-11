import { splitAnchor } from '../../extract/links.ts'
import { suggestAnchor } from '../../fix/suggest.ts'
import { anchorKey } from '../../parse/anchors.ts'
import { anchorTargetOf } from '../anchor-index.ts'
import type { Check } from '../check.ts'
import { hasFile } from '../repo-index.ts'

/**
 * `SPEC.md` § 3: a link to an anchor that does not exist in the target file.
 *
 * The other half of the specified check — a link to a file that does not exist
 * — is already reported by `path/missing`, which extracts the path half of
 * every link and suggests a candidate for it. So this check **never claims a
 * target that does not exist**: one broken link produces one finding, and the
 * one that survives is the one carrying the suggestion.
 */
export const linkBroken: Check = {
  id: 'link/broken',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['link'],

  run(claim, ctx) {
    const link = splitAnchor(claim.text)
    if (link === undefined) return null
    const target = anchorTargetOf(claim, link)
    if (target === undefined) return null

    // Not in the index: it is `path/missing`'s finding, not ours.
    if (!hasFile(ctx.index, target)) return null

    /**
     * Two ways the target tells us nothing, and both mean silence. Absent from
     * the map is a file we could not read. An empty map is one we read and
     * found no anchor in, which is far more likely a document we failed to
     * parse — generated, templated, a format remark sees as prose — than one
     * whose author linked into nothing. Either way, reporting would turn a
     * single unreadable file into a screenful.
     */
    const anchors = ctx.anchors.get(target)
    if (anchors === undefined || anchors.size === 0) return null

    const key = anchorKey(link.anchor)
    if (key === '' || anchors.has(key)) return null

    const suggestion = suggestAnchor(anchors, key)
    return {
      claim,
      message: 'anchor does not exist',
      ...(suggestion === undefined ? {} : { suggestion }),
    }
  },
}
