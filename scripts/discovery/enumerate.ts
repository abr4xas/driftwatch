/**
 * Stage one: which repositories exist.
 *
 * GitHub code search, walked facet by facet — three filenames against four
 * size bands — with the page cursor written down so a run that runs out of
 * rate limit resumes rather than restarts. Ticket `02` established the shape:
 * one facet yields ~780 unique repositories per minute of rate limit, and the
 * bands are nearly disjoint, so the facets do not pay for each other.
 *
 * The certification corpus is subtracted here and nowhere else. A repository
 * that carries a human ruling must not arrive in the corpus that carries
 * none, which is the split the whole design rests on.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { messageOf } from '../../src/core/errors.ts'
import { CORPUS } from '../corpus/repos.ts'
import { CURSOR, LIST, readList, ROOT } from './files.ts'

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
  '# The discovery corpus: repositories, no shas, not committed, disposable.',
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
export async function enumerateMain(target: number): Promise<number> {
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
