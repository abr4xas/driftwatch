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
  /**
   * Containers of skill directories the repository declared, on top of the
   * built-in ones. A check needs them for the same reason discovery does: a
   * `SKILL.md` sitting directly in one has no directory of its own to be
   * compared against. See `skillRoots`.
   */
  skillRoots: readonly string[]
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
  /**
   * One line naming what the check verifies, and a paragraph saying what a
   * finding means and when it is wrong.
   *
   * They live on the check and not in a table inside a reporter because SARIF's
   * `rules[]` is what makes a Code Scanning alert readable a month later, and a
   * lookup table in `report/sarif.ts` is a second place to forget when a check
   * changes.
   */
  title: string
  description: string
  tier: 1 | 2
  /** What it reports at when the config says nothing. See `severityOf`. */
  defaultSeverity: Severity
  claimKinds: readonly ClaimKind[]
  run(claim: Claim, ctx: CheckContext): CheckReport | null
}
