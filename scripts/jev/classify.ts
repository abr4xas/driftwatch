/**
 * Ticket `01`: does grouping reproduce the classes a person already drew?
 *
 * The corpus produces 39 findings, every one ruled true or false by hand over
 * twenty-four rounds, and eleven of the false ones carry a named class. That
 * table is the only ground truth this project has, which is what makes this
 * the one place a model can be **checked** rather than trusted.
 *
 * The question is not whether to use a model for anything. It is whether
 * grouping can recover distinctions somebody already wrote down — because a
 * grouping that cannot do that will not propose useful ones over the
 * unlabelled discovery corpus, and `07` and `17` do not need it either way.
 *
 *   pnpm jev:classify [--dry-run]
 *
 * Two questions per finding, over one shared state, in one request: Jev
 * evaluates them in parallel and they cannot see each other's answers. The
 * class answer is consumed only when the `isReal` answer says false, which is
 * the speculative half of the fan-out pattern — asked up front because a second
 * request would cost a round trip to learn something the first already knew.
 *
 * **Nothing here writes a ruling.** The output is a comparison table in
 * `test/discovery/corpus-classify.jsonl`; `CLASSIFICATION.md` is written by a person and stays
 * that way.
 */
import type { Experimental_EvaluationQuestion } from 'ai'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CORPUS_DIR, DISCOVERY_DIR } from '../lib/paths.ts'
import { messageOf } from '../../src/core/errors.ts'
import { slugOf } from '../corpus/repos.ts'
import { openJev, requireKey } from './ask.ts'

const CORPUS = CORPUS_DIR
const OUT = join(DISCOVERY_DIR, 'corpus-classify.jsonl')

/** One hand-adjudicated finding: what the tool said, and what a person ruled. */
export type Row = {
  id: number
  repo: string
  location: string
  check: string
  claim: string
  /**
   * A person's ruling: whether the finding is a true or a false positive, or
   * `pending` for one nobody has read yet.
   *
   * `pending` arrived with round thirty-one and
   * [ADR-0015](../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md):
   * once conditions 3 to 5 were withdrawn, what the surviving ones need is a
   * ruling on every `fixable` finding and enough of the rest to settle each
   * repository, not a ruling on all of them. A pass that scores itself against
   * the rulings must **exclude** these rather than count them as either.
   */
  ruling: 'true' | 'false' | 'pending'
  className: string
}

/**
 * The per-finding table, read back out of the prose it lives in.
 *
 * Parsing the document rather than keeping a second copy: two records of one
 * adjudication is how the first one went stale, and `corpus-bookkeeping`
 * already holds this table to the snapshots.
 */
export function rowsIn(doc: string): Row[] {
  const rows: Row[] = []
  for (const line of doc.split('\n')) {
    const cells =
      /^\| (\d+) \| `([^`]+)` \| `([^`]+)` \| `([^`]+)` \| `(.*)` \| \*\*(true|false|pending)\*\* \| ([^|]+)\|/u.exec(
        line,
      )
    if (cells === null) continue
    rows.push({
      id: Number(cells[1]),
      repo: cells[2] ?? '',
      location: cells[3] ?? '',
      check: cells[4] ?? '',
      claim: cells[5] ?? '',
      ruling: cells[6] === 'true' ? 'true' : cells[6] === 'pending' ? 'pending' : 'false',
      className: (cells[7] ?? '').trim(),
    })
  }
  return rows
}

/** Every class a person has named, which is the list Jev chooses from. */
export function classesIn(rows: readonly Row[]): string[] {
  return [
    ...new Set(rows.filter((row) => row.className !== '—').map((row) => row.className)),
  ].toSorted()
}

/**
 * The lines around the claim, which is the context a person had.
 *
 * Three lines either side: the ticket asks for "the sentence around it", and a
 * sentence in these documents wraps, sits in a table row, or is a bullet under
 * a lead-in. Fewer lines than that and the reader — human or not — is being
 * asked about a string.
 */
export function windowAround(content: string, line: number, radius = 3): string {
  const lines = content.split('\n')
  const from = Math.max(0, line - 1 - radius)
  return lines.slice(from, line + radius).join('\n')
}

function sourceOf(row: Row): string {
  const [path = '', line = '1'] = row.location.split(':')
  const absolute = join(CORPUS, 'repos', slugOf(row.repo), path)
  if (!existsSync(absolute)) return ''
  return windowAround(readFileSync(absolute, 'utf8'), Number(line))
}

export type ClassifyState = {
  repo: string
  file: string
  check: string
  claim: string
  context: string
  prose: string
}

export function stateOf(row: Row, prose: string): ClassifyState {
  const [path = '', , column = ''] = row.location.split(':')
  return {
    repo: row.repo,
    file: path,
    check: row.check,
    claim: row.claim,
    context: `line ${row.location.split(':')[1] ?? ''}, column ${column}`,
    prose,
  }
}

/**
 * Whether the finding is a real problem, and if not, which named class it is.
 *
 * Two questions rather than one Choice with a "true positive" option, because
 * they are different judgements: the first is about the repository, the second
 * about a taxonomy. Folding them together would make "is this real" compete
 * with nine class labels for the same probability mass.
 *
 * `new` is in the options because the ticket asks for it: a grouping that can
 * only pick from a closed list cannot tell you it has found something the list
 * does not cover, and that is the whole point of running it over unlabelled
 * material later.
 */
export function questionsFor(
  classes: readonly string[],
): Record<string, Experimental_EvaluationQuestion> {
  const criteria: Record<string, string> = {
    new: 'None of the above describes it. The finding is wrong for a reason this list does not name.',
  }
  for (const name of classes) criteria[name] = DESCRIPTIONS[name] ?? name
  return {
    isReal: {
      type: 'boolean',
      instructions:
        'The reported path or script really is missing or wrong, so the document is out of date about this repository and a maintainer would want to fix it.',
      criteria: {
        true: 'The document asserts something about this repository that is no longer so.',
        false:
          'The document is fine and the tool misread it — the string is not a claim about this repository, or it is satisfied in a way the tool cannot see.',
      },
    },
    className: {
      type: 'choice',
      instructions:
        'Supposing the tool misread this, which kind of misreading is it? Answer even if you judged the finding real; the answer is ignored in that case.',
      criteria,
    },
  }
}

/**
 * The named classes, in the words `CLASSIFICATION.md` uses for them.
 *
 * Written out rather than passed as bare labels, because a label is a name a
 * person gave a thing after reading nine examples of it. `crate-nickname`
 * means nothing on its own, and the Noul docs are explicit that a vague
 * criterion makes the answer uninterpretable.
 */
const DESCRIPTIONS: Record<string, string> = {
  'another-tools-layout':
    "A directory belonging to a different agent tool or framework, often a copy target: `.cursor/rules/`, `.agent/workflows/`, a framework's own configuration root.",
  'comma-separated-globs':
    'A frontmatter value holding several paths in one string, which the extractor claimed as a single path. Each path in it exists; the joined string does not.',
  'crate-nickname':
    'A short name for a path that exists under a longer one — `gateway/run.rs` for `crates/edgecrab-gateway/src/run.rs`. The file is there under its real name.',
  'foreign-project':
    'A path belonging to a different project the document is comparing itself to or citing.',
  'generated-bundle':
    'A file produced by a build or a command rather than committed, described without a word the tool recognises as generation.',
  placeholder:
    'A literal stand-in rather than a name: `path/to/file.ts`, `#anchor-a`, `+types/`. Nobody expects it to exist.',
  'readers-project':
    "A path in the **reader's** project rather than this one. The document is instructing somebody working elsewhere.",
  'runtime-log':
    'A file that exists only while something runs, or after it has run: a log, a scratch output.',
  'third-party-convention':
    'A path following a convention of some other tool or community, which this repository never adopted.',
}

