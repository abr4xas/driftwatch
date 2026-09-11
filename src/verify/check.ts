import type { Claim, ClaimKind, Severity, Suggestion } from '../core/types.ts'
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
 * What a check reports. It does not carry its own id or its severity: the
 * pipeline knows which check ran, and the severity is the config's to set
 * (SPEC.md § 7). A check that stamped its own would have to be edited to honour
 * an override, which is why `defaultSeverity` was a default in name only.
 */
export type CheckReport = {
  claim: Claim
  message: string
  suggestion?: Suggestion
}

/**
 * The shape of a check (ARCHITECTURE.md § Extensibility). A new check is a new
 * file plus an entry in the registry: it touches nothing in the pipeline.
 */
export type Check = {
  /** Stable id, used in config, in `--only/--skip` and in the ignores. */
  id: string
  tier: 1 | 2
  /** What it reports at when the config says nothing. See `severityOf`. */
  defaultSeverity: Severity
  claimKinds: readonly ClaimKind[]
  run(claim: Claim, ctx: CheckContext): CheckReport | null
}
