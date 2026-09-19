/**
 * The acquisition runner's decidable parts, with no network and no disk.
 *
 * Enumerating, cloning and running are three network- or disk-bound loops
 * around a handful of decisions, and the decisions are where the damage lives:
 * a query written in the website's syntax returns a plausible wrong number
 * (ticket `02`), a merge that forgets to subtract the certification corpus
 * contaminates the split the whole design rests on, and a disk check that is
 * wrong by a factor of ten fills a laptop. Each of those is a function here.
 */
import { describe, expect, it } from 'vitest'
import { CORPUS } from '../scripts/corpus-repos.ts'
import {
  BYTES_PER_REPO,
  FACETS,
  facetQuery,
  formatList,
  mergeRepos,
  parseList,
  pauseFor,
  queriesOf,
  recordedIn,
  refuseForDisk,
  reposIn,
} from '../scripts/discovery.ts'

describe('the facets', () => {
  it('asks with filename:, which is the syntax the API implements', () => {
    // `path:CLAUDE.md` answers 99 against `filename:CLAUDE.md`'s 833,536, with
    // a 200 and no warning. Ticket `02` § "The plan's query syntax does not
    // work" measured both; this is the assertion that keeps the wrong one out.
    for (const facet of FACETS) {
      expect(facetQuery(facet)).toMatch(/^filename:/u)
      expect(facetQuery(facet)).not.toContain('path:')
    }
  })

  it('partitions each filename by size ranges that cannot overlap', () => {
    // Disjointness is what makes the facets add up rather than re-deliver the
    // same head a thousand times. It is a property of the ranges, so it is
    // checked by construction: every boundary appears in exactly two facets,
    // once as an upper bound and once as a lower one.
    const byFilename = new Map<string, string[]>()
    for (const facet of FACETS) {
      byFilename.set(facet.filename, [...(byFilename.get(facet.filename) ?? []), facet.size])
    }
    for (const [, sizes] of byFilename) {
      expect(sizes).toEqual(['<1000', '1000..3000', '3000..10000', '>10000'])
    }
  })

  it('covers the three filenames the tool actually reads as roots', () => {
    expect(new Set(FACETS.map((facet) => facet.filename))).toEqual(
      new Set(['CLAUDE.md', 'AGENTS.md', 'SKILL.md']),
    )
  })
})

describe('reading a search page', () => {
  it('takes the repository of each hit, once', () => {
    expect(
      reposIn({
        items: [
          { repository: { full_name: 'a/one' } },
          { repository: { full_name: 'a/one' } },
          { repository: { full_name: 'b/two' } },
        ],
      }),
    ).toEqual(['a/one', 'b/two'])
  })

  it('refuses a payload that is not a search page rather than reading zero', () => {
    // A 403 body, an error object, a truncated response: all are objects with
    // no `items`, and silently returning [] would look exactly like a facet
    // that is exhausted — which the loop takes as permission to stop buying
    // that facet's remaining nine pages.
    expect(() => reposIn({ message: 'API rate limit exceeded' })).toThrow(/not a search page/u)
  })

  it('reads an empty page as an empty page', () => {
    expect(reposIn({ items: [] })).toEqual([])
  })
})

describe('merging into the list', () => {
  it('keeps discovery order and drops what is already known', () => {
    expect(mergeRepos(['a/one'], ['b/two', 'a/one', 'c/three'])).toEqual([
      'a/one',
      'b/two',
      'c/three',
    ])
  })

  it('subtracts the certification corpus', () => {
    // `1amageek/SwiftAgent` came back in the first thousand results of the
    // first facet ticket `02` ran. A discovery corpus holding a validation
    // repo is the contamination the two-corpus split exists to prevent, and it
    // would be invisible: nothing downstream looks at where a repo came from.
    const certified = CORPUS[0]?.repo ?? ''
    expect(mergeRepos([], ['b/two', certified])).toEqual(['b/two'])
    expect(mergeRepos([], ['1amageek/SwiftAgent'])).toEqual([])
  })
})

describe('the committed list', () => {
  const oneQuery = [facetQuery(FACETS[0] ?? { filename: 'CLAUDE.md', size: '<1000' })]

  it('round-trips through the file format', () => {
    const repos = ['a/one', 'b/two']
    expect(parseList(formatList(repos, oneQuery))).toEqual(repos)
  })

  it('carries the queries that produced it, so a rule has provenance', () => {
    expect(formatList(['a/one'], oneQuery)).toContain(oneQuery[0])
  })

  it('names only the queries that were spent, not the whole query space', () => {
    // A run that reached its target after one facet has searched one facet. A
    // header listing all twelve would attribute a repository to a search that
    // never ran, which is the opposite of what committing the list is for.
    const text = formatList(['a/one'], oneQuery)
    const unspent = FACETS.filter((facet) => facetQuery(facet) !== oneQuery[0])
    for (const facet of unspent) expect(text).not.toContain(facetQuery(facet))
  })

  it('pins no sha, because the discovery corpus is disposable', () => {
    expect(formatList(['a/one'], oneQuery)).not.toMatch(/[0-9a-f]{40}/u)
  })

  it('ignores comments and blank lines when reading one back', () => {
    expect(parseList('# a note\n\na/one\n\n# another\nb/two\n')).toEqual(['a/one', 'b/two'])
  })
})

