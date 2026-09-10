import type { Claim, ClaimKind, Finding, Severity } from '../core/types.ts'
import type { AnchorIndex } from './anchor-index.ts'
import type { TaskIndex } from './manifest.ts'
import type { RepoIndex } from './repo-index.ts'

export type CheckContext = {
  index: RepoIndex
  /** Paths git ignores. See `gitIgnoredPaths`. */
  ignoredByGit: ReadonlySet<string>
  /** The anchors offered by the files some link points into. */
  anchors: AnchorIndex
  /** The tasks each directory offers, per runner. See `buildTaskIndex`. */
  tasks: TaskIndex
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
