/**
 * The corpus of real repos.
 *
 * A green fixture proves nothing about false positives: we wrote it, with the
 * traps we already know exist. The corpus runs the tool over context files
 * other people wrote, without knowing driftwatch exists, and stores the output
 * as a snapshot.
 *
 * The snapshot **does not claim to be correct**. It claims not to change
 * without intent. Every diff is reviewed by hand, and that review is the only
 * real precision-regression signal the project has.
 *
 * Usage:
 *   pnpm corpus                    clone what is missing and rewrite snapshots
 *   pnpm corpus --check            fail if a snapshot differs from the stored one
 *   pnpm corpus --only <pattern>   only the repos matching the pattern
 *   pnpm corpus --fixes            print every edit `--fix` would apply
 *
 * `--fixes` is the measurement behind ADR-0006's hard floor — zero false
 * positives among the fixable findings. It **never writes**: a corpus clone is
 * a checkout we do not own (ADR-0007), and the question it answers is whether
 * each rewrite is the one a maintainer of that repo would have made, which is a
 * judgement a human makes by reading the line.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { CORPUS_DIR } from '../lib/paths.ts'
import { planFixes } from '../../src/fix/apply.ts'
import { run } from '../../src/run.ts'
import { stringFlag } from '../lib/argv.ts'
import { CORPUS, slugOf, type CorpusRepo } from './repos.ts'

const REPOS_DIR = join(CORPUS_DIR, 'repos')
const SNAPSHOTS_DIR = join(CORPUS_DIR, 'snapshots')

function git(args: readonly string[], cwd?: string): void {
  execFileSync('git', [...args], {
    cwd,
    stdio: ['ignore', 'ignore', 'inherit'],
    timeout: 10 * 60 * 1000,
  })
}

/**
 * Shallow-clones and parks on the pinned commit. If the directory is already
 * there and points at the right sha, it is left alone: the corpus is cloned
 * once and is a local cache afterwards.
 */
function ensureClone({ repo, sha }: CorpusRepo): string {
  const dir = join(REPOS_DIR, slugOf(repo))

  if (existsSync(join(dir, '.git'))) {
    const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
    if (head === sha) return dir
    // The pin changed: redo it, because a shallow clone cannot navigate.
    rmSync(dir, { recursive: true, force: true })
  }

  mkdirSync(dirname(dir), { recursive: true })
  git(['init', '-q', dir])
  git(['remote', 'add', 'origin', `https://github.com/${repo}.git`], dir)
  git(['fetch', '-q', '--depth', '1', 'origin', sha], dir)
  git(['checkout', '-q', 'FETCH_HEAD'], dir)
  return dir
}

/** Stable, diffable rendering of a run. */
async function snapshotOf(repo: string, dir: string): Promise<string> {
  const result = await run({ cwd: dir, paths: [] })
  const lines: string[] = [
    `# ${repo}`,
    '',
    `sources: ${result.sources.length}`,
    `errors: ${result.counts.errors}`,
    `warnings: ${result.counts.warnings}`,
    `fixable: ${result.fixable}`,
    '',
    '## sources',
    ...result.sources.map((source) => `${source.kind}  ${source.path}`),
    '',
    '## findings',
  ]

  if (result.findings.length === 0) {
    lines.push('(none)')
  } else {
    for (const finding of result.findings) {
      const { source, range, text, context } = finding.claim
      const suggestion =
        finding.suggestion === undefined
          ? ''
          : `  -> ${finding.suggestion.value} (${finding.suggestion.confidence}${
              finding.suggestion.fixable ? ', fixable' : ''
            })`
      lines.push(
        `${source.path}:${range.line}:${range.column}  [${finding.check}] ${context}  ${text}${suggestion}`,
      )
    }
  }

  // Time does not enter the snapshot: it changes on every run and says nothing
  // about precision.
  return `${lines.join('\n')}\n`
}

/** The line an offset sits on, with the offset's position inside it. */
function lineAt(content: string, offset: number): { start: number; end: number } {
  const start = content.lastIndexOf('\n', offset) + 1
  const end = content.indexOf('\n', offset)
  return { start, end: end === -1 ? content.length : end }
}

/**
 * Every edit `--fix` would apply in one repo, as the line before and the line
 * after.
 *
 * The whole line, not the fragment: a replacement is judged in the sentence it
 * sits in, and the fragments are what the snapshots already carry.
 */
