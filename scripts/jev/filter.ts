/**
 * The acquisition filter: the two judgements the spec names and nobody built.
 *
 * [`spec.md`](../.scratch/corpus-adjudication-at-scale/spec.md) §"Acquisition:
 * the GitHub API, filtered" calls this the place a model "earns the most per
 * unit of risk", and lists three questions over one state, evaluated in
 * parallel in a single request. Ticket `17` built the third — template family.
 * These are the other two:
 *
 * - **`Noul`** — does this document instruct an agent about *this* repository?
 *   ADR-0008 applied at acquisition instead of after the fact.
 * - **`Choice`** — is the repository a skills repo, a product that happens to
 *   carry skills, a template clone, or a fork with somebody else's context
 *   file vendored into it?
 *
 *   pnpm discovery filter [--limit N] [--dry-run] [--concurrency N]
 *
 * **It classifies; it decides nothing.** The output is a table over repositories
 * that carry no verdicts and measure nothing. A rule that comes out of reading
 * it is written by hand in `src/` and measured against the 66 that do.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Experimental_EvaluationQuestion } from 'ai'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { slugOf } from '../corpus/repos.ts'
import { FILTER, jsonlIn, readList, REPOS_DIR } from '../discovery/files.ts'

const EXCERPT = 1200

/**
 * The two questions, asked together over one document.
 *
 * `aboutThisRepo` is ADR-0008's distinction and its criteria are that ADR's
 * own words: a context file **instructs**, a specification **argues**, and
 * arguing means quoting paths that belong to other repositories, to
 * hypothetical ones, to the reader's, or to this one's future. Forty-three
 * findings and every one a false positive is what that costs when it goes
 * unasked.
 *
 * `repoKind` is the speculative half of the fan-out: it is asked for every
 * document and consumed per repository. A repository whose documents disagree
 * about what it is, is itself a finding worth looking at.
 */
export const QUESTIONS: Record<string, Experimental_EvaluationQuestion> = {
  aboutThisRepo: {
    type: 'boolean',
    instructions:
      'This document instructs an agent about the repository it sits in: the paths it names are paths in this repository, and an agent acting on them would be acting on this codebase.',
    criteria: {
      true: 'Instructions, conventions, layout or commands for working in this repository. The paths are meant to be here.',
      false:
        "It argues, specifies or teaches rather than instructs — a design document quoting other projects as evidence, a template, a test fixture, a tutorial, or a skill describing somebody else's codebase. The paths belong to another repository, to a hypothetical one, to the reader's, or to this repository's future.",
    },
  },
  repoKind: {
    type: 'choice',
    instructions:
      'What kind of repository is this document in? Answer from the repository name, the document, and the top-level entries.',
    criteria: {
      'skills-repo':
        'The repository exists to publish agent skills, prompts or context files. They are the product.',
      'product-with-skills':
        'A real project — a library, an application, a service — that also carries skills or context files for the agents working on it.',
      'template-clone':
        'A scaffold, starter or template, or a copy of one, whose content is meant to be replaced.',
      'fork-or-vendored':
        "A fork of another project, or a repository carrying somebody else's context files vendored inside it.",
      dotfiles:
        "Somebody's personal configuration: shell, editor, agent settings, kept for themselves rather than published as a product.",
    },
  },
}

export type Verdict = {
  repo: string
  path: string
  aboutThisRepo: number
  repoKind: string
  confidence: number
}

/** The documents a repository offers this pass, in the order they are judged. */
export function documentsOf(repo: string, dir: string, cap = 4): Array<[string, string]> {
  const listed = execFileSync(
    'git',
    ['-C', dir, 'ls-files', '--', '*CLAUDE.md', '*AGENTS.md', '*SKILL.md'],
    { encoding: 'utf8', maxBuffer: 1e8 },
  )
    .split('\n')
    .filter((rel) => rel.trim() !== '')
  // Shallowest first, then alphabetical: a repository's root `AGENTS.md` says
  // more about what the repository *is* than its fortieth skill, and the cap
  // is what keeps one monorepo from being most of the run.
  const ordered = listed.toSorted(
    (a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b),
  )
  const docs: Array<[string, string]> = []
  for (const rel of ordered.slice(0, cap)) {
    const absolute = join(dir, rel)
    // `git ls-files` reads the index and the sparse checkout may not have it.
    if (existsSync(absolute)) docs.push([rel, readFileSync(absolute, 'utf8')])
  }
  return docs
}

type State = { repo: string; file: string; topLevel: string; excerpt: string }

