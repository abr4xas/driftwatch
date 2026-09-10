/**
 * The corpus's bookkeeping, with no clones.
 *
 * `pnpm corpus --check` is the real precision gate and it does not run in CI:
 * it needs ~2.7 GB of clones, and the verdict on a changed snapshot requires a
 * person reading the diff (see ADR-0007). This file covers the part of the
 * corpus that *is* mechanical — that the repo list, the stored snapshots and
 * the numbers `CLASSIFICATION.md` cites still agree with each other.
 *
 * The failure modes it catches have both happened: adding a repo to the list
 * and forgetting its snapshot, and editing the snapshots in bulk until they no
 * longer match the classification.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CORPUS, slugOf } from '../scripts/corpus-repos.ts'

const SNAPSHOTS = new URL('./corpus/snapshots/', import.meta.url)

function snapshotNames(): string[] {
  return readdirSync(SNAPSHOTS)
    .filter((name) => name.endsWith('.txt'))
    .toSorted()
}

function snapshot(name: string): string {
  return readFileSync(new URL(name, SNAPSHOTS), 'utf8')
}

function field(text: string, key: string): number {
  const match = new RegExp(`^${key}: (\\d+)$`, 'mu').exec(text)
  if (match === null) throw new Error(`snapshot has no "${key}:" line`)
  return Number(match[1])
}

/** Findings are one per line under the last heading, or the literal `(none)`. */
function findingCount(text: string): number {
  const section = text.split('\n## findings\n')[1]
  if (section === undefined) throw new Error('snapshot has no "## findings" section')
  const body = section.trim()
  return body === '(none)' ? 0 : body.split('\n').length
}

type Totals = { repos: number; sources: number; findings: number; fixable: number }

function totalsOver(repos: readonly { repo: string }[]): Totals {
  let sources = 0
  let findings = 0
  let fixable = 0
  for (const { repo } of repos) {
    const text = snapshot(`${slugOf(repo)}.txt`)
    sources += field(text, 'sources')
    fixable += field(text, 'fixable')
    findings += findingCount(text)
  }
  return { repos: repos.length, sources, findings, fixable }
}

const VALIDATION = CORPUS.filter((entry) => entry.holdout === true)

describe('corpus bookkeeping', () => {
  it('every repo in the list has a snapshot, and no snapshot is an orphan', () => {
    const expected = CORPUS.map((entry) => `${slugOf(entry.repo)}.txt`).toSorted()
    // Compared as sorted lists rather than sizes: the interesting failure is
    // *which* repo is missing, and a plain length check would not say.
    expect(snapshotNames()).toEqual(expected)
  })

  it('no repo is listed twice', () => {
    expect(new Set(CORPUS.map((entry) => entry.repo)).size).toBe(CORPUS.length)
  })

  it('every repo is pinned to a full sha', () => {
    for (const entry of CORPUS) {
      expect(entry.sha, entry.repo).toMatch(/^[0-9a-f]{40}$/u)
    }
  })

  it('every snapshot is headed by its own repo', () => {
    for (const entry of CORPUS) {
      const first = snapshot(`${slugOf(entry.repo)}.txt`).split('\n')[0]
      expect(first).toBe(`# ${entry.repo}`)
    }
  })

  // ADR-0006 condition 8. The floor, not the current size: the corpus grows.
  it('meets the methodology floor of 20 repos with 8 in validation', () => {
    expect(CORPUS.length).toBeGreaterThanOrEqual(20)
    expect(VALIDATION.length).toBeGreaterThanOrEqual(8)
  })

  // ADR-0006 condition 2. A wrong autofix is not noise, it is corruption of
  // the document, so this one has no rate modulating it.
  it('no finding in the whole corpus is fixable', () => {
    expect(totalsOver(CORPUS).fixable).toBe(0)
  })
})

/**
 * `CLASSIFICATION.md` is the record of the M1 certification and other
 * documents cite its numbers. Reading them back out of the prose is deliberate:
 * if a reword breaks these regexes, a load-bearing claim moved and that is
 * worth a red test.
 */
describe('CLASSIFICATION.md agrees with the snapshots', () => {
  const doc = readFileSync(new URL('./corpus/CLASSIFICATION.md', import.meta.url), 'utf8')

  function cited(pattern: RegExp, label: string): number[] {
    const match = pattern.exec(doc)
    if (match === null) throw new Error(`could not find the cited ${label} in CLASSIFICATION.md`)
    return match.slice(1).map(Number)
  }

  it('cites the size of the corpus and its finding count', () => {
    const [repos, findings] = cited(
      /\*\*(\d+) public repos pinned to a commit, (\d+) findings\.\*\*/u,
      'corpus size',
    )
    const actual = totalsOver(CORPUS)
    expect(repos).toBe(actual.repos)
    expect(findings).toBe(actual.findings)
  })

  it('cites the size of the validation group', () => {
    const [size] = cited(/\*\*(\d+) form the validation group\*\*/u, 'validation group size')
    expect(size).toBe(VALIDATION.length)
  })

  it('cites the validation group measurement', () => {
    const [repos, sources, findings] = cited(
      /Validation group measurement: \*\*(\d+) repos, (\d+) sources, (\d+) findings/u,
      'validation measurement',
    )
    const actual = totalsOver(VALIDATION)
    expect({ repos, sources, findings }).toEqual({
      repos: actual.repos,
      sources: actual.sources,
      findings: actual.findings,
    })
  })
})
