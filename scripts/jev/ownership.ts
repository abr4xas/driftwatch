/**
 * Does Jev know whose document this is?
 *
 * `aboutThisRepo` has been asked of 6927 documents and never once checked
 * against a person. Ticket `33` says so itself: nobody has ruled on one of the
 * 6189 it counted, and the model's reading is not a verdict. Every candidate in
 * ticket `36`'s hypothesis would be scored against that question, so the
 * question has to be anchored first or the experiment measures agreement with
 * an instrument nobody has calibrated.
 *
 *   pnpm discovery ownership --packet    # the sample, and the page to read
 *   pnpm discovery ownership --ask       # Jev, over that fixed sample
 *   pnpm discovery ownership --score     # the two, crossed
 *
 * This is round thirty's move one level down. `classify.ts` already existed and
 * its answers sat on disk unscored; scoring them against the rulings is what
 * turned it from an instrument into an ordering. Same move, different object.
 *
 * **What a person decides here is not a ruling.** A ruling is a person's
 * decision that a *finding* is a true or a false positive
 * ([`CONTEXT.md`](../../CONTEXT.md)), and this is about a document. It enters
 * no round, it is not written into `CLASSIFICATION.md`, and it moves no
 * condition of ADR-0006. It is computed over the discovery corpus, so
 * `AGENTS.md` § "The discovery corpus is not a corpus in the same sense"
 * governs every number it prints.
 *
 * The question is `filter.ts`'s, imported rather than copied, unreworded. The
 * wording *is* the instrument: anchoring a question and then asking a different
 * one measures nothing.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CORPUS_DIR } from '../lib/paths.ts'
import { REPOS_DIR, ROOT } from '../discovery/files.ts'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { QUESTIONS, reportedDocuments, stateOf } from './filter.ts'
import { rowsIn } from './classify.ts'

const RESULTS = join(ROOT, 'results.jsonl')
const SAMPLE = join(ROOT, 'ownership-sample.jsonl')
const ANSWERS = join(ROOT, 'ownership.jsonl')
const PACKET = join(
  ROOT,
  '..',
  '..',
  '.scratch',
  'corpus-adjudication-at-scale',
  'issues',
  '36-packet.md',
)

/** Pre-registered in ticket `36` before anything was looked at. */
const SAMPLE_SIZE = 30
/**
 * One document per repository.
 *
 * The population is weighted towards a dozen hoarders — `NeelakshSaxena/Vayu`
 * alone holds 653 — and thirty near-identical documents out of one repository
 * would measure the question on one repository. `claims.ts` caps per repository
 * for the same reason and says so.
 */
const PER_REPO = 1

/** How far above and below the cut a probability counts as an agreement. */
const CUT = 0.5

export type Document = { repo: string; path: string }
export type Sampled = Document & { claims: string[]; control?: string }
export type Answer = Document & { aboutThisRepo: number; repoKind: string; confidence: number }
export type Reading = 'this-repo' | 'another-project'

/**
 * Even stride through the population, in acquisition order, capped per
 * repository.
 *
 * A stride that lands on a repository already at its cap walks forward rather
 * than skipping, so the sample fills: the hoarders occupy long contiguous runs
 * of the population, and skipping would quietly return twenty-six documents
 * where thirty were pre-registered.
 */
export function pickSample(
  all: readonly Document[],
  size = SAMPLE_SIZE,
  perRepo = PER_REPO,
): Document[] {
  const stride = Math.max(1, Math.floor(all.length / size))
  const taken = new Map<string, number>()
  const seen = new Set<number>()
  const out: Document[] = []
  for (let k = 0; k < size; k += 1) {
    for (let i = k * stride; i < all.length; i += 1) {
      const doc = all[i]
      if (doc === undefined || seen.has(i)) continue
      if ((taken.get(doc.repo) ?? 0) >= perRepo) continue
      taken.set(doc.repo, (taken.get(doc.repo) ?? 0) + 1)
      seen.add(i)
      out.push(doc)
      break
    }
  }
  return out
}

/** Every `path/missing` claim a document made, for the page a person reads. */
export function claimsByDocument(resultsText: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const line of resultsText.split('\n')) {
    if (line.trim() === '') continue
    let outcome: { repo?: unknown; findings?: unknown }
    try {
      outcome = JSON.parse(line) as { repo?: unknown; findings?: unknown }
    } catch {
      continue
    }
    const { repo } = outcome
    if (typeof repo !== 'string' || !Array.isArray(outcome.findings)) continue
    for (const raw of outcome.findings) {
      const finding = raw as { check?: unknown; path?: unknown; text?: unknown }
      const { path, text } = finding
      if (finding.check !== 'path/missing') continue
      if (typeof path !== 'string' || typeof text !== 'string') continue
      const key = `${repo}|${path}`
      out.set(key, [...(out.get(key) ?? []), text])
    }
  }
  return out
}

