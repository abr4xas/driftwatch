/**
 * What a gate rules over, and where it reaches too far.
 *
 * A gate carries two things and they fail independently: the markers it knows,
 * and the **scope** each marker rules over. Jobs 1 to 3 of the spec all measure
 * the first. Ticket `16` found the second and then demonstrated how hard it is
 * to read: `hedged` held the right marker and `context-prose.ts` tests it as a
 * substring against a two-line window, so a sentence about optional
 * *parameters* silenced its neighbours and `haddocking/haddock3` lost three
 * files asserted in three consecutive sentences.
 *
 *   pnpm discovery scope [--family sentence|section] [--per-marker 120]
 *                        [--per-repo 2] [--concurrency 8] [--dry-run]
 *
 * Two questions over one state, in one request. Neither is interesting alone:
 *
 *   claimsAPath  the frozen `CLAIMS_A_PATH`, unchanged, so this run is
 *                comparable with `discovery claims` and with the baseline in
 *                ticket `27`.
 *   qualifies    whether the marker's qualification reaches *this* candidate.
 *
 * The cell that matters is the cross. **Claims a path and is not governed** is
 * a gate that reached across and ate a real claim. Claims a path *and* is
 * governed is the ordinary cost this project chose to pay, and separating those
 * two is the entire deliverable.
 *
 * **It decides nothing.** The output is a table saying where an experiment is
 * worth spending; the experiment is `16`'s method — change the scope, audit the
 * discovery corpus before and after, diff the findings — and it is a ticket of
 * its own. No number here is a precision, none enters `CLASSIFICATION.md`, and
 * none moves a condition of ADR-0006.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CONDITIONAL,
  CREATE_IMPERATIVES,
  ELSEWHERE,
  EXAMPLE,
  HEDGED,
  HEDGED_SPLIT,
} from '../../src/extract/context-prose.ts'
import { familyIndex } from '../discovery/discards.ts'
import { DISCARDS, FAMILIES, ROOT } from '../discovery/files.ts'
import { runPass } from '../lib/pass.ts'
import { type Candidate, spread } from './claims.ts'
import { openJev, requireKey } from './ask.ts'
import { CLAIMS_A_PATH } from './questions.ts'

const OUT = join(ROOT, 'scope.jsonl')

/**
 * The cut that puts a row on the shortlist, and it is two constants because it
 * is two questions.
 *
 * Both are strict, and the asymmetry is deliberate in the same way
 * `families.ts`'s is: the cell they define is the only thing that sends a
 * person to spend an experiment, and the experiment is the expensive part.
 * A loose cut here buys a longer list of places to look and each entry on it
 * costs an audit of 2533 repositories to settle.
 */
export const CLAIMS_AT = 0.8
export const LOOSE_AT = 0.2

/**
 * The eight prose causes minus `elsewhere`, split by how they fail.
 *
 * A sentence-scoped gate bleeds into the neighbouring bullet or table row
 * inside a two-line window. A section-scoped one floods: its stated risk is a
 * long section with one aside in it, and a document with no `#` heading is one
 * section. "Governed" does not mean the same thing across those two, so they
 * are budgeted apart and printed apart; one table over both would be a mean of
 * two things.
 *
 * `elsewhere` is absent on evidence rather than by oversight. The baseline in
 * ticket `27` found 11 askable candidates in 6 repositories out of 2533 — the
 * gate `context-prose.ts` calls the widest in the file barely fires at this
 * scale, and its one legible failure is written into the ticket instead.
 */
export const FAMILIES_OF_GATE = {
  sentence: ['hedged', 'example', 'conditional', 'another-repo'],
  section: ['creation-target', 'external-root'],
} as const

export type GateFamily = keyof typeof FAMILIES_OF_GATE

/**
 * The shape rules that ride along as the **negative control**.
 *
 * There is no gate and no marker on these, so `qualifies` has nothing to find
 * and must come back low. If it does not, the question is answering something
 * other than what it asks and the whole table is void — which is a thing worth
 * being able to discover, because "every gate governs well" otherwise has two
 * readings that cannot be told apart after the fact.
 */