describe('the rate limit', () => {
  const now = 1_700_000_000_000

  it('does not pause while requests remain', () => {
    expect(pauseFor(new Headers({ 'x-ratelimit-remaining': '4' }), now)).toBe(0)
  })

  it('waits for the window to reset when the budget is spent', () => {
    const reset = String(Math.floor(now / 1000) + 30)
    const headers = new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset })
    expect(pauseFor(headers, now)).toBeGreaterThanOrEqual(30_000)
    expect(pauseFor(headers, now)).toBeLessThanOrEqual(32_000)
  })

  it('does not wait backwards when the reset is already past', () => {
    const reset = String(Math.floor(now / 1000) - 30)
    const headers = new Headers({ 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset })
    expect(pauseFor(headers, now)).toBeLessThanOrEqual(2000)
  })

  it('obeys retry-after over its own arithmetic', () => {
    // Secondary rate limits are not the primary one and do not move
    // `x-ratelimit-reset`: GitHub answers them with `retry-after` and a budget
    // that still looks healthy. Computing from `remaining` alone would retry
    // immediately and earn a longer ban.
    const headers = new Headers({ 'retry-after': '60', 'x-ratelimit-remaining': '9' })
    expect(pauseFor(headers, now)).toBe(60_000)
  })
})

describe('the disk budget', () => {
  it('lets a run start when the space is there', () => {
    expect(refuseForDisk(100 * 1024 ** 3, 2000)).toBeUndefined()
  })

  it('refuses rather than filling the disk', () => {
    const refusal = refuseForDisk(1024 ** 3, 2000)
    expect(refusal).toMatch(/2000 repos/u)
    expect(refusal).toMatch(/GB/u)
  })

  it('budgets from what 06 measured, not from a guess', () => {
    // 2.8 MB per repo over all 66 corpus repos, `discovery-clone.ts`.
    expect(BYTES_PER_REPO).toBe(2.8 * 1024 * 1024)
  })

  it('keeps headroom, because the estimate is a mean over 66 repos', () => {
    // Exactly the measured mean is not enough space: half the repos are above
    // it, and a run that dies at repo 1900 with a full disk has cost the whole
    // rate-limit budget for nothing.
    expect(refuseForDisk(2000 * BYTES_PER_REPO, 2000)).toBeDefined()
  })
})

describe('the cursor', () => {
  it('reads the query back out of a spent key', () => {
    const query = facetQuery(FACETS[0] ?? { filename: 'CLAUDE.md', size: '<1000' })
    expect(queriesOf(new Set([`${query}#1`, `${query}#2`]))).toEqual([query, query])
  })

  it('splits at the last separator, so a query holding one survives', () => {
    expect(queriesOf(new Set(['filename:a#b size:<1000#3']))).toEqual(['filename:a#b size:<1000'])
  })
})

const line = (repo: string): string => JSON.stringify({ repo, ok: true })

describe('reading the results back', () => {
  it('names every repository already recorded, failures included', () => {
    const text = `${line('a/one')}\n${JSON.stringify({ repo: 'b/two', ok: false })}\n`
    expect(recordedIn(text)).toEqual(new Set(['a/one', 'b/two']))
  })

  it('survives the half-written last line of an interrupted run', () => {
    // This is the whole reason the file is JSONL rather than a JSON array. A
    // torn line must cost one repository; before this it threw, and one torn
    // line made `run` and `status` permanently unusable.
    expect(recordedIn(`${line('a/one')}\n{"repo":"b/tw`)).toEqual(new Set(['a/one']))
  })

  it('reads an absent file as nothing recorded', () => {
    expect(recordedIn('')).toEqual(new Set())
  })
})

describe('a response with no rate-limit headers', () => {
  it('is not read as a spent budget', () => {
    // `Number(headers.get(x) ?? '')` is 0 for an absent header, which is finite
    // and reads as "no requests left". Absent and zero are different answers,
    // and conflating them made every header-less response pause.
    expect(pauseFor(new Headers(), 1_700_000_000_000)).toBe(0)
  })

  it('is not read as a spent budget when the value is not a number either', () => {
    expect(pauseFor(new Headers({ 'x-ratelimit-remaining': 'unknown' }), 0)).toBe(0)
  })
})
