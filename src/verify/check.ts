import type { Claim, ClaimKind, Finding, Severity } from '../core/types.ts'
import type { RepoIndex } from './repo-index.ts'

export type CheckContext = {
  index: RepoIndex
  /** Paths git ignores. See `gitIgnoredPaths`. */
  ignoredByGit: ReadonlySet<string>
}

/**
 * The shape of a check (ARCHITECTURE.md § Extensibility). A new check is a new
 * file plus an entry in the registry: it touches nothing in the pipeline.
 */
export type Check = {
  /** Stable id, used in config, in `--only/--skip` and in the ignores. */
  id: string
  tier: 1 | 2
  defaultSeverity: Severity
  claimKinds: readonly ClaimKind[]
  run(claim: Claim, ctx: CheckContext): Finding | null
}
