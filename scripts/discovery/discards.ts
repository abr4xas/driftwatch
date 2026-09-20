/**
 * What the extractor threw away, and the table ticket `07` asks for.
 *
 * Everything this project measures is on one side of the tool: `CLASSIFICATION.md`
 * counts findings and rules each one true or false, and nothing counts what
 * never became a finding. Discards appear in no snapshot, and inspecting them
 * inside a validation repository is what ADR-0006 condition 9 forbids. So the
 * cost of `src/extract/discard.ts` and the prose gates has never had a number.
 *
 * `ExtractContext` carries an optional `DiscardSink` — absent on every ordinary
 * run — and this reads it over the discovery clones:
 *
 *   pnpm discovery discards  [--limit N]    write discards.jsonl, print the table
 *   pnpm discovery sample    [--sample N]   n of each rule's discards, to read
 *
 * It lives beside `discovery.ts` rather than inside it for the reason
 * `discovery-clone.ts` does: the acquisition runner is about acquisition, and
 * this consumes what it acquired.
 *
 * **Nothing here is a measurement.** `AGENTS.md` § "The discovery corpus is not
 * a corpus in the same sense" is the rule, and `formatTable` prints it with the
 * table because the table is the part somebody pastes somewhere.
 */
import { closeSync, existsSync, openSync, readFileSync, renameSync, writeSync } from 'node:fs'
import { join } from 'node:path'
import { messageOf } from '../../src/core/errors.ts'
import type { Discard, DiscardCause } from '../../src/extract/context.ts'
import { normalizePathText } from '../../src/extract/discard.ts'
import { buildRepoIndex, hasDir, hasFile, type RepoIndex } from '../../src/verify/repo-index.ts'
import { resolveInRepo } from '../../src/verify/resolve.ts'
import { slugOf } from '../corpus/repos.ts'
import { DISCARDS, FAMILIES, jsonlIn, readList, REPOS_DIR } from './files.ts'

/**
 * One discarded candidate, as one line of JSONL.
 *
 * The window is what makes the file readable: ticket `07`'s question is "does
 * the document claim that path exists", and nobody can answer it from the
 * string alone. `path` and `line` are kept so an answer can be checked against
 * the clone while it is still on disk.
 */
export type DiscardRecord = {
  repo: string
  path: string
  /** Which extractor's candidate it was. See `Discard.kind`. */
  kind: string
  cause: DiscardCause
  text: string
  line: number
  /** Kept as well as `line`: the ticket asks for it and a line does not locate a span. */
  offset: [number, number]
  window: string
  /**
   * Whether the repository has that path, resolved the way a claim would be.
   *
   * It is **not** "this would have been a finding": everything `path-claim.ts`
   * declines to answer — a generated file, a tool that is not installed, a path
   * git ignores — runs after this and is not asked here. What it does is
   * separate the discards that cost nothing from the ones worth reading, and
   * the first group is most of them. A rule that threw away four thousand
   * strings naming files that are right there threw away nothing.
   *
   * **Absent when the question does not apply.** `pnpm build` is not a path and
   * neither is `#installation`, so nothing is asserted about them; they are
   * counted as worth reading, which is what they are — there are 60 of them.
   *
   * Even at its narrowest this column is an **upper bound**, and ticket `16`
   * found out how loose it can be: the rules that decline to answer a claim —
   * `exists-as-suffix` above all — run *after* the discard rules and catch what
   * they let through, so a gate can look expensive here and cost nothing. A row
   * says where to look and not what anything costs. What it cost in one case is
   * in the ticket, where a count over these repositories belongs.
   */
  exists?: boolean
}

/** One row of the table ticket `07` asks for. */
export type DiscardRow = {
  cause: DiscardCause
  count: number
  /** Distinct texts, because one document repeating a string is one habit. */
  distinct: number
  repos: number
  /**
   * Of `count`, the ones not known to be satisfied: the repository does not
   * have the path, or it was never a path and the question was not asked.
   * These are the ones a person reads.
   */
  absent: number
}

/**
 * The table, most discarded first.
 *
 * It counts and it does **not** judge: whether a discard looks like a real
 * claim is the question a person answers by reading the windows, and the
 * ticket is explicit that a high count is not a bug report. Three columns
 * rather than one because they disagree usefully — a rule that fires ten
 * thousand times over one string in one repository is a different object from
 * one that fires ten thousand times over ten thousand strings.
 */
type Tally = { texts: Set<string>; repos: Set<string>; count: number; absent: number }

