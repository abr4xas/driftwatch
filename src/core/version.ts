import { readFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'

/**
 * La versión se lee del package.json en tiempo de ejecución en vez de inyectarse
 * en build para que `--version` no dependa del bundler y siga siendo correcta
 * cuando se corre desde `src/` en desarrollo. La búsqueda hacia arriba está
 * acotada por la raíz del filesystem.
 *
 * Si no encuentra nada, lanza. Devolver un placeholder como '0.0.0' haría que un
 * fallo de lectura fuera indistinguible de una versión real.
 */
export function readVersion(from: string = import.meta.dirname): string {
  const { root } = parse(from)
  let dir = from
  while (true) {
    const found = versionIn(dir)
    if (found !== undefined) return found
    if (dir === root) {
      throw new Error(`no se encontró un package.json con version subiendo desde ${from}`)
    }
    dir = dirname(dir)
  }
}

function versionIn(dir: string): string | undefined {
  let raw: string
  try {
    raw = readFileSync(join(dir, 'package.json'), 'utf8')
  } catch {
    // Este directorio no tiene package.json; el llamador sigue subiendo.
    return undefined
  }
  const parsed: unknown = JSON.parse(raw)
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    typeof parsed.version === 'string'
  ) {
    return parsed.version
  }
  return undefined
}
