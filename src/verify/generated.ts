/**
 * Directories whose contents are generated and not versioned.
 *
 * A path going through one of these is indistinguishable, from the index, from
 * a path that does not exist: the artifacts are not tracked, so they never
 * enter it. And they are among the most mentioned things in a context file
 * ("the bundle ends up in `dist/cli.js`", "do not edit `node_modules/`"), so
 * reporting them is guaranteed noise in almost any real repo.
 *
 * SPEC.md § 7 allows declaring more with `knownPaths`; this list is the default
 * that makes the tool usable with no configuration at all.
 */
const GENERATED = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'target',
  'coverage',
  'vendor',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.astro',
  '.turbo',
  '.wrangler',
  '.cache',
  '.parcel-cache',
  '.venv',
  'venv',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.gradle',
  '.terraform',
  '.react-router',
  // React Router's typegen writes `+types/` beside every route module, and a
  // context file names it because that is where a route's types come from —
  // "imports from `./+types/...`". Nothing tracks it: not in
  // `remix-run/react-router` itself, nor in any of the three repositories that
  // mention it across the discovery corpus. Ticket `21`.
  '+types',
])

/** Whether any of the path's segments is a generated directory. */
export function passesThroughGenerated(rel: string): boolean {
  return rel.split('/').some((segment) => GENERATED.has(segment))
}