/**
 * The two controls, pre-registered, and they sit outside the thirty.
 *
 * `remix-run/react-router` publishes a skill for its consumers naming
 * `app/entry.server.tsx` — the reader's file, not react-router's. ADR-0008
 * names this exact case, so Jev must read it as **not** about this repository.
 *
 * The other control is the one a careless version of this work would fail. A
 * certification document carrying a finding a person ruled **true** is by
 * construction a repository's own context file gone out of date: it asserts
 * about this repository and the file moved. Jev must read it as **about** this
 * repository. A signal that fires on "many paths do not resolve" is measuring
 * staleness rather than authorship, and silencing it would silence the case
 * driftwatch exists to find.
 */
export function controlsIn(classification: string, limit = 4): Sampled[] {
  const out: Sampled[] = [
    {
      repo: 'remix-run/react-router',
      path: '.agents/skills/react-router/SKILL.md',
      claims: ['app/entry.server.tsx'],
      control: 'another-project',
    },
  ]
  // One per repository, like the sample. `1amageek/SwiftAgent` carries the
  // same drift in `AGENTS.md` and `CLAUDE.md` — CLASSIFICATION.md calls it one
  // drift event written twice — and two copies of one control is one control.
  const seen = new Set<string>()
  for (const row of rowsIn(classification)) {
    if (row.ruling !== 'true' || row.check !== 'path/missing') continue
    const path = row.location.split(':')[0] ?? ''
    if (path === '' || seen.has(row.repo)) continue
    seen.add(row.repo)
    out.push({ repo: row.repo, path, claims: [row.claim], control: 'this-repo' })
    if (out.length > limit) break
  }
  return out
}

function dirFor(repo: string): string {
  const slug = repo.replace('/', '__')
  const discovery = join(REPOS_DIR, slug)
  return existsSync(discovery) ? discovery : join(CORPUS_DIR, 'repos', slug)
}

/**
 * The page a person reads, and it is blind on purpose: no `aboutThisRepo`, no
 * `repoKind`, no hint of which entries are controls.
 *
 * It carries the same 1200-character excerpt Jev is given, so that the two are
 * answering over the same text, and the full path on disk, so that a person
 * who wants the rest of the document can open it. That asymmetry is deliberate
 * and is the honest direction: a person deciding with everything available is
 * what makes their answer the yardstick, and round thirty-one already showed
 * that what limits Jev here is how much document it gets.
 */
