/**
 * Turning findings into new file contents.
 *
 * Two pure functions and no I/O: planning is a fold over the findings, and
 * applying is `slice` between the ranges. The writing belongs to the CLI, and
 * keeping it there is what makes every rule below testable without a
 * filesystem.
 *
 * "Preserving formatting" (SPEC.md § 8) is not a feature here, it is the
 * absence of one: the bytes outside the ranges are copied, so line endings, a
 * missing trailing newline and the alignment of a table survive because
 * nothing looks at them.
 */
import type { Finding, Source } from '../core/types.ts'
import { fixEditFor, type FixEdit } from './range.ts'

/** Every edit that lands on one source, in the order they will be applied. */
export type FixPlan = {
  source: Source
  /** Sorted by offset, non-overlapping, each one a real change. */
  edits: readonly FixEdit[]
  /** The findings whose edits are in `edits`, in the same order. */
  findings: readonly Finding[]
}

/** What a plan could not include, and why. Read by the tests and by nothing else. */
export type FixRefusal = {
  finding: Finding
  reason: 'no-edit' | 'overlaps' | 'no-op' | 'out-of-bounds'
}

export type FixPlans = {
  plans: readonly FixPlan[]
  refusals: readonly FixRefusal[]
}

type Candidate = { finding: Finding; edit: FixEdit }

function overlaps(a: FixEdit, b: FixEdit): boolean {
  return a.range[0] < b.range[1] && b.range[0] < a.range[1]
}

/**
 * The edits of one source, minus the ones that cannot be applied safely.
 *
 * **Overlap drops both sides, rather than picking one.** Two edits touching the
 * same bytes means two findings claimed one fragment, which is a bug upstream —
 * and a `--fix` that resolves it quietly both hides the bug and writes on a
 * guess. Dropping both leaves the findings reported and the file untouched,
 * which is the outcome a reader can act on.
 */
function usable(candidates: readonly Candidate[]): {
  kept: Candidate[]
  refusals: FixRefusal[]
} {
  const refusals: FixRefusal[] = []
  const sorted = candidates.toSorted((a, b) => a.edit.range[0] - b.edit.range[0])
  const dropped = new Set<number>()

  for (const [i, candidate] of sorted.entries()) {
    const { range, replacement, source } = candidate.edit
    // A range outside the content can only come from a source that changed
    // under us. Cheap to assert, and the assertion is what keeps a future
    // refactor from writing at the wrong offset.
    if (range[0] < 0 || range[1] > source.content.length || range[0] > range[1]) {
      dropped.add(i)
      refusals.push({ finding: candidate.finding, reason: 'out-of-bounds' })
      continue
    }
    // Not an error, but not a fix either: counting it would inflate the number
    // the user reads to decide whether to look at the diff.
    if (replacement === source.content.slice(range[0], range[1])) {
      dropped.add(i)
      refusals.push({ finding: candidate.finding, reason: 'no-op' })
    }
  }

  for (const [i, a] of sorted.entries()) {
    if (dropped.has(i)) continue
    for (const [j, b] of sorted.entries()) {
      if (i >= j || dropped.has(j)) continue
      if (!overlaps(a.edit, b.edit)) continue
      dropped.add(i)
      dropped.add(j)
      refusals.push(
        { finding: a.finding, reason: 'overlaps' },
        { finding: b.finding, reason: 'overlaps' },
      )
    }
  }

  return { kept: sorted.filter((_, i) => !dropped.has(i)), refusals }
}

/**
 * The findings grouped into one plan per source.
 *
 * Grouping by source is what makes a write one write, and the order is the
 * order the findings arrive in: `run()` already sorts them by file and
 * position, so a plan's edits come out sorted and the diff reads down the file.
 */
export function planFixes(findings: readonly Finding[]): FixPlans {
  const bySource = new Map<string, Candidate[]>()
  const refusals: FixRefusal[] = []

  for (const finding of findings) {
    if (finding.suggestion?.fixable !== true) continue
    const edit = fixEditFor(finding)
    if (edit === undefined) {
      // A fixable suggestion `fix/range.ts` declined to place. It stays a
      // finding the user can act on by hand.
      refusals.push({ finding, reason: 'no-edit' })
      continue
    }
    const key = finding.claim.source.path
    const group = bySource.get(key)
    if (group === undefined) bySource.set(key, [{ finding, edit }])
    else group.push({ finding, edit })
  }

  const plans: FixPlan[] = []
  for (const group of bySource.values()) {
    const { kept, refusals: refused } = usable(group)
    refusals.push(...refused)
    const source = kept[0]?.edit.source
    if (source === undefined) continue
    plans.push({
      source,
      edits: kept.map((candidate) => candidate.edit),
      findings: kept.map((candidate) => candidate.finding),
    })
  }

  return { plans, refusals }
}

/**
 * The content with the edits applied.
 *
 * Built by slicing between the ranges rather than splicing in reverse: the two
 * are equivalent and this one never mutates a string it has already produced,
 * so an edit whose offsets are wrong shows up as wrong output instead of as a
 * later edit landing in the wrong place.
 *
 * The edits must be sorted and non-overlapping, which is what `planFixes`
 * guarantees. Nothing re-checks it here, because a second copy of that rule is
 * a second place for it to be different.
 */
export function applyEdits(content: string, edits: readonly FixEdit[]): string {
  let out = ''
  let cursor = 0
  for (const edit of edits) {
    out += content.slice(cursor, edit.range[0])
    out += edit.replacement
    cursor = edit.range[1]
  }
  return out + content.slice(cursor)
}

/** The content a plan produces. The source's own content is its input. */
export function applyPlan(plan: FixPlan): string {
  return applyEdits(plan.source.content, plan.edits)
}
