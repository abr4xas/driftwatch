/**
 * The classes nobody has named, from the findings nobody has ruled on.
 *
 * `corpus-classes.ts` established that pairwise root-cause grouping recovers
 * the taxonomy a person drew over the 66 — one merge, the right one, and no
 * merge a person would call wrong in 666 pairs. This points the same question
 * at the 35 304 findings the tool makes over 2533 wild repositories, where
 * nobody has ruled on anything and there is no taxonomy to recover.
 *
 * What comes out is groups, not names. A **large homogeneous group** is a
 * class worth a person reading twenty examples of, and whatever rule that
 * reading suggests is written by hand in `src/` and measured against the 66.
 * Nothing here decides that a finding is wrong: there is no verdict in this
 * corpus and this pass does not manufacture one.
 *
 *   pnpm discovery findings [--sample 100] [--per-repo 2] [--concurrency 10]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { slugOf } from '../corpus/repos.ts'
import { windowAround } from './classify.ts'
import { groupsOf, type Judged, MERGE_AT, SAME_CAUSE } from './classes.ts'
import { spread } from './claims.ts'
import { familyIndex } from '../discovery/discards.ts'
import { FAMILIES, jsonlIn, REPOS_DIR, RESULTS, ROOT } from '../discovery/files.ts'

const OUT = join(ROOT, 'finding-groups.jsonl')

/** One finding the tool made, with an id this pass gives it. */
export type Wild = {
  id: number
  repo: string
  path: string
  check: string
  text: string
  line: number
}

type Side = { repo: string; file: string; check: string; claim: string; prose: string }
export type PairState = { first: Side; second: Side }

function proseOf(finding: Wild): string {
  const absolute = join(REPOS_DIR, slugOf(finding.repo), finding.path)
  if (!existsSync(absolute)) return ''
  return windowAround(readFileSync(absolute, 'utf8'), finding.line)
}

function sideOf(finding: Wild): Side {
  return {
    repo: finding.repo,
    file: finding.path,
    check: finding.check,
    claim: finding.text,
    prose: proseOf(finding),
  }
}

export function pairStateOf(a: Wild, b: Wild): PairState {
  return { first: sideOf(a), second: sideOf(b) }
}

/**
 * The findings worth asking about, with the two caps this corpus has taught.
 *
 * One document per family, because a third of what the corpus holds is a copy
 * of another repository's document (`17`) and a template's finding is one
 * finding. And at most `perRepo` from any repository, because 792 repositories
 * carry the 35 304 findings and the largest of them carry hundreds — without
 * the cap the groups are a portrait of whichever skill farm had the most.
 */
export function eligible(
  results: Iterable<unknown>,
  families: ReadonlyMap<string, string>,
  perRepo: number,
): Wild[] {
  const seen = new Set<string>()
  const perRepoCount = new Map<string, number>()
  const kept: Wild[] = []
  let id = 0
  for (const parsed of results) {
    const result = parsed as { repo?: string; ok?: boolean; findings?: unknown[] }
    if (typeof result.repo !== 'string' || result.ok !== true) continue
    for (const raw of result.findings ?? []) {
      const finding = raw as { check?: string; path?: string; text?: string; line?: number }
      if (typeof finding.check !== 'string' || typeof finding.path !== 'string') continue
      if (typeof finding.text !== 'string') continue
      const family = families.get(`${result.repo}|${finding.path}`)
      if (family !== undefined) {
        const key = `${family}|${finding.check}|${finding.text}`
        if (seen.has(key)) continue
        seen.add(key)
      }
      const count = perRepoCount.get(result.repo) ?? 0
      if (count >= perRepo) continue
      perRepoCount.set(result.repo, count + 1)
      id += 1
      kept.push({
        id,
        repo: result.repo,
        path: finding.path,
        check: finding.check,
        text: finding.text,
        line: finding.line ?? 1,
      })
    }
  }
  return kept
}

/**
 * The deterministic block a finding belongs to: its check, and the shape of
 * the thing it names.
 *
 * Asking across blocks is asking whether a missing directory and a missing
 * `.md` have the same cause, and the answer is no 4950 times out of 4950 —
 * that was the first run of this pass, and the fault was the sampling rather
 * than the question. A shared cause is only possible between findings that are
 * already alike in the ways arithmetic can see, so arithmetic picks the
 * neighbourhoods and the judgement works inside them.
 */
export function blockOf(finding: Wild): string {
  if (finding.text.endsWith('/')) return `${finding.check}|directory`
  const extension = /\.([A-Za-z0-9]{1,6})$/u.exec(finding.text)
  return `${finding.check}|${extension === null ? 'no-extension' : extension[1]}`
}