/**
 * Jev's answer, under names that cannot collide with the row's.
 *
 * The first version called this field `className` too and spread both objects
 * into one record, so the model's answer silently overwrote the ruling it was
 * being compared against. Every class matched, which is what a scoring bug
 * looks like from the outside.
 */
type Answer = { isReal: number; jevClass: string; jevConfidence: number }

async function jevAsk(): Promise<
  (state: ClassifyState, classes: readonly string[]) => Promise<Answer>
> {
  const ask = await openJev()
  return async (state, classes) => {
    // The class list is read out of a document at run time, so the question
    // map is built per request rather than declared.
    const answered = await ask(state, questionsFor(classes))
    const chosen = answered.chosen('className')
    return {
      isReal: answered.probability('isReal'),
      jevClass: chosen.choice,
      jevConfidence: chosen.confidence,
    }
  }
}

/** What the pass asks: one finding and the class list in, two answers out. */
export type AskToClassify = (state: ClassifyState, classes: readonly string[]) => Promise<Answer>

export async function classifyMain(
  dryRun: boolean,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskToClassify,
): Promise<number> {
  // Checked before the document is parsed: this pass used to discover a
  // missing key at the first request, after printing a summary of the work.
  if (!dryRun && askWith === undefined) requireKey('corpus-classify')
  const doc = readFileSync(join(CORPUS, 'CLASSIFICATION.md'), 'utf8')
  const rows = rowsIn(doc)
  const classes = classesIn(rows)
  process.stderr.write(`${rows.length} findings, ${classes.length} named classes\n`)
  if (rows.length === 0) throw new Error('no per-finding rows in CLASSIFICATION.md')

  if (dryRun) {
    process.stderr.write(`classes: ${classes.join(', ')}\n`)
    const [first] = rows
    if (first !== undefined) {
      process.stderr.write(`${JSON.stringify(stateOf(first, sourceOf(first)), null, 2)}\n`)
    }
    return 0
  }

  const ask = askWith ?? (await jevAsk())
  const out: string[] = []
  for (const [i, row] of rows.entries()) {
    try {
      const answer = await ask(stateOf(row, sourceOf(row)), classes)
      out.push(JSON.stringify({ ...row, ...answer }))
    } catch (cause) {
      // Recorded as unanswered rather than as a wrong answer: a request that
      // failed is not a judgement, and scoring it as one would flatter or
      // damn the model for the network.
      process.stderr.write(`  ${row.id} ${row.repo}: ${messageOf(cause)}\n`)
    }
    if ((i + 1) % 10 === 0) process.stderr.write(`  ${i + 1}/${rows.length}\n`)
  }
  writeFileSync(OUT, `${out.join('\n')}\n`, 'utf8')
  process.stderr.write(`\n${out.length} of ${rows.length} answered; ${OUT}\n`)
  return 0
}

if (process.argv[1] === import.meta.filename) {
  try {
    process.exitCode = await classifyMain(process.argv.includes('--dry-run'))
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    process.exitCode = 2
  }
}
