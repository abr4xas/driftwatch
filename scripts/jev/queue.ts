/**
 * The order a person should read a repository's findings in.
 *
 * Condition 6 counts **repositories with zero false positives**, so declaring a
 * repository dirty costs exactly one ruling — the first false positive found —
 * and declaring it clean costs all of them. `BuilderIO/agent-native` has 247
 * findings and one of them decides its column. Read in the wrong order that is
 * 247 rulings; read worst-first it is usually one.
 *
 *   pnpm discovery queue [--repos a,b,c] [--limit N] [--concurrency 12]
 *
 * **This orders; it does not adjudicate.** The spec is explicit that confidence
 * may be used to sequence work and never to decide it, and `CONTEXT.md` is
 * explicit that a ruling is a person's and nothing else produces one. Every row
 * this prints still has to be read against the real repository before it counts
 * as anything.
 *
 * The question is `CLAIMS_A_PATH`, unchanged and unreworded, asked of the
 * finding's own sentence, and **it is the wrong instrument for this job** —
 * measured, not suspected. Against the 28 ruled `path/missing` findings of the
 * certification corpus it orders 25 readings where arbitrary order takes 26.
 *
 * The reason is worth keeping, because it says what the right question would
 * ask. `CLAIMS_A_PATH` asks whether the sentence puts a path forward. For a
 * true positive the answer is yes. For this corpus's false positives it is
 * *also* yes: a crate nickname, a runtime log, a generated bundle and a path
 * in the reader's own project are all put forward as paths, and are absent for
 * a reason that has nothing to do with the sentence. Ordering adjudication
 * needs a question about **why a path might legitimately be missing**, which
 * nobody has written.
 *
 * What is left unmeasured is whether it helps on a repository with hundreds of
 * findings, where the corpus has none to check against.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CORPUS_DIR } from '../lib/paths.ts'
import { REPOS_DIR, ROOT } from '../discovery/files.ts'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { CLAIMS_A_PATH } from './questions.ts'

const OUT = join(ROOT, 'queue.jsonl')
const RESULTS = join(ROOT, 'results.jsonl')
/**
 * The certification corpus can be queued too, and for a different reason: its
 * findings are already ruled, so the ordering can be checked against the only
 * labelled data this project has. Reading a finding's own prose is what a
 * person does to rule on it — ADR-0006 condition 9 contaminates on inspecting
 * a repository's **discards**, not on classifying its findings.
 */
const CORPUS_RESULTS = join(CORPUS_DIR, 'results.jsonl')

/** How much of the document a reader needs around the claim. */
const RADIUS = 2

export type Item = {
  repo: string
  path: string
  check: string
  text: string
  line: number
  window: string
}

export type QueueState = {
  repo: string
  file: string
  candidate: string
  sentence: string
}

export function stateOf(item: Item): QueueState {
  return { repo: item.repo, file: item.path, candidate: item.text, sentence: item.window }
}

/** The lines around a finding, which is what a person reads to rule on it. */
export function windowAround(content: string, line: number, radius = RADIUS): string {
  const lines = content.split('\n')
  return lines.slice(Math.max(0, line - 1 - radius), line + radius).join('\n')
}

/**
 * Every `path/missing` finding in the named repositories, with its prose.
 *
 * Only `path/missing`: it is 91% of what the tool reports and the only check
 * whose findings a sentence can speak to. A `link/broken` anchor and a
 * `script/missing` command are answered by the target document and the
 * manifest, not by the prose around them, and asking this question of them
 * would be asking an instrument something it was not built for.
 */
export function itemsIn(
  resultsText: string,
  repos: ReadonlySet<string> | undefined,
  read: (repo: string, path: string) => string | undefined,
): Item[] {
  const out: Item[] = []
  for (const line of resultsText.split('\n')) {
    if (line.trim() === '') continue
    let outcome: { repo?: unknown; findings?: unknown }
    try {
      outcome = JSON.parse(line) as { repo?: unknown; findings?: unknown }
    } catch {
      continue
    }
    const repo = outcome.repo
    if (typeof repo !== 'string') continue
    if (repos !== undefined && !repos.has(repo)) continue
    if (!Array.isArray(outcome.findings)) continue
    const contents = new Map<string, string | undefined>()
    for (const raw of outcome.findings) {
      const finding = raw as { check?: unknown; path?: unknown; text?: unknown; line?: unknown }
      if (finding.check !== 'path/missing') continue
      const { path, text, line: at } = finding
      if (typeof path !== 'string' || typeof text !== 'string' || typeof at !== 'number') continue
      if (!contents.has(path)) contents.set(path, read(repo, path))
      const content = contents.get(path)
      if (content === undefined) continue
      out.push({
        repo,
        path,
        check: 'path/missing',
        text,
        line: at,
        window: windowAround(content, at),
      })
    }
  }
  return out
}

