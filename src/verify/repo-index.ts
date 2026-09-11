import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, parse, sep } from 'node:path'

/**
 * Directories that are never walked, with or without git. They do not depend on
 * `.gitignore` because a repo may have `dist/` committed and we still do not
 * want to index its contents: those are artifacts, not sources.
 */
const NEVER_WALK = ['node_modules', 'dist', 'build', '.next', 'vendor', 'target'] as const

export type Manifest = {
  /** Directory holding the package.json, relative to the root. '' is the root. */
  dir: string
  name: string | undefined
  scripts: Readonly<Record<string, string>>
}

/**
 * The repo, in memory, built once per run.
 *
 * `root` and `listing` are plain values and are read directly. Everything with
 * a shape — the sets and the maps — is asked through the functions below, and
 * that is the whole interface: the struct used to be a second one, with
 * `discover.ts` and `manifest.ts` reaching past the accessors into it.
 */
export type RepoIndex = {
  root: string
  /** Every file path relative to the root, with posix separators. */
  files: ReadonlySet<string>
  dirs: ReadonlySet<string>
  /** 'auth.ts' -> ['src/auth.ts', 'test/auth.ts']. Feeds the suggestions. */
  byBasename: ReadonlyMap<string, readonly string[]>
  /** The same for directories: 'router' -> ['src/lib/router']. */
  dirsByBasename: ReadonlyMap<string, readonly string[]>
  manifests: ReadonlyMap<string, Manifest>
  /** Whether the listing came from git or the glob fallback. Reported in --json. */
  listing: 'git' | 'glob'
}

/** The directory holding `.git`, or the starting point if there is no repo. */
export function findRepoRoot(from: string): string {
  const { root } = parse(from)
  let dir = from
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir
    if (dir === root) return from
    dir = dirname(dir)
  }
}

function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/')
}

function isExcluded(rel: string): boolean {
  const segments = rel.split('/')
  return segments.some((segment) => (NEVER_WALK as readonly string[]).includes(segment))
}

/**
 * `git ls-files` with `--others --exclude-standard` lists what is tracked plus
 * what is untracked and not ignored: exactly the set of files the repo
 * considers its own, already filtered by `.gitignore`, and faster than walking
 * the tree ourselves.
 */
function listWithGit(root: string): string[] | undefined {
  try {
    const stdout = execFileSync(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return stdout.split('\0').filter((entry) => entry.length > 0)
  } catch {
    // No git, not a repo, or the binary failed. The caller falls back to glob.
    return undefined
  }
}

/**
 * The cold path: with no repo we have to walk the tree and apply `.gitignore` by
 * hand. Both dependencies are imported dynamically so the hot path, which in
 * any real repo is git, does not pay for loading them.
 */
async function listWithGlob(root: string): Promise<string[]> {
  const { glob } = await import('tinyglobby')
  const found = await glob(['**/*'], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: NEVER_WALK.map((dir) => `**/${dir}/**`),
  })
  return applyGitignore(root, found)
}

async function applyGitignore(root: string, paths: readonly string[]): Promise<string[]> {
  let raw: string
  try {
    raw = readFileSync(join(root, '.gitignore'), 'utf8')
  } catch {
    // With no .gitignore there is nothing to filter.
    return [...paths]
  }
  const { default: ignore } = await import('ignore')
  const matcher = ignore().add(raw)
  return paths.filter((path) => !matcher.ignores(path))
}

function readManifest(root: string, dir: string): Manifest | undefined {
  let raw: string
  try {
    raw = readFileSync(join(root, dir, 'package.json'), 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // A broken package.json is the project's problem, not ours. It is ignored
    // instead of taking down the whole run over a file we were not asked to
    // audit.
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record: Record<string, unknown> = parsed as Record<string, unknown>
  const scripts = record.scripts
  return {
    dir,
    name: typeof record.name === 'string' ? record.name : undefined,
    scripts:
      typeof scripts === 'object' && scripts !== null
        ? Object.fromEntries(
            Object.entries(scripts as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {},
  }
}

/**
 * Built exactly once per run. From here on every verification is an in-memory
 * lookup: not a single `fs.stat` on the hot path.
 */
export async function buildRepoIndex(root: string): Promise<RepoIndex> {
  const fromGit = listWithGit(root)
  const listing: 'git' | 'glob' = fromGit === undefined ? 'glob' : 'git'
  const raw = fromGit ?? (await listWithGlob(root))

  const files = new Set<string>()
  const dirs = new Set<string>()
  const byBasename = new Map<string, string[]>()
  const dirsByBasename = new Map<string, string[]>()
  const manifests = new Map<string, Manifest>()

  for (const entry of raw) {
    const rel = toPosix(entry)
    if (rel.length === 0 || isExcluded(rel)) continue
    files.add(rel)

    const slash = rel.lastIndexOf('/')
    const basename = slash === -1 ? rel : rel.slice(slash + 1)
    const existing = byBasename.get(basename)
    if (existing === undefined) byBasename.set(basename, [rel])
    else existing.push(rel)

    // Every prefix of the path is a directory that exists.
    let cut = slash
    while (cut > 0) {
      const dir = rel.slice(0, cut)
      if (dirs.has(dir)) break
      dirs.add(dir)
      const dirBase = dir.slice(dir.lastIndexOf('/') + 1)
      const sameName = dirsByBasename.get(dirBase)
      if (sameName === undefined) dirsByBasename.set(dirBase, [dir])
      else sameName.push(dir)
      cut = dir.lastIndexOf('/')
    }

    if (basename === 'package.json') {
      const dir = slash === -1 ? '' : rel.slice(0, slash)
      const manifest = readManifest(root, dir)
      if (manifest !== undefined) manifests.set(dir, manifest)
    }
  }

  return { root, files, dirs, byBasename, dirsByBasename, manifests, listing }
}

export function hasFile(index: RepoIndex, rel: string): boolean {
  return index.files.has(rel)
}

export function hasDir(index: RepoIndex, rel: string): boolean {
  return index.dirs.has(rel)
}

export function candidatesFor(index: RepoIndex, basename: string): readonly string[] {
  return index.byBasename.get(basename) ?? []
}

/**
 * Whether some path in the repo **ends** with `rel`, taking whole segments.
 *
 * It is the answer to the most common pattern in real context files: the prose
 * names a directory ("inside `packages/next`") and the paths that follow are
 * written relative to it (`src/cli/next-dev.ts`). Neither the source's baseDir
 * nor the repo root resolves them, and there is no syntactic signal telling
 * that apart from a broken path.
 *
 * The search starts from the last segment, so it only compares against the
 * namesakes and never scans the index.
 */
export function someEntryEndsWith(index: RepoIndex, rel: string): boolean {
  const basename = rel.slice(rel.lastIndexOf('/') + 1)
  const suffix = `/${rel}`
  const matches = (candidate: string): boolean => candidate.endsWith(suffix)
  return (
    (index.byBasename.get(basename) ?? []).some(matches) ||
    (index.dirsByBasename.get(basename) ?? []).some(matches)
  )
}

/** Every file, for the callers that classify or match the whole listing. */
export function allFiles(index: RepoIndex): Iterable<string> {
  return index.files
}

/** Every manifest the tree walk parsed, by the directory holding it. */
export function allManifests(index: RepoIndex): Iterable<[string, Manifest]> {
  return index.manifests
}
