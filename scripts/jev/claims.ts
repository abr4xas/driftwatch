/**
 * What a discard rule costs, rather than the most it could cost.
 *
 * Ticket `07` is careful that a row in its table is an **upper bound** on a
 * rule's cost and not its cost: 875 870 candidates thrown away by `bare-word`
 * is the number the rule touched, not the number of real claims it lost. The
 * one measurement that has ever priced a rule — releasing a gate and diffing
 * the findings — released 43 discards and produced zero new true findings.
 *
 * This asks the question directly, of a sample, one discard at a time: **does
 * this sentence say that this thing is a file in this repository?** A discard
 * where the answer is yes and the path is absent is a finding the tool did not
 * make. That is recall, not precision, and it is worth naming the direction
 * plainly because the two get confused: nothing here can produce a false
 * positive, and nothing here moves condition 6.
 *
 *   pnpm discovery claims [--cause bare-word] [--sample 800] [--per-repo 2]
 *
 * Jev does not adjudicate. What comes out is a band and a pile of examples for
 * a person to read, and whatever rule that reading suggests is written by hand
 * in `src/` and measured against the 66.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { CLAIMS_A_PATH } from './questions.ts'
import { familyIndex } from '../discovery/discards.ts'
import { DISCARDS, FAMILIES, ROOT } from '../discovery/files.ts'

const OUT = join(ROOT, 'claims.jsonl')

/** One discarded candidate, as much of it as a judgement needs. */
export type Candidate = {
  repo: string
  path: string
  cause: string
  text: string
  line: number
  window: string
}

export type ClaimState = {
  repo: string
  file: string
  candidate: string
  sentence: string
}

export function stateOf(candidate: Candidate): ClaimState {
  return {
    repo: candidate.repo,
    file: candidate.path,
    candidate: candidate.text,
    sentence: candidate.window,
  }
}

/**
 * The candidates worth asking about, capped so the farms do not answer for
 * everyone.
 *
 * Two constraints, both learned rather than assumed. One document per family,
 * because a third of the discards are a copy of another repository's document
 * (`17`). And at most `perRepo` from any one repository, because twelve
 * repositories hold 35% of the corpus's documents and `Sandeeprdy1729/skill_galaxy`
 * alone holds 10 293 — without the cap the sample is a survey of one skill
 * farm's prose style.
 */
export type Chooser = {
  offer: (record: Candidate & { exists?: boolean }) => void
  kept: () => Candidate[]
  considered: () => number
}

export function chooser(
  cause: string,
  families: ReadonlyMap<string, string>,
  perRepo: number,
): Chooser {
  const seen = new Set<string>()
  const perRepoCount = new Map<string, number>()
  const kept: Candidate[] = []
  let considered = 0
  return {
    offer(record) {
      if (record.cause !== cause) return
      // Only the ones not known to be satisfied: a discard naming a file that
      // is right there cost nothing whatever the sentence says, and asking
      // about it would be asking about the rule's harmless majority. `07`'s
      // sampler makes the same cut for the same reason.
      if (record.exists === true) return
      considered += 1
      const family = families.get(`${record.repo}|${record.path}`)
      if (family !== undefined) {
        const key = `${family}|${record.cause}|${record.text}`
        if (seen.has(key)) return
        seen.add(key)
      }
      const count = perRepoCount.get(record.repo) ?? 0
      if (count >= perRepo) return
      perRepoCount.set(record.repo, count + 1)
      kept.push({
        repo: record.repo,
        path: record.path,
        cause: record.cause,
        text: record.text,
        line: record.line,
        window: record.window,
      })
    },
    kept: () => kept,
    considered: () => considered,
  }
}

/**
 * Evenly spaced rather than random, so a rerun asks the same questions.
 *
 * The same choice `17`'s stratified sample makes, for the same reason: a
 * sample nobody can reproduce is a number nobody can check.
 */
export function spread<T>(items: readonly T[], want: number): T[] {
  if (items.length <= want) return [...items]
  const picked: T[] = []
  for (let k = 0; k < want; k += 1) {
    const item = items[Math.floor((k * items.length) / want)]
    if (item !== undefined) picked.push(item)
  }
  return picked
}

