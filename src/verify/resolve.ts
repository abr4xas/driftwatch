import type { Claim } from '../core/types.ts'

/**
 * Resolves a claim's text to a path relative to the repo root.
 *
 * Returns `undefined` when the path escapes above the root: that is not a
 * missing file in the repo, it is a claim about the filesystem of whoever wrote
 * the document, and it is not ours to verify.
 */
export function resolveInRepo(baseDir: string, text: string): string | undefined {
  // A leading slash reads as "from the repo root" here, which is what an
  // anchor target needs. Path **claims** never arrive with one: `discard.ts`
  // stops them, because over the corpus that reading held for 5 of 306 and
  // produced three false positives and no true ones.
  const fromRoot = text.startsWith('/')
  const joined = fromRoot ? text.slice(1) : baseDir === '' ? text : `${baseDir}/${text}`

  const out: string[] = []
  for (const segment of joined.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (out.length === 0) return undefined
      out.pop()
      continue
    }
    out.push(segment)
  }
  return out.join('/')
}

/**
 * The two paths a claim resolves to: against its source's directory, and
 * against the repo root.
 *
 * Both exist because a nested source writes half its paths one way and half the
 * other, with no syntactic signal separating them (`path-claim.ts` has the
 * argument). They are named rather than returned as a list because the rules
 * use them differently: the absent-tool rule and the suffix search want the
 * path **as written** even when the source sits at the root.
 *
 * `undefined` means there is nothing to ask about — the path escapes above the
 * root, or resolves to the root itself.
 */
export type Resolutions = {
  local: string | undefined
  asWritten: string | undefined
}

/** The root itself is not something to ask about, so it reads as absent. */
function asked(rel: string | undefined): string | undefined {
  return rel === undefined || rel === '' ? undefined : rel
}

export function resolutionsOf(claim: Claim): Resolutions {
  return {
    local: asked(resolveInRepo(claim.source.baseDir, claim.text)),
    asWritten: asked(resolveInRepo('', claim.text)),
  }
}
