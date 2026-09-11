import { suggestPath } from '../../fix/suggest.ts'
import type { Check, CheckContext } from '../check.ts'
import { belongsToAbsentTool } from '../foreign-tools.ts'
import { passesThroughGenerated } from '../generated.ts'
import { ignoredByGit } from '../ignored.ts'
import { hasDir, hasFile, someEntryEndsWith } from '../repo-index.ts'
import { resolveInRepo } from '../resolve.ts'

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

export const pathMissing: Check = {
  id: 'path/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],

  run(claim, ctx) {
    const { baseDir } = claim.source

    const local = resolveInRepo(baseDir, claim.text)
    // A path that escapes above the root is not ours to verify.
    if (local === undefined || local === '') return null
    if (pointsOutsideRepo(ctx, claim.text, local)) return null

    /**
     * The path as the document writes it, from the root. Two rules need it
     * rather than the baseDir resolution: another tool's configuration root
     * means that root wherever the document sits, and the suffix search below
     * asks whether this sequence of segments appears anywhere.
     */
    const asWritten = resolveInRepo('', claim.text)

    // Another assistant's directory, in a repo that does not use that
    // assistant. See `belongsToAbsentTool`.
    if (asWritten !== undefined && belongsToAbsentTool(ctx.index, asWritten)) return null

    // A generated artifact is not tracked, so from the index it is
    // indistinguishable from a nonexistent path. Let it through. The fixed
    // list is the fallback for when there is no git; `ignoredByGit` is the
    // good signal.
    if (passesThroughGenerated(local) || ignoredByGit(ctx.ignoredByGit, claim, local)) return null

    if (exists(ctx, local)) return null

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
    if (baseDir !== '') {
      const fromRoot = resolveInRepo('', claim.text)
      if (fromRoot !== undefined && fromRoot !== '') {
        if (passesThroughGenerated(fromRoot) || ignoredByGit(ctx.ignoredByGit, claim, fromRoot))
          return null
        if (exists(ctx, fromRoot)) return null
      }
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
     */
    // The suffix searched for is the **claimed text**, normalized, not the path
    // already resolved against the baseDir: the question is whether that
    // sequence of segments appears anywhere in the repo.
    if (asWritten !== undefined && asWritten !== '' && someEntryEndsWith(ctx.index, asWritten)) {
      return null
    }

    const suggestion = suggestPath(ctx.index, local)
    return {
      claim,
      message: 'path does not exist',
      ...(suggestion === undefined ? {} : { suggestion }),
    }
  },
}