export function stateOf(repo: string, dir: string, path: string, content: string): State {
  let topLevel = ''
  try {
    topLevel = execFileSync('git', ['-C', dir, 'ls-tree', '--name-only', 'HEAD'], {
      encoding: 'utf8',
      maxBuffer: 1e7,
    })
      .split('\n')
      .filter(Boolean)
      .slice(0, 40)
      .join(', ')
  } catch {
    // A clone without a HEAD tree tells us nothing here and is not an error.
  }
  return {
    repo,
    file: path,
    topLevel,
    excerpt: content.length <= EXCERPT ? content : `${content.slice(0, EXCERPT)}\n…`,
  }
}

async function jevAsk(): Promise<(state: State) => Promise<Omit<Verdict, 'repo' | 'path'>>> {
  const ask = await openJev()
  return async (state) => {
    const answered = await ask(state, QUESTIONS)
    const kind = answered.chosen('repoKind')
    return {
      aboutThisRepo: answered.probability('aboutThisRepo'),
      repoKind: kind.choice,
      confidence: kind.confidence,
    }
  }
}

/** The table: what the corpus is made of, and how much of it is off-subject. */
export function tabulate(rows: readonly Verdict[]): string {
  const byRepo = new Map<string, string[]>()
  for (const row of rows) byRepo.set(row.repo, [...(byRepo.get(row.repo) ?? []), row.repoKind])
  const kinds = new Map<string, number>()
  for (const [, seen] of byRepo) {
    // A repository is whatever most of its documents say it is; a tie takes
    // the first, and a repository whose documents disagree is itself worth
    // looking at rather than worth resolving here.
    const tally = new Map<string, number>()
    for (const k of seen) tally.set(k, (tally.get(k) ?? 0) + 1)
    const best = [...tally].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown'
    kinds.set(best, (kinds.get(best) ?? 0) + 1)
  }
  const off = rows.filter((row) => row.aboutThisRepo < 0.5).length
  const width = Math.max(12, ...[...kinds.keys()].map((k) => k.length))
  return [
    `${rows.length} documents in ${byRepo.size} repositories`,
    `${off} judged not to be about the repository they sit in (p < 0.5)`,
    '',
    ...[...kinds]
      .toSorted((a, b) => b[1] - a[1])
      .map(([kind, n]) => `${kind.padEnd(width)}  ${String(n).padStart(5)} repos`),
    '',
    'Not a measurement of driftwatch. See AGENTS.md, "The discovery corpus is',
    'not a corpus in the same sense".',
  ].join('\n')
}

/** What the pass asks: one document in, the two judgements out. */
export type AskAboutDocument = (state: State) => Promise<Omit<Verdict, 'repo' | 'path'>>

export async function filterMain(
  limit: number | undefined,
  dryRun: boolean,
  width: number,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskAboutDocument,
): Promise<number> {
  if (!dryRun) requireKey('filter')
  const repos = readList().slice(0, limit)
  const work: Array<{ repo: string; dir: string; path: string; content: string }> = []
  for (const repo of repos) {
    const dir = join(REPOS_DIR, slugOf(repo))
    if (!existsSync(join(dir, '.git'))) continue
    for (const [path, content] of documentsOf(repo, dir)) work.push({ repo, dir, path, content })
  }
  process.stderr.write(`${work.length} documents to judge, ${width} at a time\n`)
  if (dryRun) {
    const [first] = work
    if (first !== undefined) {
      process.stderr.write(
        `${JSON.stringify(stateOf(first.repo, first.dir, first.path, first.content), null, 2)}\n`,
      )
    }
    return 0
  }

  const ask = askWith ?? (await jevAsk())
  const { answered: rows, failed } = await runPass({
    items: work,
    width,
    every: 250,
    nameOf: (item) => item.repo,
    answer: async (item) => ({
      repo: item.repo,
      path: item.path,
      ...(await ask(stateOf(item.repo, item.dir, item.path, item.content))),
    }),
  })
  writeFileSync(FILTER, rows.map((row) => JSON.stringify(row)).join('\n') + '\n', 'utf8')
  process.stderr.write(`\n${rows.length} judged, ${failed} failed; ${FILTER}\n\n`)
  process.stdout.write(`${tabulate(rows)}\n`)
  return 0
}

/** Every verdict a previous run wrote. */
export function verdictsIn(text: string): Verdict[] {
  const rows: Verdict[] = []
  for (const parsed of jsonlIn(text)) {
    const row = parsed as Partial<Verdict>
    if (typeof row.repo === 'string' && typeof row.repoKind === 'string') rows.push(row as Verdict)
  }
  return rows
}
