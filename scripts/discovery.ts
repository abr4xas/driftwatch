/**
 * The acquisition runner: the half that was missing between tickets `02` and
 * `06`.
 *
 * `02` established that repositories can be enumerated — one code search facet
 * yields ~780 unique repos per minute of rate limit, so two thousand is a
 * matter of minutes. `06` built the clone that fits them on a laptop, 2.8 MB
 * per repo against 52.7. Nobody wrote the part in between, and until it exists
 * the discovery corpus is two solved problems with nothing joining them.
 *
 * Three stages, each resumable on its own, because they fail for unrelated
 * reasons: enumeration runs out of rate limit, cloning runs out of network or
 * disk, and a run dies on one repository at a time.
 *
 *   pnpm discovery enumerate [--target N]   fill scripts/discovery-repos.txt
 *   pnpm discovery clone     [--limit N]    sparse-clone what the list names
 *   pnpm discovery run       [--limit N]    audit each clone, record the result
 *   pnpm discovery status                   what exists so far
 *
 * **Nothing here is a measurement.** Ticket `09` § "What it must not do" and
 * the [spec](../.scratch/corpus-adjudication-at-scale/spec.md) § "The hard
 * limit" say it in one rule: no number computed over the discovery corpus is a
 * precision, none of it enters `CLASSIFICATION.md`, and none of it moves a
 * condition of ADR-0006. What comes out is material to read — classes of
 * finding and classes of discard — and the rule that a person then writes is
 * measured the way every rule in this project is measured, against the 66 repos
 * that carry human verdicts.
 *
 * It does not touch `corpus.ts` either. The certification corpus keeps its full
 * shallow clones and its pinned shas, and is governed by ADR-0007.
 *
 * **Exercised end to end 2026-09-19**, and what that produced is written down
 * in ticket `09` rather than here. The rule above is a rule about where numbers
 * may live, and a count of findings over the discovery corpus pinned into
 * permanent source is the first step towards being quoted as one — a file that
 * states the rule and then breaks it four lines later teaches the wrong half.
 * What belongs here is what the **runner** costs, because that is a fact about
 * this code:
 *
 * - Enumeration: 2486 repositories from 26 pages of code search, a few minutes
 *   of rate limit, and the facets overlap by almost nothing. Every page of 100
 *   hits contributed 77 to 100 repositories the list did not have. `02`'s
 *   784-unique-per-1000 figure was one facet exhausted over ten pages, where a
 *   repository repeats *within* a facet; across facets the `size:` bands are as
 *   disjoint at the repository level as at the file level.
 * - Cloning, over the first 135: mean 1.74 MB per repository, median ~0.6 MB,
 *   one at 11.6 MB. None failed to clone. One failed to audit, and it turned
 *   out to be a defect in driftwatch rather than in the runner — ticket `13`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { appendFile, statfs } from 'node:fs/promises'
import { join } from 'node:path'
import { messageOf } from '../src/core/errors.ts'
import type { RunOptions, RunResult } from '../src/run.ts'
import { CORPUS, slugOf } from './corpus-repos.ts'
import { sparseClone } from './discovery-clone.ts'

const HERE = import.meta.dirname
/**
 * The list is committed; everything it leads to is not.
 *
 * Ticket `09` leaves this open and argues both sides: a disposable corpus may
 * have a disposable list, but a rule mined from a run nobody can reproduce is a
 * rule with no provenance. Committing the list and **not** pinning the shas
 * settles it in the only way that is consistent with what each artifact is
 * for. The list is provenance — it says which repositories a class was seen in,
 * and it is what a reader checks a claim about the discovery corpus against.
 * The shas are reproducibility of a *snapshot*, and there are no snapshots
 * here: nothing is compared against a stored result, so a moving upstream
 * costs nothing. Pinning 2000 shas would also make the file 2000 lines that
 * change for reasons that mean nothing.
 */
