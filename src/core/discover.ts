import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RepoIndex } from '../verify/repo-index.ts'
import type { Source, SourceKind } from './types.ts'

export type DiscoverOptions = {
  /** Positional arguments that narrow the scope. Empty audits the whole repo. */
  paths: readonly string[]
}

/** The segments of a relative path, already in posix form. */
function segmentsOf(rel: string): string[] {
  return rel.split('/')
}

function basenameOf(rel: string): string {
  const slash = rel.lastIndexOf('/')
  return slash === -1 ? rel : rel.slice(slash + 1)
}

/**
 * Finds the position of a pair of consecutive segments, such as
 * `.claude/skills`. It is accepted at any depth so that a monorepo with one
 * `.claude/` per package works the same as a flat repo.
 */
function indexOfPair(segments: readonly string[], first: string, second: string): number {
  for (let i = 0; i + 1 < segments.length; i += 1) {
    if (segments[i] === first && segments[i + 1] === second) return i
  }
  return -1
}

/**
 * What kind of source a path is, or `undefined` if it is not a source.
 * Rule order matters: the most specific anchors come first.
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
  // `.claude/agents/*.md` is flat: a .md one level deeper is not a subagent.
  if (agents !== -1 && base.endsWith('.md') && segments.length === agents + 3) return 'subagent'

  const commands = indexOfPair(segments, '.claude', 'commands')
  if (commands !== -1 && base.endsWith('.md')) return 'command'

  if (base === 'CLAUDE.md' || base === 'CLAUDE.local.md') return 'claude-md'
  if (base === 'AGENTS.md') return 'agents-md'

  return undefined
}

/**
 * A positional narrows the scope to an exact file or to everything under a
 * directory. It is compared segment-wise and not by text prefix, so that `pack`
 * does not drag `packages/` along.
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

  // Stable order by path: the tool's output has to be the same run after run
  // for a corpus snapshot to mean anything.
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
 * Collapses the sources that are byte-for-byte copies within the same
 * directory.
 *
 * Identical `AGENTS.md` and `CLAUDE.md` files are the norm, not the exception:
 * across the corpus of real repos, 4 of 13 findings were the same problem
 * counted twice. One is audited and the rest stay as aliases, which the
 * reporter names.
 *
 * The first one in alphabetical order wins, which puts `AGENTS.md` before
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
