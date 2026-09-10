/**
 * The claim a `SKILL.md` makes by having a frontmatter block at all.
 *
 * The four rules about a *field* read the claims `extract/frontmatter.ts`
 * already emits — one per top-level key, positioned at the key token — so the
 * only thing missing is the block itself: "there is no `name`" is not a fact
 * about any key, and neither is "there is no frontmatter".
 */
import type { Claim } from '../core/types.ts'
import { claimableFrontmatter, frontmatterClaim } from './frontmatter.ts'
import type { ExtractContext } from './paths.ts'

/** What the block asserts: that it is there, and which keys it holds. */
export type SkillFact = {
  subject: 'skill-block'
  /** `false` when the file has no frontmatter at all. */
  present: boolean
  /** The top-level keys, in the order they are written. */
  keys: readonly string[]
}

/** The opening delimiter, which `parseFrontmatter` guarantees is at offset 0. */
const DELIMITER: [number, number] = [0, 3]

export function extractSkillClaims(context: ExtractContext): Claim[] {
  const { source } = context
  if (source.kind !== 'skill') return []

  const claim = (offset: [number, number], fact: SkillFact): Claim =>
    frontmatterClaim(context, offset, fact)

  if (context.frontmatter === undefined) {
    // Nothing to point at but the first line, which is what a reader opens the
    // file on anyway.
    const end = source.content.indexOf('\n')
    return [
      claim([0, end === -1 ? source.content.length : end], {
        subject: 'skill-block',
        present: false,
        keys: [],
      }),
    ]
  }

  const frontmatter = claimableFrontmatter(context.frontmatter)
  // A gate refused it: a template, or a leading block that is not frontmatter.
  // Reading a structure out of something we know we misread is how a generator
  // ends up reported.
  if (frontmatter === undefined) return []
  // The block does not parse, so there is no structure. One finding, and it is
  // `frontmatter/invalid`'s.
  if (frontmatter.error !== undefined) return []

  return [
    claim(DELIMITER, {
      subject: 'skill-block',
      present: true,
      keys: frontmatter.keys.map((key) => key.key),
    }),
  ]
}

/**
 * The fact a claim carries, validated rather than cast — the same boundary
 * `frontmatterFactOf` draws, for the same reason.
 */
export function skillFactOf(claim: Claim): SkillFact | undefined {
  const meta = claim.meta
  if (meta === undefined || meta.subject !== 'skill-block') return undefined
  if (typeof meta.present !== 'boolean' || !Array.isArray(meta.keys)) return undefined
  const keys: readonly unknown[] = meta.keys
  if (!keys.every((key): key is string => typeof key === 'string')) return undefined
  return { subject: 'skill-block', present: meta.present, keys }
}
