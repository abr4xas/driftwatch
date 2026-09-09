import type { Claim, ClaimKind, Finding, Severity } from '../core/types.ts'
import type { RepoIndex } from './repo-index.ts'

export type CheckContext = {
  index: RepoIndex
}

/**
 * La forma de un check (ARCHITECTURE.md § Extensibilidad). Un check nuevo es un
 * archivo nuevo mas una entrada en el registro: no toca nada del pipeline.
 */
export type Check = {
  /** Id estable, usado en config, en `--only/--skip` y en los ignores. */
  id: string
  tier: 1 | 2
  defaultSeverity: Severity
  claimKinds: readonly ClaimKind[]
  run(claim: Claim, ctx: CheckContext): Finding | null
}
