/**
 * Public API. The remaining types get exported from here as the tickets that
 * need them introduce them.
 */
export { defineConfig, type CheckSeverity, type Config } from './core/config.ts'
export { EXIT, exitCodeFor, type Counts, type ExitCode } from './core/exit-codes.ts'
export { UserError } from './core/errors.ts'
export { run, type RunOptions, type RunResult } from './run.ts'
export type { Source, SourceKind } from './core/types.ts'
