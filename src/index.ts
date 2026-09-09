export type {
  Claim,
  ClaimContext,
  ClaimKind,
  CheckSeverity,
  Config,
  Finding,
  Range,
  Severity,
  Source,
  SourceKind,
  Suggestion,
  UserConfig,
  Verdict,
} from './core/types.ts'
export type { UserConfig as DriftwatchConfig } from './core/types.ts'
export { EXIT, type ExitCode } from './core/exit-codes.ts'
export { UserError } from './core/errors.ts'
export type { Format } from './cli/args.ts'

import type { UserConfig } from './core/types.ts'

/**
 * Identidad con tipos. Existe para que un `driftwatch.config.ts` tenga
 * autocompletado y errores en el editor en vez de al correr la herramienta.
 */
export function defineConfig(config: UserConfig): UserConfig {
  return config
}