async function reportFixes(
  repo: string,
  dir: string,
): Promise<{ placed: number; refused: number }> {
  const result = await run({ cwd: dir, paths: [] })
  const { plans, refusals } = planFixes(result.findings)
  const placed = plans.reduce((total, plan) => total + plan.edits.length, 0)

  if (placed === 0 && refusals.length === 0) return { placed: 0, refused: 0 }

  process.stdout.write(`\n# ${repo}\n`)
  for (const plan of plans) {
    const { content } = plan.source
    for (const [i, edit] of plan.edits.entries()) {
      const finding = plan.findings[i]
      const { start, end } = lineAt(content, edit.range[0])
      const before = content.slice(start, end)
      const after =
        content.slice(start, edit.range[0]) + edit.replacement + content.slice(edit.range[1], end)
      process.stdout.write(
        `${plan.source.path}:${finding?.claim.range.line ?? 0}  [${finding?.check ?? '?'}]\n` +
          `  - ${before.trim()}\n  + ${after.trim()}\n`,
      )
    }
  }
  for (const refusal of refusals) {
    const { claim } = refusal.finding
    process.stdout.write(
      `${claim.source.path}:${claim.range.line}  [${refusal.finding.check}] ` +
        `not applied (${refusal.reason}): ${claim.text}\n`,
    )
  }

  return { placed, refused: refusals.length }
}

async function fixesMain(only: string | undefined): Promise<number> {
  let placed = 0
  let refused = 0

  for (const entry of CORPUS) {
    if (only !== undefined && !entry.repo.includes(only)) continue
    let dir: string
    try {
      dir = ensureClone(entry)
    } catch {
      process.stderr.write(`${entry.repo}: could not clone, skipping\n`)
      continue
    }
    const counts = await reportFixes(entry.repo, dir)
    placed += counts.placed
    refused += counts.refused
  }

  process.stderr.write(`\n${placed} edit(s) would be applied · ${refused} refused\n`)
  return 0
}

async function main(): Promise<number> {
  const check = process.argv.includes('--check')
  const only = stringFlag(process.argv, '--only')
  if (process.argv.includes('--fixes')) return fixesMain(only)
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })

  let differing = 0
  let totalFindings = 0
  let totalSources = 0
  let holdoutFindings = 0

  for (const entry of CORPUS) {
    // With --only the rest are skipped without touching their snapshot, so a
    // new repo can be added without re-cloning the whole corpus.
    if (only !== undefined && !entry.repo.includes(only)) continue
    process.stderr.write(`${entry.repo}${entry.holdout === true ? ' [validation]' : ''} ... `)
    let dir: string
    try {
      dir = ensureClone(entry)
    } catch {
      process.stderr.write('could not clone, skipping\n')
      continue
    }

    const snapshot = await snapshotOf(entry.repo, dir)
    const path = join(SNAPSHOTS_DIR, `${slugOf(entry.repo)}.txt`)

    const findings = snapshot.split('\n## findings\n')[1] ?? ''
    const n = findings.trim() === '(none)' ? 0 : findings.trim().split('\n').length
    totalFindings += n
    if (entry.holdout === true) holdoutFindings += n
    totalSources += Number(/sources: (\d+)/u.exec(snapshot)?.[1] ?? 0)

    if (check) {
      const previous = existsSync(path) ? readFileSync(path, 'utf8') : ''
      if (previous === snapshot) {
        process.stderr.write(`ok (${n})\n`)
      } else {
        differing += 1
        process.stderr.write('CHANGED\n')
      }
      continue
    }

    writeFileSync(path, snapshot, 'utf8')
    process.stderr.write(`${n} findings\n`)
  }

  const snapshotCount = existsSync(SNAPSHOTS_DIR)
    ? readdirSync(SNAPSHOTS_DIR).filter((name) => name.endsWith('.txt')).length
    : 0

  process.stderr.write(
    `\n${snapshotCount} repos · ${totalSources} sources · ${totalFindings} findings\n` +
      `  calibration: ${totalFindings - holdoutFindings} · validation: ${holdoutFindings}\n`,
  )

  if (check && differing > 0) {
    process.stderr.write(
      `\n${differing} snapshot(s) changed. Review the diff by hand before accepting it:\n` +
        `that diff is the only real precision-regression signal.\n`,
    )
    return 1
  }
  return 0
}

process.exit(await main())
