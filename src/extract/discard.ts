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
  | 'url'
  | 'tiene-espacios'
  | 'glob-o-placeholder'
  | 'palabra-suelta'
  | 'no-es-un-archivo'
  | 'directorio-suelto'
  | 'metasintactico'
  | 'sin-forma-de-ruta'

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

/**
 * Nombres que en escritura tecnica son huecos, no cosas.
 * Evita: `foo/index.ts` en sst/opencode, donde el documento dice "if the module
 * is `foo/index.ts`" para explicar una convencion de reexport. `foo` no es un
 * directorio del repo, es la letra x de un enunciado.
 */
const METASINTACTICOS = new Set(['foo', 'bar', 'baz', 'qux', 'quux', 'fulano', 'ejemplo'])

/**
 * La otra convencion de placeholder: una letra repetida en mayusculas, que se
 * lee como "poné el numero acá".
 * Evita: `../NNNN/results.md` en colinhacks/zod, donde `NNNN` es el numero de
 * issue. Tambien `XXXX`, `YYYY`, `NN`, `ID`.
 */
const PLACEHOLDER_MAYUSCULAS = /^(N{2,}|X{2,}|Y{2,}|Z{2,}|ID|NNN?N?)$/u

/**
 * Nombres de relleno con prefijo posesivo, que le piden al lector que ponga el
 * suyo.
 * Evita: `perf/memory/src/profile/your_profile.rs` en tursodatabase/turso, que
 * el documento pide crear.
 */
const PLACEHOLDER_POSESIVO = /^(your|my|tu|mi|su|myapp|mycompany)[-_]/iu

/**
 * Placeholders en CamelCase con relleno, la otra forma de "poné el tuyo acá".
 *
 * Caso real (browser-use/browser-use): "any tests specific to an event live in
 * its `tests/ci/test_action_EventNameHere.py` file". `EventNameHere` es un
 * hueco, no un archivo.
 *
 * Las tres formas se eligieron angostas a proposito:
 *
 * - `...Here` con `H` mayuscula precedida de minuscula. Exige la mayuscula para
 *   no tocar palabras reales que terminan en "here" (`sphere`, `elsewhere`).
 * - `Your...` o `My...` seguidos de otra mayuscula: `YourClassName`.
 * - `XXX` o `Xxx`, que es la convencion clasica de hueco.
 */
const PLACEHOLDER_CAMEL = [
  /[a-z]Here(?![a-z])/u,
  /(?:^|[^A-Za-z])(?:Your|My)[A-Z]/u,
  /(?:XXX|Xxx)(?![a-z])/u,
]

function tieneSegmentoMetasintactico(text: string): boolean {
  return text
    .split('/')
    .some(
      (segment) =>
        METASINTACTICOS.has(segment.toLowerCase()) ||
        PLACEHOLDER_MAYUSCULAS.test(segment) ||
        PLACEHOLDER_POSESIVO.test(segment) ||
        PLACEHOLDER_CAMEL.some((pattern) => pattern.test(segment)),
    )
}

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
 * Regla 6. Un fragmento con espacios dentro de codigo inline es, casi siempre,
 * un comando entero y no una ruta.
 * Evita: `node scripts/sync.mjs`, `pnpm test test/e2e/app/x.test.ts`,
 * `prisma/ignite docs/drive/`, que un extractor ingenuo lee como una sola ruta
 * porque terminan con una extension conocida.
 *
 * El costo es no verificar una ruta que de verdad tiene un espacio en el
 * nombre. Por eso la regla **no** aplica a los destinos de link, donde el texto
 * es una URL por construccion y no puede ser un comando.
 */
function tieneEspacios(text: string): boolean {
  return /\s/u.test(text.trim())
}

/**
 * Regla 7. Un directorio de un solo segmento no fija una ubicacion.
 * Evita: `feat/` y `fix/` (prefijos de rama), `embeddings/` y `security/`
 * (categorias de test), `ppr/` (un modo), `partners/` (un paquete que vive mas
 * profundo). Es la extension natural de ADR-0003 a los directorios; ver
 * ADR-0004.
 */
function esDirectorioSuelto(text: string): boolean {
  if (!text.endsWith('/')) return false
  return !text.slice(0, -1).includes('/')
}

export type DiscardOptions = {
  /** Si el texto puede ser un comando. Falso para destinos de link. */
  couldBeCommand: boolean
}

/**
 * Las reglas de descarte sobre el texto crudo. La normalizacion viene despues,
 * para que un recorte no pueda convertir en ruta algo que ya se habia
 * descartado.
 */
export function discardReason(
  text: string,
  options: DiscardOptions = { couldBeCommand: true },
): DiscardReason | undefined {
  if (text.length === 0) return 'sin-forma-de-ruta'
  if (isUrl(text)) return 'url'
  if (options.couldBeCommand && tieneEspacios(text)) return 'tiene-espacios'
  if (GLOB_O_PLACEHOLDER.test(text)) return 'glob-o-placeholder'
  if (isPalabraSuelta(text)) return 'palabra-suelta'
  if (noEsUnArchivo(text)) return 'no-es-un-archivo'
  if (esDirectorioSuelto(text)) return 'directorio-suelto'
  if (tieneSegmentoMetasintactico(text)) return 'metasintactico'
  return undefined
}
