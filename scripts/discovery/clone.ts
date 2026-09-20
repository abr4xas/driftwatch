/**
 * Stage two: get them onto the disk, and refuse before filling it.
 *
 * `sparse-clone.ts` knows how to clone one repository small. This knows how
 * many there are going to be, what that weighs at 2.8 MB each, and when to
 * stop — a disk check wrong by a factor of ten fills a laptop, so the estimate
 * and its headroom are a function with a test rather than a number inline.
 *
 * A clone that lands over 100 MB is dropped and written down. Sparse checkout
 * is a filter, not a promise, and one repository that ignores it is worth more
 * disk than the next four hundred that do not.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { statfs } from 'node:fs/promises'
import { join } from 'node:path'
import { messageOf } from '../../src/core/errors.ts'
import { slugOf } from '../corpus/repos.ts'
import { sparseClone } from './sparse-clone.ts'
import { LIST, readList, REPOS_DIR } from './files.ts'
import { record, recorded } from './journal.ts'

/**
 * Per repo, from `discovery-clone.ts`'s measurement over all 66 corpus repos.
 *
 * The **discovery** population is lighter, measured over the first 30 repos
 * this runner actually acquired: mean 1.74 MB, median ~0.6 MB, and one repo at
 * 11.6 MB. The distribution is skewed, which is why the mean is the figure and
 * not the median — but the certification figure is kept anyway, because it is
 * the larger of the two and taken over more repos. Budgeting from a 30-repo
 * sample of a skewed distribution would be the cheaper number arrived at the
 * worse way.
 */
export const BYTES_PER_REPO = 2.8 * 1024 * 1024

/**
 * Headroom over the measured mean.
 *
 * 2.8 MB is an average, and half the corpus is above it — `next.js` and
 * `langchain` carry thousands of markdown files that are all inside the cone.
 * A run that dies at repo 1900 with a full disk has spent the whole rate-limit
 * budget for a corpus nobody can use, so the refusal is deliberately early.
 */
const HEADROOM = 2

/**
 * How big a clone may be before it is dropped and written down.
 *
 * Measured over 1915 clones: mean 8 MB, thirty above 50, **seven above 200**,
 * and three of those seven are 1.7, 2.4 and 3.7 GB between them. Those three
 * are 7.7 GB — half the corpus's disk — for three repositories out of 2584.
 *
 * It is checked **after** the clone, which looks wrong and is not. Neither
 * cheaper signal predicts it:
 *
 * - **The name.** Ten repositories whose names say mirror, awesome, vault or
 *   archive were cloned: 4099 MB, of which 4063 is two of them. The other
 *   eight are 1 to 20 MB, and the largest repository of all —
 *   `meta-skill-evloving` at 3.7 GB — matches nothing.
 * - **The size GitHub reports.** `openai/codex` is 620 MB to the API and
 *   **3 MB** as a clone, because blobless plus sparse is doing its job. The
 *   API measures history; this measures the cone.
 *
 * What makes a repository big here is that its content *is* thousands of
 * markdown files, all inside the cone. That is only knowable once it is on
 * disk, so the download is paid once and the disk is not paid at all.
 */
const MAX_CLONE_BYTES = 100 * 1024 * 1024

/** What a clone weighs, for the cap above. `du` is the cheap way to ask. */
function weighOf(dir: string): number {
  const out = execFileSync('du', ['-sk', dir], { encoding: 'utf8', timeout: 120_000 })
  return Number(out.split('\t')[0] ?? '0') * 1024
}

