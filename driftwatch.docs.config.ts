import { defineConfig } from './src/index.ts'

/**
 * The second invocation, for `link/broken` only.
 *
 * `sources` and the check filter are both global, so auditing the
 * specification needs its own config rather than a bigger one. ADR-0008
 * established that `path/missing` cannot run over `docs/spec/`: a
 * specification quotes paths from other repositories and from hypothetical
 * ones, and reporting them is nothing but noise.
 *
 * **Anchors are the opposite case.** An anchor is a claim about the document it
 * points at, and these documents cross-reference each other constantly, so
 * this is exactly where a stale section title shows up first.
 *
 *   driftwatch --config driftwatch.docs.ts --only link/broken
 *
 * As of the commit that added it this run is **vacuous**: the repo's documents
 * cross-reference each other with `§` in prose and not one of them writes a
 * `](...#...)` link, so there is nothing for the check to resolve. It is kept
 * because it costs twenty lines and it fires on the first anchor link somebody
 * writes, which is the moment the drift becomes possible.
 */
export default defineConfig({
  sources: ['docs/**/*.md', 'README.md', 'AGENTS.md', 'test/corpus/*.md'],
  checks: {
    'path/missing': 'off',
  },
})