/**
 * The table, one record at a time.
 *
 * Its own thing rather than a loop inside `tabulate` because the runner cannot
 * afford to hold the records: 2533 repositories carry 192 thousand documents,
 * and the discards they produce are millions of lines — more than a JavaScript
 * string can hold, so reading the file back to count it is not available
 * either. The counting happens as the lines are written.
 */
export function tallies(): {
  add: (record: DiscardRecord) => void
  rows: () => DiscardRow[]
} {
  const byCause = new Map<DiscardCause, Tally>()
  return {
    add(discard) {
      const row = byCause.get(discard.cause) ?? {
        texts: new Set(),
        repos: new Set(),
        count: 0,
        absent: 0,
      }
      row.count += 1
      if (discard.exists !== true) row.absent += 1
      row.texts.add(discard.text)
      row.repos.add(discard.repo)
      byCause.set(discard.cause, row)
    },
    rows: () => rowsOf(byCause),
  }
}

function rowsOf(byCause: ReadonlyMap<DiscardCause, Tally>): DiscardRow[] {
  return [...byCause]
    .map(([cause, row]) => ({
      cause,
      count: row.count,
      distinct: row.texts.size,
      repos: row.repos.size,
      absent: row.absent,
    }))
    .toSorted((a, b) => b.count - a.count || a.cause.localeCompare(b.cause))
}

export function tabulate(records: readonly DiscardRecord[]): DiscardRow[] {
  const table = tallies()
  for (const record of records) table.add(record)
  return table.rows()
}

/**
 * Every record a JSONL file holds, skipping a torn last line and anything that
 * is not shaped like one.
 *
 * The shape is checked rather than asserted, for the reason `AGENTS.md` gives
 * about `as`: this file is written by one version of the runner and read by
 * another, and a record missing `cause` would become a row in the table named
 * `undefined`.
 */
export function discardsIn(text: string): DiscardRecord[] {
  const records: DiscardRecord[] = []
  for (const parsed of jsonlIn(text)) {
    const candidate = parsed as Partial<DiscardRecord>
    if (typeof candidate.cause !== 'string' || typeof candidate.repo !== 'string') continue
    records.push(candidate as DiscardRecord)
  }
  return records
}

/**
 * `n` discards of one rule, spread evenly through the file.
 *
 * Evenly rather than at random, and rather than the first `n`: the file is
 * written repository by repository, so the head of any rule's discards is one
 * or two documents and reading it would be reading their habits. An even
 * stride is deterministic, which is what lets a judgement recorded in the
 * ticket be checked by somebody who re-runs this.
 */
/**
 * One discard per template family, when the family table exists.
 *
 * Ticket `17`, and it is the whole reason that table is built. `07` read 26
 * `conditional` discards and reported a proportion; four of them were one
 * `.agents/skills/teach/SKILL.md` living in two repositories. A reader asking
 * "how often does this rule misfire" wants documents, and every copy answers
 * the same way the original did.
 *
 * With no table this returns the records untouched, so the sampler works on a
 * corpus nobody has run `families` over — it just reads copies, the way it did
 * before.
 */
export function collapseToFamilies(
  records: readonly DiscardRecord[],
  families: ReadonlyMap<string, string>,
): DiscardRecord[] {
  if (families.size === 0) return [...records]
  const seen = new Set<string>()
  const kept: DiscardRecord[] = []
  for (const discard of records) {
    const family = families.get(`${discard.repo}|${discard.path}`)
    if (family === undefined) {
      kept.push(discard)
      continue
    }
    // One document per family per rule: the same rule firing on two copies is
    // one observation, and on two rules it is two.
    const key = `${family}|${discard.cause}|${discard.text}`
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(discard)
  }
  return kept
}

/** `owner/repo|path` to the family it belongs to, from `families.json`. */
export function familyIndex(raw: string): Map<string, string> {
  const index = new Map<string, string>()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return index
  }
  if (!Array.isArray(parsed)) return index
  for (const family of parsed) {
    if (!Array.isArray(family) || family.length < 2) continue
    const root = family.find((m) => typeof m === 'string')
    if (typeof root !== 'string') continue
    for (const member of family) if (typeof member === 'string') index.set(member, root)
  }
  return index
}

export function sampleOf(
  records: readonly DiscardRecord[],
  cause: DiscardCause,
  n: number,
): DiscardRecord[] {
  // Only the ones not known to be satisfied. A discard naming a file that is
  // right there cost nothing, whatever the sentence around it says, and reading
  // those would be reading the rule's harmless majority.
  const all = records.filter((discard) => discard.cause === cause && discard.exists !== true)
  if (all.length <= n) return [...all]
  const stride = all.length / n
  return Array.from({ length: n }, (_, i) => all[Math.floor(i * stride)]).filter(
    (discard) => discard !== undefined,
  )
}