/** Bytes in the unit a person would have used. `0.0 GB` is not an answer. */
function inUnits(bytes: number): string {
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(1)} GB`
    : `${Math.round(bytes / 1024 ** 2)} MB`
}

/**
 * Why the run must not start, if it must not.
 *
 * Ticket `09` leaves the threshold as a decision and this is it: refuse when
 * the free space is under twice what the clones are expected to weigh. The
 * alternative — a fixed number of gigabytes — ages badly against a list whose
 * length is an argument.
 */
export function refuseForDisk(freeBytes: number, count: number): string | undefined {
  const needed = count * BYTES_PER_REPO * HEADROOM
  if (freeBytes >= needed) return undefined
  return (
    `${count} repos need about ${inUnits(needed)} of room and there is ${inUnits(freeBytes)}. ` +
    `Clone fewer with --limit, or free some space.`
  )
}

async function freeSpace(path: string): Promise<number> {
  const stats = await statfs(path)
  return Number(stats.bavail) * Number(stats.bsize)
}

/**
 * The default branch's head, asked of the remote rather than of the API.
 *
 * `sparseClone` fetches one commit by sha, which is what the certification
 * corpus needs and what makes a shallow fetch legal on GitHub. Discovery pins
 * nothing, so the sha it wants is simply whatever `HEAD` is now — and
 * `ls-remote` answers that without spending a code-search request, which is the
 * budget that is actually scarce.
 */
function headOf(repo: string): string {
  const out = execFileSync('git', ['ls-remote', `https://github.com/${repo}.git`, 'HEAD'], {
    encoding: 'utf8',
    timeout: 60_000,
  })
  const sha = out.split(/\s/u)[0] ?? ''
  if (!/^[0-9a-f]{40}$/u.test(sha)) throw new Error(`no HEAD for ${repo}`)
  return sha
}

export async function cloneMain(limit: number | undefined): Promise<number> {
  const repos = readList().slice(0, limit)
  if (repos.length === 0) {
    process.stderr.write(`${LIST} is empty; run pnpm discovery enumerate first\n`)
    return 2
  }

  mkdirSync(REPOS_DIR, { recursive: true })
  const done = recorded()
  const missing = repos.filter(
    (repo) => !done.has(repo) && !existsSync(join(REPOS_DIR, slugOf(repo), '.git')),
  )
  const refusal = refuseForDisk(await freeSpace(REPOS_DIR), missing.length)
  if (refusal !== undefined) {
    process.stderr.write(`${refusal}\n`)
    return 2
  }

  // Said out loud before the first fetch, because `clone` with no `--limit`
  // means the whole list and the whole list is hours and gigabytes. The disk
  // refusal above stops the disaster; this stops the surprise.
  process.stderr.write(
    `${missing.length} to clone, about ${inUnits(missing.length * BYTES_PER_REPO)}, ` +
      `${repos.length - missing.length} already handled\n`,
  )

  let cloned = 0
  let failed = 0
  let oversized = 0
  for (const [i, repo] of missing.entries()) {
    const dir = join(REPOS_DIR, slugOf(repo))
    process.stderr.write(`[${i + 1}/${missing.length}] ${repo} ... `)
    try {
      sparseClone(repo, headOf(repo), dir)
      const weight = weighOf(dir)
      if (weight > MAX_CLONE_BYTES) {
        // Dropped and recorded, so a later run neither keeps it nor fetches it
        // again. It is not a failure: the repository is fine and it is simply
        // not worth its disk in a corpus that measures nothing.
        rmSync(dir, { recursive: true, force: true })
        await record({ repo, ok: false, stage: 'clone', error: `too large: ${inUnits(weight)}` })
        oversized += 1
        process.stderr.write(`dropped, ${inUnits(weight)}\n`)
        continue
      }
      cloned += 1
      process.stderr.write('ok\n')
    } catch (cause) {
      // A repository deleted, renamed or made private since the enumeration is
      // ordinary, not exceptional — and it has to be **recorded**, not just
      // printed. `sparseClone` inits before it fetches, so a failed clone
      // leaves a `.git` behind that every later stage would count as a
      // checkout and audit as an empty repository. Removing it and writing the
      // failure down is what stops the next run retrying it forever.
      failed += 1
      rmSync(dir, { recursive: true, force: true })
      await record({ repo, ok: false, stage: 'clone', error: messageOf(cause) })
      process.stderr.write(`FAILED ${messageOf(cause)}\n`)
    }
  }

  process.stderr.write(
    `\n${cloned} cloned, ${failed} failed, ${oversized} dropped for size, ` +
      `${repos.length - missing.length} already handled\n`,
  )
  return failed > 0 && cloned === 0 ? 1 : 0
}
