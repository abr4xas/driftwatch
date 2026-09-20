/**
 * Stage three: audit each clone and record what came out.
 *
 * One JSONL line per repository, appended as it finishes, so a run that dies
 * on repository 1400 resumes at 1401. A repository that throws is recorded as
 * a failure rather than skipped: ticket `13` was found exactly this way, and a
 * failure the runner swallowed would have read as a repository with no
 * findings.
 *
 * **Nothing recorded here is a measurement.** See the header of `cli.ts`.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { messageOf } from '../../src/core/errors.ts'
import { slugOf } from '../corpus/repos.ts'
import type { RunOptions, RunResult } from '../../src/run.ts'
import { readList, REPOS_DIR } from './files.ts'
import { type Outcome, record, recorded } from './journal.ts'

/**
 * One repository's result, as one line of JSONL.
 *
 * JSONL because the file is appended to as the run proceeds and read back by
 * whatever ticket `07` builds: a run over two thousand repos is interrupted
 * sooner or later, and a half-written JSON array is not readable while a
 * half-written JSONL file is.
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
    skipped: result.skipped.length,
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

export async function runMain(limit: number | undefined): Promise<number> {
  const repos = readList().slice(0, limit)
  const done = recorded()
  let audited = 0
  let failed = 0
  let uncloned = 0
  const { run } = await import('../../src/run.ts')

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
