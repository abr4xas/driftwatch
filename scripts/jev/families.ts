/**
 * One observation per template family, so a document copied into forty
 * repositories is counted once.
 *
 * Ticket `17`, and it exists because of a mistake rather than a hunch. Ticket
 * `07` adjudicated a gate by reading every discard it could not rule out and
 * reported a proportion; four of the occurrences it counted were one
 * `.agents/skills/teach/SKILL.md` living in two repositories. One document,
 * four votes.
 *
 * Exact duplicates need no judgement and are grouped here for nothing. They are
 * also not the problem: the pair that did the damage differs by **one byte**, a
 * comma promoted to an em dash, so every hash sees two documents. That is the
 * judgement, and it is the shape the model is good at — short input, low
 * cardinality, high volume, cheap to be wrong about once.
 *
 *   pnpm discovery families [--limit N] [--dry-run]
 *
 * **It groups; it does not adjudicate.** What comes out is a table of families.
 * Any rule that comes out of reading them is still written by hand in `src/`
 * and still measured against the 66 repositories that carry human verdicts.
 * Nothing here is on driftwatch's main path — `ai` and `zod` are
 * devDependencies and `tsdown` builds `src/` alone.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { slugOf } from '../corpus/repos.ts'
import { FAMILIES, readList, REPOS_DIR, VERDICTS } from '../discovery/files.ts'

/** One source document, as the family pass sees it. */
export type Doc = {
  repo: string
  /** Path inside the repository. */
  path: string
  content: string
}

/** A document reduced to what the cheap comparison needs. */
export type Fingerprint = {
  repo: string
  path: string
  /** Exact content, so identical documents group with no judgement at all. */
  hash: string
  /** The basename, which blocks the comparison: a SKILL.md is never a CLAUDE.md. */
  basename: string
  bytes: number
  /** Hashes of the lines worth comparing. See `comparableLines`. */
  lines: ReadonlySet<string>
}

/**
 * The lines a comparison may use.
 *
 * Short lines are dropped — a blank, a `---`, a `## Usage` — because they are
 * shared by documents with nothing to do with each other and they are most of
 * what two unrelated files have in common. What is left is prose and paths,
 * which is what a template carries from one repository to the next.
 */
function comparableLines(content: string): Set<string> {
  const lines = new Set<string>()
  for (const raw of content.split('\n')) {
    const line = raw.trim()
    if (line.length < 24) continue
    lines.add(createHash('md5').update(line).digest('hex').slice(0, 16))
  }
  return lines
}

export function fingerprint(doc: Doc): Fingerprint {
  return {
    repo: doc.repo,
    path: doc.path,
    hash: createHash('md5').update(doc.content).digest('hex'),
    basename: doc.path.slice(doc.path.lastIndexOf('/') + 1),
    bytes: doc.content.length,
    lines: comparableLines(doc.content),
  }
}

/** A pair of documents close enough to be worth asking about. */
export type Candidate = {
  a: Fingerprint
  b: Fingerprint
  /** Shared comparable lines over the union of them. */
  overlap: number
}

/**
 * How alike two documents are, by the lines they share.
 *
 * Jaccard rather than a diff: a template edited in three places keeps almost
 * every line, and a diff would have to be read to say so while this is a set
 * intersection. It is a **filter**, not the answer — what it decides is which
 * pairs are worth a judgement.
 */
export function overlapOf(a: Fingerprint, b: Fingerprint): number {
  if (a.lines.size === 0 || b.lines.size === 0) return 0
  let shared = 0
  const [small, large] = a.lines.size <= b.lines.size ? [a.lines, b.lines] : [b.lines, a.lines]
  for (const line of small) if (large.has(line)) shared += 1
  return shared / (a.lines.size + b.lines.size - shared)
}

/**
 * Lines shared by so many documents that they say nothing.
 *
 * A licence header, an `npx skills add` incantation, a sentence the whole
 * ecosystem copies. Without this every document carrying one is a candidate
 * against every other, which is the quadratic blow-up **and** a worse filter.
 */
const COMMON_LINE = 40

/**
 * The pairs worth asking a model about.
 *
 * Built from an inverted index rather than by comparing everything to
 * everything: 4460 documents is ten million pairs, and all but a handful share
 * no line at all. Two documents reach this function only if they share a line
 * that is not boilerplate.
 *
 * Identical documents are **excluded**: they are a family already and asking
 * about them would be paying for an answer a hash gives.
 */
