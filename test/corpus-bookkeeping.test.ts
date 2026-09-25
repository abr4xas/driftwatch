/**
 * The corpus's bookkeeping, with no clones.
 *
 * `pnpm corpus --check` is the real precision gate and it does not run in CI:
 * it needs ~2.7 GB of clones, and the ruling on a changed snapshot requires a
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
    // ruling cannot be reworded into agreeing with itself. It is not asserted
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
 * because there was nowhere to look the ruling up.
 *
 * These assertions are the reason that cannot happen twice. They check
 * bookkeeping, not rulings: whether a finding is true is a judgement and
 * ADR-0007 keeps judgements out of CI.
 *
 * A ruling may be **pending**, and that is round thirty-one's doing rather
 * than a loosening. When every finding had to be ruled, the corpus could only
 * hold repositories small enough to read end to end — which is what
 * [ADR-0015](../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md)
 * found conditions 3 to 5 were really measuring. With those withdrawn, what
 * the surviving conditions need is narrower, and the two things they do need
 * are asserted below rather than implied by ruling everything:
 *
 * - **No `fixable` finding is pending.** Condition 2 admits no false positive
 *   among them at any rate, so an unread autofix is the one thing this file
 *   may never contain.
 * - **Every repository is settled.** Condition 6 asks whether a repository
 *   produces a false positive at all: one `false` settles it, and otherwise
 *   every one of its findings has to be ruled. A repository with a pending
 *   ruling and no false one is a repository nobody has answered.
 */
describe('every finding has a row and a ruling', () => {
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

  /** The rows of the per-finding table, as `repo location` plus its ruling. */
  function recordedFindings(): Map<string, string> {
    const rows = new Map<string, string>()
    for (const line of doc.split('\n')) {
      const row =
        /^\| \d+ \| `([^`]+)` \| `([^`]+)` \| `[^`]+` \| .* \| \*\*(true|false|pending)\*\* \|/u.exec(
          line,
        )
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
    const cited = /\*\*(\d+) true, (\d+) false, (\d+) pending, (\d+) findings\.\*\*/u.exec(doc)
    if (cited === null) throw new Error('CLASSIFICATION.md does not state its per-finding totals')
    const [trueCount = 0, falseCount = 0, pending = 0, total = 0] = cited.slice(1).map(Number)
    const rulings = [...recordedFindings().values()]
    expect({
      true: rulings.filter((ruling) => ruling === 'true').length,
      false: rulings.filter((ruling) => ruling === 'false').length,
      pending: rulings.filter((ruling) => ruling === 'pending').length,
      total: rulings.length,
    }).toEqual({ true: trueCount, false: falseCount, pending, total })
  })

  /** `repo location` for every finding a snapshot marks `fixable`. */
  function fixableFindings(): string[] {
    const found: string[] = []
    for (const name of snapshotNames()) {
      const text = snapshot(name)
      const [, findings = ''] = text.split('## findings\n')
      const repo = /^# (.+)$/mu.exec(text)?.[1] ?? name
      for (const line of findings.split('\n')) {
        const location = /^(\S+:\d+:\d+)\s/u.exec(line.trim())?.[1]
        if (location !== undefined && line.includes('fixable')) found.push(`${repo} ${location}`)
      }
    }
    return found
  }

  it('leaves no fixable finding unread, whatever else is pending', () => {
    const recorded = recordedFindings()
    const unread = fixableFindings().filter((finding) => recorded.get(finding) === 'pending')
    expect(unread).toEqual([])
  })

  it('settles every repository: a false positive, or every finding ruled', () => {
    const byRepo = new Map<string, string[]>()
    for (const [finding, ruling] of recordedFindings()) {
      const repo = finding.slice(0, finding.lastIndexOf(' '))
      byRepo.set(repo, [...(byRepo.get(repo) ?? []), ruling])
    }
    const unsettled = [...byRepo]
      .filter(([, rulings]) => rulings.includes('pending') && !rulings.includes('false'))
      .map(([repo]) => repo)
    expect(unsettled).toEqual([])
  })

  it('agrees with the aggregate the document opens with', () => {
    const cited =
      /corpus produces \*\*(\d+) findings, (\d+) true, (\d+) false and (\d+) unruled\*\*/u.exec(doc)
    if (cited === null) throw new Error('CLASSIFICATION.md does not cite its aggregate')
    const [total = 0, trueCount = 0] = cited.slice(1).map(Number)
    const rulings = [...recordedFindings().values()]
    expect(rulings).toHaveLength(total)
    expect(rulings.filter((ruling) => ruling === 'true')).toHaveLength(trueCount)
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
 * found is a test that discourages finding one, and ADR-0007 keeps the ruling
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

/**
 * `results.jsonl` is the machine rendering of the same run the snapshots
 * record, and it went stale without anybody noticing.
 *
 * It sat at 66 rows from a 66-repo corpus while the corpus grew to 96, so
 * `pnpm discovery queue --certification` read it, found none of the thirty
 * repositories round thirty-one added, and ordered silence. Nothing failed:
 * the file was valid, just about a corpus that no longer existed. Worse, the
 * message printed when it is missing named `pnpm corpus --json`, a flag that
 * had never been implemented — so the one instruction for repairing it could
 * not be followed.
 *
 * The flag exists now, and this is what stops the file drifting again. It
 * clones nothing: both artifacts are on disk.
 */
describe('results.jsonl is the same run the snapshots are', () => {
  type Outcome = { repo: string; sources: number; findings: unknown[] }
  const outcomes: Outcome[] = readFileSync(
    new URL('./corpus/results.jsonl', import.meta.url),
    'utf8',
  )
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as Outcome)

  it('covers every repository the snapshots do, and invents none', () => {
    expect(outcomes.map((o) => slugOf(o.repo)).toSorted()).toEqual(
      snapshotNames().map((name) => name.replace(/\.txt$/u, '')),
    )
  })

  it('counts the same findings the snapshots count', () => {
    const inSnapshots = snapshotNames().reduce(
      (total, name) => total + findingCount(snapshot(name)),
      0,
    )
    expect(outcomes.reduce((total, o) => total + o.findings.length, 0)).toBe(inSnapshots)
  })

  it('counts the same sources', () => {
    const inSnapshots = snapshotNames().reduce(
      (total, name) => total + field(snapshot(name), 'sources'),
      0,
    )
    expect(outcomes.reduce((total, o) => total + o.sources, 0)).toBe(inSnapshots)
  })
})
