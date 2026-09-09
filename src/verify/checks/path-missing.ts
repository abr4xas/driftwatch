import { suggestPath } from '../../fix/suggest.ts'
import type { Check } from '../check.ts'
import { hasDir, hasFile } from '../repo-index.ts'
import { resolveInRepo } from '../resolve.ts'

export const pathMissing: Check = {
  id: 'path/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],

  run(claim, ctx) {
    const rel = resolveInRepo(claim.source.baseDir, claim.text)
    // Una ruta que apunta fuera del repo no es nuestra para verificar.
    if (rel === undefined || rel === '') return null

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