function readerIn(dir: string) {
  return (repo: string, path: string): string | undefined => {
    try {
      return readFileSync(join(dir, repo.replace('/', '__'), path), 'utf8')
    } catch {
      return undefined
    }
  }
}

type Answer = Item & { claimsAPath: number }
export type AskQueue = (state: QueueState) => Promise<number>

async function jevAsk(): Promise<AskQueue> {
  const ask = await openJev()
  return async (state) =>
    (await ask(state, { claimsAPath: CLAIMS_A_PATH })).probability('claimsAPath')
}

/**
 * One block per repository, worst first, and repositories ordered by how
 * cheaply they can be settled.
 *
 * A repository whose most doubtful finding is very doubtful is one ruling away
 * from being decided; one whose findings all read as real claims may take all
 * of them. Sorting by the minimum puts the cheap decisions at the top of the
 * page, which is the whole point of the ordering.
 */
export function queueOf(answers: readonly Answer[]): string {
  const byRepo = new Map<string, Answer[]>()
  for (const answer of answers) {
    byRepo.set(answer.repo, [...(byRepo.get(answer.repo) ?? []), answer])
  }
  const blocks = [...byRepo.entries()]
    .map(([repo, rows]) => ({ repo, rows: rows.toSorted((p, q) => p.claimsAPath - q.claimsAPath) }))
    .toSorted((a, b) => (a.rows[0]?.claimsAPath ?? 1) - (b.rows[0]?.claimsAPath ?? 1))

  const lines: string[] = []
  for (const { repo, rows } of blocks) {
    const lowest = rows[0]?.claimsAPath ?? 1
    lines.push(`\n${repo}  ${rows.length} finding(s), most doubtful at ${lowest.toFixed(2)}`)
    for (const row of rows.slice(0, 5)) {
      lines.push(
        `  ${row.claimsAPath.toFixed(2)}  ${row.path}:${row.line}  ${row.text}\n` +
          `        ${row.window.replaceAll('\n', ' ⏎ ').trim().slice(0, 150)}`,
      )
    }
    if (rows.length > 5) lines.push(`  … and ${rows.length - 5} more, higher up`)
  }
  return lines.join('\n')
}

export async function queueMain(
  repos: ReadonlySet<string> | undefined,
  limit: number | undefined,
  concurrency: number,
  dryRun: boolean,
  /** Queue the certification corpus instead, whose findings carry rulings. */
  certification = false,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskQueue,
): Promise<number> {
  if (!dryRun && askWith === undefined) requireKey('queue')
  const results = certification ? CORPUS_RESULTS : RESULTS
  if (!existsSync(results)) {
    process.stderr.write(
      `${results} is missing; run ${certification ? 'pnpm corpus --json' : 'pnpm discovery run'} first\n`,
    )
    return 2
  }
  const read = readerIn(certification ? join(CORPUS_DIR, 'repos') : REPOS_DIR)
  const all = itemsIn(readFileSync(results, 'utf8'), repos, read)
  const asked = limit === undefined ? all : all.slice(0, limit)
  process.stderr.write(
    `${asked.length} path/missing findings in ${new Set(asked.map((i) => i.repo)).size} repositories\n`,
  )
  if (dryRun) {
    for (const item of asked.slice(0, 3)) {
      process.stderr.write(`${JSON.stringify(stateOf(item), null, 2)}\n`)
    }
    return 0
  }
  const ask = askWith ?? (await jevAsk())
  const { answered } = await runPass({
    items: asked,
    width: concurrency,
    every: 100,
    nameOf: (item) => `${item.repo} ${item.text}`,
    answer: async (item): Promise<Answer> => ({ ...item, claimsAPath: await ask(stateOf(item)) }),
  })
  // Two populations, two files: a certification run must not overwrite the
  // discovery queue, because the comparison between them is the point.
  const out = certification ? join(ROOT, 'queue-certification.jsonl') : OUT
  writeFileSync(out, `${answered.map((a) => JSON.stringify(a)).join('\n')}\n`, 'utf8')
  process.stderr.write(`\n${answered.length} of ${asked.length} answered; ${out}\n`)
  process.stdout.write(`${queueOf(answered)}\n`)
  process.stdout.write(
    '\nThis is a reading order and nothing else. A low number is a finding worth ' +
      'reading first,\nnot a false positive: no ruling exists until a person opens the ' +
      'repository. Nothing here is\na precision and none of it enters CLASSIFICATION.md.\n',
  )
  return 0
}
