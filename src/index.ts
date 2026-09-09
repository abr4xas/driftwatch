/**
 * Public API. Today it exposes the exit codes, the user error and the pipeline.
 * `defineConfig` and the missing types will be exported from here as the
 * tickets that need them introduce them.
 */
export { EXIT, exitCodeFor, type Counts, type ExitCode } from './core/exit-codes.ts'
export { UserError } from './core/errors.ts'
export { run, type RunOptions, type RunResult } from './run.ts'
export type { Source, SourceKind } from './core/types.ts'
