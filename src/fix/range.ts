/**
 * Which bytes an autofix is allowed to overwrite, and what of the author's
 * spelling survives.
 *
 * `Claim.offset` says it "enables --fix without reformatting", and for the
 * script autofix that is true. For the path one it is not: a path claim from a
 * Markdown link spans the whole url, anchor included, so replacing it deletes
 * the `#section`.
 *
 * There used to be a third, and the reason this module exists at all: a
 * `skill/frontmatter` claim spanned the **key** token, so an edit that
 * inherited it wrote `my-skill: wrong-thing` over somebody's frontmatter. That
 * check was withdrawn — driftwatch does not rename a skill — and the value-edit
 * branch went with it.
 *
 * One module owns the answer, the way `verify/path-claim.ts` owns the verdict
 * on a path claim. The alternative shapes — a `range` on `Suggestion`, or one
 * on every fact — both spread the question across the three producers, and the
 * question is the same one three times: what does this suggestion replace.
 *
 * Every path out of here is either an edit that has been checked against the
 * bytes it is about to overwrite, or `undefined`. There is no third outcome,
 * and a refusal costs a fix the user can still apply by hand.
 */
import type { Claim, Finding } from '../core/types.ts'
import { resolveInRepo } from '../verify/resolve.ts'

/** A replacement of one byte range of one source. */
export type FixEdit = {
  source: Claim['source']
  /** Absolute offsets into `source.content`. */
  range: [number, number]
  replacement: string
}

/** What the range currently holds. The guard every case below runs. */
function currently(claim: Claim, range: [number, number]): string {
  return claim.source.content.slice(range[0], range[1])
}

/**
 * `script/missing`: the claim spans the whole command and the suggestion **is**
 * the whole corrected command.
 *
 * That is deliberate and predates this module — `ScriptFact.nameOffset`'s
 * comment has the argument: rewriting one token later means a second parser to
 * keep in step with the first. So there is nothing to compute here, only the
 * check that the offsets still describe the file we read.
 */
function wholeClaimEdit(claim: Claim, value: string): FixEdit | undefined {
  if (currently(claim, claim.offset) !== claim.raw) return undefined
  return { source: claim.source, range: claim.offset, replacement: value }
}

/** The path half of a link url: `./docs/x.md#section` claims `./docs/x.md`. */
function beforeAnchor(url: string): string {
  const hash = url.indexOf('#')
  return hash === -1 ? url : url.slice(0, hash)
}

/**
 * How the candidate has to be **written** so that reading it the way the claim
 * was read lands on the candidate.
 *
 * `suggestPath` returns a path relative to the repo root, and a document does
 * not necessarily speak from there.
 *
 * - A path the author wrote from the root (`/src/cli.ts`) keeps its leading
 *   slash and is unambiguous wherever the source sits.
 * - A source at the root writes the candidate as it is.
 * - **A nested source is refused.** `verify/path-claim.ts` has the finding
 *   behind that: a nested document writes half its paths against its own
 *   directory and half against the repo root, with no syntactic signal
 *   separating them. Reporting can afford to accept both, because accepting
 *   both only costs detections. Writing cannot: picking one convention
 *   rewrites the path into the other one and the result is a document that
 *   contradicts its own neighbours. The cost is a fix the user applies by
 *   hand, which is the cheap side of this trade.
 */
function rewritten(claim: Claim, candidate: string): string | undefined {
  if (claim.text.startsWith('/')) return `/${candidate}`
  if (claim.source.baseDir !== '') return undefined
  return candidate
}

/**
 * `path/missing`: the path fragment, and only the fragment.
 *
 * The range is the claim's **normalized text** located inside what the author
 * wrote, which is what keeps a `./` prefix, a trailing `:42` line reference and
 * a link's `#anchor` outside the replacement. They survive by not being part of
 * it, rather than by being re-applied afterwards.
 */
function pathEdit(claim: Claim, candidate: string): FixEdit | undefined {
  if (currently(claim, claim.offset) !== claim.raw) return undefined

  const written = claim.context === 'link' ? beforeAnchor(claim.raw) : claim.raw
  const at = written.indexOf(claim.text)
  // Not found means normalization did more than trim the ends — a backtick
  // inside, or a percent-encoded url whose decoded text is not in the file.
  // Two occurrences means picking one, which is a guess.
  if (at === -1 || written.indexOf(claim.text, at + 1) !== -1) return undefined

  const replacement = rewritten(claim, candidate)
  if (replacement === undefined) return undefined
  // Round trip: read the replacement the way the claim was read, and it has to
  // land on the candidate. Nothing downstream re-checks this.
  if (resolveInRepo(claim.source.baseDir, replacement) !== candidate) return undefined

  return {
    source: claim.source,
    range: [claim.offset[0] + at, claim.offset[0] + at + claim.text.length],
    replacement,
  }
}

/**
 * The edit a finding would apply, or `undefined` when there is none to make.
 *
 * `fixable` is the only question asked about the suggestion itself: the 0.8
 * threshold is how `fix/suggest.ts` reaches that flag and it is not
 * re-litigated here.
 */
export function fixEditFor(finding: Finding): FixEdit | undefined {
  const { claim, suggestion } = finding
  if (suggestion?.fixable !== true) return undefined

  switch (claim.kind) {
    case 'path':
      return pathEdit(claim, suggestion.value)
    case 'script':
      return wholeClaimEdit(claim, suggestion.value)
    // No other kind produces a fixable suggestion today, and a kind that
    // starts to has to be given its range here rather than inheriting the
    // claim's by default. `frontmatter` used to, for `skill/frontmatter`'s
    // name rewrite; that check is gone and the value-edit path with it.
    default:
      return undefined
  }
}
