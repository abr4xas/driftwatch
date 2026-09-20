/**
 * Does grouping **draw** the classes, rather than pick from them?
 *
 * Ticket `01` asked Jev to choose a finding's class from the nine a person had
 * already named, and it reproduced ten of eleven. That is a different question
 * from this one, and the difference is the whole point: a model that can label
 * against a taxonomy still cannot tell you the taxonomy is missing an entry.
 *
 * Here nothing names a class. Every pair of adjudicated findings is asked
 * whether the two share a **root cause**, and the answers are unioned into
 * groups. Then the groups are compared with the partition a person drew. If
 * the emergent grouping recovers that partition, the same procedure can be
 * pointed at the wild findings, where nobody has named anything and a large
 * homogeneous group is a class worth a rule. If it lumps everything together,
 * that is worth knowing at 666 pairs rather than at a hundred thousand.
 *
 *   pnpm corpus-classes [--dry-run] [--concurrency N]
 *
 * **Nothing here writes a verdict or a class.** The output is a comparison in
 * `.scratch/`; `CLASSIFICATION.md` is written by a person and stays that way.
 */
import type { Experimental_EvaluationQuestion } from 'ai'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { messageOf } from '../src/core/errors.ts'
import { slugOf } from './corpus-repos.ts'
import { type Row, rowsIn, windowAround } from './corpus-classify.ts'

const HERE = import.meta.dirname
const CORPUS = join(HERE, '..', 'test', 'corpus')
const OUT = join(HERE, '..', 'test', 'discovery', 'corpus-classes.jsonl')
const MODEL = process.env['DISCOVERY_MODEL'] ?? 'typesafe-ai/jev'

/**
 * Strict, and for the reason ticket `17` gives about merging.
 *
 * Joining two findings takes a distinction out of every count that follows,
 * which is the same shape as a false positive in the tool. Splitting one that
 * belongs together only leaves the taxonomy where it already was.
 */
export const MERGE_AT = 0.8

/** What a judgement sees: two findings, each with the prose around it. */
export type PairState = {
  first: { repo: string; file: string; check: string; claim: string; prose: string }
  second: { repo: string; file: string; check: string; claim: string; prose: string }
}

function sideOf(row: Row, prose: string): PairState['first'] {
  const [path = ''] = row.location.split(':')
  return { repo: row.repo, file: path, check: row.check, claim: row.claim, prose }
}

export function pairStateOf(a: Row, aProse: string, b: Row, bProse: string): PairState {
  return { first: sideOf(a, aProse), second: sideOf(b, bProse) }
}

/**
 * The question, and the `false` criterion is the one doing the work.
 *
 * Two findings from this corpus are alike in every superficial way — both are
 * a path that a checker could not resolve, usually in a Markdown file, often
 * `path/missing`. Asked whether they are "similar", everything is. What the
 * taxonomy is actually made of is **why the tool was wrong**, so the criteria
 * say that and give the contrast explicitly.
 *
 * Phrased as a statement, per the Noul guidance, and with no hint that a list
 * of classes exists: naming even one would be handing over the answer the pass
 * exists to see whether it can find.
 */
export const SAME_CAUSE: Experimental_EvaluationQuestion = {
  type: 'boolean',
  instructions:
    'These two findings have the same underlying cause: whatever is true of one — why the ' +
    'document reads the way it does, and why a checker did or did not resolve it — is true ' +
    'of the other for the same reason. A maintainer fixing one would fix the other by the ' +
    'same move, and a rule written for one would cover the other without being widened.',
  criteria: {
    true:
      'One explanation covers both. The kind of string, the kind of document and the reason ' +
      'it does or does not name a real file are the same; only the repository and the words ' +
      'differ.',
    false:
      'Two explanations are needed. They may both be unresolved paths in Markdown, both ' +
      'reported by the same check, and still be two different situations — a stand-in that ' +
      'was never meant to exist is not a file produced by a build, and neither is a path ' +
      'belonging to somebody else’s project. Superficial likeness is not a shared cause.',
  },
}

