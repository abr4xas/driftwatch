import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** How many paths are passed per invocation, to stay clear of the argv limit. */
const BATCH = 400

/**
 * Which of these paths git would ignore.
 *
 * This is the general answer to a whole class of false positive: if git ignores
 * a path, the index cannot know whether it exists, so claiming it is missing is
 * making things up. It covers `dist/` and `node_modules/`, but also each
 * project's own names: `wrangler-dist/` in workers-sdk, `scripts/pr-status/` in
 * next.js, `.agents/skills/` in prisma. No hand-written list gets there; the
 * repo's `.gitignore` does, nested ones included.
 *
 * Only the paths some check is going to look up are asked about, which is a few
 * dozen per run.
 */
/**
 * What one `check-ignore` invocation produced, and whether git answered at all.
 *
 * The distinction is the whole point. `check-ignore` exits **1** when nothing
 * matched, which is an answer; it exits **128** when it refuses a pathspec,
 * which is not. Both arrive as a thrown error with an empty stdout, and
 * conflating them is how a whole batch of suppressions disappears.
 */
type BatchResult = { stdout: string; answered: boolean }

async function askGit(root: string, batch: readonly string[]): Promise<BatchResult> {
  try {
    // `-n` so the path does not need to exist, which is exactly the case here.
    const result = await run('git', ['-C', root, 'check-ignore', '-n', '-v', '--', ...batch], {
      maxBuffer: 16 * 1024 * 1024,
      encoding: 'utf8',
    })
    return { stdout: result.stdout, answered: true }
  } catch (cause) {
    const error = cause as { stdout?: string; code?: unknown }
    const stdout = typeof error.stdout === 'string' ? error.stdout : ''
    // Exit 1 is "none of these is ignored" and is a complete answer, whether or
    // not it printed anything. Anything else — no git, a refused pathspec — is
    // a failure, and a failure with no output tells us nothing about this batch.
    const answered = error.code === 1 || stdout.length > 0
    return { stdout, answered }
  }
}

function collect(stdout: string, into: Set<string>): void {
  for (const line of stdout.split('\n')) {
    // -v format: `<source>:<line>:<pattern>\t<path>`. With no pattern, `::`.
    const tab = line.lastIndexOf('\t')
    if (tab === -1) continue
    if (line.slice(0, tab) === '::') continue
    into.add(line.slice(tab + 1))
  }
}

/**
 * Asks about a batch, and on a refusal splits it until the refused paths are
 * alone.
 *
 * `git check-ignore` aborts the **entire invocation** when one pathspec crosses
 * a symlink — `fatal: pathspec 'x' is beyond a symbolic link`, exit 128, no
 * output — so a single such path used to cost the suppression of up to 400
 * others. `emdash-cms/emdash` reported 18 findings for paths its own
 * `.gitignore` covers, because `.agents/skills` there is a symlink and its
 * directory probe poisoned the batch.
 *
 * Halving rather than dropping to one: the refused paths are usually few, so
 * this costs O(log n) extra invocations in the bad case and none in the good
 * one. A single path that git still refuses is the only thing lost, and losing
 * it means treating it as not-ignored, which is the direction that reports
 * rather than the direction that hides.
 */
async function askSplitting(
  root: string,
  batch: readonly string[],
  into: Set<string>,
): Promise<void> {
  const { stdout, answered } = await askGit(root, batch)
  if (answered) {
    collect(stdout, into)
    return
  }
  if (batch.length === 1) return
  const half = Math.ceil(batch.length / 2)
  await askSplitting(root, batch.slice(0, half), into)
  await askSplitting(root, batch.slice(half), into)
}

export async function gitIgnoredPaths(
  root: string,
  paths: readonly string[],
): Promise<ReadonlySet<string>> {
  const ignored = new Set<string>()
  if (paths.length === 0) return ignored

  for (let i = 0; i < paths.length; i += BATCH) {
    await askSplitting(root, paths.slice(i, i + BATCH), ignored)
  }

  return ignored
}

/**
 * `owner/repo` of the `origin` remote, or `undefined` if there is none.
 *
 * It serves one purpose: knowing when a document is talking about **another**
 * repository. An `AGENTS.md` saying "these skills live in
 * [prisma/ignite](https://github.com/prisma/ignite) (`skills/.pilot/`)" does
 * not claim that `skills/.pilot/` exists here.
 */
export async function originSlug(root: string): Promise<string | undefined> {
  try {
    const { stdout } = await run('git', ['-C', root, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    })
    const match = /[/:]([^/:]+\/[^/]+?)(?:\.git)?\s*$/u.exec(stdout.trim())
    return match?.[1]?.toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * Which of these paths have uncommitted changes.
 *
 * `SPEC.md` § 8 warns before `--fix` writes to one, and the parenthesis in that
 * sentence — "this is not a git tool" — is the important half: it does not
 * stage, commit, refuse or offer to stash. The one real safety net after a bad
 * `--fix` is `git checkout -- .`, and it is only there if the file was clean.
 * Saying so before the fall is the whole value; blocking on it would get a
 * `--force` bolted on within a week.
 *
 * A repo with no git, or no `git` on `PATH`, answers "none". A warning that git
 * failed is noise about a tool the user may not be using — discovery already
 * falls back to a glob walk for that case.
 */
export async function gitDirtyPaths(
  root: string,
  paths: readonly string[],
): Promise<ReadonlySet<string>> {
  const dirty = new Set<string>()
  if (paths.length === 0) return dirty

  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH)
    try {
      const { stdout } = await run('git', ['-C', root, 'status', '--porcelain', '--', ...batch], {
        maxBuffer: 16 * 1024 * 1024,
        encoding: 'utf8',
      })
      for (const line of stdout.split('\n')) {
        // `XY <path>`, and `XY <old> -> <new>` for a rename. The path we asked
        // about is the last field either way.
        const path = line.slice(3).trim()
        if (path.length === 0) continue
        const arrow = path.lastIndexOf(' -> ')
        dirty.add(arrow === -1 ? path : path.slice(arrow + 4))
      }
    } catch {
      // No git, no repository, or a path outside it. Nothing to warn about.
      continue
    }
  }

  return dirty
}
