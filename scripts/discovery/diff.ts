/**
 * Two audits of the discovery corpus, and what moved between them.
 *
 * Ticket `16` established the only way this project argues about a rule, and
 * then had to build it by hand: **change it, audit the discovery corpus before
 * and after, and diff the findings.** Ticket `27`'s table says where an
 * experiment is worth spending and explicitly does not settle one; this is the
 * thing that settles one.
 *
 *   pnpm discovery diff --before results-before.jsonl --after results.jsonl
 *
 * A row it prints is a finding that appeared or disappeared, with enough of it
 * to read. **It rules on nothing.** Whether an added finding is a true positive
 * is a person's call against the real repository, and this corpus has no
 * rulings in it by construction — so the count at the bottom is a count of
 * things to read, never a precision and never a score for the change.
 *
 * `fixable` is called out separately, and that is the one place this is more
 * than bookkeeping: ADR-0006 condition 2 admits **no** false positive among the
 * fixable at any rate, so an experiment that adds a fixable finding has a
 * higher bar to clear than one that adds a reportable one.
 */
import { existsSync, readFileSync } from 'node:fs'
import { jsonlIn } from './files.ts'

export type Finding = {
  check: string
  path: string
  line: number
  column: number
  text: string
  fixable?: boolean
}

export type Outcome = { repo: string; findings?: Finding[] }

/**
 * What makes two findings the same finding across two runs.
 *
 * The documents do not change between audits — only the rules do — so the
 * position is stable and belongs in the key. Leaving it out would call a
 * finding that moved to another line "the same", which is exactly the kind of
 * quiet merge that hides what an experiment did.
 */
export function keyOf(repo: string, finding: Finding): string {
  return [repo, finding.check, finding.path, finding.line, finding.column, finding.text].join('|')
}

export function findingsIn(text: string): Map<string, { repo: string; finding: Finding }> {
  const out = new Map<string, { repo: string; finding: Finding }>()
  for (const parsed of jsonlIn(text)) {
    const outcome = parsed as Outcome
    if (typeof outcome.repo !== 'string' || !Array.isArray(outcome.findings)) continue
    for (const finding of outcome.findings) {
      if (typeof finding?.text !== 'string' || typeof finding.check !== 'string') continue
      out.set(keyOf(outcome.repo, finding), { repo: outcome.repo, finding })
    }
  }
  return out
}

export type Diff = {
  added: { repo: string; finding: Finding }[]
  removed: { repo: string; finding: Finding }[]
  before: number
  after: number
}

export function diffOf(before: string, after: string): Diff {
  const was = findingsIn(before)
  const now = findingsIn(after)
  const added = [...now].filter(([key]) => !was.has(key)).map(([, v]) => v)
  const removed = [...was].filter(([key]) => !now.has(key)).map(([, v]) => v)
  return { added, removed, before: was.size, after: now.size }
}

function show(title: string, rows: readonly { repo: string; finding: Finding }[]): string {
  if (rows.length === 0) return `${title}: none\n`
  const lines = [`${title}: ${rows.length}\n`]
  for (const { repo, finding } of rows) {
    lines.push(
      `  ${finding.check}${finding.fixable === true ? ' [fixable]' : ''}  ${repo}  ` +
        `${finding.path}:${finding.line}:${finding.column}\n        ${finding.text}\n`,
    )
  }
  return `${lines.join('')}\n`
}

export function report(diff: Diff): string {
  const fixable = diff.added.filter((row) => row.finding.fixable === true)
  return (
    `${diff.before} findings before, ${diff.after} after ` +
    `(${diff.after - diff.before >= 0 ? '+' : ''}${diff.after - diff.before})\n\n` +
    show('added', diff.added) +
    show('removed', diff.removed) +
    (fixable.length === 0
      ? 'No added finding is fixable.\n'
      : `${fixable.length} of the added findings are FIXABLE. ADR-0006 condition 2 admits no ` +
        'false positive\namong those at any rate; read every one against the real repository ' +
        'before keeping the change.\n') +
    '\nNo ruling here. The discovery corpus carries none, so a row above is something to read ' +
    'and\nnot a score for the change. Nothing in this output is a precision.\n'
  )
}

export function diffMain(before: string, after: string): number {
  for (const path of [before, after]) {
    if (!existsSync(path)) {
      process.stderr.write(`${path} is missing\n`)
      return 2
    }
  }
  process.stdout.write(report(diffOf(readFileSync(before, 'utf8'), readFileSync(after, 'utf8'))))
  return 0
}
