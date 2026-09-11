import type { Claim } from '../core/types.ts'
import type { ExtractContext } from './context.ts'
import { extractFrontmatterClaims } from './frontmatter.ts'
import { extractLinkClaims } from './links.ts'
import { extractPathClaims } from './paths.ts'
import { extractScriptClaims } from './scripts.ts'
import { extractSkillClaims } from './skill.ts'

/**
 * Static extractor registry, the twin of `verify/checks/index.ts`. Adding an
 * extractor means adding a file next to this one and an entry here — which is
 * what ARCHITECTURE.md § Ordering principle promised and what `run.ts` used to
 * make false, by naming all five by hand.
 *
 * The order is the order claims are emitted in. Findings are sorted by position
 * before they are reported, so it only decides the tie between two claims at
 * the same offset; it is fixed here rather than left to chance for the sake of
 * the corpus snapshots.
 */
export const EXTRACTORS: readonly ((context: ExtractContext) => Claim[])[] = [
  extractPathClaims,
  extractScriptClaims,
  extractLinkClaims,
  extractFrontmatterClaims,
  extractSkillClaims,
]

/** Every claim one source makes. */
export function extractClaims(context: ExtractContext): Claim[] {
  return EXTRACTORS.flatMap((extract) => extract(context))
}