export const CONTROL_CAUSES = ['bare-word', 'url', 'home-path'] as const

/**
 * Which entry of which list fired.
 *
 * `Discard` carries the cause and not the marker, and a table by cause cannot
 * say what `16` needed to say: `optional` fired 87 times out of `hedged`'s 266
 * where the next marker down fired 32, so a budget by cause spends a third of
 * the sample on one word. The lists are imported rather than copied for the
 * reason `sparse-clone.ts` imports `RUNNERS`.
 *
 * This does **not** reproduce a choice the gate made, because the gate does not
 * make one: `markerReason` asks `.some()` and throws away which entry matched.
 * Every marker this could return is a marker that would have fired on its own.
 * Longest first is therefore a disambiguation rule of this pass's own, and it
 * is longest rather than first-in-list so that `(optional)` and the bare
 * `optional` stay two rows. They are two entries in `HEDGED` and they are not
 * the same risk: one is a parenthetical that almost always means what it says,
 * the other is the substring that cost `haddocking/haddock3` three files.
 *
 * `undefined` is honest rather than a bug: a section-scoped gate fires on a
 * marker that is nowhere near the candidate's own window, and a control discard
 * has no marker at all. Those rows are budgeted under the cause itself.
 */
export function markerIn(cause: string, window: string): string | undefined {
  const lower = window.toLowerCase()
  const lists: Record<string, readonly string[]> = {
    example: EXAMPLE,
    hedged: HEDGED,
    elsewhere: ELSEWHERE,
    'create-instruction': CREATE_IMPERATIVES,
    conditional: CONDITIONAL,
  }
  const list = lists[cause]
  if (list !== undefined) {
    // Longest first, so `if it exists` is not reported as `if exists`.
    const hit = list.toSorted((a, b) => b.length - a.length).find((m) => lower.includes(m))
    if (hit !== undefined) return hit
  }
  if (cause === 'hedged' && HEDGED_SPLIT.some((pattern) => pattern.test(lower))) {
    return 'if…exists (split)'
  }
  return undefined
}

export type ScopeState = {
  repo: string
  file: string
  marker: string
  candidate: string
  window: string
}

/**
 * Four fields, and `window` is deliberately uncut.
 *
 * It is the text the gate acted on. Trimming it to a sentence would ask about a
 * scope the gate does not have, which is the one thing this pass cannot afford
 * to get wrong.
 */
export function stateOf(candidate: Candidate): ScopeState {
  return {
    repo: candidate.repo,
    file: candidate.path,
    marker: markerIn(candidate.cause, candidate.window) ?? candidate.cause,
    candidate: candidate.text,
    window: candidate.window,
  }
}

/**
 * The new half of the question. It stays here rather than in `questions.ts`
 * because one pass asks it; the convention there is explicit about that.
 *
 * The verb is *qualify* and not *disclaim* on purpose. The code has two:
 * `disclaimedBy` for the gates that weaken an assertion, `declaresDestination`
 * for the ones that say "create this". This measures both, and *disclaim* would
 * quietly drop `create-instruction` and `creation-target`.
 *
 * The closing sentence of `criteria.false` is the load-bearing one, and it
 * follows the house habit of naming the resemblance that does not count —
 * `SAME_CAUSE` ends on "Superficial likeness is not a shared cause",
 * `SAME_DOCUMENT` on "and still be two documents".
 */
export const QUALIFIES_THE_CANDIDATE = {
  type: 'boolean',
  instructions:
    'The qualification in `marker` applies to `candidate`. The window holds a phrase that ' +
    'weakens or redirects what is being asserted — it calls something an example, hedges it, ' +
    'says it lives in another project, or tells the reader to create it — and that phrase is ' +
    'about this candidate rather than about something else nearby.',
  criteria: {
    true:
      'The qualification reaches the candidate: the candidate is the thing being called an ' +
      'example, hedged, placed elsewhere, or created. A reader would not take the document to ' +
      'be asserting that this path is in the repository right now.',
    false:
      'The qualification is about something else inside the same window — a different path, a ' +
      'neighbouring bullet or table row, a parameter, a setting, a sentence on another ' +
      'subject — and the candidate is asserted plainly. Proximity is not government: two ' +
      'statements can share a line, a list or a section and qualify different things.',
  },
} as const

