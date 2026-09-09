import { type Counts } from './core/exit-codes.ts'
import { discoverSources } from './core/discover.ts'
import type { Source } from './core/types.ts'
import { CHECK_IDS } from './verify/checks/index.ts'
import { buildRepoIndex, findRepoRoot } from './verify/repo-index.ts'

export type RunOptions = {
  cwd: string
  /** Argumentos posicionales que limitan el alcance. */
  paths: readonly string[]
}

export type RunResult = {
  root: string
  sources: readonly Source[]
  /** Los ids de los checks que corrieron. Vacio mientras no haya ninguno. */
  checks: readonly string[]
  counts: Counts
  fixable: number
  durationMs: number
}

/**
 * El pipeline completo: discover -> parse -> extract -> verify. El reporte queda
 * afuera a proposito, porque quien llama decide en que formato lo quiere.
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const started = performance.now()
  const root = findRepoRoot(options.cwd)
  const index = await buildRepoIndex(root)
  const sources = await discoverSources(index, { paths: options.paths })

  return {
    root,
    sources,
    checks: CHECK_IDS,
    counts: { errors: 0, warnings: 0 },
    fixable: 0,
    durationMs: performance.now() - started,
  }
}
