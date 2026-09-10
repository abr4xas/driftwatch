import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RepoIndex } from '../verify/repo-index.ts'
import { UserError } from './errors.ts'
import type { Source, SourceKind } from './types.ts'

export type DiscoverOptions = {
  /** Positional arguments that narrow the scope. Empty audits the whole repo. */
  paths: readonly string[]
  /**
   * The config's `sources`: literal paths or globs, matched against the repo
   * index. They are added to what discovery found, never replacing it.
   */
  sources?: readonly string[]
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

/** Whether the pattern is a glob and not a literal path. */
const GLOB_CHARS = /[*?[\]{}!]/u

/**
 * Resolves the config's `sources` against the **repo index** instead of
 * walking the filesystem.
 *
 * Two things fall out of that for free: `.gitignore` is respected, because the
 * index already is what git lists, and a pattern cannot reach outside the repo.
 * The alternative, globbing the disk, would duplicate discovery and lose both.
 *
 * A pattern that matches nothing **fails**. Declaring a source and not having
 * it is exactly the drift this tool reports; doing it silently in our own
 * config file would be the tool lying about itself.
 */
async function matchConfiguredSources(
  index: RepoIndex,
  patterns: readonly string[],
): Promise<string[]> {
  const literals: string[] = []
  const globs: string[] = []
  for (const raw of patterns) {
    const pattern = raw.replace(/^\.\//u, '').replace(/\/+$/u, '')
    if (pattern === '') continue
    if (GLOB_CHARS.test(pattern)) globs.push(pattern)
    else literals.push(pattern)
  }

  const matched = new Set<string>()
  for (const literal of literals) {
    if (!index.files.has(literal)) {
      throw new UserError(
        `the config declares a source that does not exist: ${literal}`,
        'remove it from `sources`, or check the path is relative to the repo root',
      )
    }
    matched.add(literal)
  }

  // `ignore` is imported only if a pattern actually needs matching: a config
  // with literal paths must not pay for it. It is the same matcher the no-git
  // fallback uses, and gitignore syntax is what `docs/**/*.md` already means.
  if (globs.length > 0) {
    const { default: ignore } = await import('ignore')
    for (const glob of globs) {
      const matcher = ignore().add(glob)
      let hits = 0
      for (const rel of index.files) {
        if (!matcher.ignores(rel)) continue
        matched.add(rel)
        hits += 1
      }
      if (hits === 0) {
        throw new UserError(
          `the config declares a source pattern that matches nothing: ${glob}`,
          'patterns are matched against the files git lists, from the repo root',
        )
      }
    }
  }
  return [...matched]
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

  if (options.sources !== undefined && options.sources.length > 0) {
    const found = new Set(matched.map((entry) => entry.path))
    for (const rel of await matchConfiguredSources(index, options.sources)) {
      // Discovery wins: a configured entry that is already an AGENTS.md keeps
      // its real kind instead of being reported twice under two names.
      if (found.has(rel)) continue
      // A positional still narrows: `driftwatch src/` must not drag in a
      // configured `docs/` source.
      if (!isInScope(rel, options.paths)) continue
      matched.push({ path: rel, kind: 'configured' })
    }
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
