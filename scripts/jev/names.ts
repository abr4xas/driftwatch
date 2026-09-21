/**
 * Whether `skill/frontmatter`'s one autofix is an edit a maintainer would take.
 *
 * The certification corpus has 30 real skills and 30 of 30 have a `name` that
 * matches their directory, so this check has never produced a finding there and
 * the spec calls it silent. Over the discovery corpus it produces **670
 * fixable rewrites in 58 repositories**, and ADR-0006 condition 2 admits no
 * false positive among the fixable at any rate. The check is not silent; it is
 * silent in the only place anybody has looked.
 *
 *   pnpm discovery names [--limit N] [--concurrency 8] [--dry-run]
 *
 * Round seventeen of `CLASSIFICATION.md` asked this question of edits by hand,
 * one at a time, and it is the right question: not "is the name different from
 * the directory", which is arithmetic over two strings, but **"is the rewrite
 * the one a maintainer of that skill would have made"**. Six hundred and
 * seventy of those do not get read by hand.
 *
 * Two questions over one state, in one request. Neither is a ruling: this pass
 * produces a distribution and a list of classes to read, `CLASSIFICATION.md`
 * gets nothing, and whatever changes in `src/` is written by a person.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPOS_DIR, ROOT } from '../discovery/files.ts'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'

const OUT = join(ROOT, 'names.jsonl')
const RESULTS = join(ROOT, 'results.jsonl')

/** One offered rewrite, and the context needed to judge it. */
export type Rename = {
  repo: string
  path: string
  directory: string
  current: string
  suggested: string
  description: string
}

export type NameState = {
  repo: string
  skillDirectory: string
  declaredName: string
  directoryName: string
  description: string
  proposedEdit: string
}

export function stateOf(rename: Rename): NameState {
  return {
    repo: rename.repo,
    skillDirectory: rename.path.split('/').slice(0, -1).join('/'),
    declaredName: rename.current,
    directoryName: rename.directory,
    description: rename.description,
    proposedEdit: `name: ${rename.current} -> name: ${rename.suggested}`,
  }
}

/**
 * The load-bearing question, and it is deliberately about the **edit** rather
 * than about the mismatch.
 *
 * Whether `name` differs from the directory is arithmetic and the tool already
 * knows it. What ADR-0006 condition 2 is about is whether applying the rewrite
 * without a person reading it leaves the repository better, and the cases that
 * decide it are the ones where both strings are defensible: a directory renamed
 * to carry a deprecation date, a namespace the directory adds and the name does
 * not, a title written for humans beside a slug written for a filesystem.
 */
export const REWRITE_IS_RIGHT = {
  type: 'boolean',
  instructions:
    "Rewriting this skill's `name` to match its directory is the edit a maintainer of this " +
    'skill would accept. The tool found that `declaredName` and `directoryName` differ and ' +
    'proposes to overwrite the first with the second, with no person reading it first.',
  criteria: {
    true:
      'The declared name is stale or wrong and the directory is the authority: the skill was ' +
      'renamed and the frontmatter was left behind, or the name is a typo or an obvious ' +
      'leftover. After the edit the document says something truer than before.',
    false:
      'The declared name is deliberate and the difference is not an error: the directory ' +
      "carries something that is not part of the skill's name — a namespace, a prefix shared " +
      'with its siblings, a deprecation or date marker — or the two are simply different ' +
      'words and the tool cannot know which the author meant. A rewrite here replaces a ' +
      "maintainer's choice with a filesystem detail.",
  },
} as const

/** So a person reads classes rather than 670 rows. */
export const WHY_THEY_DIFFER = {
  type: 'choice',
  instructions:
    "What kind of difference is this between the skill's declared name and the directory it " +
    'lives in? Answer from both strings and the description.',
  criteria: {
    'directory-renamed':
      'The directory is the newer of the two and the frontmatter was not updated with it. ' +
      'This is the case the check was written for.',
    'human-title':
      'The declared name is a title written for a reader — capitals, spaces, punctuation — ' +
      'and the directory is the same words as a filesystem slug. They say the same thing in ' +
      'two registers.',
    'directory-namespace':
      'The directory adds something the name does not: a prefix or suffix shared with its ' +
      'sibling skills, a product or vendor tag, a grouping. The name is the skill; the ' +
      'directory is where it is filed.',
    'lifecycle-marker':
      'The directory carries a state rather than an identity — deprecated, archived, a date, ' +
      'a version, `old` or `wip`.',
    unrelated:
      'The two are different words and neither explains the other. Nothing here says which ' +
      'one the author intended.',
  },
} as const

