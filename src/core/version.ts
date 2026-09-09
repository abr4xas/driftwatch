import { readFileSync } from 'node:fs'
import { dirname, join, parse } from 'node:path'

/**
 * La version se lee del package.json en tiempo de ejecucion en vez de inyectarse
 * en build para que `--version` no dependa del bundler y siga siendo correcta
 * cuando se corre desde `src/` en desarrollo. Es un unico readFileSync, con la
 * busqueda hacia arriba acotada por la raiz del filesystem.
 */
export function readVersion(from: string = import.meta.dirname): string {
  const { root } = parse(from)
  let dir = from
  while (true) {
    try {
      const raw = readFileSync(join(dir, 'package.json'), 'utf8')
      const parsed: unknown = JSON.parse(raw)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        typeof parsed.version === 'string'
      ) {
        return parsed.version
      }
    } catch {
      // Este directorio no tiene package.json legible; seguimos subiendo.
    }
    if (dir === root) return '0.0.0'
    dir = dirname(dir)
  }
}
