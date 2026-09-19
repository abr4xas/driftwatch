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
import { messageOf } from '../src/core/errors.ts'
import { slugOf } from './corpus-repos.ts'
import { FAMILIES, readList, REPOS_DIR, VERDICTS } from './discovery-files.ts'

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

  const seen = new Set<string>()
  const candidates: Candidate[] = []
  for (const [, bucket] of byLine) {
    if (bucket.length > COMMON_LINE) continue
    for (const [x, i] of bucket.entries()) {
      for (const j of bucket.slice(x + 1)) {
        const key = `${i}:${j}`
        if (seen.has(key)) continue
        seen.add(key)
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
 * One narrow question, and it is deliberately not "are these similar".
 *
 * Similarity is what `overlapOf` already answered and it is why the pair is
 * here. What a model adds is the thing a set intersection cannot see: whether
 * two documents are one **template** two repositories installed, or two
 * documents that happen to describe the same tool. The second is common — every
 * repository using the same framework writes similar prose about it — and it is
 * exactly the case a high overlap cannot distinguish.
 */
export function judgementPrompt(a: Doc, b: Doc): string {
  return [
    'Two documents from different repositories.',
    '',
    `A — ${a.repo} ${a.path}`,
    '---',
    excerptOf(a.content),
    '---',
    '',
    `B — ${b.repo} ${b.path}`,
    '---',
    excerptOf(b.content),
    '---',
    '',
    'Is B the same document as A, copied and edited?',
    '',
    'Answer yes only if one is derived from the other: the same document, installed',
    'into two repositories, possibly with edits. Answer no if they are two documents',
    'that merely describe the same tool or follow the same convention — two projects',
    'writing their own instructions for the same framework are two documents, however',
    'alike the prose.',
  ].join('\n')
}

// --- The runner -----------------------------------------------------------

const MODEL = process.env['DISCOVERY_MODEL'] ?? 'anthropic/claude-haiku-4-5'

/**
 * The gateway key, refused early rather than one request in.
 *
 * `AI_GATEWAY_API_KEY` is what the AI SDK reads by default; the check is here
 * so a run that cannot work says so before it reads 4000 files.
 */
function requireKey(): void {
  if ((process.env['AI_GATEWAY_API_KEY'] ?? '') !== '') return
  throw new Error(
    'the family pass needs a Vercel AI Gateway key: set AI_GATEWAY_API_KEY in .env ' +
      '(pnpm discovery loads it) or in the environment.',
  )
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

type Verdict = { pair: [string, string]; same: boolean; why: string }

/**
 * Asks about one pair. A failure is recorded and is **not** a `no`.
 *
 * The difference matters: a model that could not be reached has said nothing,
 * and treating that as "two documents" would quietly restore the bias this
 * whole pass exists to remove.
 */
async function judge(
  ask: (prompt: string) => Promise<{ same: boolean; why: string }>,
  candidate: Candidate,
  docs: ReadonlyMap<string, Doc>,
): Promise<Verdict | undefined> {
  const a = docs.get(keyOf(candidate.a))
  const b = docs.get(keyOf(candidate.b))
  if (a === undefined || b === undefined) return undefined
  try {
    const answer = await ask(judgementPrompt(a, b))
    return { pair: [keyOf(candidate.a), keyOf(candidate.b)], same: answer.same, why: answer.why }
  } catch (cause) {
    process.stderr.write(`  ${keyOf(candidate.a)} ~ ${keyOf(candidate.b)}: ${messageOf(cause)}\n`)
    return undefined
  }
}

/** The AI Gateway call, loaded on demand so the other subcommands never see it. */
async function gatewayAsk(): Promise<(prompt: string) => Promise<{ same: boolean; why: string }>> {
  const { generateText, Output } = await import('ai')
  const { z } = await import('zod')
  const schema = z.object({
    same: z.boolean().describe('true when one document is the other, copied and edited'),
    why: z.string().describe('one short sentence naming what decided it'),
  })
  return async (prompt: string) => {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema }),
      prompt,
    })
    return output
  }
}

export async function familiesMain(limit: number | undefined, dryRun: boolean): Promise<number> {
  if (!dryRun) requireKey()
  const repos = readList().slice(0, limit)
  const docs: Doc[] = []
  for (const repo of repos) {
    const dir = join(REPOS_DIR, slugOf(repo))
    if (!existsSync(join(dir, '.git'))) continue
    docs.push(...docsOf(repo, dir))
  }
  const prints = docs.map((doc) => fingerprint(doc))
  const byKey = new Map(docs.map((doc) => [`${doc.repo}|${doc.path}`, doc]))
  const candidates = candidatePairs(prints)

  process.stderr.write(
    `${docs.length} documents in ${repos.length} repos, ` +
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
    const ask = await gatewayAsk()
    for (const [i, candidate] of candidates.entries()) {
      const verdict = await judge(ask, candidate, byKey)
      if (verdict !== undefined) verdicts.push(verdict)
      if ((i + 1) % 25 === 0) process.stderr.write(`  ${i + 1}/${candidates.length}\n`)
    }
  }

  const confirmed = verdicts.filter((v) => v.same).map((v) => v.pair)
  const families = familiesOf(prints, confirmed)
  writeFileSync(FAMILIES, `${JSON.stringify([...families.values()], null, 2)}\n`, 'utf8')
  if (verdicts.length > 0) {
    writeFileSync(VERDICTS, verdicts.map((v) => JSON.stringify(v)).join('\n') + '\n', 'utf8')
  }
  process.stderr.write(
    `\n${confirmed.length} of ${verdicts.length} judged pairs are one document\n` +
      `families in ${FAMILIES}\n\n`,
  )
  process.stdout.write(`${formatFamilies(families)}\n`)
  return 0
}
