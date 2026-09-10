/**
 * The anchors offered by the files some link points into.
 *
 * It is built once per run, before verification, for the same reason
 * `ignoredByGit` is: `Check.run` is synchronous, and a check that reads from
 * disk on the hot path is how the 500 ms budget of `SPEC.md` § 9 dies.
 *
 * Only files a claim actually targets are read. This is not an index of the
 * repo — a repo full of Markdown is common and reading all of it to answer
 * three links would be waste.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Claim } from '../core/types.ts'
import { splitAnchor, type AnchorLink } from '../extract/links.ts'
import { collectAnchors } from '../parse/anchors.ts'
import { resolveInRepo } from './resolve.ts'

/** One document's anchors: comparison key -> readable form. */
export type DocumentAnchors = ReadonlyMap<string, string>

/** `path relative to the root` -> that document's anchors. */
export type AnchorIndex = ReadonlyMap<string, DocumentAnchors>

/**
 * The file a link claim points into, relative to the root.
 *
 * Resolution is against `source.baseDir` **only**. The dual baseDir/root
 * resolution in `path/missing` exists because prose is ambiguous about where it
 * is speaking from; a Markdown link is not, because GitHub renders it relative
 * to its own directory.
 */
export function anchorTargetOf(claim: Claim, link: AnchorLink): string | undefined {
  // It takes the already-split link rather than re-deriving it: both callers
  // have one in hand, and splitting twice is how the two disagree one day.
  if (link.path === '') return claim.source.path

  const rel = resolveInRepo(claim.source.baseDir, link.path)
  return rel === undefined || rel === '' ? undefined : rel
}

export async function buildAnchorIndex(
  root: string,
  claims: readonly Claim[],
): Promise<AnchorIndex> {
  const targets = new Set<string>()
  for (const claim of claims) {
    if (claim.kind !== 'link') continue
    const link = splitAnchor(claim.text)
    if (link === undefined) continue
    const target = anchorTargetOf(claim, link)
    if (target !== undefined) targets.add(target)
  }

  const index = new Map<string, DocumentAnchors>()
  await Promise.all(
    [...targets].map(async (target) => {
      let content: string
      try {
        content = await readFile(join(root, target), 'utf8')
      } catch {
        // Left out of the map entirely, which the check reads as "say
        // nothing" rather than "this document has no anchors".
        return
      }
      index.set(target, collectAnchors(content))
    }),
  )
  return index
}