/** The prose a person had when they ruled on the finding. */
function proseOf(row: Row): string {
  const [path = '', line = '1'] = row.location.split(':')
  const absolute = join(CORPUS, 'repos', slugOf(row.repo), path)
  if (!existsSync(absolute)) return ''
  return windowAround(readFileSync(absolute, 'utf8'), Number(line))
}

export type Pair = { a: Row; b: Row }

/** Every unordered pair, once. */
export function pairsOf(rows: readonly Row[]): Pair[] {
  const pairs: Pair[] = []
  for (const [i, a] of rows.entries()) {
    for (const b of rows.slice(i + 1)) pairs.push({ a, b })
  }
  return pairs
}

export type Judged = { a: number; b: number; probability: number; same: boolean }

/**
 * Groups, by union-find over the confirmed pairs.
 *
 * Transitive on purpose and for ticket `17`'s reason: if A and B share a cause
 * and B and C do, the three are one class, and counting them as two would be
 * the thing this pass is checking for, halved.
 */
export function groupsOf(rows: readonly Row[], judged: readonly Judged[]): number[][] {
  const parent = new Map<number, number>(rows.map((row) => [row.id, row.id]))
  const find = (id: number): number => {
    let at = id
    while (parent.get(at) !== at) at = parent.get(at) ?? at
    return at
  }
  for (const verdict of judged) {
    if (!verdict.same) continue
    const [x, y] = [find(verdict.a), find(verdict.b)]
    if (x !== y) parent.set(x, y)
  }
  const byRoot = new Map<number, number[]>()
  for (const row of rows) {
    const root = find(row.id)
    const bucket = byRoot.get(root)
    if (bucket === undefined) byRoot.set(root, [row.id])
    else bucket.push(row.id)
  }
  return [...byRoot.values()].map((ids) => ids.toSorted((p, q) => p - q))
}

/**
 * The label a person gave a finding, for scoring.
 *
 * A true positive has no class — the column holds `—` — and two true positives
 * are not "the same class" merely by both being real. They are scored by
 * `check` plus the claim's shape instead, which is what `securego/gosec`'s four
 * `name` mismatches have in common and what makes them the one multi-member
 * group among the true findings.
 */
export function labelOf(row: Row): string {
  if (row.verdict === 'false') return row.className
  return `true:${row.check}:${row.repo}`
}

/** Pairs the person joined, pairs the model joined, and where they differ. */
export function agreement(
  rows: readonly Row[],
  judged: readonly Judged[],
): { together: number; joined: number; both: number; split: number; overJoined: number } {
  const labels = new Map(rows.map((row) => [row.id, labelOf(row)]))
  let together = 0
  let joined = 0
  let both = 0
  let split = 0
  let overJoined = 0
  for (const verdict of judged) {
    const same = labels.get(verdict.a) === labels.get(verdict.b)
    if (same) together += 1
    if (verdict.same) joined += 1
    if (same && verdict.same) both += 1
    if (same && !verdict.same) split += 1
    if (!same && verdict.same) overJoined += 1
  }
  return { together, joined, both, split, overJoined }
}

export function formatGroups(rows: readonly Row[], groups: readonly number[][]): string {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const lines: string[] = []
  for (const group of groups.toSorted((p, q) => q.length - p.length || (p[0] ?? 0) - (q[0] ?? 0))) {
    const members = group.map((id) => byId.get(id)).filter((row) => row !== undefined)
    const drawn = [...new Set(members.map((row) => labelOf(row)))]
    lines.push(`group of ${group.length}  [person: ${drawn.join(', ')}]`)
    for (const row of members) {
      lines.push(
        `    ${String(row.id).padStart(2)}  ${row.verdict.padEnd(5)} ${row.repo} — ${row.claim}`,
      )
    }
  }
  return lines.join('\n')
}

/**
 * Jev through the AI Gateway, loaded on demand: it is an `evaluation` model, so
 * `generateText` refuses it and the other scripts have no use for the import.
 */
