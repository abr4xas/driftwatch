import type { Suggestion } from '../core/types.ts'
import { candidatesFor, type RepoIndex } from '../verify/repo-index.ts'

/**
 * SPEC.md § 8: `--fix` solo aplica cuando la correccion es inequivoca, y eso
 * significa un unico candidato con confianza por encima de 0.8.
 */
const FIXABLE_THRESHOLD = 0.8

function parentOf(rel: string): string {
  const slash = rel.lastIndexOf('/')
  return slash === -1 ? '' : rel.slice(0, slash)
}

function basenameOf(rel: string): string {
  return rel.slice(rel.lastIndexOf('/') + 1)
}

/**
 * Cuanto se parecen dos directorios, medido por segmentos compartidos sobre el
 * mas corto de los dos. No es distancia de edicion a proposito: mover un
 * archivo de `src/lib` a `src/auth` conserva un segmento, y eso es la senal que
 * interesa, no que las cadenas se parezcan letra a letra.
 */
export function parentSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const left = a === '' ? [] : a.split('/')
  const right = b === '' ? [] : b.split('/')
  if (left.length === 0 || right.length === 0) return 0

  const shared = new Set(right)
  const overlap = left.filter((segment) => shared.has(segment)).length
  return overlap / Math.min(left.length, right.length)
}

const SIMILAR = 0.5

/**
 * Busca un destino probable para una ruta que no existe.
 *
 * La busqueda arranca en `byBasename`, no sobre el indice completo: la
 * comparacion difusa se corre solo entre los candidatos que ya comparten el
 * nombre de archivo. Sobre 100k archivos eso es la diferencia entre una
 * consulta y un recorrido.
 */
export function suggestPath(index: RepoIndex, rel: string): Suggestion | undefined {
  const candidates = candidatesFor(index, basenameOf(rel))
  if (candidates.length === 0) return undefined

  const wanted = parentOf(rel)
  const scored = candidates
    .map((candidate) => ({ candidate, score: parentSimilarity(wanted, parentOf(candidate)) }))
    .toSorted((a, b) => b.score - a.score || a.candidate.localeCompare(b.candidate))

  const best = scored[0]
  if (best === undefined) return undefined

  // Varios homonimos: se dice cual es el mas parecido, pero no se corrige solo.
  if (candidates.length > 1) {
    return { value: best.candidate, confidence: 0.3, fixable: false }
  }

  const confidence = best.score >= SIMILAR ? 1 : 0.6
  return {
    value: best.candidate,
    confidence,
    fixable: confidence > FIXABLE_THRESHOLD,
  }
}