const LIST = join(HERE, 'discovery-repos.txt')
const ROOT = join(HERE, '..', 'test', 'discovery')
const REPOS_DIR = join(ROOT, 'repos')
/**
 * Which (facet, page) pairs have been spent. Disposable, like the clones.
 *
 * A key is `${query}#${page}`, and the page is read back off the **last** `#`
 * because a query contains none but could one day; `queriesOf` is the only
 * reader and `test/discovery.test.ts` pins the round trip.
 */
const CURSOR = join(ROOT, 'enumerated.json')
const RESULTS = join(ROOT, 'results.jsonl')

// --- Enumeration ------------------------------------------------------------

export type Facet = { readonly filename: string; readonly size: string }

/**
 * The filenames, and why these three.
 *
 * `CLAUDE.md` and `AGENTS.md` are the roots `discover.ts` finds by exact
 * basename, so a repo holding one is a repo driftwatch has something to say
 * about. `SKILL.md` is here for a different reason: ticket `08` widened
 * `classifySource` to three install roots, and the population that decides
 * whether that was enough is the one where skills actually live. A facet over
 * `SKILL.md` is the only way to see the layouts nobody in the certification
 * corpus happens to use.
 *
 * `.cursorrules` and `*.mdc` are deliberately absent. Code search indexes by
 * filename, and both of those are either extensionless or an extension rather
 * than a name, which the API's `filename:` does not facet usefully. They come
 * along anyway in repos found by the three above.
 */
const FILENAMES = ['CLAUDE.md', 'AGENTS.md', 'SKILL.md'] as const

/**
 * The size bands, from `02`'s measurement.
 *
 * Ranges are disjoint by construction — the API cannot return the same file in
 * two of them — and each is far above the 1000-result cap, which is what makes
 * facetting add up instead of re-delivering one head. They also stratify on
 * something the corpus cares about: a longer document claims more, so the
 * bands are not merely a way of getting past the cap.
 */
const SIZES = ['<1000', '1000..3000', '3000..10000', '>10000'] as const

export const FACETS: readonly Facet[] = FILENAMES.flatMap((filename) =>
  SIZES.map((size) => ({ filename, size })),
)

/**
 * A facet as GitHub's code search wants it.
 *
 * `filename:`, never `path:`. `path:` is the **website's** syntax; the REST API
 * implements the older one and answers the wrong query with a plausible number
 * and a 200 — `path:CLAUDE.md` returns 99 where `filename:CLAUDE.md` returns
 * 833,536. Four orders of magnitude, no error. Ticket `02` § "The plan's query
 * syntax does not work".
 */
export function facetQuery(facet: Facet): string {
  return `filename:${facet.filename} size:${facet.size}`
}

/** The repositories a search page names, each once, in the order they appear. */
export function reposIn(payload: unknown): string[] {
  if (typeof payload !== 'object' || payload === null || !('items' in payload)) {
    // Not a defensive nicety: the enumeration loop retires a facet when its
    // page comes back empty, so a 403 body read as zero hits would silently
    // retire a facet that still had nine pages to give.
    throw new Error(`not a search page: ${JSON.stringify(payload).slice(0, 200)}`)
  }
  const { items } = payload as { items: unknown }
  if (!Array.isArray(items)) throw new Error('not a search page: items is not an array')

  const seen = new Set<string>()
  const repos: string[] = []
  for (const item of items) {
    const name: unknown = (item as { repository?: { full_name?: unknown } }).repository?.full_name
    if (typeof name !== 'string' || seen.has(name)) continue
    seen.add(name)
    repos.push(name)
  }
  return repos
}

/** The certification corpus, which no discovery run may collect. */
const CERTIFIED = new Set(CORPUS.map((entry) => entry.repo))

