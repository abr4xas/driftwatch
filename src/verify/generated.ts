/**
 * Directorios cuyo contenido se genera y no se versiona.
 *
 * Una ruta que pasa por uno de estos es indistinguible, desde el indice, de una
 * ruta que no existe: los artefactos no estan trackeados, asi que nunca entran.
 * Y son de lo mas mencionado en un archivo de contexto ("el bundle queda en
 * `dist/cli.js`", "no edites `node_modules/`"), asi que reportarlos es ruido
 * garantizado en casi cualquier repo real.
 *
 * SPEC.md § 7 permite declarar mas con `knownPaths`; esta lista es el default
 * que hace que la herramienta sea usable sin configurar nada.
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
])

/** Si alguno de los segmentos de la ruta es un directorio generado. */
export function passesThroughGenerated(rel: string): boolean {
  return rel.split('/').some((segment) => GENERATED.has(segment))
}
