import { lstatSync, realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { allFiles, hasFile, type RepoIndex } from '../verify/repo-index.ts'
import { codeOf, UserError } from './errors.ts'
import type { SkipReason, SkippedSource, Source, SourceKind } from './types.ts'

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
 * The roots an agent installs skills into, of the ones this tool reads.
 *
 * **There is no single one, and `.claude/skills/` is not the busiest.**
 * `npx skills add` writes to `.agents/skills/` by default — the "universal"
 * target, which covers Amp, Cline, Codex, Cursor, GitHub Copilot, Gemini CLI,
 * Kilo, Kimi, OpenCode, Warp, Zed and more — and offers fifty-odd others behind
 * a picker, including `.aider-desk/skills`, `.augment/skills`, `.bob/skills`,
 * `data/skills` and a bare `skills` for OpenClaw. Every agent picks its own.
 *
 * The corpus agrees, and by a wide margin: 83 `SKILL.md` files live under
 * `.agents/skills/` against 32 under `.claude/skills/`.
 *
 * These are **not** a list pasted from the installer, and the ones missing are
 * not an oversight: each root added is more sources audited in every repo that
 * has one, which moves corpus snapshots and has to be priced against the diff
 * (ADR-0007). Widening happens one root at a time, with the measurement in
 * hand.
 *
 * What that measurement should count is **repositories, not files**: the root
 * with the most `SKILL.md` files of the ones not read here has all of them in
 * one project, and a file count cannot tell a convention from a project. The
 * roots that are missing and why is `CLASSIFICATION.md`'s round twenty-two;
 * repeating it here would be two records of one decision.
 *
 * The general answer is not a longer list. It is a repository saying where its
 * skills are, which is still undecided. This is the stopgap for the roots
 * common enough to be worth hard-coding meanwhile.
 */
export const SKILL_ROOTS: readonly string[] = [
  '.claude',
  '.agents',
  '.cursor',
  '.codex',
  '.opencode',
]

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

  if (
    base === 'SKILL.md' &&
    SKILL_ROOTS.some((root) => indexOfPair(segments, root, 'skills') !== -1)
  ) {
    return 'skill'
  }

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
    if (!hasFile(index, literal)) {
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
      for (const rel of allFiles(index)) {
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

/**
 * Collapses sources that are **the same file on disk**, reached through a
 * symlink.
 *
 * Real case (emdash-cms/emdash): `.claude/CLAUDE.md` is a symlink to
 * `../AGENTS.md`, git mode `120000`. `readFile` follows it, so one stale claim
 * was reported twice.
 *
 * This is not what `collapseDuplicates` does and it cannot be folded into it.
 * That one merges byte-identical **copies within a directory**, and keys on
 * the directory on purpose: `harehare/mq` ships the same 4112 bytes as
 * `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md`, and the one
 * under `.github/` is a separate document that resolves its relative paths
 * from a different place. A symlink has no such defence — there is one file,
 * one `baseDir` that actually applies, and reporting it twice is noise.
 *
 * The real file wins over the link, rather than alphabetical order. In emdash
 * `.claude/CLAUDE.md` sorts first, and naming the symlink as the source while
 * the file it points at becomes the alias would be exactly backwards.
 *
 * Which one is the link is decided with `lstat` on the entry, **not** by
 * comparing its path against its own realpath. Those differ whenever an
 * ancestor directory is itself a symlink — `/tmp` on macOS is the case that
 * caught it — and the comparison would then call every file a link.
 *
 * It only acts **across directories**. A symlink next to its target is
 * already handled by `collapseDuplicates`, which merges them by content and
 * prefers `AGENTS.md` alphabetically. Four corpus repos link `AGENTS.md` to a
 * `CLAUDE.md` beside it, and an earlier version of this function changed which
 * of the two was reported for no gain: same directory, same `baseDir`, nothing
 * to correct. The cross-directory case is the one that matters, because there
 * the two paths disagree about where relative paths resolve from.
 */
function dirOf(rel: string): string {
  const slash = rel.lastIndexOf('/')
  return slash === -1 ? '' : rel.slice(0, slash)
}

function isSymlink(absPath: string): boolean {
  try {
    return lstatSync(absPath).isSymbolicLink()
  } catch {
    return false
  }
}

function collapseSymlinks(
  entries: ReadonlyArray<{ path: string; kind: SourceKind; absPath: string }>,
): Array<{ path: string; kind: SourceKind; absPath: string; aliases: string[] }> {
  const byRealPath = new Map<
    string,
    { path: string; kind: SourceKind; absPath: string; aliases: string[] }
  >()
  const out: Array<{ path: string; kind: SourceKind; absPath: string; aliases: string[] }> = []

  for (const entry of entries) {
    let real: string
    try {
      real = realpathSync(entry.absPath)
    } catch {
      // A broken link, or a race with something deleting it. Left alone:
      // whatever happens next is what would have happened before this rule.
      out.push({ ...entry, aliases: [] })
      continue
    }

    const first = byRealPath.get(real)
    if (first === undefined) {
      const copy = { ...entry, aliases: [] as string[] }
      byRealPath.set(real, copy)
      out.push(copy)
      continue
    }

    // Same directory: leave it to `collapseDuplicates` and its documented
    // preference for `AGENTS.md`.
    if (dirOf(first.path) === dirOf(entry.path)) {
      out.push({ ...entry, aliases: [] })
      continue
    }

    // The link found first, the real file found second: swap them, so the
    // source is the file and the alias is the link.
    if (isSymlink(first.absPath) && !isSymlink(entry.absPath)) {
      first.aliases.push(first.path)
      Object.assign(first, { path: entry.path, kind: entry.kind, absPath: entry.absPath })
      continue
    }
    first.aliases.push(entry.path)
  }

  return out
}

/** What discovery found: the documents it read, and the ones it could not. */
export type Discovered = {
  sources: Source[]
  skipped: SkippedSource[]
}

/** A document found in the index, before anything has been read off disk. */
type Candidate = {
  path: string
  kind: SourceKind
  absPath: string
  aliases: string[]
}

type ReadResult = { ok: true; source: Source } | { ok: false; skipped: SkippedSource }

/**
 * Which of `SkipReason`'s two the path is, asked of the filesystem.
 *
 * `lstat` does not follow the link, so it succeeds exactly when the entry is
 * there and its target is not. That is the only part of the cause this can
 * observe, and the rest stays unnamed rather than guessed.
 */
function whyAbsent(absPath: string): SkipReason {
  try {
    lstatSync(absPath)
    return 'dangling-symlink'
  } catch {
    return 'absent-from-worktree'
  }
}

/**
 * Reads one document, or reports that the working tree does not have it.
 *
 * `SkipReason` carries the policy and the reasoning. The case that produced it:
 * `Rspoon3/Shotbot`'s `CLAUDE.md` is a symlink into a git submodule that was
 * never initialised, so both entries are in the index and neither file is on
 * disk. Before ticket `13` this threw, and the run answered with "internal
 * failure … this is a driftwatch bug; report it" — sending the reader to the
 * one place the answer was not, and auditing none of the repository's other
 * documents.
 */
async function readSource(entry: Candidate): Promise<ReadResult> {
  let content: string
  try {
    content = await readFile(entry.absPath, 'utf8')
  } catch (cause) {
    if (codeOf(cause) !== 'ENOENT') throw cause
    return { ok: false, skipped: { path: entry.path, reason: whyAbsent(entry.absPath) } }
  }
  const slash = entry.path.lastIndexOf('/')
  return {
    ok: true,
    source: {
      path: entry.path,
      absPath: entry.absPath,
      kind: entry.kind,
      content,
      baseDir: slash === -1 ? '' : entry.path.slice(0, slash),
      aliases: entry.aliases,
    },
  }
}

export async function discoverSources(
  index: RepoIndex,
  options: DiscoverOptions,
): Promise<Discovered> {
  const matched: Array<{ path: string; kind: SourceKind }> = []
  for (const rel of allFiles(index)) {
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

  const unique = collapseSymlinks(
    matched.map((entry) => ({ ...entry, absPath: join(index.root, entry.path) })),
  )

  const sources: Source[] = []
  const skipped: SkippedSource[] = []
  for (const entry of await Promise.all(unique.map(readSource))) {
    if (entry.ok) sources.push(entry.source)
    else skipped.push(entry.skipped)
  }

  return { sources: collapseDuplicates(sources), skipped }
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
      // The aliases already collected by `collapseSymlinks` are carried, not
      // reset: a source can be both a symlink target and have a copy.
      const copy = { ...source, aliases: [...source.aliases] }
      byContent.set(key, copy)
      out.push(copy)
      continue
    }
    first.aliases.push(source.path)
  }

  return out
}