/**
 * The list, plus whatever is new in `found`, minus the certification corpus.
 *
 * The subtraction is the load-bearing line. `1amageek/SwiftAgent` came back in
 * the first thousand results of the first facet `02` ran, and a discovery
 * corpus quietly holding a validation repo is exactly the contamination the
 * two-corpus split exists to prevent. Nothing downstream records where a repo
 * came from, so it would never be noticed afterwards.
 *
 * Discovery order is kept rather than sorted, and it is worth being exact
 * about what that buys, because an earlier version of this comment was not.
 * The enumeration walks the facets page by page rather than facet by facet, so
 * the list cycles through all twelve every ~1200 entries — which means a
 * prefix is balanced across filename and size band **only once it is longer
 * than one page**. Below that it is one facet: the first thirty repositories
 * cloned came entirely from `filename:CLAUDE.md size:<1000`. A sorted list
 * would be worse at every length, because alphabetical order is a sample of
 * nothing, but `--limit 30` is a sample of one facet and should be read as one.
 */
export function mergeRepos(known: readonly string[], found: readonly string[]): string[] {
  const seen = new Set(known)
  const merged = [...known]
  for (const repo of found) {
    if (seen.has(repo) || CERTIFIED.has(repo)) continue
    seen.add(repo)
    merged.push(repo)
  }
  return merged
}

const LIST_HEADER = [
  '# The discovery corpus: repositories, no shas, disposable by design.',
  '#',
  '# Written by `pnpm discovery enumerate`. Nothing measured over these',
  '# repositories is a precision and none of it enters CLASSIFICATION.md;',
  '# see scripts/discovery.ts and the spec\'s "The hard limit".',
  '#',
  '# The queries that produced it, against GitHub code search:',
]

/**
 * The list as the committed file, headed by the queries that **were spent**.
 *
 * The queries are passed in rather than taken from `FACETS`, because the two
 * are not the same thing and the difference is the provenance. `FACETS` is the
 * query space, twelve of them; a run that stopped at its target spent one or
 * two, and a header claiming all twelve would attribute a repository to a
 * search that never ran.
 */
export function formatList(repos: readonly string[], spent: Iterable<string>): string {
  const queries = [...new Set(spent)].toSorted().map((query) => `#   ${query}`)
  return `${[...LIST_HEADER, ...queries, '', ...repos].join('\n')}\n`
}

export function parseList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

function readList(): string[] {
  return existsSync(LIST) ? parseList(readFileSync(LIST, 'utf8')) : []
}

/**
 * A numeric header, or `undefined` if it is absent or is not a number.
 *
 * `Number(headers.get(x) ?? '')` is 0 for an absent header, which is finite and
 * reads as "no budget left" — so a response carrying no rate-limit headers at
 * all would be treated as an exhausted one. Absent and zero are different
 * answers and this keeps them apart.
 */
function numberHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name)
  if (raw === null || raw.trim() === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

/**
 * How long to wait before the next request, from what the response said.
 *
 * `retry-after` wins over the arithmetic, and that ordering is the point.
 * Secondary rate limits are not the primary one: GitHub answers them with
 * `retry-after` while `x-ratelimit-remaining` still looks healthy, so a client
 * that only reads its own budget retries immediately and earns a longer ban.
 */
export function pauseFor(headers: Headers, now: number): number {
  const retryAfter = numberHeader(headers, 'retry-after')
  if (retryAfter !== undefined && retryAfter > 0) return retryAfter * 1000

  const remaining = numberHeader(headers, 'x-ratelimit-remaining')
  if (remaining === undefined || remaining > 0) return 0

  const reset = numberHeader(headers, 'x-ratelimit-reset')
  if (reset === undefined) return 60_000
  // A second of slack: the reset is a whole second and the clocks are not the
  // same clock.
  return Math.max(0, reset * 1000 - now) + 1000
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function token(): string {
  const value = process.env['GITHUB_TOKEN'] ?? process.env['GH_TOKEN'] ?? ''
  if (value === '') {
    throw new Error(
      'code search needs a token: set GITHUB_TOKEN (`export GITHUB_TOKEN=$(gh auth token)`). ' +
        'It is the one search endpoint that refuses anonymous requests, measured in ticket 02.',
    )
  }
  return value
}

/**
 * A page, or a refusal to serve one.
 *
 * The distinction is load-bearing and an earlier version did not have it: it
 * inferred "rate limited" from an empty page carrying a pause, which is also
 * what an **exhausted** facet looks like when the budget happens to be low. One
 * of those should be retried and the other must never be, so the answer says
 * which it is rather than being reconstructed from its shape.
 */
type Hits = { repos: string[]; pause: number }
type Page = ({ limited: false } & Hits) | { limited: true; pause: number }

async function fetchPage(facet: Facet, page: number): Promise<Page> {
  const url = new URL('https://api.github.com/search/code')
  url.searchParams.set('q', facetQuery(facet))
  url.searchParams.set('per_page', '100')
  url.searchParams.set('page', String(page))

  const response = await fetch(url, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token()}`,
      'x-github-api-version': '2022-11-28',
      'user-agent': 'driftwatch-discovery',
    },
  })
  const pause = pauseFor(response.headers, Date.now())
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      return { limited: true, pause: Math.max(pause, 60_000) }
    }
    throw new Error(`search returned ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  return { limited: false, repos: reposIn(await response.json()), pause }
}

/** How many times one page is worth waiting out before giving up on the run. */
const RETRIES = 5

/**
 * One page, waiting out a rate limit on **the same page** rather than moving on.
 *
 * Moving on is what the first version did, and it was wrong in a way the
 * comment denied: the outer loop visits each (facet, page) once, so a page
 * skipped for a rate limit was abandoned for the whole run. The budget the
 * ticket calls scarce would have been spent and the page never bought.
 */
async function fetchPatiently(facet: Facet, page: number): Promise<Hits> {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    const result = await fetchPage(facet, page)
    if (!result.limited) return result
    process.stderr.write(`rate limited, waiting ${Math.round(result.pause / 1000)}s\n`)
    await sleep(result.pause)
  }
  throw new Error(`rate limited ${RETRIES} times on ${facetQuery(facet)} page ${page}`)
}

/** The (facet, page) pairs already spent, so a resumed run buys nothing twice. */
function readCursor(): Set<string> {
  if (!existsSync(CURSOR)) return new Set()
  try {
    const parsed: unknown = JSON.parse(readFileSync(CURSOR, 'utf8'))
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [])
  } catch {
    // A cursor killed mid-write is a cursor that costs some rate limit to
    // rebuild, and nothing else. Refusing to start over it would make the one
    // disposable file in the design the one that can block the run.
    process.stderr.write(`${CURSOR} is unreadable; starting the cursor over\n`)
    return new Set()
  }
}

/** The queries behind a set of spent `query#page` keys. */
export function queriesOf(spent: ReadonlySet<string>): string[] {
  return [...spent].map((key) => key.slice(0, key.lastIndexOf('#')))
}

function writeCursor(spent: ReadonlySet<string>): void {
  writeFileSync(CURSOR, JSON.stringify([...spent], null, 2), 'utf8')
}

/**
 * Fills the list to `target`, walking the facets page by page.
 *
 * Page-major, not facet-major: page 1 of every facet before page 2 of any of
 * them. The order decides what a truncated run contains, and a run that stops
 * early — out of rate limit, out of patience — should hold a balanced sample of
 * all twelve facets rather than all of the first one.
 *
 * Ten pages is the cap: code search serves 1000 results per query and answers
 * page 11 with a 422. That is per facet, which is why there are twelve.
 */