/**
 * The table as a person reads it, with the rule that governs it attached.
 *
 * The caveat is printed rather than left to the ticket because this is the form
 * most likely to be pasted somewhere, and a table of counts over somebody
 * else's repositories looks exactly like a measurement of driftwatch.
 */
export function formatTable(rows: readonly DiscardRow[]): string {
  const width = Math.max(6, ...rows.map((row) => row.cause.length))
  const header =
    `${'rule'.padEnd(width)}  ${'count'.padStart(8)}  ${'distinct'.padStart(8)}  ` +
    `${'repos'.padStart(6)}  ${'absent'.padStart(8)}`
  const lines = rows.map(
    (row) =>
      `${row.cause.padEnd(width)}  ${String(row.count).padStart(8)}  ` +
      `${String(row.distinct).padStart(8)}  ${String(row.repos).padStart(6)}  ` +
      `${String(row.absent).padStart(8)}`,
  )
  return [
    header,
    '-'.repeat(header.length),
    ...lines,
    '',
    'Not a recall figure. No number here is a precision, none enters',
    'CLASSIFICATION.md, and none moves a condition of ADR-0006.',
  ].join('\n')
}

/**
 * Both resolutions a claim gets: against the source's directory and the root.
 *
 * Only asked of a path candidate. A script name and an anchor resolve against
 * nothing, and answering `false` for them would be asserting that a repository
 * lacks a file nobody said was a file.
 */
function resolvesInRepo(index: RepoIndex, discard: Discard): boolean | undefined {
  if (discard.kind !== 'path') return undefined
  const text = normalizePathText(discard.text)
  return [discard.source.baseDir, ''].some((baseDir) => {
    const rel = resolveInRepo(baseDir, text)
    return rel !== undefined && rel !== '' && (hasFile(index, rel) || hasDir(index, rel))
  })
}

function recordOf(repo: string, index: RepoIndex, discard: Discard): DiscardRecord {
  const exists = resolvesInRepo(index, discard)
  return {
    repo,
    path: discard.source.path,
    kind: discard.kind,
    cause: discard.cause,
    text: discard.text,
    line: discard.line,
    offset: discard.offset,
    window: discard.window,
    ...(exists === undefined ? {} : { exists }),
  }
}

/**
 * Both tables over a `discards.jsonl` too large to read at once.
 *
 * Its own subcommand rather than part of the pass that writes the file for one
 * reason: the collapse depends on `families.json`, and the family pass and the
 * discard pass are hours apart. Recomputing the table is a minute; recomputing
 * the discards is an hour.
 *
 * The file is streamed a line at a time because at 2533 repositories it is
 * over a gigabyte, and `readFileSync` on it throws before it returns — a
 * JavaScript string cannot hold it.
 */
