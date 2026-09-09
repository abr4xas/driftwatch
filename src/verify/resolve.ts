/**
 * Resuelve el texto de una claim a una ruta relativa a la raiz del repo.
 *
 * Devuelve `undefined` cuando la ruta se escapa de la raiz: eso no es un
 * archivo faltante del repo, es una afirmacion sobre el sistema de archivos de
 * quien escribio el documento, y no nos toca verificarla.
 */
export function resolveInRepo(baseDir: string, text: string): string | undefined {
  // Una barra inicial se lee como "desde la raiz del repo", no del filesystem.
  const fromRoot = text.startsWith('/')
  const joined = fromRoot ? text.slice(1) : baseDir === '' ? text : `${baseDir}/${text}`

  const out: string[] = []
  for (const segment of joined.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (out.length === 0) return undefined
      out.pop()
      continue
    }
    out.push(segment)
  }
  return out.join('/')
}