export function candidatePairs(prints: readonly Fingerprint[], minOverlap = 0.5): Candidate[] {
  const byLine = new Map<string, number[]>()
  for (const [i, print] of prints.entries()) {
    for (const line of print.lines) {
      const bucket = byLine.get(line)
      if (bucket === undefined) byLine.set(line, [i])
      else bucket.push(i)
    }
  }

  // One document at a time, with its partners in a set that is thrown away
  // before the next one. A single `seen` across the whole walk holds every
  // pair that shares any line, and at 2533 repositories that is tens of
  // millions of entries and a four-gigabyte heap — the pass died there. The
  // candidates it returns are the same; only what is alive at once changed.
  const candidates: Candidate[] = []
  const partners = new Set<number>()
  for (const [i, print] of prints.entries()) {
    partners.clear()
    for (const line of print.lines) {
      const bucket = byLine.get(line)
      if (bucket === undefined || bucket.length > COMMON_LINE) continue
      for (const j of bucket) if (j > i) partners.add(j)
    }
    for (const j of partners) {
      const a = prints[i]
      const b = prints[j]
      if (a === undefined || b === undefined) continue
      // Same repository is not a template family: a project repeating its own
      // document is one project, and `07` counts observations per repository.
      if (a.repo === b.repo) continue
      if (a.basename !== b.basename) continue
      if (a.hash === b.hash) continue
      const overlap = overlapOf(a, b)
      if (overlap < minOverlap) continue
      candidates.push({ a, b, overlap })
    }
  }
  return candidates.toSorted((p, q) => q.overlap - p.overlap)
}

/**
 * Families, from exact hashes plus whatever pairs were confirmed.
 *
 * Union-find, because "the same document" is transitive in the way that
 * matters: if A is B edited and B is C edited, the three are one template and
 * counting them as two families would be the bug this ticket is about, halved.
 */
/** How a document is named in a family table: `owner/repo|path`. */
function keyOf(print: Fingerprint): string {
  return `${print.repo}|${print.path}`
}

export function familiesOf(
  prints: readonly Fingerprint[],
  confirmed: ReadonlyArray<readonly [string, string]> = [],
): Map<string, string[]> {
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    const seen: string[] = []
    let at = x
    while (parent.get(at) !== undefined && parent.get(at) !== at) {
      seen.push(at)
      at = parent.get(at) ?? at
    }
    for (const node of seen) parent.set(node, at)
    return at
  }
  const union = (x: string, y: string): void => {
    parent.set(find(x), find(y))
  }

  for (const print of prints) parent.set(keyOf(print), keyOf(print))

  // Exact duplicates first, which costs nothing and is most of the answer.
  const byHash = new Map<string, string>()
  for (const print of prints) {
    const first = byHash.get(print.hash)
    if (first === undefined) byHash.set(print.hash, keyOf(print))
    else union(keyOf(print), first)
  }
  for (const [a, b] of confirmed) if (parent.has(a) && parent.has(b)) union(a, b)

  const families = new Map<string, string[]>()
  for (const print of prints) {
    const root = find(keyOf(print))
    families.set(root, [...(families.get(root) ?? []), keyOf(print)])
  }
  return families
}

/** One document per family: the reading wants documents, not copies. */
export function representatives(families: ReadonlyMap<string, string[]>): Set<string> {
  const chosen = new Set<string>()
  for (const [, members] of families) {
    const first = members.toSorted()[0]
    if (first !== undefined) chosen.add(first)
  }
  return chosen
}

export function formatFamilies(families: ReadonlyMap<string, string[]>): string {
  const shared = [...families.values()]
    .filter((members) => new Set(members.map((m) => m.split('|')[0])).size > 1)
    .toSorted((a, b) => b.length - a.length)
  const lines = shared.map((members) => {
    const repos = [...new Set(members.map((m) => m.split('|')[0]))]
    return `${String(members.length).padStart(4)}  ${members[0]?.split('|')[1] ?? ''}\n        ${repos.join(', ')}`
  })
  return [
    `${families.size} families over ${[...families.values()].flat().length} documents`,
    `${shared.length} span more than one repository`,
    '',
    ...lines,
  ].join('\n')
}

// --- The judgement --------------------------------------------------------

/**
 * The excerpt a judgement is made on.
 *
 * Bounded, because the question is "one document or two" and the answer is
 * visible in the opening: a template keeps its frontmatter, its heading and its
 * first paragraphs, and an edit that changes only what comes after those is the
 * case this is for. Sending 9 KB twice to be told what 1 KB shows is the cost
 * of a judgement nobody bounded.
 */