async function enumerateMain(target: number): Promise<number> {
  // Before anything is written or any page is bought: a missing token is the
  // caller's problem, and it exits 2 like every other one.
  token()
  mkdirSync(ROOT, { recursive: true })
  let repos = readList()
  const spent = readCursor()
  /** Facets with no more pages to give, so their later pages are not bought. */
  const exhausted = new Set<string>()
  process.stderr.write(`${repos.length} repos in the list, target ${target}\n`)

  for (let page = 1; page <= 10 && repos.length < target; page += 1) {
    for (const facet of FACETS) {
      if (repos.length >= target) break
      const query = facetQuery(facet)
      if (exhausted.has(query)) continue
      const key = `${query}#${page}`
      if (spent.has(key)) continue

      let found: Hits
      try {
        found = await fetchPatiently(facet, page)
      } catch (cause) {
        process.stderr.write(`${key}: ${messageOf(cause)}\n`)
        return 1
      }

      spent.add(key)
      const before = repos.length
      repos = mergeRepos(repos, found.repos)
      writeFileSync(LIST, formatList(repos, queriesOf(spent)), 'utf8')
      writeCursor(spent)
      process.stderr.write(
        `${key}: ${found.repos.length} hits, +${repos.length - before} (${repos.length})\n`,
      )
      // An empty page is the end of this facet, not of the run. Code search
      // serves 1000 results per query and a facet can hold fewer; without this
      // its pages 2 through 10 are re-bought on every run, out of the budget
      // the ticket calls the scarce one.
      if (found.repos.length === 0) exhausted.add(query)
      if (found.pause > 0) await sleep(found.pause)
    }
  }

  process.stderr.write(`\n${repos.length} repos in ${LIST}\n`)
  return 0
}

// --- Cloning ----------------------------------------------------------------

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

async function cloneMain(limit: number | undefined): Promise<number> {
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
  for (const [i, repo] of missing.entries()) {
    const dir = join(REPOS_DIR, slugOf(repo))
    process.stderr.write(`[${i + 1}/${missing.length}] ${repo} ... `)
    try {
      sparseClone(repo, headOf(repo), dir)
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
    `\n${cloned} cloned, ${failed} failed, ${repos.length - missing.length} already handled\n`,
  )
  return failed > 0 && cloned === 0 ? 1 : 0
}

// --- Running ----------------------------------------------------------------

/**
 * One repository's result, as one line of JSONL.
 *
 * JSONL because the file is appended to as the run proceeds and read back by
 * whatever ticket `07` builds: a run over two thousand repos is interrupted
 * sooner or later, and a half-written JSON array is not readable while a
 * half-written JSONL file is.
 */
type Outcome =
  | { repo: string; ok: true; sources: number; claims: number; findings: readonly unknown[] }
  | { repo: string; ok: false; stage: 'clone' | 'audit'; error: string }

/**
 * Every repo already recorded, so a resumed run does not redo them.
 *
 * Failures count as recorded. A repo whose config pointed outside the cone
 * fails the same way every time, and retrying it on each resume would make the
 * last repos of a long list unreachable.
 */
export function recordedIn(text: string): Set<string> {
  const done = new Set<string>()
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      // The half-written last line of an interrupted run. Skipping it is the
      // whole reason the file is JSONL: one torn line costs one repository,
      // where a torn JSON array would cost the file.
      continue
    }
    const repo: unknown = (parsed as { repo?: unknown }).repo
    if (typeof repo === 'string') done.add(repo)
  }
  return done
}

function recorded(): Set<string> {
  return existsSync(RESULTS) ? recordedIn(readFileSync(RESULTS, 'utf8')) : new Set()
}

async function record(outcome: Outcome): Promise<void> {
  await appendFile(RESULTS, `${JSON.stringify(outcome)}\n`, 'utf8')
}

/**
 * Loaded on demand, because `enumerate` and `clone` have no use for the
 * analyser and the two of them are what a long session spends its time in.
 * Taken once rather than per repository: the module cache makes the repeat
 * free, but the free repeat is what hides that it was ever a question.
 */
type Run = (options: RunOptions) => Promise<RunResult>

