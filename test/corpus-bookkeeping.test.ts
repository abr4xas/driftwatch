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
import { CORPUS, slugOf } from '../scripts/corpus/repos.ts'

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

  /**
   * ADR-0006 condition 2 — zero **false positives** among the fixable findings
   * — cannot be checked here: whether a finding is false is a hand judgement
   * and this file clones nothing (ADR-0007).
   *
   * What is mechanical is the count, so the count is what is pinned. It read
   * `0` for twelve rounds because no rule had ever fired on a real repo, not
   * because none could; the thirteenth round produced three, two of them
   * false, and the condition is **broken** in `CLASSIFICATION.md` § "Criterion
   * status". A change to this number means a `--fix` somebody could apply to
   * somebody's document, which is the one thing that must never move by
   * accident.
   */
  it('the fixable count is the one CLASSIFICATION.md cites', () => {
    const doc = readFileSync(new URL('./corpus/CLASSIFICATION.md', import.meta.url), 'utf8')
    const match = /Fixable findings: \*\*(\d+)\*\*, of which \*\*(\d+) (?:is|are) false\*\*/u.exec(
      doc,
    )
    if (match === null) throw new Error('CLASSIFICATION.md does not cite the fixable count')
    const [cited = 0, false_ = 0] = match.slice(1).map(Number)
    expect(totalsOver(CORPUS).fixable).toBe(cited)
    // The false count is read back too, so the sentence stating condition 2's
    // verdict cannot be reworded into agreeing with itself. It is not asserted
    // against anything: a test that goes red when the false positives get
    // fixed is the gate ADR-0007 argues against.
    expect(false_).toBeLessThanOrEqual(cited)
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

/**
 * The per-finding record, which is the one thing in `CLASSIFICATION.md` that
 * has to stay exactly in step with the snapshots.
 *
 * It went stale once and it was not noticed: the per-repo table said 26
 * findings while the snapshots held 39, and thirteen adjudications from rounds
 * 18 to 24 lived only in the prose of the rounds that made them. Round
 * twenty-three then justified a bound with a finding it called true which round
 * thirteen had ruled false — a mistake nobody could have caught by reading,
 * because there was nowhere to look the verdict up.
 *
 * These assertions are the reason that cannot happen twice. They check
 * bookkeeping, not verdicts: whether a finding is true is a judgement and
 * ADR-0007 keeps judgements out of CI.
 */
describe('every finding has a row and a verdict', () => {
  const doc = readFileSync(new URL('./corpus/CLASSIFICATION.md', import.meta.url), 'utf8')

  /** `repo location` for every finding the snapshots carry. */
  function snapshotFindings(): string[] {
    const found: string[] = []
    for (const name of snapshotNames()) {
      const text = snapshot(name)
      const [, findings = ''] = text.split('## findings\n')
      const repo = /^# (.+)$/mu.exec(text)?.[1] ?? name
      for (const line of findings.split('\n')) {
        const location = /^(\S+:\d+:\d+)\s/u.exec(line.trim())?.[1]
        if (location !== undefined) found.push(`${repo} ${location}`)
      }
    }
    return found
  }

  /** The rows of the per-finding table, as `repo location` plus its verdict. */
  function recordedFindings(): Map<string, string> {
    const rows = new Map<string, string>()
    for (const line of doc.split('\n')) {
      const row =
        /^\| \d+ \| `([^`]+)` \| `([^`]+)` \| `[^`]+` \| .* \| \*\*(true|false)\*\* \|/u.exec(line)
      if (row !== null) rows.set(`${row[1]} ${row[2]}`, row[3] ?? '')
    }
    return rows
  }

  it('records every finding the snapshots carry, and invents none', () => {
    const recorded = recordedFindings()
    const snapshots = snapshotFindings()
    expect(snapshots.filter((finding) => !recorded.has(finding))).toEqual([])
    expect([...recorded.keys()].filter((row) => !snapshots.includes(row))).toEqual([])
  })

  it('records each one exactly once', () => {
    expect(recordedFindings().size).toBe(snapshotFindings().length)
  })

  it('agrees with the count it states about itself', () => {
    const cited = /\*\*(\d+) true, (\d+) false, (\d+) findings\.\*\*/u.exec(doc)
    if (cited === null) throw new Error('CLASSIFICATION.md does not state its per-finding totals')
    const [trueCount = 0, falseCount = 0, total = 0] = cited.slice(1).map(Number)
    const verdicts = [...recordedFindings().values()]
    expect({
      true: verdicts.filter((verdict) => verdict === 'true').length,
      false: verdicts.filter((verdict) => verdict === 'false').length,
      total: verdicts.length,
    }).toEqual({ true: trueCount, false: falseCount, total })
  })

  it('agrees with the aggregate the document opens with', () => {
    const cited = /corpus produces \*\*(\d+) findings, (\d+) true and (\d+) false\*\*/u.exec(doc)
    if (cited === null) throw new Error('CLASSIFICATION.md does not cite its aggregate')
    const [total = 0, trueCount = 0] = cited.slice(1).map(Number)
    const verdicts = [...recordedFindings().values()]
    expect(verdicts).toHaveLength(total)
    expect(verdicts.filter((verdict) => verdict === 'true')).toHaveLength(trueCount)
  })
})

/**
 * Condition 6's arithmetic, which is the one that went wrong quietly.
 *
 * It reads "≥ 90% of repos produce zero false positives", and the table said
 * 61 of 66 while the rows said 58 — round eighteen left three classes open on
 * purpose and three more repositories joined the count without anyone dividing
 * again. Nothing regressed in the code; the numerator grew while the
 * denominator stood still.
 *
 * This asserts that the cited counts **match the rows**, and nothing about
 * whether the condition passes. A test that goes red when a false positive is
 * found is a test that discourages finding one, and ADR-0007 keeps the verdict
 * out of CI.
 */
describe('condition 6 is divided from the rows it is about', () => {
  const doc = readFileSync(new URL('./corpus/CLASSIFICATION.md', import.meta.url), 'utf8')

  /** Repositories with at least one false positive, and of those, validation. */
  function repositoriesWithAFalsePositive(): { all: Set<string>; validation: Set<string> } {
    const all = new Set<string>()
    const validation = new Set<string>()
    for (const line of doc.split('\n')) {
      const row =
        /^\| \d+ \| `([^`]+)` \| `[^`]+` \| `[^`]+` \| .* \| \*\*false\*\* \| \S+ \| ([^|]+)\|/u.exec(
          line,
        )
      if (row === null) continue
      const repo = row[1] ?? ''
      all.add(repo)
      if ((row[2] ?? '').trim().startsWith('validation')) validation.add(repo)
    }
    return { all, validation }
  }

  it('cites the count the per-finding rows produce', () => {
    const cited =
      /\*\*(\d+) of (\d+) = [\d.]+%\*\*; validation \*\*(\d+) of (\d+) = [\d.]+%\*\*/u.exec(doc)
    if (cited === null) throw new Error('CLASSIFICATION.md does not cite condition 6 both ways')
    const [clean = 0, total = 0, cleanValidation = 0, totalValidation = 0] = cited
      .slice(1)
      .map(Number)
    const withAFalsePositive = repositoriesWithAFalsePositive()
    expect({
      clean: total - withAFalsePositive.all.size,
      cleanValidation: totalValidation - withAFalsePositive.validation.size,
    }).toEqual({ clean, cleanValidation })
  })
})
