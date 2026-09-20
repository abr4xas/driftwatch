/**
 * The numbers the site publishes, derived from the snapshots rather than typed.
 *
 * `site/corpus-data.js` was written once, by hand, and then the corpus moved
 * under it: the site went on saying 236 context files and 92.4% precision
 * while the repository had corrected both. A page making a measurement claim
 * that nothing recomputes is the exact failure this tool exists to report, on
 * the one surface where a stranger reads it first.
 *
 * So it is generated, and `test/site-data.test.ts` holds the page to the
 * output. Run it after any round that moves the corpus:
 *
 *   pnpm site-data
 *
 * It reads only committed files — the snapshots and `CLASSIFICATION.md` — so
 * it needs no clones and no network.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { rowsIn } from '../jev/classify.ts'
import { CORPUS_DIR, REPO_ROOT } from '../lib/paths.ts'
import { CORPUS, slugOf } from './repos.ts'

/** One finding, under the short keys the page's renderer reads. */
export type SiteFinding = {
  /** The context file it was found in. */
  f: string
  /** 1-indexed line. */
  l: number
  /** The check id. */
  c: string
  /** The claim as written. */
  t: string
  /** What `--fix` would put there, or `null`. */
  s: string | null
}

/** One corpus repository. */
export type SiteRepo = {
  /** `owner/name`. */
  n: string
  /** In the validation group. */
  v: boolean
  /** How many context files were audited. */
  s: number
  f: SiteFinding[]
}

/** What the prose around the diagram claims, so a test can hold it to this. */
export type SiteSummary = {
  repos: number
  validation: number
  sources: number
  findings: number
  /** Context files driftwatch reported anything at all about. */
  litFiles: number
  /** Findings a person ruled true. */
  trueFindings: number
  /** Repositories with no false positive, whole corpus and validation alone. */
  cleanRepos: number
  cleanValidation: number
  /** As percentages, one decimal, the way the page prints them. */
  cleanPct: string
  cleanValidationPct: string
  /** The most false positives any one repository carries. */
  worstRepo: number
  /** Edits `--fix` would apply across the corpus. */
  fixable: number
}

const FINDING = /^(?<file>[^\s:]+):(?<line>\d+):\d+\s+\[(?<check>[^\]]+)\]\s+\S+\s+(?<rest>.*)$/u

/**
 * A snapshot's findings, in the order it lists them.
 *
 * The `-> suggestion (confidence, fixable)` tail is optional and is split off
 * rather than matched inside the claim: a claim can itself contain ` -> `, and
 * the tail is always last.
 */
export function findingsIn(snapshot: string): SiteFinding[] {
  const out: SiteFinding[] = []
  let inside = false
  for (const line of snapshot.split('\n')) {
    if (line.startsWith('## findings')) {
      inside = true
      continue
    }
    if (line.startsWith('## ')) {
      inside = false
      continue
    }
    if (!inside || line.trim() === '') continue
    const found = FINDING.exec(line)
    if (found?.groups === undefined) continue
    const { file, line: at, check, rest } = found.groups
    const arrow = (rest ?? '').lastIndexOf(' -> ')
    const text = arrow === -1 ? (rest ?? '') : (rest ?? '').slice(0, arrow)
    const tail = arrow === -1 ? '' : (rest ?? '').slice(arrow + 4)
    out.push({
      f: file ?? '',
      l: Number(at),
      c: check ?? '',
      t: text.trim(),
      s: tail === '' ? null : tail.replace(/\s*\([^)]*\)\s*$/u, '').trim(),
    })
  }
  return out
}

/** How many context files a snapshot audited. */
export function sourcesIn(snapshot: string): number {
  return Number(/^sources:\s*(\d+)$/mu.exec(snapshot)?.[1] ?? 0)
}

/** How many of its findings `--fix` would rewrite. */
export function fixableIn(snapshot: string): number {
  return Number(/^fixable:\s*(\d+)$/mu.exec(snapshot)?.[1] ?? 0)
}

/** The way the page prints a share: one decimal, with the sign. */
function pct(part: number, whole: number): string {
  return `${((part * 100) / whole).toFixed(1)}%`
}

function snapshotOf(repo: string): string {
  return readFileSync(join(CORPUS_DIR, 'snapshots', `${slugOf(repo)}.txt`), 'utf8')
}

export function siteData(): { repos: SiteRepo[]; summary: SiteSummary } {
  const rulings = new Map<string, 'true' | 'false'>()
  for (const row of rowsIn(readFileSync(join(CORPUS_DIR, 'CLASSIFICATION.md'), 'utf8'))) {
    // The document keys a finding by repository and `file:line:column`; the
    // snapshot has no column here, so the line is the key and a repository
    // with two findings on one line is counted once. There is one such pair
    // and both carry the same ruling.
    rulings.set(`${row.repo} ${row.location.split(':').slice(0, 2).join(':')}`, row.ruling)
  }

  const repos: SiteRepo[] = []
  let fixable = 0
  for (const entry of CORPUS) {
    const snapshot = snapshotOf(entry.repo)
    fixable += fixableIn(snapshot)
    repos.push({
      n: entry.repo,
      v: entry.holdout === true,
      s: sourcesIn(snapshot),
      f: findingsIn(snapshot),
    })
  }

  const falseIn = (repo: SiteRepo): number =>
    repo.f.filter((f) => rulings.get(`${repo.n} ${f.f}:${f.l}`) === 'false').length
  const clean = repos.filter((repo) => falseIn(repo) === 0)
  const validation = repos.filter((repo) => repo.v)

  const findings = repos.flatMap((repo) => repo.f.map((f) => ({ repo: repo.n, ...f })))
  const summary: SiteSummary = {
    repos: repos.length,
    validation: validation.length,
    sources: repos.reduce((sum, repo) => sum + repo.s, 0),
    findings: findings.length,
    litFiles: new Set(findings.map((f) => `${f.repo} ${f.f}`)).size,
    trueFindings: findings.filter((f) => rulings.get(`${f.repo} ${f.f}:${f.l}`) === 'true').length,
    cleanRepos: clean.length,
    cleanValidation: validation.filter((repo) => falseIn(repo) === 0).length,
    cleanPct: pct(clean.length, repos.length),
    cleanValidationPct: pct(
      validation.filter((repo) => falseIn(repo) === 0).length,
      validation.length,
    ),
    worstRepo: Math.max(...repos.map((repo) => falseIn(repo))),
    fixable,
  }
  return { repos, summary }
}

export function main(): number {
  const { repos, summary } = siteData()
  writeFileSync(
    join(REPO_ROOT, 'site', 'corpus-data.js'),
    `const CORPUS=${JSON.stringify(repos)};\n`,
    'utf8',
  )
  process.stderr.write(
    `${summary.sources} context files · ${summary.repos} repos · ${summary.findings} findings\n` +
      `  ${summary.trueFindings} true, in ${summary.litFiles} files\n` +
      `  ${summary.cleanRepos}/${summary.repos} = ${summary.cleanPct} with no false positive\n` +
      `  validation ${summary.cleanValidation}/${summary.validation} = ${summary.cleanValidationPct}\n` +
      `  worst repo ${summary.worstRepo} · ${summary.fixable} fixable\n`,
  )
  return 0
}

if (process.argv[1] === import.meta.filename) {
  process.exitCode = main()
}