const EXCERPT = 1200

function excerptOf(content: string): string {
  return content.length <= EXCERPT ? content : `${content.slice(0, EXCERPT)}\n…`
}

/**
 * The one judgement, as a Noul.
 *
 * Jev is an **evaluation** model rather than a language model: it reads shared
 * state, answers typed questions, and returns a probability instead of prose.
 * That is the whole reason it is the right tool here. The question is asked
 * 137 times over near-identical inputs, nobody reads an explanation, and what
 * the code needs is a number it can threshold — which is also why the first
 * attempt at this, a chat model asked for `{ same, why }`, was paying for a
 * paragraph nothing consumed.
 *
 * Phrased as a **statement** rather than a question, which the Noul docs give
 * as one of the two forms, and with both criteria spelled out. The `false`
 * criterion is the one that matters: `overlapOf` already established that the
 * two documents are alike, so the distinction Jev is being asked for is
 * derivation, not similarity. Two projects writing their own instructions for
 * the same framework are two documents however alike the prose, and without
 * saying so the question collapses into the one the set intersection answered.
 */
export const SAME_DOCUMENT = {
  type: 'boolean',
  instructions: 'Document B is document A, copied into another repository and possibly edited.',
  criteria: {
    true: 'One is derived from the other, or both from one source: the same document installed in two repositories, with or without edits.',
    false:
      'Two documents written independently. They may describe the same tool, follow the same convention, or share boilerplate, and still be two documents.',
  },
} as const

/**
 * How sure Jev has to be before two documents are called one.
 *
 * Merging is the **claim** here. Calling two documents one takes an
 * observation out of every count that follows, so a wrong merge quietly hides
 * evidence — which is the same shape as a false positive in the tool, and gets
 * the same treatment. A wrong split only leaves the bias ticket `17` is about
 * where it already was.
 *
 * So: strict, and the probability is written to `family-verdicts.jsonl` beside
 * every pair, because a threshold somebody cannot re-run is a threshold nobody
 * can argue with.
 */
export const MERGE_AT = 0.8

/**
 * The overlap above which two documents are one document without asking.
 *
 * Not a guess. A stratified sample of 600 of the 193 185 candidate pairs was
 * put to Jev band by band, and above 0.85 it answered "one document" **180
 * times out of 180** while the bands below 0.65 fell to two in three. So the
 * model's judgement carries information in one part of the range and none in
 * the other, and the part where it carries none is 79% of the pairs.
 *
 * This is the shape the whole pass is for: the model is asked once, at
 * research time, and what survives into the run is arithmetic over a number it
 * helped choose. Moving this constant means measuring again, not arguing.
 */
export const CERTAIN_ABOVE = 0.85

/** One document as Jev reads it. A type alias, so it satisfies `JSONObject`. */
type Side = { repo: string; path: string; excerpt: string }

/** The state one judgement reads: two documents, named and excerpted. */
export type JudgementState = { a: Side; b: Side }

export function judgementState(a: Doc, b: Doc): JudgementState {
  return {
    a: { repo: a.repo, path: a.path, excerpt: excerptOf(a.content) },
    b: { repo: b.repo, path: b.path, excerpt: excerptOf(b.content) },
  }
}

// --- The runner -----------------------------------------------------------

/**
 * The document a fingerprint was made from, read back off disk.
 *
 * Fingerprints are kept for the whole pass and documents are not, so a
 * judgement reads its two documents when it asks. Absent is not an error: the
 * sparse checkout may not carry a file `git ls-files` lists, which is ticket
 * `13` again.
 */
function readDoc(print: Fingerprint): Doc | undefined {
  const absolute = join(REPOS_DIR, slugOf(print.repo), print.path)
  if (!existsSync(absolute)) return undefined
  return { repo: print.repo, path: print.path, content: readFileSync(absolute, 'utf8') }
}

/** Every source document in a clone, as `fingerprint` wants them. */
function docsOf(repo: string, dir: string): Doc[] {
  const listed = execFileSync(
    'git',
    ['-C', dir, 'ls-files', '--', '*CLAUDE.md', '*AGENTS.md', '*SKILL.md'],
    { encoding: 'utf8', maxBuffer: 1e8 },
  )
  const docs: Doc[] = []
  for (const rel of listed.split('\n')) {
    if (rel.trim() === '') continue
    const absolute = join(dir, rel)
    // `git ls-files` reads the index; the sparse checkout may not have the
    // file. Ticket `13` is the same fact costing a whole run.
    if (!existsSync(absolute)) continue
    docs.push({ repo, path: rel, content: readFileSync(absolute, 'utf8') })
  }
  return docs
}

