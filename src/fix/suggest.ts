import type { ScriptFact, Suggestion } from '../core/types.ts'
import type { DocumentAnchors } from '../verify/anchor-index.ts'
import { candidatesFor, type RepoIndex } from '../verify/repo-index.ts'

/**
 * SPEC.md § 8: `--fix` only applies when the correction is unambiguous, and
 * that means a single candidate with confidence above 0.8.
 */
const FIXABLE_THRESHOLD = 0.8

function parentOf(rel: string): string {
  const slash = rel.lastIndexOf('/')
  return slash === -1 ? '' : rel.slice(0, slash)
}

function basenameOf(rel: string): string {
  return rel.slice(rel.lastIndexOf('/') + 1)
}

/**
 * How similar two directories are, measured by **common prefix**: how far they
 * agree before diverging, over the depth of the shorter one.
 *
 * It is not set overlap of segments, and the difference matters. A set says
 * `packages/web/src` and `packages/api/src` are very similar, because they
 * share two of three segments; but the segment that differs is the one
 * identifying the package, and proposing the other package's file as an
 * unambiguous target is exactly the autofix we do not want to apply. The common
 * prefix separates them: they agree only on `packages` and diverge there.
 *
 * It is not edit distance either: moving a file from `src/lib` to `src/auth`
 * preserves the prefix, and that is the signal, not that the strings look alike
 * letter by letter.
 */
export function parentSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const left = a === '' ? [] : a.split('/')
  const right = b === '' ? [] : b.split('/')
  if (left.length === 0 || right.length === 0) return 0

  let shared = 0
  while (shared < left.length && shared < right.length && left[shared] === right[shared]) {
    shared += 1
  }
  return shared / Math.min(left.length, right.length)
}

const SIMILAR = 0.5

/**
 * Looks for a likely target for a path that does not exist.
 *
 * The search starts from `byBasename`, not over the whole index: the fuzzy
 * comparison only runs among the candidates that already share the file name.
 * Over 100k files that is the difference between a lookup and a scan.
 */
export function suggestPath(
  index: RepoIndex,
  rel: string,
  /** The document making the claim, which is never the answer to it. */
  source: string,
): Suggestion | undefined {
  const candidates = candidatesFor(index, basenameOf(rel)).filter(
    // A document cannot be telling you to read itself under another name.
    //
    // Ticket `22`: `parentSimilarity` divides by the **shorter** directory, so
    // a target sitting above the claim agrees on every segment it has and
    // scores 1.00 — the same as one exactly where the claim said. A claim
    // written relative to a nested source resolves under that source's own
    // directory, which makes the source's own siblings prefixed by it for
    // free, and in a repository holding a single `SKILL.md` a skill referring
    // to another skill was offered itself, fixable, at confidence 1.
    //
    // The guard is deliberately not about the score. Changing the divisor
    // fixes nothing — every real instance still clears `SIMILAR` — and the
    // thing that is wrong here is not the arithmetic.
    (candidate) => candidate !== source,
  )
  if (candidates.length === 0) return undefined

  const wanted = parentOf(rel)
  const scored = candidates
    .map((candidate) => ({ candidate, score: parentSimilarity(wanted, parentOf(candidate)) }))
    .toSorted((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))

  const best = scored[0]
  if (best === undefined) return undefined

  // Several namesakes: we say which is closest, but do not fix it ourselves.
  if (candidates.length > 1) {
    return { value: best.candidate, confidence: 0.3, fixable: false }
  }

  const confidence = best.score >= SIMILAR ? 1 : 0.6
  return {
    value: best.candidate,
    confidence,
    fixable: confidence > FIXABLE_THRESHOLD,
  }
}

/** Two edits is the whole budget: past that the "suggestion" is a new word. */
const MAX_SUGGESTION_DISTANCE = 2

