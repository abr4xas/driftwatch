/**
 * Public API, and since `1.0.0` a frozen one: every name here is listed in
 * `CONTRACT.md` and cannot leave without a major version.
 *
 * Three of them were added on the way in, by ticket `05` of the contract
 * freeze. They were already reachable — a `RunResult` hands you findings and
 * skipped sources, a `RunOptions` takes a discard sink — and they could not be
 * named, so a consumer could read those shapes and could not write a function
 * that takes one. Exporting the names adds no surface; it makes the surface
 * usable.
 */
export { type CheckSeverity, type Config } from './core/config.ts'
export { EXIT, exitCodeFor, type Counts, type ExitCode } from './core/exit-codes.ts'
export { UserError } from './core/errors.ts'
export type { DiscardSink } from './extract/context.ts'
export { run, type RunOptions, type RunResult } from './run.ts'
export type { Finding, SkippedSource, Source, SourceKind } from './core/types.ts'