/** The distribution, which is the thing the pass is for. */
export function bandTable(probabilities: readonly number[]): string {
  const edges = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.01]
  const lines = ['  P(claims a path)   candidates    share']
  for (const [i, lo] of edges.slice(0, -1).entries()) {
    const hi = edges[i + 1] ?? 1.01
    const n = probabilities.filter((p) => p >= lo && p < hi).length
    const share = probabilities.length === 0 ? 0 : Math.round((n * 100) / probabilities.length)
    lines.push(
      `  ${lo.toFixed(2)}-${Math.min(1, hi).toFixed(2)} ${String(n).padStart(14)} ${String(share).padStart(7)}%`,
    )
  }
  return lines.join('\n')
}

type Answer = Candidate & { probability: number }

async function jevAsk(): Promise<(state: ClaimState) => Promise<number>> {
  const ask = await openJev()
  return async (state) =>
    (await ask(state, { claimsAPath: CLAIMS_A_PATH })).probability('claimsAPath')
}

async function* recordsIn(): AsyncGenerator<Candidate & { exists?: boolean }> {
  const { createReadStream } = await import('node:fs')
  const { createInterface } = await import('node:readline')
  const reader = createInterface({
    input: createReadStream(DISCARDS, 'utf8'),
    crlfDelay: Number.POSITIVE_INFINITY,
  })
  for await (const line of reader) {
    if (line.trim() === '') continue
    try {
      const parsed = JSON.parse(line) as Partial<Candidate>
      if (typeof parsed.cause !== 'string' || typeof parsed.repo !== 'string') continue
      yield parsed as Candidate & { exists?: boolean }
    } catch {
      continue
    }
  }
}

/** What the pass asks: one sentence in, a probability out. */
export type AskClaimsAPath = (state: ClaimState) => Promise<number>

export async function claimsMain(
  cause: string,
  want: number,
  perRepo: number,
  concurrency: number,
  dryRun: boolean,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskClaimsAPath,
): Promise<number> {
  if (!dryRun) requireKey('claims')
  if (!existsSync(DISCARDS)) {
    process.stderr.write(`${DISCARDS} is missing; run pnpm discovery discards first\n`)
    return 2
  }
  const families = existsSync(FAMILIES) ? familyIndex(readFileSync(FAMILIES, 'utf8')) : new Map()
  const pick = chooser(cause, families, perRepo)
  for await (const record of recordsIn()) pick.offer(record)
  const pool = pick.kept()
  const asked = spread(pool, want)
  process.stderr.write(
    `${pick.considered()} ${cause} discards not known to be satisfied; ` +
      `${pool.length} after one per family and ${perRepo} per repository; asking ${asked.length}\n`,
  )

  if (dryRun) {
    for (const candidate of asked.slice(0, 5)) {
      process.stderr.write(`${JSON.stringify(stateOf(candidate), null, 2)}\n`)
    }
    return 0
  }

  const ask = askWith ?? (await jevAsk())
  const { answered } = await runPass({
    items: asked,
    width: concurrency,
    nameOf: (candidate) => `${candidate.repo} ${candidate.text}`,
    answer: async (candidate): Promise<Answer> => ({
      ...candidate,
      probability: await ask(stateOf(candidate)),
    }),
  })
  const judged = answered
  writeFileSync(OUT, `${judged.map((a) => JSON.stringify(a)).join('\n')}\n`, 'utf8')

  const probabilities = judged.map((answer) => answer.probability)
  const strong = judged.filter((answer) => answer.probability >= 0.8)
  process.stderr.write(`\n${judged.length} of ${asked.length} answered; ${OUT}\n\n`)
  process.stdout.write(`${bandTable(probabilities)}\n\n`)
  process.stdout.write(
    `${strong.length} of ${judged.length} are put forward as a path by their sentence ` +
      `and are not there (p >= 0.8). The twenty highest:\n\n`,
  )
  for (const answer of strong.toSorted((p, q) => q.probability - p.probability).slice(0, 20)) {
    process.stdout.write(
      `  ${answer.probability.toFixed(2)}  ${answer.repo}  ${answer.path}:${answer.line}\n` +
        `        ${answer.text}\n` +
        `        ${answer.window.replaceAll('\n', ' ').trim().slice(0, 140)}\n`,
    )
  }
  process.stdout.write(
    '\nRecall, not precision. Nothing here is a driftwatch measurement, no number ' +
      'enters\nCLASSIFICATION.md, and none moves a condition of ADR-0006.\n',
  )
  return 0
}