/** The `blocks` largest neighbourhoods, `perBlock` findings from each. */
export function blocked(
  pool: readonly Wild[],
  blocks: number,
  perBlock: number,
): Map<string, Wild[]> {
  const byBlock = new Map<string, Wild[]>()
  for (const finding of pool) {
    const block = blockOf(finding)
    const bucket = byBlock.get(block)
    if (bucket === undefined) byBlock.set(block, [finding])
    else bucket.push(finding)
  }
  const biggest = [...byBlock.entries()]
    .toSorted((p, q) => q[1].length - p[1].length)
    .slice(0, blocks)
  return new Map(biggest.map(([block, found]) => [block, spread(found, perBlock)]))
}

export function formatGroups(findings: readonly Wild[], groups: readonly number[][]): string {
  const byId = new Map(findings.map((finding) => [finding.id, finding]))
  const lines: string[] = []
  for (const group of groups.toSorted((p, q) => q.length - p.length)) {
    if (group.length < 2) continue
    lines.push(`group of ${group.length}`)
    for (const id of group) {
      const finding = byId.get(id)
      if (finding === undefined) continue
      lines.push(
        `    ${finding.check.padEnd(20)} ${finding.repo}  ${finding.path}:${finding.line}\n` +
          `        ${finding.text}`,
      )
    }
    lines.push('')
  }
  const singles = groups.filter((group) => group.length === 1).length
  lines.push(`and ${singles} findings in a group of their own`)
  return lines.join('\n')
}

async function jevAsk(): Promise<(state: PairState) => Promise<number>> {
  const ask = await openJev()
  return async (state) => (await ask(state, { sameCause: SAME_CAUSE })).probability('sameCause')
}

/** What the pass asks: two wild findings in, a probability out. */
export type AskSameCause = (state: PairState) => Promise<number>

export async function findingsMain(
  perBlock: number,
  perRepo: number,
  concurrency: number,
  dryRun: boolean,
  blocks = 3,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskSameCause,
): Promise<number> {
  if (!dryRun && askWith === undefined) requireKey('findings')
  if (!existsSync(RESULTS)) {
    process.stderr.write(`${RESULTS} is missing; run pnpm discovery run first\n`)
    return 2
  }
  const families = existsSync(FAMILIES) ? familyIndex(readFileSync(FAMILIES, 'utf8')) : new Map()
  const pool = eligible(jsonlIn(readFileSync(RESULTS, 'utf8')), families, perRepo)
  const neighbourhoods = blocked(pool, blocks, perBlock)
  const asked = [...neighbourhoods.values()].flat()
  // Pairs inside a block only. Across blocks the answer is already known.
  const pairs: { a: Wild; b: Wild }[] = []
  for (const found of neighbourhoods.values()) {
    for (const [i, a] of found.entries()) for (const b of found.slice(i + 1)) pairs.push({ a, b })
  }
  process.stderr.write(
    `${pool.length} findings after one per family and ${perRepo} per repository\n` +
      [...neighbourhoods].map(([b, f]) => `  ${b}: ${f.length}`).join('\n') +
      `\ngrouping ${asked.length} of them, ${pairs.length} pairs inside blocks\n`,
  )

  if (dryRun) {
    const [first] = pairs
    if (first !== undefined) {
      process.stderr.write(`${JSON.stringify(pairStateOf(first.a, first.b), null, 2)}\n`)
    }
    return 0
  }

  const ask = askWith ?? (await jevAsk())
  const { answered } = await runPass({
    items: pairs,
    width: concurrency,
    every: 200,
    nameOf: (pair) => `${pair.a.id}~${pair.b.id}`,
    answer: async (pair): Promise<Judged> => {
      const probability = await ask(pairStateOf(pair.a, pair.b))
      return { a: pair.a.id, b: pair.b.id, probability, same: probability >= MERGE_AT }
    },
  })
  const judged = answered
  writeFileSync(OUT, `${judged.map((v) => JSON.stringify(v)).join('\n')}\n`, 'utf8')

  const groups = groupsOf(
    asked.map((finding) => finding.id),
    judged,
  )
  const grouped = groups.filter((group) => group.length > 1)
  process.stderr.write(
    `\n${judged.length} of ${pairs.length} judged; ${grouped.length} groups of more than one, ` +
      `largest ${Math.max(0, ...groups.map((group) => group.length))}; ${OUT}\n\n`,
  )
  process.stdout.write(`${formatGroups(asked, groups)}\n\n`)
  process.stdout.write(
    'No verdict here. These findings have never been ruled on, so a group is a place to\n' +
      'read, not a class of error. No number enters CLASSIFICATION.md.\n',
  )
  return 0
}
