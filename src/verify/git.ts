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
export async function gitIgnoredPaths(
  root: string,
  paths: readonly string[],
): Promise<ReadonlySet<string>> {
  const ignored = new Set<string>()
  if (paths.length === 0) return ignored

  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH)
    let stdout: string
    try {
      // `-n` so the path does not need to exist, which is exactly the case
      // here. `check-ignore` exits 1 when nothing matches, so the catch covers
      // both "none ignored" and "no git available".
      const result = await run('git', ['-C', root, 'check-ignore', '-n', '-v', '--', ...batch], {
        maxBuffer: 16 * 1024 * 1024,
        encoding: 'utf8',
      })
      stdout = result.stdout
    } catch (cause) {
      // Exit 1 with empty stdout means "none ignored", not a failure.
      const partial = (cause as { stdout?: string }).stdout
      if (typeof partial !== 'string' || partial.length === 0) continue
      stdout = partial
    }

    for (const line of stdout.split('\n')) {
      // -v format: `<source>:<line>:<pattern>\t<path>`. With no pattern, `::`.
      const tab = line.lastIndexOf('\t')
      if (tab === -1) continue
      if (line.slice(0, tab) === '::') continue
      ignored.add(line.slice(tab + 1))
    }
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
