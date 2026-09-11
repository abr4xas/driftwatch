import type { Claim } from '../core/types.ts'
import { resolveInRepo } from './resolve.ts'

/** An improbable name, to ask git about a directory's contents. */
const DIR_PROBE = '__driftwatch_probe__'

/**
 * The paths a path claim is verified against: its source's `baseDir`, and the
 * repo root. Both, because a nested source writes half its paths one way and
 * half the other; `path/missing` has the argument.
 */
export function resolutionsOf(claim: Claim): string[] {
  const out: string[] = []
  for (const base of [claim.source.baseDir, '']) {
    const rel = resolveInRepo(base, claim.text)
    if (rel === undefined || rel === '' || out.includes(rel)) continue
    out.push(rel)
  }
  return out
}

/**
 * What git has to be asked to answer "is this resolution ignored?".
 *
 * A pattern like `pr-status/*` ignores the directory's *contents*, not the
 * directory. So for a directory claim we also ask about a made-up child: if git
 * would ignore what is inside, the directory is generated output.
 *
 * Real case (vercel/next.js): `scripts/pr-status/`, with `scripts/.gitignore`
 * containing `pr-status/*`.
 *
 * This is the function that keeps the prefetch and the lookup in step. They ran
 * as two copies of the probe name in two directories, and nothing tied them.
 */
function queriesFor(claim: Claim, rel: string): string[] {
  return claim.text.endsWith('/') ? [rel, `${rel}/${DIR_PROBE}`] : [rel]
}

/** Every path git is asked about in one run, in one batch, before the checks. */
export function gitQueriesFor(claims: readonly Claim[]): string[] {
  const paths = new Set<string>()
  for (const claim of claims) {
    if (claim.kind !== 'path') continue
    for (const rel of resolutionsOf(claim)) {
      for (const query of queriesFor(claim, rel)) paths.add(query)
    }
  }
  return [...paths]
}

/**
 * Whether git ignores this resolution of the claim, or would ignore whatever is
 * inside it. Asks exactly what `gitQueriesFor` prefetched.
 */
export function ignoredByGit(ignored: ReadonlySet<string>, claim: Claim, rel: string): boolean {
  return queriesFor(claim, rel).some((query) => ignored.has(query))
}
