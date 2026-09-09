/**
 * Las reglas de descarte del extractor de rutas. Cada regla existe para evitar
 * un falso positivo concreto, y cada una lleva escrito cual.
 *
 * Este modulo es donde se concentra el riesgo del proyecto entero: un falso
 * positivo cuesta mas que diez falsos negativos, asi que ante la duda se
 * descarta.
 */

/** Por que se descarto algo. Se usa en los tests para fijar cada regla. */
export type DiscardReason = 'url'

/**
 * Un texto con protocolo no es una ruta del repo. Evita reportar
 * `https://ejemplo.com/docs/guia.md` como archivo faltante.
 */
function isUrl(text: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(text) || text.startsWith('//')
}

/**
 * Devuelve la razon por la que el texto no puede ser una ruta verificable, o
 * `undefined` si sobrevive a todas las reglas.
 */
export function discardReason(text: string): DiscardReason | undefined {
  if (isUrl(text)) return 'url'
  return undefined
}
