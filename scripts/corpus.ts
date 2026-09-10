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
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { run } from '../src/run.ts'
import { CORPUS, slugOf, type CorpusRepo } from './corpus-repos.ts'

const HERE = import.meta.dirname
const CORPUS_DIR = join(HERE, '..', 'test', 'corpus')
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

/** `--only <pattern>`: run only the repos whose name contains the pattern. */
function onlyPattern(argv: readonly string[]): string | undefined {
  const at = argv.indexOf('--only')
  return at === -1 ? undefined : argv[at + 1]
}

async function main(): Promise<number> {
  const check = process.argv.includes('--check')
  const only = onlyPattern(process.argv)
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