async function jevAsk(): Promise<(state: PairState) => Promise<number>> {
  const { experimental_evaluate: evaluate } = await import('ai')
  return async (state) => {
    const { answers } = await evaluate({
      model: MODEL,
      state,
      questions: { sameCause: SAME_CAUSE },
    })
    const answer = answers.sameCause
    if (answer.type !== 'boolean') throw new Error(`expected a boolean answer, got ${answer.type}`)
    return answer.probability
  }
}

function requireKey(): void {
  if ((process.env['AI_GATEWAY_API_KEY'] ?? '') !== '') return
  throw new Error(
    'this pass needs a Vercel AI Gateway key: set AI_GATEWAY_API_KEY in .env.local ' +
      '(pnpm corpus-classes loads it) or in the environment.',
  )
}

export async function classesMain(dryRun: boolean, concurrency: number): Promise<number> {
  if (!dryRun) requireKey()
  const rows = rowsIn(readFileSync(join(CORPUS, 'CLASSIFICATION.md'), 'utf8'))
  if (rows.length === 0) throw new Error('no per-finding rows in CLASSIFICATION.md')
  const pairs = pairsOf(rows)
  const drawn = new Set(rows.map((row) => labelOf(row)))
  process.stderr.write(
    `${rows.length} findings (${rows.filter((r) => r.verdict === 'false').length} false), ` +
      `${drawn.size} groups a person drew, ${pairs.length} pairs\n`,
  )

  if (dryRun) {
    const [first] = pairs
    if (first !== undefined) {
      process.stderr.write(
        `${JSON.stringify(pairStateOf(first.a, proseOf(first.a), first.b, proseOf(first.b)), null, 2)}\n`,
      )
    }
    return 0
  }

  const ask = await jevAsk()
  const { inFlight } = await import('./discovery-filter.ts')
  let done = 0
  const answers = await inFlight(pairs, concurrency, async (pair) => {
    try {
      const probability = await ask(pairStateOf(pair.a, proseOf(pair.a), pair.b, proseOf(pair.b)))
      done += 1
      if (done % 50 === 0) process.stderr.write(`  ${done}/${pairs.length}\n`)
      return { a: pair.a.id, b: pair.b.id, probability, same: probability >= MERGE_AT }
    } catch (cause) {
      // Unanswered rather than a `no`: a request that failed is not a
      // judgement, and scoring it as one would flatter or damn the model for
      // the network. Ticket `17` makes the same distinction.
      process.stderr.write(`  ${pair.a.id}~${pair.b.id}: ${messageOf(cause)}\n`)
      return undefined
    }
  })
  const judged = answers.filter((verdict) => verdict !== undefined)
  writeFileSync(OUT, `${judged.map((v) => JSON.stringify(v)).join('\n')}\n`, 'utf8')

  const groups = groupsOf(rows, judged)
  const score = agreement(rows, judged)
  process.stderr.write(
    `\n${judged.length} of ${pairs.length} judged; ${groups.length} groups against ` +
      `${drawn.size} a person drew; ${OUT}\n\n`,
  )
  process.stdout.write(`${formatGroups(rows, groups)}\n\n`)
  process.stdout.write(
    `pairs a person put together: ${score.together}\n` +
      `pairs Jev put together:     ${score.joined}\n` +
      `  both agreed:              ${score.both}\n` +
      `  person joined, Jev split: ${score.split}\n` +
      `  Jev joined, person split: ${score.overJoined}\n\n` +
      'Not a measurement of driftwatch. Nothing here writes a verdict or a class.\n',
  )
  return 0
}

function numberFlag(argv: readonly string[], flag: string): number | undefined {
  const at = argv.indexOf(flag)
  if (at === -1) return undefined
  const value = Number(argv[at + 1])
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${flag} wants a positive integer`)
  return value
}

if (process.argv[1] === import.meta.filename) {
  try {
    process.exitCode = await classesMain(
      process.argv.includes('--dry-run'),
      numberFlag(process.argv, '--concurrency') ?? 8,
    )
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    process.exitCode = 2
  }
}