export async function tableMain(): Promise<number> {
  if (!existsSync(DISCARDS)) {
    process.stderr.write(`${DISCARDS} is missing; run pnpm discovery discards first\n`)
    return 2
  }
  const families = existsSync(FAMILIES) ? familyIndex(readFileSync(FAMILIES, 'utf8')) : new Map()
  const raw = tallies()
  const collapsed = tallies()
  // One document per family per rule per text, exactly as `collapseToFamilies`
  // decides it, kept as a set of keys rather than a list of records.
  const seen = new Set<string>()
  let lines = 0
  let kept = 0

  const { createReadStream } = await import('node:fs')
  const { createInterface } = await import('node:readline')
  const reader = createInterface({
    input: createReadStream(DISCARDS, 'utf8'),
    crlfDelay: Number.POSITIVE_INFINITY,
  })
  for await (const line of reader) {
    if (line.trim() === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    const candidate = parsed as Partial<DiscardRecord>
    if (typeof candidate.cause !== 'string' || typeof candidate.repo !== 'string') continue
    const record = candidate as DiscardRecord
    lines += 1
    raw.add(record)
    const family = families.get(`${record.repo}|${record.path}`)
    if (family !== undefined) {
      const key = `${family}|${record.cause}|${record.text}`
      if (seen.has(key)) continue
      seen.add(key)
    }
    kept += 1
    collapsed.add(record)
  }

  process.stderr.write(
    `\n${lines} discards, ${lines - kept} of them copies of another document ` +
      `(${families.size} documents in families, ${FAMILIES})\n\n`,
  )
  process.stdout.write(`every discard\n\n${formatTable(raw.rows())}\n\n`)
  process.stdout.write(`one document per family per rule\n\n${formatTable(collapsed.rows())}\n`)
  return 0
}

export async function discardsMain(limit: number | undefined): Promise<number> {
  const repos = readList().slice(0, limit)
  const { run } = await import('../../src/run.ts')
  // Written as it goes, to a partial file that is renamed at the end. The
  // whole-or-nothing property the file header argues for is kept by the
  // rename, not by holding every line in memory — which at this size is a
  // gigabyte of strings and a dead pass.
  const partial = `${DISCARDS}.partial`
  const handle = openSync(partial, 'w')
  const table = tallies()
  let pending: string[] = []
  let written = 0
  const emit = (line: string): void => {
    pending.push(line)
    written += 1
    if (pending.length >= 5000) {
      writeSync(handle, `${pending.join('\n')}\n`)
      pending = []
    }
  }
  let read = 0
  let failed = 0
  let uncloned = 0

  for (const [at, repo] of repos.entries()) {
    // Said out loud every fifty repositories. The pass takes the better part
    // of an hour over 2533 clones and a silent hour is indistinguishable from
    // a hung one.
    if (at > 0 && at % 50 === 0) {
      process.stderr.write(`  ${at}/${repos.length} repos, ${written} discards\n`)
    }
    const dir = join(REPOS_DIR, slugOf(repo))
    if (!existsSync(join(dir, '.git'))) {
      uncloned += 1
      continue
    }
    const collected: Discard[] = []
    try {
      // The same `--no-config` as the audit, for the same two reasons, and one
      // more: a table computed over repositories the audit configured
      // differently is a table about several tools.
      await run({
        cwd: dir,
        paths: [],
        config: false,
        discards: (discard) => collected.push(discard),
      })
      read += 1
    } catch (cause) {
      // Recorded on stderr and nowhere else. A repository that cannot be
      // audited contributes no discards, and inventing a line for it would put
      // a zero in the table that means "not looked at" rather than "none".
      failed += 1
      process.stderr.write(`${repo}: ${messageOf(cause)}\n`)
      continue
    }
    // Built a second time rather than taken from the run, which does not
    // return it. One `git ls-files` per repository against a pass that already
    // parses every document in it.
    const index = await buildRepoIndex(dir)
    for (const discard of collected) {
      const record = recordOf(repo, index, discard)
      table.add(record)
      emit(JSON.stringify(record))
    }
  }

  if (pending.length > 0) writeSync(handle, `${pending.join('\n')}\n`)
  closeSync(handle)
  renameSync(partial, DISCARDS)
  process.stderr.write(
    `\n${read} read, ${failed} failed, ${uncloned} not cloned yet\n` +
      `${written} discards in ${DISCARDS}\n\n`,
  )
  process.stdout.write(`${formatTable(table.rows())}\n`)
  return 0
}

/**
 * Prints the sample a person then reads, rule by rule.
 *
 * Reading is the whole method here, and it is not an apology for one: the
 * question — "does this document claim that path exists?" — is about the
 * meaning of a sentence, and this project puts no model on its main path. What
 * comes out of the reading is a table in ticket `07`, and what may come out of
 * the table is a rule written by hand in `src/` and measured against the 66
 * repositories that carry human rulings.
 */
export function sampleMain(n: number): number {
  if (!existsSync(DISCARDS)) {
    process.stderr.write(`${DISCARDS} is missing; run pnpm discovery discards first\n`)
    return 2
  }
  const all = discardsIn(readFileSync(DISCARDS, 'utf8'))
  const families = existsSync(FAMILIES) ? familyIndex(readFileSync(FAMILIES, 'utf8')) : new Map()
  const records = collapseToFamilies(all, families)
  if (records.length !== all.length) {
    process.stderr.write(
      `${all.length - records.length} of ${all.length} discards are copies of another ` +
        `repository's document; reading one of each (${FAMILIES})\n`,
    )
  }
  for (const row of tabulate(records)) {
    process.stdout.write(`\n## ${row.cause} (${row.count})\n\n`)
    for (const discard of sampleOf(records, row.cause, n)) {
      process.stdout.write(
        `${discard.repo} ${discard.path}:${discard.line}\n` +
          `  text:   ${discard.text}\n` +
          `  window: ${discard.window.trim()}\n`,
      )
    }
  }
  return 0
}
