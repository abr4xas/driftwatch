import { suggestPath } from '../../fix/suggest.ts'
import type { Check, CheckContext } from '../check.ts'
import { hasDir, hasFile } from '../repo-index.ts'
import { resolveInRepo } from '../resolve.ts'

/**
 * Una barra inicial es ambigua: `/src/index.ts` casi siempre significa "desde
 * la raiz del repo", pero `/etc/hosts` o `/Users/alguien/notas.md` son rutas
 * del filesystem de quien escribio el documento.
 *
 * Se resuelve mirando el primer segmento: si existe en la raiz del repo, la
 * ruta es del repo y se verifica. Si no, se asume que apunta afuera y se deja
 * pasar. El costo es un falso negativo (`/directorio-nuevo/x.ts` no se reporta);
 * el beneficio es no reportar jamas la ruta absoluta de otra maquina.
 */
function pointsOutsideRepo(ctx: CheckContext, text: string, rel: string): boolean {
  if (!text.startsWith('/')) return false
  const first = rel.split('/')[0] ?? ''
  return !(hasDir(ctx.index, first) || hasFile(ctx.index, first))
}

export const pathMissing: Check = {
  id: 'path/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],

  run(claim, ctx) {
    const rel = resolveInRepo(claim.source.baseDir, claim.text)
    // Una ruta que se escapa por arriba de la raiz no es nuestra para verificar.
    if (rel === undefined || rel === '') return null
    if (pointsOutsideRepo(ctx, claim.text, rel)) return null

    if (hasFile(ctx.index, rel) || hasDir(ctx.index, rel)) return null

    const suggestion = suggestPath(ctx.index, rel)
    return {
      check: pathMissing.id,
      severity: pathMissing.defaultSeverity,
      claim,
      message: 'ruta no existe',
      ...(suggestion === undefined ? {} : { suggestion }),
    }
  },
}
