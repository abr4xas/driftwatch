/**
 * API publica. Hoy expone los exit codes, el error de usuario y el pipeline.
 * `defineConfig` y los tipos que faltan se van a exportar desde aca a medida
 * que los tickets que los necesitan los introduzcan.
 */
export { EXIT, exitCodeFor, type Counts, type ExitCode } from './core/exit-codes.ts'
export { UserError } from './core/errors.ts'
export { run, type RunOptions, type RunResult } from './run.ts'
export type { Source, SourceKind } from './core/types.ts'
