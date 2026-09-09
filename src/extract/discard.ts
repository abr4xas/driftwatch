/**
 * Las reglas de descarte del extractor de rutas, en el orden de
 * ARCHITECTURE.md § "Extracción de rutas".
 *
 * Este modulo es donde se concentra el riesgo del proyecto entero: un falso
 * positivo cuesta mas que diez falsos negativos, asi que ante la duda se
 * descarta. Cada regla lleva escrito el falso positivo concreto que evita, y
 * cada una tiene su caso en el fixture `false-positive-traps`.
 */

/** Por que se descarto un texto. Los tests fijan cada regla por su razon. */
export type DiscardReason =
  'url' | 'glob-o-placeholder' | 'palabra-suelta' | 'no-es-un-archivo' | 'sin-forma-de-ruta'

/**
 * Regla 1. Un texto con protocolo apunta afuera del repo.
 * Evita: `https://ejemplo.com/docs/guia.md` reportado como archivo faltante.
 */
function isUrl(text: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(text) || text.startsWith('//')
}

/**
 * Regla 2. Un glob o un placeholder no nombra un archivo, nombra una familia o
 * un hueco que quien lee tiene que rellenar.
 * Evita: `src/**\/*.test.ts`, `.scratch/<feature>/issues/`, `{{ruta}}/x.ts`,
 * `$HOME/.config/app.json`, `packages/[nombre]/src`.
 */
const GLOB_O_PLACEHOLDER = /[*?{}<>$[\]]/u

/**
 * Regla 3. Una palabra sola no es una afirmacion sobre una ruta del repo, ni
 * siquiera con extension conocida (ADR-0003).
 * Evita: `index.ts`, `tsconfig.json`, `pnpm`, `build` reportados contra la raiz.
 */
function isPalabraSuelta(text: string): boolean {
  return !text.includes('/')
}

/**
 * Regla 4. Cosas con punto que parecen archivo y no lo son.
 * Evita: `node.js`, `next.js`, `vue.js` (nombres de tecnologia), `1.0`, `v2.1`
 * (versiones), y `d.ts` suelto (una extension, no un archivo).
 */
const NO_SON_ARCHIVOS = new Set([
  'node.js',
  'nodejs',
  'next.js',
  'nuxt.js',
  'vue.js',
  'nest.js',
  'three.js',
  'd.ts',
  'package.json#scripts',
])

const VERSION = /^v?\d+(\.\d+)+$/u

function noEsUnArchivo(text: string): boolean {
  const last = text.slice(text.lastIndexOf('/') + 1).toLowerCase()
  return NO_SON_ARCHIVOS.has(last) || VERSION.test(last) || NO_SON_ARCHIVOS.has(text.toLowerCase())
}

/**
 * Regla 5. Normaliza lo que sobrevivio a las reglas anteriores.
 *
 * Cada recorte tiene su motivo: `./` inicial es ruido de escritura; un sufijo
 * `:12` o `:12:3` es una referencia a una linea, no parte del nombre; los
 * backticks residuales aparecen cuando alguien anida comillas; y la puntuacion
 * final es de la oracion, no de la ruta.
 */
export function normalizePathText(text: string): string {
  let out = text.trim()
  out = out.replaceAll('`', '')
  out = out.replace(/^\.\//u, '')
  out = out.replace(/:\d+(:\d+)?$/u, '')
  out = out.replace(/[.,;:)\]]+$/u, '')
  return out
}

/**
 * Las reglas 1 a 4, sobre el texto crudo. La normalizacion viene despues, para
 * que un recorte no pueda convertir en ruta algo que ya se habia descartado.
 */
export function discardReason(text: string): DiscardReason | undefined {
  if (text.length === 0) return 'sin-forma-de-ruta'
  if (isUrl(text)) return 'url'
  if (GLOB_O_PLACEHOLDER.test(text)) return 'glob-o-placeholder'
  if (isPalabraSuelta(text)) return 'palabra-suelta'
  if (noEsUnArchivo(text)) return 'no-es-un-archivo'
  return undefined
}