async function auditOne(run: Run, repo: string, dir: string): Promise<Outcome> {
  // `--no-config`, always, and it does two things rather than one. The
  // deciding reason is `09`'s: honouring two thousand different configs means
  // measuring two thousand different tools. The mechanical one is `06`'s — a
  // repo's own `sources` globs can name paths outside the sparse cone — and
  // refusing the config does not merely survive that, it removes the class:
  // with no config there are no `configured` sources, and every other source
  // driftwatch discovers is inside the cone by construction.
  const result = await run({ cwd: dir, paths: [], config: false })
  return {
    repo,
    ok: true,
    sources: result.sources.length,
    claims: result.claims,
    findings: result.findings.map((finding) => ({
      check: finding.check,
      path: finding.claim.source.path,
      kind: finding.claim.source.kind,
      line: finding.claim.range.line,
      column: finding.claim.range.column,
      context: finding.claim.context,
      text: finding.claim.text,
      suggestion: finding.suggestion?.value,
      fixable: finding.suggestion?.fixable === true,
    })),
  }
}

async function runMain(limit: number | undefined): Promise<number> {
  const repos = readList().slice(0, limit)
  const done = recorded()
  let audited = 0
  let failed = 0
  let uncloned = 0
  const { run } = await import('../src/run.ts')

  for (const repo of repos) {
    if (done.has(repo)) continue
    const dir = join(REPOS_DIR, slugOf(repo))
    if (!existsSync(join(dir, '.git'))) {
      // Not a failure and not a success: a repository the clone stage has not
      // reached. It is counted so the summary cannot read as a whole-list
      // result when it is a result over whatever happens to be on disk.
      uncloned += 1
      continue
    }

    let outcome: Outcome
    try {
      outcome = await auditOne(run, repo, dir)
      audited += 1
    } catch (cause) {
      // Recording and carrying on is the requirement, not an optimism. The
      // named case — a source outside the cone raising `ENOENT`, ticket `06`
      // § "What the cone cannot promise" — is gone with the config refused
      // above; what is left is everything a repository can be that 66 hand-read
      // ones were not. Over the first 30 acquired, none of it happened.
      outcome = { repo, ok: false, stage: 'audit', error: messageOf(cause) }
      failed += 1
    }
    await record(outcome)
  }

  process.stderr.write(
    `\n${audited} audited, ${failed} failed, ${done.size} already recorded, ` +
      `${uncloned} not cloned yet\n`,
  )
  return 0
}

// --- Status -----------------------------------------------------------------

function statusMain(): number {
  const repos = readList()
  const cloned = existsSync(REPOS_DIR)
    ? repos.filter((repo) => existsSync(join(REPOS_DIR, slugOf(repo), '.git'))).length
    : 0
  // Recorded and succeeded are separated deliberately. A run that failed on
  // half the list and a run that audited it are the same number of recorded
  // repositories, and reporting only the total would let the second read as
  // the first.
  const done = recorded()
  const failed = existsSync(RESULTS)
    ? readFileSync(RESULTS, 'utf8')
        .split('\n')
        .filter((line) => line.includes('"ok":false')).length
    : 0
  process.stdout.write(
    `list:     ${repos.length} repos (${LIST})\n` +
      `cloned:   ${cloned}\n` +
      `recorded: ${done.size} (${RESULTS})\n` +
      `  failed: ${failed}\n`,
  )
  return 0
}

// --- Entry ------------------------------------------------------------------

function numberFlag(argv: readonly string[], flag: string): number | undefined {
  const at = argv.indexOf(flag)
  if (at === -1) return undefined
  const value = Number(argv[at + 1])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} wants a positive integer`)
  return value
}

async function main(argv: readonly string[]): Promise<number> {
  const [command] = argv
  switch (command) {
    case 'enumerate':
      return enumerateMain(numberFlag(argv, '--target') ?? 2000)
    case 'clone':
      return cloneMain(numberFlag(argv, '--limit'))
    case 'run':
      return runMain(numberFlag(argv, '--limit'))
    case 'status':
    case undefined:
      return statusMain()
    default:
      process.stderr.write('usage: discovery <enumerate|clone|run|status>\n')
      return 2
  }
}

if (process.argv[1] === import.meta.filename) {
  try {
    process.exitCode = await main(process.argv.slice(2))
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    process.exitCode = 2
  }
}
