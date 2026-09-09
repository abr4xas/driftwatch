import type { Suggestion } from '../core/types.ts'
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
export function suggestPath(index: RepoIndex, rel: string): Suggestion | undefined {
  const candidates = candidatesFor(index, basenameOf(rel))
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