/** Both answers for one candidate. Neither is read alone. */
export type Judgement = { claimsAPath: number; qualifies: number }
export type AskScope = (state: ScopeState) => Promise<Judgement>

type Answer = Candidate & Judgement & { marker: string }

async function jevAsk(): Promise<AskScope> {
  const ask = await openJev()
  return async (state) => {
    const answers = await ask(state, {
      claimsAPath: CLAIMS_A_PATH,
      qualifies: QUALIFIES_THE_CANDIDATE,
    })
    return {
      claimsAPath: answers.probability('claimsAPath'),
      qualifies: answers.probability('qualifies'),
    }
  }
}

/**
 * The budget is per **marker**, not per cause, and that is the one thing this
 * chooser does that `claims.ts`'s does not. Everything else — one document per
 * family, a cap per repository, `exists === true` dropped — is the protocol
 * `claims.ts` established and the reasons are the same there.
 */
export function choose(
  offered: readonly (Candidate & { exists?: boolean })[],
  causes: readonly string[],
  families: ReadonlyMap<string, string>,
  perMarker: number,
  perRepo: number,
): Candidate[] {
  const wanted = new Set(causes)
  const seen = new Set<string>()
  const perRepoCount = new Map<string, number>()
  const byMarker = new Map<string, Candidate[]>()
  for (const record of offered) {
    if (!wanted.has(record.cause)) continue
    if (record.exists === true) continue
    const family = families.get(`${record.repo}|${record.path}`)
    if (family !== undefined) {
      const key = `${family}|${record.cause}|${record.text}`
      if (seen.has(key)) continue
      seen.add(key)
    }
    const count = perRepoCount.get(record.repo) ?? 0
    if (count >= perRepo) continue
    perRepoCount.set(record.repo, count + 1)
    const marker = markerIn(record.cause, record.window) ?? record.cause
    const bucket = byMarker.get(`${record.cause}|${marker}`) ?? []
    bucket.push({
      repo: record.repo,
      path: record.path,
      cause: record.cause,
      text: record.text,
      line: record.line,
      window: record.window,
    })
    byMarker.set(`${record.cause}|${marker}`, bucket)
  }
  const chosen: Candidate[] = []
  for (const bucket of [...byMarker.keys()].toSorted()) {
    chosen.push(...spread(byMarker.get(bucket) ?? [], perMarker))
  }
  return chosen
}

/** One row per marker: how much it costs, and how much of that is over-reach. */
export function scopeTable(answers: readonly Answer[]): string {
  const keys = [...new Set(answers.map((a) => `${a.cause}|${a.marker}`))].toSorted()
  const lines = [
    `  ${'gate'.padEnd(20)}${'marker'.padEnd(24)}${'n'.padStart(5)}${'claims'.padStart(8)}${'over-reach'.padStart(12)}${'unsure'.padStart(8)}`,
  ]
  for (const key of keys) {
    const rows = answers.filter((a) => `${a.cause}|${a.marker}` === key)
    const claims = rows.filter((a) => a.claimsAPath >= CLAIMS_AT)
    const over = claims.filter((a) => a.qualifies <= LOOSE_AT)
    // Reported apart, never folded into "governs correctly". A Noul near 0.5 is
    // the model saying it has similar probability either way (`24`), and those
    // are the rows a person most wants to read; counting them as a healthy gate
    // says the opposite of what happened.
    const unsure = claims.filter((a) => a.qualifies > 0.4 && a.qualifies < 0.6)
    const [cause = '', marker = ''] = key.split('|')
    lines.push(
      `  ${cause.padEnd(20)}${marker.slice(0, 23).padEnd(24)}${String(rows.length).padStart(5)}` +
        `${String(claims.length).padStart(8)}${String(over.length).padStart(12)}${String(unsure.length).padStart(8)}`,
    )
  }
  return lines.join('\n')
}

/**
 * Streamed, not read whole. `discards.jsonl` is 510 MB over the 2533-repo
 * corpus and `readFileSync().split()` holds the file and its line array at
 * once; `claims.ts` streams for the same reason and this is the same file.
 */
