/**
 * Senales, en la linea que rodea a una afirmacion, de que el documento **no**
 * esta afirmando que esa ruta exista.
 *
 * Es lo unico de todo el extractor que mira prosa, y lo hace de una sola forma:
 * buscando marcadores literales. No interpreta el texto. El proyecto rechaza
 * meter un LLM en el camino principal, asi que la alternativa a estas listas no
 * es algo mas inteligente, es reportar el falso positivo.
 *
 * Las dos clases salieron del corpus de repos reales, y las dos son generales:
 * cualquier documentacion suficientemente larga escribe ejemplos y marca cosas
 * como opcionales o pendientes.
 */

/**
 * La ruta es un **ejemplo** de una convencion, no una ruta del repo.
 * Caso real (BerriAI/litellm): "Use subdirectories that match the
 * implementation path, **such as** `auth/test_token_exchange.py` for
 * `auth/token_exchange.py`". Ninguno de los dos archivos existe, y no deberian:
 * la frase describe como nombrar los que se creen.
 */
const EJEMPLO = [
  'such as',
  'for example',
  'for instance',
  'e.g.',
  'eg.',
  'por ejemplo',
  'p. ej.',
  'digamos',
  'supongamos',
  'imagina',
]

/**
 * El documento **se cubre** sobre la existencia de la ruta.
 * Caso real (vercel/next.js): "- `turbopack/crates/README.md` (if exists)".
 * El documento ya dice que puede no estar; reportarlo es contradecir al autor.
 */
const CUBIERTO = [
  'if exists',
  'if it exists',
  'if present',
  'if any',
  'si existe',
  'si está',
  'si esta',
  '(optional)',
  'optional',
  'opcional',
  'not yet',
  'todavía no',
  'todavia no',
  'planned',
  'planeado',
  'coming soon',
  'proximamente',
  'próximamente',
  'deprecated',
  'obsoleto',
]

const MARCADORES = [...EJEMPLO, ...CUBIERTO]

/**
 * La linea que contiene un offset, mas la anterior.
 *
 * La linea sola no alcanza: una oracion envuelta parte el marcador de la ruta.
 * Caso real (BerriAI/litellm), donde el "such as" queda una linea arriba:
 *
 *     Use subdirectories that match the implementation path, such as
 *     `auth/test_token_exchange.py` for `auth/token_exchange.py` and
 *
 * Dos lineas cubren el envoltorio tipico sin tragarse un parrafo entero, que
 * suprimiria de mas.
 */
export function lineAround(content: string, offset: number): string {
  const lineStart = content.lastIndexOf('\n', offset) + 1
  const previousStart = lineStart === 0 ? 0 : content.lastIndexOf('\n', lineStart - 2) + 1
  const end = content.indexOf('\n', offset)
  return content.slice(previousStart, end === -1 ? content.length : end)
}

/**
 * Si la linea que rodea a la afirmacion la marca como ejemplo o la da por
 * incierta. Se mira la linea entera, no solo lo que va antes: un "(if exists)"
 * llega despues de la ruta.
 */
export function proseDisclaims(line: string): boolean {
  const lower = line.toLowerCase()
  return MARCADORES.some((marker) => lower.includes(marker))
}