/** Levenshtein, over two keys that are short by construction. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > MAX_SUGGESTION_DISTANCE) return MAX_SUGGESTION_DISTANCE + 1

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      )
    }
    previous = current
  }
  return previous[b.length] ?? MAX_SUGGESTION_DISTANCE + 1
}

/**
 * The one candidate within the edit budget, or `undefined` when there are none
 * or several.
 *
 * "Two candidates is no candidate" is the rule both callers below need: saying
 * "did you mean one of these three" is how a reader learns to skim past the
 * suggestion column, and naming the wrong one of them is worse than saying
 * nothing.
 */
function nearestUnique(candidates: readonly string[], to: string): string | undefined {
  const near = candidates.filter(
    (candidate) => editDistance(to, candidate) <= MAX_SUGGESTION_DISTANCE,
  )
  return near.length === 1 ? near[0] : undefined
}

/**
 * The closest anchor to one that matched nothing.
 *
 * **Never `fixable`, and not by omission.** ADR-0006's hard floor is zero false
 * positives among the fixable findings, and every case where the correction is
 * obvious — wrong case, wrong punctuation — is already accepted by the
 * canonical key and never reported. What is left to report is a real typo, and
 * choosing its target is a guess. `SPEC.md` § 8 lists `link/broken` as
 * autofixable "with a single candidate target"; that is the *file* half, which
 * this check does not claim and `path/missing` does.
 *
 * M3 revisited this with the corpus in hand, as it said it would. The corpus
 * holds no `link/broken` finding at all, so it offers no evidence either way —
 * and the argument above never rested on it: it rests on the shape of the two
 * functions. See CLASSIFICATION.md, round 17.
 */
export function suggestAnchor(anchors: DocumentAnchors, key: string): Suggestion | undefined {
  const only = nearestUnique([...anchors.keys()], key)
  if (only === undefined) return undefined
  // The suggestion carries the readable heading, never the key: an anchor that
  // reads `thefixflag` helps nobody.
  return { value: `#${anchors.get(only) ?? only}`, confidence: 0.6, fixable: false }
}

/**
 * The known key an unknown one is a near-miss of.
 *
 * This is what narrows `skill/frontmatter`'s unknown-key rule from "not on our
 * list" to "a misspelling of something on our list" ([ADR-0011](../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md)):
 * the key set is not ours, Claude Code adds fields between releases, and a list
 * one release behind would report a valid `SKILL.md`. A field added later is
 * not two edits from an older one, so the divergence can only cost a detection.
 */
export function suggestKey(known: readonly string[], key: string): Suggestion | undefined {
  const only = nearestUnique(known, key)
  if (only === undefined) return undefined
  // Never fixable: it is a plausible correction, not the only one, and
  // rewriting somebody's key means deciding what they meant.
  return { value: only, confidence: 0.6, fixable: false }
}

/**
 * The script a mistyped one is a near-miss of, as a whole corrected command.
 *
 * `SPEC.md` § 8 lists this as autofixable, and unlike the two suggestions above
 * it really is unambiguous: one candidate, within two edits, in the manifest the
 * command already resolves to. Nothing has to be guessed about what the author
 * meant, so the confidence is 1 and `fixable` follows from the same threshold
 * `suggestPath` uses.
 *
 * The `value` is the whole command rather than the name, because the command is
 * what the claim's `offset` covers and therefore what `--fix` replaces. The
 * name's position comes from the fact the extractor recorded: finding it again
 * here would be a second parser to keep in step with the first.
 */
export function suggestScript(
  available: readonly string[],
  fact: ScriptFact,
  command: string,
): Suggestion | undefined {
  const only = nearestUnique(available, fact.script)
  if (only === undefined) return undefined
  const { nameOffset, script } = fact
  const confidence = 1
  return {
    value: `${command.slice(0, nameOffset)}${only}${command.slice(nameOffset + script.length)}`,
    confidence,
    fixable: confidence > FIXABLE_THRESHOLD,
  }
}
