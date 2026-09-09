import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RepoIndex } from '../verify/repo-index.ts'
import type { Source, SourceKind } from './types.ts'

export type DiscoverOptions = {
  /** Argumentos posicionales que limitan el alcance. Vacio audita todo el repo. */
  paths: readonly string[]
}

/** Los segmentos de una ruta relativa, ya en posix. */
function segmentsOf(rel: string): string[] {
  return rel.split('/')
}

function basenameOf(rel: string): string {
  const slash = rel.lastIndexOf('/')
  return slash === -1 ? rel : rel.slice(slash + 1)
}

/**
 * Busca la posicion de un par de segmentos consecutivos, como `.claude/skills`.
 * Se acepta a cualquier profundidad para que un monorepo con un `.claude/` por
 * paquete funcione igual que un repo plano.
 */
function indexOfPair(segments: readonly string[], first: string, second: string): number {
  for (let i = 0; i + 1 < segments.length; i += 1) {
    if (segments[i] === first && segments[i + 1] === second) return i
  }
  return -1
}

/**
 * Que tipo de fuente es una ruta, o `undefined` si no es una fuente.
 * El orden de las reglas importa: las anclas mas especificas van primero.
 */
export function classifySource(rel: string): SourceKind | undefined {
  const base = basenameOf(rel)
  const segments = segmentsOf(rel)

  if (base === '.cursorrules') return 'cursor-rule'
  if (base === 'copilot-instructions.md' && segments.at(-2) === '.github') return 'copilot'

  if (indexOfPair(segments, '.cursor', 'rules') !== -1 && base.endsWith('.mdc')) {
    return 'cursor-rule'
  }

  const skills = indexOfPair(segments, '.claude', 'skills')
  if (skills !== -1 && base === 'SKILL.md') return 'skill'

  const agents = indexOfPair(segments, '.claude', 'agents')
  // `.claude/agents/*.md` es plano: un .md mas abajo no es un subagente.
  if (agents !== -1 && base.endsWith('.md') && segments.length === agents + 3) return 'subagent'

  const commands = indexOfPair(segments, '.claude', 'commands')
  if (commands !== -1 && base.endsWith('.md')) return 'command'

  if (base === 'CLAUDE.md' || base === 'CLAUDE.local.md') return 'claude-md'
  if (base === 'AGENTS.md') return 'agents-md'

  return undefined
}

/**
 * Un posicional limita el alcance a un archivo exacto o a todo lo que este bajo
 * un directorio. Se compara por segmento y no por prefijo de texto, para que
 * `pack` no arrastre `packages/`.
 */
function isInScope(rel: string, paths: readonly string[]): boolean {
  if (paths.length === 0) return true
  return paths.some((raw) => {
    const scope = raw.replace(/\/+$/u, '').replace(/^\.\//u, '')
    if (scope === '' || scope === '.') return true
    return rel === scope || rel.startsWith(`${scope}/`)
  })
}

export async function discoverSources(
  index: RepoIndex,
  options: DiscoverOptions,
): Promise<Source[]> {
  const matched: Array<{ path: string; kind: SourceKind }> = []
  for (const rel of index.files) {
    if (!isInScope(rel, options.paths)) continue
    const kind = classifySource(rel)
    if (kind !== undefined) matched.push({ path: rel, kind })
  }

  // Orden estable por ruta: la salida de la herramienta tiene que ser la misma
  // corrida tras corrida para que un snapshot del corpus signifique algo.
  matched.sort((a, b) => a.path.localeCompare(b.path))

  const read = await Promise.all(
    matched.map(async ({ path, kind }) => {
      const absPath = join(index.root, path)
      const slash = path.lastIndexOf('/')
      return {
        path,
        absPath,
        kind,
        content: await readFile(absPath, 'utf8'),
        baseDir: slash === -1 ? '' : path.slice(0, slash),
        aliases: [] as string[],
      }
    }),
  )

  return collapseDuplicates(read)
}

/**
 * Junta las fuentes que son copias byte a byte dentro del mismo directorio.
 *
 * `AGENTS.md` y `CLAUDE.md` identicos son la norma, no la excepcion: sobre el
 * corpus de repos reales, 4 de 13 findings eran el mismo problema contado dos
 * veces. Se audita una y las demas quedan como alias, que el reporter nombra.
 *
 * Gana la primera en orden alfabetico, que deja `AGENTS.md` antes que
 * `CLAUDE.md`.
 */
function collapseDuplicates(sources: readonly Source[]): Source[] {
  const byContent = new Map<string, Source & { aliases: string[] }>()
  const out: Array<Source & { aliases: string[] }> = []

  for (const source of sources) {
    const key = `${source.baseDir}\u0000${source.content}`
    const first = byContent.get(key)
    if (first === undefined) {
      const copy = { ...source, aliases: [] as string[] }
      byContent.set(key, copy)
      out.push(copy)
      continue
    }
    first.aliases.push(source.path)
  }

  return out
}