/**
 * The replacement for the first version of `REWRITE_IS_RIGHT`, which failed its
 * control and is kept in the ticket rather than here.
 *
 * That question asked whether a maintainer would accept the edit. Nothing in
 * the state could settle it — the state holds two strings and a description,
 * and which of the two strings is the newer one is exactly what is not written
 * down anywhere. The answers came back flat: 670 rewrites between 0.20 and
 * 0.58, and 229 one-character typos scoring the same as
 * `Hook Lab — 10 scroll-stopping opening lines for any topic -> hook-lab`.
 *
 * This asks something the description can answer. If the directory is not a
 * usable name for the skill on its own, overwriting the name with it is wrong
 * whoever renamed what.
 */
export const DIRECTORY_IS_A_NAME = {
  type: 'boolean',
  instructions:
    'Taken on its own, `directoryName` is a complete and usable name for the skill that ' +
    '`description` describes — a reader who saw only that name would know which skill it is.',
  criteria: {
    true:
      'The directory names the skill. It may be shorter or more terse than the declared ' +
      'name, but it identifies the same thing and stands alone.',
    false:
      'The directory is where the skill is filed rather than what it is called: a fragment ' +
      'of the name, a generic word that only means something given its parent directory ' +
      '(`lib`, `core`, `auto`, `output`, `language`), a prefix shared with its siblings, or ' +
      'a marker of state rather than identity. On its own it does not identify this skill.',
  },
} as const

export type Judgement = {
  rewriteIsRight: number
  directoryIsAName: number
  why: string
  confidence: number
}
export type AskNames = (state: NameState) => Promise<Judgement>

async function jevAsk(): Promise<AskNames> {
  const ask = await openJev()
  return async (state) => {
    const answers = await ask(state, {
      rewriteIsRight: REWRITE_IS_RIGHT,
      directoryIsAName: DIRECTORY_IS_A_NAME,
      why: WHY_THEY_DIFFER,
    })
    const chosen = answers.chosen('why')
    return {
      rewriteIsRight: answers.probability('rewriteIsRight'),
      directoryIsAName: answers.probability('directoryIsAName'),
      why: chosen.choice,
      confidence: chosen.confidence,
    }
  }
}

const NAME = /^name:\s*(.+?)\s*$/mu
const DESCRIPTION = /^description:\s*(.+?)\s*$/mu