type Verdict = { pair: [string, string]; overlap: number; probability: number; same: boolean }

/**
 * Asks about one pair. A failure is recorded and is **not** a `no`.
 *
 * The difference matters: a model that could not be reached has said nothing,
 * and treating that as "two documents" would quietly restore the bias this
 * whole pass exists to remove. A dropped pair is a pair nobody judged, and it
 * shows up in the run's own summary as one.
 */
async function judge(
  ask: (state: JudgementState) => Promise<number>,
  candidate: Candidate,
  read: (print: Fingerprint) => Doc | undefined,
): Promise<Verdict | undefined> {
  const a = read(candidate.a)
  const b = read(candidate.b)
  // Not a failure: a fingerprint whose document is gone was never asked about.
  if (a === undefined || b === undefined) return undefined
  const probability = await ask(judgementState(a, b))
  return {
    pair: [keyOf(candidate.a), keyOf(candidate.b)],
    overlap: Number(candidate.overlap.toFixed(3)),
    probability,
    same: probability >= MERGE_AT,
  }
}

/**
 * Jev through the AI Gateway, loaded on demand so the other subcommands never
 * import it — and it is an `evaluation` model, so `generateText` refuses it.
 */
async function jevAsk(): Promise<(state: JudgementState) => Promise<number>> {
  const ask = await openJev()
  return async (state) =>
    (await ask(state, { sameDocument: SAME_DOCUMENT })).probability('sameDocument')
}

/**
 * A stratified sample of the candidate pairs, spread over overlap.
 *
 * 193 thousand pairs is not a question anyone asks a model: at eight at a time
 * it is hours of gateway and a bill nobody sized. And the 137 pairs already
 * judged say the answer is nearly constant — Jev called 133 of them one
 * document — so what is worth buying is not every answer but **the place where
 * the answer stops being yes**. Sampling evenly across overlap bands buys that
 * and the whole-population pass does not: the interesting band is the thin one.
 *
 * Deterministic: the candidates arrive sorted, and within each band the picks
 * are evenly spaced rather than random, so a rerun asks the same questions.
 */
export function stratifiedSample(candidates: readonly Candidate[], want: number): Candidate[] {
  const bands = new Map<number, Candidate[]>()
  for (const candidate of candidates) {
    // 0.5 <= overlap <= 1, in tenths of the range: [0.50,0.55) ... [0.95,1.00]
    const band = Math.min(9, Math.floor((candidate.overlap - 0.5) / 0.05))
    const bucket = bands.get(band)
    if (bucket === undefined) bands.set(band, [candidate])
    else bucket.push(candidate)
  }
  const per = Math.max(1, Math.ceil(want / Math.max(1, bands.size)))
  const picked: Candidate[] = []
  for (const band of [...bands.keys()].toSorted((a, b) => a - b)) {
    const bucket = bands.get(band) ?? []
    const take = Math.min(per, bucket.length)
    for (let k = 0; k < take; k += 1) {
      const at = Math.floor((k * bucket.length) / take)
      const candidate = bucket[at]
      if (candidate !== undefined) picked.push(candidate)
    }
  }
  return picked
}

/** Agreement with the overlap filter, band by band. The table the sample buys. */
export function bandTable(verdicts: readonly Verdict[]): string {
  const bands = new Map<number, Verdict[]>()
  for (const verdict of verdicts) {
    const band = Math.min(9, Math.floor((verdict.overlap - 0.5) / 0.05))
    const bucket = bands.get(band)
    if (bucket === undefined) bands.set(band, [verdict])
    else bucket.push(verdict)
  }
  const lines = ['   overlap   judged   one document   mean p']
  for (const band of [...bands.keys()].toSorted((a, b) => a - b)) {
    const bucket = bands.get(band) ?? []
    const same = bucket.filter((v) => v.same).length
    const mean = bucket.reduce((sum, v) => sum + v.probability, 0) / bucket.length
    const lo = (0.5 + band * 0.05).toFixed(2)
    const hi = (0.55 + band * 0.05).toFixed(2)
    lines.push(
      `  ${lo}-${hi} ${String(bucket.length).padStart(8)} ${String(same).padStart(14)} ${mean.toFixed(3).padStart(8)}`,
    )
  }
  return lines.join('\n')
}