async function* records(): AsyncGenerator<Candidate & { exists?: boolean }> {
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

export async function scopeMain(
  family: GateFamily | 'both',
  perMarker: number,
  perRepo: number,
  concurrency: number,
  dryRun: boolean,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskScope,
): Promise<number> {
  if (!dryRun && askWith === undefined) requireKey('scope')
  if (!existsSync(DISCARDS)) {
    process.stderr.write(`${DISCARDS} is missing; run pnpm discovery discards first\n`)
    return 2
  }
  const gates =
    family === 'both'
      ? [...FAMILIES_OF_GATE.sentence, ...FAMILIES_OF_GATE.section]
      : [...FAMILIES_OF_GATE[family]]
  const families = existsSync(FAMILIES) ? familyIndex(readFileSync(FAMILIES, 'utf8')) : new Map()
  const all: (Candidate & { exists?: boolean })[] = []
  for await (const record of records()) all.push(record)
  const asked = [
    ...choose(all, gates, families, perMarker, perRepo),
    // The negative control rides in the same run, on the same question, so a
    // question that stopped discriminating shows up in the same table.
    ...choose(all, CONTROL_CAUSES, families, 12, 1),
  ]
  process.stderr.write(
    `${gates.join(', ')}; ${asked.length} candidates at ${perMarker} per marker ` +
      `and ${perRepo} per repository, controls included\n`,
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
    every: 100,
    nameOf: (candidate) => `${candidate.repo} ${candidate.text}`,
    answer: async (candidate): Promise<Answer> => ({
      ...candidate,
      marker: markerIn(candidate.cause, candidate.window) ?? candidate.cause,
      ...(await ask(stateOf(candidate))),
    }),
  })
  writeFileSync(OUT, `${answered.map((a) => JSON.stringify(a)).join('\n')}\n`, 'utf8')
  process.stderr.write(`\n${answered.length} of ${asked.length} answered; ${OUT}\n\n`)

  const control = answered.filter((a) => (CONTROL_CAUSES as readonly string[]).includes(a.cause))
  const gated = answered.filter((a) => !(CONTROL_CAUSES as readonly string[]).includes(a.cause))
  for (const [name, list] of [
    ['sentence or line', gated.filter((a) => hasGate(FAMILIES_OF_GATE.sentence, a.cause))],
    ['section or document', gated.filter((a) => hasGate(FAMILIES_OF_GATE.section, a.cause))],
  ] as const) {
    if (list.length === 0) continue
    process.stdout.write(`${name}\n\n${scopeTable(list)}\n\n`)
  }
  process.stdout.write(`negative control (no gate, no marker)\n\n${scopeTable(control)}\n\n`)

  const shortlist = gated
    .filter((a) => a.claimsAPath >= CLAIMS_AT && a.qualifies <= LOOSE_AT)
    .toSorted((p, q) => p.qualifies - q.qualifies)
  process.stdout.write(
    `${shortlist.length} of ${gated.length} read as a real claim the gate did not govern ` +
      `(claims >= ${CLAIMS_AT}, qualifies <= ${LOOSE_AT}). The twenty loosest:\n\n`,
  )
  for (const answer of shortlist.slice(0, 20)) {
    process.stdout.write(
      `  ${answer.qualifies.toFixed(2)}  ${answer.cause}/${answer.marker}  ` +
        `${answer.repo}  ${answer.path}:${answer.line}\n` +
        `        ${answer.text}\n` +
        `        ${answer.window.replaceAll('\n', ' ').trim().slice(0, 140)}\n`,
    )
  }
  process.stdout.write(
    '\nNo rule is changed here and no finding is made. A row on the shortlist is a place ' +
      'to spend\nan experiment, which is ticket `16`’s method and a ticket of its own. ' +
      'Nothing here is a\nprecision, none of it enters CLASSIFICATION.md, and none of it ' +
      'moves a condition of ADR-0006.\n',
  )
  return 0
}

function hasGate(list: readonly string[], cause: string): boolean {
  return list.includes(cause)
}