/** Every fixable `name` rewrite the audit offered, with its two strings. */
export function renamesIn(text: string, read: (repo: string, path: string) => string | undefined) {
  const out: Rename[] = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    let outcome: { repo?: string; findings?: unknown[] }
    try {
      outcome = JSON.parse(line) as { repo?: string; findings?: unknown[] }
    } catch {
      continue
    }
    const repo = outcome.repo
    if (typeof repo !== 'string' || !Array.isArray(outcome.findings)) continue
    for (const raw of outcome.findings) {
      const finding = raw as {
        check?: string
        text?: string
        fixable?: boolean
        path?: string
        suggestion?: string
      }
      if (finding.check !== 'skill/frontmatter' || finding.text !== 'name') continue
      if (finding.fixable !== true) continue
      const path = finding.path
      const suggested = finding.suggestion
      if (typeof path !== 'string' || typeof suggested !== 'string') continue
      const head = read(repo, path)
      if (head === undefined) continue
      const current = NAME.exec(head)?.[1]
        ?.trim()
        .replaceAll(/^["']|["']$/gu, '')
      if (current === undefined || current === '') continue
      out.push({
        repo,
        path,
        directory: path.split('/').at(-2) ?? '',
        current,
        suggested,
        description: (DESCRIPTION.exec(head)?.[1] ?? '').slice(0, 300),
      })
    }
  }
  return out
}

function readHead(repo: string, path: string): string | undefined {
  try {
    return readFileSync(join(REPOS_DIR, repo.replace('/', '__'), path), 'utf8').slice(0, 1500)
  } catch {
    return undefined
  }
}

type Answer = Rename & Judgement

/** The distribution, and the classes under it. */
export function report(answers: readonly Answer[]): string {
  const lines: string[] = []
  const edges = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.01]
  lines.push('  P(a maintainer would accept the rewrite)   rewrites    share')
  for (const [i, lo] of edges.slice(0, -1).entries()) {
    const hi = edges[i + 1] ?? 1.01
    const n = answers.filter((a) => a.rewriteIsRight >= lo && a.rewriteIsRight < hi).length
    const share = answers.length === 0 ? 0 : Math.round((n * 100) / answers.length)
    lines.push(
      `  ${lo.toFixed(2)}-${Math.min(1, hi).toFixed(2)} ${String(n).padStart(33)} ${String(share).padStart(7)}%`,
    )
  }
  lines.push(
    '',
    `  ${'class'.padEnd(24)}${'n'.padStart(6)}${'dir is a name'.padStart(15)}${'dir is not'.padStart(13)}`,
  )
  for (const why of [...new Set(answers.map((a) => a.why))].toSorted()) {
    const rows = answers.filter((a) => a.why === why)
    const yes = rows.filter((a) => a.directoryIsAName >= 0.8).length
    const no = rows.filter((a) => a.directoryIsAName <= 0.2).length
    lines.push(
      `  ${why.padEnd(24)}${String(rows.length).padStart(6)}${String(yes).padStart(15)}${String(no).padStart(13)}`,
    )
  }
  return lines.join('\n')
}

export async function namesMain(
  limit: number | undefined,
  concurrency: number,
  dryRun: boolean,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskNames,
): Promise<number> {
  if (!dryRun && askWith === undefined) requireKey('names')
  if (!existsSync(RESULTS)) {
    process.stderr.write(`${RESULTS} is missing; run pnpm discovery run first\n`)
    return 2
  }
  const all = renamesIn(readFileSync(RESULTS, 'utf8'), readHead)
  const asked = limit === undefined ? all : all.slice(0, limit)
  process.stderr.write(
    `${all.length} fixable name rewrites in ${new Set(all.map((r) => r.repo)).size} repositories; asking ${asked.length}\n`,
  )
  if (dryRun) {
    for (const rename of asked.slice(0, 5)) {
      process.stderr.write(`${JSON.stringify(stateOf(rename), null, 2)}\n`)
    }
    return 0
  }
  const ask = askWith ?? (await jevAsk())
  const { answered } = await runPass({
    items: asked,
    width: concurrency,
    every: 100,
    nameOf: (rename) => `${rename.repo} ${rename.current}`,
    answer: async (rename): Promise<Answer> => ({ ...rename, ...(await ask(stateOf(rename))) }),
  })
  writeFileSync(OUT, `${answered.map((a) => JSON.stringify(a)).join('\n')}\n`, 'utf8')
  process.stderr.write(`\n${answered.length} of ${asked.length} answered; ${OUT}\n\n`)
  process.stdout.write(`${report(answered)}\n\n`)

  const refused = answered
    .filter((a) => a.directoryIsAName <= 0.2)
    .toSorted((p, q) => p.directoryIsAName - q.directoryIsAName)
  process.stdout.write(
    `${refused.length} of ${answered.length} would overwrite the name with something that ` +
      'does not name the skill\n(p <= 0.20). The twenty clearest:\n\n',
  )
  for (const a of refused.slice(0, 20)) {
    process.stdout.write(
      `  ${a.directoryIsAName.toFixed(2)}  ${a.why}\n        ${a.current} -> ${a.suggested}\n` +
        `        ${a.repo}  ${a.path}\n`,
    )
  }
  process.stdout.write(
    '\nNo ruling here. Nothing in this output is a precision, none of it enters ' +
      'CLASSIFICATION.md,\nand none of it moves a condition of ADR-0006 — but every row is an ' +
      'edit `--fix` would make\ntoday, and condition 2 admits no false positive among those at ' +
      'any rate.\n',
  )
  return 0
}