/** What the pass asks: two documents in, a probability out. */
export type AskSameDocument = (state: JudgementState) => Promise<number>

export async function familiesMain(
  limit: number | undefined,
  dryRun: boolean,
  sample?: number,
  concurrency = 8,
  certainAbove = CERTAIN_ABOVE,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskSameDocument,
): Promise<number> {
  if (!dryRun && askWith === undefined) requireKey('families')
  const repos = readList().slice(0, limit)
  // Fingerprints are kept; the documents they were made from are not. The
  // corpus holds 192 thousand of these files and 1.3 GB of text, and holding
  // them all was a four-gigabyte heap and a dead pass. A fingerprint is a few
  // hundred bytes; the two documents a judgement needs are read back off disk
  // when the judgement is asked, which is a handful of reads per pair.
  const prints: Fingerprint[] = []
  for (const repo of repos) {
    const dir = join(REPOS_DIR, slugOf(repo))
    if (!existsSync(join(dir, '.git'))) continue
    for (const doc of docsOf(repo, dir)) prints.push(fingerprint(doc))
  }
  const candidates = candidatePairs(prints)

  process.stderr.write(
    `${prints.length} documents in ${repos.length} repos, ` +
      `${new Set(prints.map((p) => p.hash)).size} distinct contents, ` +
      `${candidates.length} pairs to judge\n`,
  )

  const verdicts: Verdict[] = []
  if (dryRun) {
    // What the pass would spend, before it spends it. Said out loud for the
    // reason `clone` announces its gigabytes.
    for (const candidate of candidates.slice(0, 10)) {
      process.stderr.write(
        `  ${candidate.overlap.toFixed(2)}  ${keyOf(candidate.a)} ~ ${keyOf(candidate.b)}\n`,
      )
    }
  } else {
    const ask = askWith ?? (await jevAsk())
    const settled = sample === undefined ? candidates.filter((c) => c.overlap >= certainAbove) : []
    const open = candidates.filter((c) => c.overlap < certainAbove)
    const asked = sample === undefined ? open : stratifiedSample(candidates, sample)
    if (settled.length > 0) {
      process.stderr.write(
        `${settled.length} pairs are one document by overlap alone (>= ${certainAbove}), unasked\n`,
      )
      for (const candidate of settled) {
        verdicts.push({
          pair: [keyOf(candidate.a), keyOf(candidate.b)],
          overlap: Number(candidate.overlap.toFixed(3)),
          probability: 1,
          same: true,
        })
      }
    }
    process.stderr.write(`asking about ${asked.length}, ${concurrency} at a time\n`)
    const { answered } = await runPass({
      items: asked,
      width: concurrency,
      nameOf: (candidate) => `${keyOf(candidate.a)} ~ ${keyOf(candidate.b)}`,
      answer: async (candidate) => judge(ask, candidate, readDoc),
    })
    verdicts.push(...answered)
  }

  if (verdicts.length > 0) {
    writeFileSync(VERDICTS, verdicts.map((v) => JSON.stringify(v)).join('\n') + '\n', 'utf8')
  }
  const confirmed = verdicts.filter((verdict) => verdict.same).map((verdict) => verdict.pair)

  // A sample cannot build the family table. Families come from the transitive
  // closure of confirmed pairs, so a run that judged one pair in two hundred
  // would write a file saying the corpus has almost no families — a false
  // number in the place the real one lives. The sample's product is the band
  // table; `FAMILIES` is left as whatever the last whole pass wrote.
  if (sample !== undefined) {
    process.stderr.write(
      `\n${confirmed.length} of ${verdicts.length} sampled pairs are one document ` +
        `(p >= ${MERGE_AT}); ${FAMILIES} left alone\n\n`,
    )
    process.stdout.write(`${bandTable(verdicts)}\n`)
    return 0
  }

  const families = familiesOf(prints, confirmed)
  writeFileSync(FAMILIES, `${JSON.stringify([...families.values()], null, 2)}\n`, 'utf8')
  process.stderr.write(
    `\n${confirmed.length} of ${verdicts.length} judged pairs are one document ` +
      `(p >= ${MERGE_AT}); ${candidates.length - verdicts.length} went unjudged\n` +
      `families in ${FAMILIES}\n\n`,
  )
  process.stdout.write(`${formatFamilies(families)}\n`)
  return 0
}