export function packetOf(entries: readonly Sampled[], excerptOf: (e: Sampled) => string): string {
  const lines = [
    '# 36-packet: whose document is this?',
    '',
    'Thirty documents, selected as ticket `36` pre-registered it, plus controls mixed in and',
    'not marked. For each one, answer **one** question:',
    '',
    '> Does this document instruct an agent about the repository it sits in — are the paths it',
    '> names paths in *this* repository?',
    '',
    'Read the documents here and answer on the sheet at the bottom of this file: write',
    '`this-repo` or `another-project` after the `->` on each numbered line. A blank line is a',
    'skip, and the score ignores it.',
    '',
    '**This is not a ruling and it is not "is this finding false".** A ruling is a decision that',
    'a *finding* is a true or a false positive; this is about the document. A document can be',
    'about this repository and still carry a false positive, and a document about somebody',
    "else's project can name a path that happens to exist here. The two are independent.",
    '',
    'The excerpt below is exactly what Jev was given. The full file is on disk at the path in',
    'the heading — open it if the excerpt does not settle it. You having more than the model is',
    'the point: your answer is the yardstick.',
    '',
    '---',
    '',
  ]
  entries.forEach((entry, index) => {
    const excerpt = excerptOf(entry)
    // Context files are full of fenced code, so the wrapper has to be longer
    // than the longest run of backticks inside it or the page renders wrong
    // from the first document that shows a shell command.
    const fence = '`'.repeat(
      Math.max(3, ...[...excerpt.matchAll(/`+/gu)].map((m) => m[0].length + 1)),
    )
    lines.push(
      `## ${index + 1}. \`${entry.repo}\` — \`${entry.path}\``,
      '',
      `On disk: \`${join(dirFor(entry.repo), entry.path)}\``,
      '',
      `Reported paths: ${entry.claims
        .slice(0, 8)
        .map((c) => `\`${c}\``)
        .join(', ')}${entry.claims.length > 8 ? `, and ${entry.claims.length - 8} more` : ''}`,
      '',
      `${fence}markdown`,
      excerpt,
      fence,
      '',
      '---',
      '',
    )
  })
  // The sheet rather than a field under each document: thirty-five answers
  // scattered through fifteen hundred lines is thirty-five places to find, and
  // the answers are worth more read next to each other anyway.
  lines.push(
    '## Answer sheet',
    '',
    'One line per document, in the order above. Write `this-repo` or `another-project` after',
    'the arrow.',
    '',
    '```',
    ...entries.map(
      (entry, index) => `${String(index + 1).padStart(2)}. ${entry.repo} ${entry.path} ->`,
    ),
    '```',
    '',
    'Nothing on this page is a precision, and none of it enters `CLASSIFICATION.md`.',
    '',
  )
  return lines.join('\n')
}

/** What a person wrote, keyed the way the answers are. */
export function readingsIn(packet: string): Map<string, Reading> {
  const out = new Map<string, Reading>()
  for (const line of packet.split('\n')) {
    // The repository and the document are read off the line itself rather than
    // from its number, so that an answer cannot end up against the wrong
    // document if the sheet is reordered or an entry is pasted twice.
    const answer = /^\s*\d+\.\s+(\S+)\s+(\S+)\s*->\s*(this-repo|another-project)\s*$/u.exec(line)
    if (answer === null) continue
    out.set(`${answer[1]}|${answer[2]}`, answer[3] as Reading)
  }
  return out
}

/**
 * The agreement, against the baseline ticket `36` fixed before the number.
 *
 * The baseline is the majority class — assume every document is about its own
 * repository — which is the same baseline round thirty used, where the rule
 * scored 94% against 69%.
 */
export function scoreOf(
  readings: ReadonlyMap<string, Reading>,
  answers: readonly Answer[],
  controls: ReadonlyMap<string, Reading>,
): string {
  const rows: Array<{ key: string; person: Reading; jev: Reading; p: number }> = []
  for (const answer of answers) {
    const key = `${answer.repo}|${answer.path}`
    const person = readings.get(key)
    if (person === undefined) continue
    rows.push({
      key,
      person,
      jev: answer.aboutThisRepo >= CUT ? 'this-repo' : 'another-project',
      p: answer.aboutThisRepo,
    })
  }
  const sample = rows.filter((r) => !controls.has(r.key))
  const agreed = sample.filter((r) => r.person === r.jev).length
  const mine = sample.filter((r) => r.person === 'this-repo').length
  const baseline = Math.max(mine, sample.length - mine)
  const pct = (n: number): string =>
    sample.length === 0 ? '—' : `${((100 * n) / sample.length).toFixed(1)}%`

  const lines = [
    `${sample.length} documents read by a person and answered by Jev`,
    '',
    `Jev agrees      ${String(agreed).padStart(3)}  ${pct(agreed)}`,
    `Baseline        ${String(baseline).padStart(3)}  ${pct(baseline)}  (assume every document is its own)`,
    `Margin          ${sample.length === 0 ? '—' : `${((100 * (agreed - baseline)) / sample.length).toFixed(1)} points`}`,
    '',
    'Where they disagree:',
    ...sample
      .filter((r) => r.person !== r.jev)
      .map((r) => `  ${r.key}\n      person ${r.person}, jev ${r.jev} (p=${r.p.toFixed(2)})`),
    '',
    'Controls:',
  ]
  for (const [key, expected] of controls) {
    const row = rows.find((r) => r.key === key)
    if (row === undefined) {
      lines.push(`  ${key}\n      not answered`)
      continue
    }
    lines.push(
      `  ${row.jev === expected ? 'pass' : 'FAIL'}  ${key}\n` +
        `      expected ${expected}, jev ${row.jev} (p=${row.p.toFixed(2)})`,
    )
  }
  lines.push(
    '',
    "Ticket `36`'s rule, fixed before this number: Jev anchors if it beats the baseline by at",
    'least 15 points and passes both controls. A result near the threshold is not a pass, it is',
    'an instruction to widen the sample.',
    '',
    "Nothing here is a precision. No answer of Jev's is a ruling, and none of this enters",
    'CLASSIFICATION.md.',
  )
  return lines.join('\n')
}

function sampledIn(text: string): Sampled[] {
  const out: Sampled[] = []
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    out.push(JSON.parse(line) as Sampled)
  }
  return out
}

export type AskOwnership = (
  state: ReturnType<typeof stateOf>,
) => Promise<Omit<Answer, 'repo' | 'path'>>

async function jevAsk(): Promise<AskOwnership> {
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

function readDocument(entry: Document): string | undefined {
  const absolute = join(dirFor(entry.repo), entry.path)
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : undefined
}

function buildPacket(): number {
  if (!existsSync(RESULTS)) {
    process.stderr.write(`${RESULTS} is missing; run pnpm discovery run first\n`)
    return 2
  }
  const results = readFileSync(RESULTS, 'utf8')
  const claims = claimsByDocument(results)
  const population = reportedDocuments(results)
  const picked = pickSample(population).map((doc) => ({
    ...doc,
    claims: claims.get(`${doc.repo}|${doc.path}`) ?? [],
  }))
  const controls = controlsIn(readFileSync(join(CORPUS_DIR, 'CLASSIFICATION.md'), 'utf8'))
  // Controls are interleaved rather than appended: a page whose last five
  // entries are the controls tells the reader which ones they are.
  const entries: Sampled[] = []
  const every = Math.max(1, Math.floor(picked.length / (controls.length + 1)))
  let next = 0
  picked.forEach((entry, index) => {
    entries.push(entry)
    if ((index + 1) % every === 0 && next < controls.length) {
      const control = controls[next]
      next += 1
      if (control !== undefined) entries.push(control)
    }
  })
  for (const control of controls.slice(next)) entries.push(control)

  const readable = entries.filter((entry) => readDocument(entry) !== undefined)
  const excerpts = new Map<string, string>()
  for (const entry of readable) {
    const content = readDocument(entry) ?? ''
    const dir = dirFor(entry.repo)
    excerpts.set(
      `${entry.repo}|${entry.path}`,
      stateOf(entry.repo, dir, entry.path, content).excerpt,
    )
  }
  writeFileSync(SAMPLE, `${readable.map((e) => JSON.stringify(e)).join('\n')}\n`, 'utf8')
  writeFileSync(
    PACKET,
    packetOf(readable, (entry) => excerpts.get(`${entry.repo}|${entry.path}`) ?? ''),
    'utf8',
  )
  const controlCount = readable.filter((e) => e.control !== undefined).length
  process.stderr.write(
    `${population.length} documents in the population, ` +
      `${readable.length - controlCount} sampled, ${controlCount} controls\n` +
      `${SAMPLE}\n${PACKET}\n`,
  )
  return 0
}

async function askJev(
  concurrency: number,
  dryRun: boolean,
  askWith?: AskOwnership,
): Promise<number> {
  if (!existsSync(SAMPLE)) {
    process.stderr.write(`${SAMPLE} is missing; run --packet first\n`)
    return 2
  }
  if (!dryRun && askWith === undefined) requireKey('ownership')
  const entries = sampledIn(readFileSync(SAMPLE, 'utf8'))
  const work = entries.flatMap((entry) => {
    const content = readDocument(entry)
    return content === undefined
      ? []
      : [{ entry, state: stateOf(entry.repo, dirFor(entry.repo), entry.path, content) }]
  })
  process.stderr.write(`${work.length} documents to judge, ${concurrency} at a time\n`)
  if (dryRun) {
    const [first] = work
    if (first !== undefined) process.stderr.write(`${JSON.stringify(first.state, null, 2)}\n`)
    return 0
  }
  const ask = askWith ?? (await jevAsk())
  const { answered, failed } = await runPass({
    items: work,
    width: concurrency,
    every: 10,
    nameOf: (item) => `${item.entry.repo} ${item.entry.path}`,
    answer: async (item): Promise<Answer> => ({
      repo: item.entry.repo,
      path: item.entry.path,
      ...(await ask(item.state)),
    }),
  })
  writeFileSync(ANSWERS, `${answered.map((a) => JSON.stringify(a)).join('\n')}\n`, 'utf8')
  process.stderr.write(`\n${answered.length} answered, ${failed} failed; ${ANSWERS}\n`)
  return 0
}

function score(): number {
  for (const path of [SAMPLE, ANSWERS, PACKET]) {
    if (existsSync(path)) continue
    process.stderr.write(`${path} is missing; run --packet and --ask first\n`)
    return 2
  }
  const answers = readFileSync(ANSWERS, 'utf8')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => JSON.parse(l) as Answer)
  const readings = readingsIn(readFileSync(PACKET, 'utf8'))
  if (readings.size === 0) {
    process.stderr.write(`no readings in ${PACKET}; fill in the Reading: lines first\n`)
    return 2
  }
  const controls = new Map<string, Reading>()
  for (const entry of sampledIn(readFileSync(SAMPLE, 'utf8'))) {
    if (entry.control !== undefined)
      controls.set(`${entry.repo}|${entry.path}`, entry.control as Reading)
  }
  process.stdout.write(`${scoreOf(readings, answers, controls)}\n`)
  return 0
}

export async function ownershipMain(
  mode: 'packet' | 'ask' | 'score',
  concurrency: number,
  dryRun: boolean,
  askWith?: AskOwnership,
): Promise<number> {
  if (mode === 'packet') return buildPacket()
  if (mode === 'ask') return askJev(concurrency, dryRun, askWith)
  return score()
}
