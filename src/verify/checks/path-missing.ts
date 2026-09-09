import { suggestPath } from '../../fix/suggest.ts'
import type { Check, CheckContext } from '../check.ts'
import { passesThroughGenerated } from '../generated.ts'
import { hasDir, hasFile, someEntryEndsWith } from '../repo-index.ts'
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

function exists(ctx: CheckContext, rel: string): boolean {
  return hasFile(ctx.index, rel) || hasDir(ctx.index, rel)
}

/**
 * Si git ignora la ruta, o ignoraria lo que haya dentro de ella. Lo segundo es
 * lo que detecta un directorio de salida generada, porque un `.gitignore` suele
 * escribir `salida/*` y no `salida/`.
 */
function ignoredByGit(ctx: CheckContext, rel: string): boolean {
  return ctx.ignoredByGit.has(rel) || ctx.ignoredByGit.has(`${rel}/__driftwatch_probe__`)
}

export const pathMissing: Check = {
  id: 'path/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],

  run(claim, ctx) {
    const { baseDir } = claim.source

    const local = resolveInRepo(baseDir, claim.text)
    // Una ruta que se escapa por arriba de la raiz no es nuestra para verificar.
    if (local === undefined || local === '') return null
    if (pointsOutsideRepo(ctx, claim.text, local)) return null

    // Un artefacto generado no esta trackeado, asi que desde el indice es
    // indistinguible de una ruta inexistente. Se deja pasar. La lista fija es
    // el respaldo para cuando no hay git; `ignoredByGit` es la senal buena.
    if (passesThroughGenerated(local) || ignoredByGit(ctx, local)) return null

    if (exists(ctx, local)) return null

    /**
     * SPEC.md § 2 dice que una fuente anidada resuelve sus rutas contra su
     * propio directorio, y es cierto la mitad de las veces. El corpus de repos
     * reales muestra que la otra mitad escribe rutas desde la raiz del repo:
     * un `packages/llm/AGENTS.md` que dice `packages/opencode/src/x.ts`, o un
     * `tests/e2e/CLAUDE.md` que dice `tests/e2e/`.
     *
     * Las dos formas conviven en el mismo documento, y no hay senal sintactica
     * que las separe. Asi que se aceptan las dos: se reporta solo si la ruta no
     * existe ni contra el baseDir ni contra la raiz. Fue la correccion de
     * precision mas grande de todo el proyecto.
     */
    if (baseDir !== '') {
      const fromRoot = resolveInRepo('', claim.text)
      if (fromRoot !== undefined && fromRoot !== '') {
        if (passesThroughGenerated(fromRoot) || ignoredByGit(ctx, fromRoot)) return null
        if (exists(ctx, fromRoot)) return null
      }
    }

    /**
     * Ultima red antes de reportar: que alguna ruta del repo termine con la
     * ruta afirmada. Cubre el patron mas comun de los documentos reales, donde
     * la prosa nombra un directorio ("dentro de `packages/next`") y las rutas
     * que siguen son relativas a el.
     *
     * El corpus lo mostro sin ambiguedad: cada uno de esos findings ya traia
     * una sugerencia cuyo destino terminaba exactamente con el texto afirmado.
     * Si la ruta esta ahi, con esos mismos segmentos y en ese mismo orden, el
     * documento no esta mintiendo: esta hablando en relativo.
     */
    // El sufijo que se busca es el **texto afirmado**, normalizado, no la ruta
    // ya resuelta contra el baseDir: lo que se pregunta es si esa secuencia de
    // segmentos aparece en algun lugar del repo.
    const asWritten = resolveInRepo('', claim.text)
    if (asWritten !== undefined && asWritten !== '' && someEntryEndsWith(ctx.index, asWritten)) {
      return null
    }

    const suggestion = suggestPath(ctx.index, local)
    return {
      check: pathMissing.id,
      severity: pathMissing.defaultSeverity,
      claim,
      message: 'ruta no existe',
      ...(suggestion === undefined ? {} : { suggestion }),
    }
  },
}
