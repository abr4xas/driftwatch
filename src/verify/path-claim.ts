import type { Claim } from '../core/types.ts'
import type { CheckContext } from './check.ts'
import { belongsToAbsentTool } from './foreign-tools.ts'
import { passesThroughGenerated } from './generated.ts'
import { ignoredByGit } from './ignored.ts'
import { hasDir, hasFile, someEntryEndsWith } from './repo-index.ts'
import { resolveInRepo } from './resolve.ts'

/**
 * What is known about a path claim once every rule has spoken.
 *
 * `unanswerable` and `satisfied` are kept apart although `path/missing` treats
 * them the same, because they are different statements: the first says the
 * question is not ours, the second says we asked and the answer was yes. A
 * future check, and anyone reading a corpus diff, needs to tell them apart.
 */
export type PathVerdict =
  | { kind: 'unanswerable'; rule: UnanswerableRule }
  | { kind: 'satisfied' }
  | { kind: 'missing'; local: string }

/** Which rule declined the question. One name per false positive class. */
export type UnanswerableRule =
  | 'escapes-root'
  | 'outside-repo'
  | 'absent-tool'
  | 'generated'
  | 'ignored-by-git'
  | 'exists-as-suffix'

/**
 * A leading slash is ambiguous: `/src/index.ts` almost always means "from the
 * repo root", but `/etc/hosts` or `/Users/someone/notes.md` are filesystem
 * paths belonging to whoever wrote the document.
 *
 * It is settled by looking at the first segment: if it exists at the repo root,
 * the path is the repo's and gets verified. Otherwise we assume it points
 * outside and let it through. The cost is a false negative (`/new-dir/x.ts` is
 * not reported); the benefit is never reporting another machine's absolute
 * path.
 */
function pointsOutsideRepo(ctx: CheckContext, text: string, rel: string): boolean {
  if (!text.startsWith('/')) return false
  const first = rel.split('/')[0] ?? ''
  return !(hasDir(ctx.index, first) || hasFile(ctx.index, first))
}

function exists(ctx: CheckContext, rel: string): boolean {
  return hasFile(ctx.index, rel) || hasDir(ctx.index, rel)
}

/**
 * Whether a path claim can be answered at all, and if it can, whether the repo
 * answers yes.
 *
 * This is where the precision of the whole tool lives. The rules used to sit on
 * both sides of a seam drawn by an implementation fact — a rule needing
 * `RepoIndex` ran in the check, a rule not needing it ran in the extractor —
 * which left `path/missing` five sixths suppression and one sixth verdict. The
 * rules that need the index are all here now; the ones that decide a text is
 * not a path at all stay in `extract/`, where no claim is built and nothing is
 * paid for.
 *
 * Each `unanswerable` rule is a false positive class the corpus found. The
 * modules they read — `generated.ts`, `foreign-tools.ts` — keep their own
 * files: they are lists with the argument for each entry written next to it,
 * and folding them in here would trade six readable documents for one nobody
 * opens.
 */
export function verifyPathClaim(claim: Claim, ctx: CheckContext): PathVerdict {
  const { baseDir } = claim.source

  const local = resolveInRepo(baseDir, claim.text)
  // A path that escapes above the root is not ours to verify.
  if (local === undefined || local === '') return { kind: 'unanswerable', rule: 'escapes-root' }
  if (pointsOutsideRepo(ctx, claim.text, local)) {
    return { kind: 'unanswerable', rule: 'outside-repo' }
  }

  /**
   * The path as the document writes it, from the root. Two rules need it
   * rather than the baseDir resolution: another tool's configuration root
   * means that root wherever the document sits, and the suffix search below
   * asks whether this sequence of segments appears anywhere.
   */
  const asWritten = resolveInRepo('', claim.text)

  // Another assistant's directory, in a repo that does not use that
  // assistant. See `belongsToAbsentTool`.
  if (asWritten !== undefined && belongsToAbsentTool(ctx.index, asWritten)) {
    return { kind: 'unanswerable', rule: 'absent-tool' }
  }

  // A generated artifact is not tracked, so from the index it is
  // indistinguishable from a nonexistent path. Let it through. The fixed
  // list is the fallback for when there is no git; `ignoredByGit` is the
  // good signal.
  if (passesThroughGenerated(local)) return { kind: 'unanswerable', rule: 'generated' }
  if (ignoredByGit(ctx.ignoredByGit, claim, local)) {
    return { kind: 'unanswerable', rule: 'ignored-by-git' }
  }

  if (exists(ctx, local)) return { kind: 'satisfied' }

  /**
   * SPEC.md § 2 says a nested source resolves its paths against its own
   * directory, and that is true half of the time. The corpus of real repos
   * shows the other half writes paths from the repo root: a
   * `packages/llm/AGENTS.md` saying `packages/opencode/src/x.ts`, or a
   * `tests/e2e/CLAUDE.md` saying `tests/e2e/`.
   *
   * Both forms coexist in the same document, and there is no syntactic signal
   * separating them. So both are accepted: we only report if the path exists
   * neither against the baseDir nor against the root. It was the single
   * largest precision correction in the whole project.
   */
  if (baseDir !== '' && asWritten !== undefined && asWritten !== '') {
    if (passesThroughGenerated(asWritten)) return { kind: 'unanswerable', rule: 'generated' }
    if (ignoredByGit(ctx.ignoredByGit, claim, asWritten)) {
      return { kind: 'unanswerable', rule: 'ignored-by-git' }
    }
    if (exists(ctx, asWritten)) return { kind: 'satisfied' }
  }

  /**
   * Last net before reporting: whether some path in the repo ends with the
   * claimed path. It covers the most common pattern in real documents, where
   * the prose names a directory ("inside `packages/next`") and the paths that
   * follow are relative to it.
   *
   * The corpus showed it unambiguously: every one of those findings already
   * carried a suggestion whose target ended exactly with the claimed text. If
   * the path is there, with those same segments in that same order, the
   * document is not lying: it is speaking relatively.
   *
   * The suffix searched for is the **claimed text**, normalized, not the path
   * already resolved against the baseDir: the question is whether that
   * sequence of segments appears anywhere in the repo.
   */
  if (asWritten !== undefined && asWritten !== '' && someEntryEndsWith(ctx.index, asWritten)) {
    return { kind: 'unanswerable', rule: 'exists-as-suffix' }
  }

  return { kind: 'missing', local }
}
