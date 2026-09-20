/**
 * What the extractor threw away in one repository, read by a model.
 *
 *   pnpm review <path-to-a-repo> [--show-at 0.7] [--cap 200]
 *
 * ## Why this exists, and why it is a script
 *
 * The extractor discards a candidate for nineteen reasons and the largest by
 * far is [ADR-0003](../docs/adr/0003-a-path-needs-a-slash.md): a word with no
 * slash is not a claim about a path. Measured over 800 such discards in 2533
 * repositories, that is right **92%** of the time. The other 8% are sentences
 * that really do put a file forward, and ticket `25` records what happened to
 * the attempt to reach them with a rule: the corpus went from 37 findings to
 * 118, because the judgement does not compress. A document writes
 *
 *     - `src/dev` — Development server logic (`app.ts`, `server.ts`)
 *
 * and knowing that `app.ts` lives in `src/dev` is reading, not pattern
 * matching. So the reading is offered to a person instead of being compiled
 * into a gate that fires on everybody.
 *
 * It lives in `scripts/` and not in `src/` because `PRODUCT.md` sells
 * driftwatch as deterministic, offline, no network and no API key, and Angel
 * decided on 2026-09-20 that the promise keeps no asterisk: **nobody who
 * installs driftwatch receives a line of model-shaped code.** This is a tool
 * for working on driftwatch, like the six discovery passes beside it.
 *
 * Nothing here is a finding. No number it prints enters `CLASSIFICATION.md` or
 * moves a condition of ADR-0006, and the audit is unaffected by whether it was
 * ever run.
 *
 * ## Point it at a full checkout
 *
 * Not at `test/discovery/repos/*`. Those are sparse blobless clones, so the
 * working tree holds the Markdown and almost nothing else — `git ls-files`
 * lists `src/build/assets.ts` and the directory is not on disk. Every path in
 * the repository then reads as missing and the output is a list of sentences
 * that are all perfectly true. Asked about `unjs/nitro`'s clone it returned
 * seven confident suggestions and every one of them was this. It is ticket
 * `13` in a new place, and the guard against it is knowing where you pointed
 * it.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { messageOf } from '../../src/core/errors.ts'
import { countFlag, numberFlag } from '../lib/argv.ts'
import { runPass } from '../lib/pass.ts'
import { openJev, requireKey } from './ask.ts'
import { CLAIMS_A_PATH } from './questions.ts'
import type { Discard } from '../../src/extract/context.ts'
import { normalizePathText } from '../../src/extract/discard.ts'
import { buildRepoIndex, findRepoRoot, hasDir, hasFile } from '../../src/verify/repo-index.ts'
import type { RepoIndex } from '../../src/verify/repo-index.ts'
import { resolveInRepo } from '../../src/verify/resolve.ts'

/** One candidate, with the sentence it sat in. */
export type Candidate = {
  file: string
  line: number
  text: string
  cause: string
  sentence: string
}

export type Suggestion = Candidate & { probability: number }

/**
 * Both resolutions a claim gets: against the document's directory and against
 * the root, exactly as ticket `07`'s instrumentation asks them.
 */
export function satisfiedBy(index: RepoIndex, discard: Discard): boolean {
  const text = normalizePathText(discard.text)
  return [discard.source.baseDir, ''].some((baseDir) => {
    const rel = resolveInRepo(baseDir, text)
    return rel !== undefined && rel !== '' && (hasFile(index, rel) || hasDir(index, rel))
  })
}

/**
 * The candidates worth a question: one per file, cause and word, and only the
 * ones the repository does not already satisfy.
 *
 * A discard naming a file that is right there cost nothing whatever the
 * sentence says, and asking about it would be asking about the rule's harmless
 * majority. `07`'s sampler makes the same cut for the same reason.
 */
export function candidatesIn(
  discards: readonly Discard[],
  satisfied: (discard: Discard) => boolean,
): Candidate[] {
  const seen = new Set<string>()
  const kept: Candidate[] = []
  for (const discard of discards) {
    if (satisfied(discard)) continue
    const key = `${discard.source.path}|${discard.cause}|${discard.text}`
    if (seen.has(key)) continue
    seen.add(key)
    kept.push({
      file: discard.source.path,
      line: discard.line,
      text: discard.text,
      cause: discard.cause,
      sentence: discard.window,
    })
  }
  return kept
}

export function formatSuggestions(suggestions: readonly Suggestion[], judged: number): string {
  if (suggestions.length === 0) {
    return `nothing to read: none of the ${judged} discarded candidates reads as a path claim\n`
  }
  const lines = [
    `${suggestions.length} of ${judged} discarded candidates read as a claim about a path ` +
      'that is not there:',
    '',
  ]
  for (const suggestion of suggestions.toSorted((p, q) => q.probability - p.probability)) {
    lines.push(
      `  ${suggestion.probability.toFixed(2)}  ${suggestion.file}:${suggestion.line}  ` +
        `${suggestion.text}   [${suggestion.cause}]`,
      `        ${suggestion.sentence.replaceAll('\n', ' ').trim().slice(0, 160)}`,
      '',
    )
  }
  lines.push(
    'These are not findings. driftwatch discarded every one of them on purpose and a',
    'model was asked to read the sentence again. Judge them yourself; the audit is',
    'unchanged either way.',
    '',
  )
  return lines.join('\n')
}

/** What a judgement sees: the candidate and the sentence it came from. */
export type ReviewState = {
  repo: string
  file: string
  candidate: string
  sentence: string
}

async function jevAsk(): Promise<(state: ReviewState) => Promise<number>> {
  const ask = await openJev()
  return async (state) =>
    (await ask(state, { claimsAPath: CLAIMS_A_PATH })).probability('claimsAPath')
}

/** What the pass asks: one discarded sentence in, a probability out. */
export type AskClaimsAPath = (state: ReviewState) => Promise<number>

export async function reviewMain(
  target: string,
  showAt: number,
  cap: number,
  concurrency: number,
  /** The seam. A pass is driven by a fake in tests; the default opens Jev. */
  askWith?: AskClaimsAPath,
): Promise<number> {
  // Only when this pass is about to open the gateway itself.
  if (askWith === undefined) requireKey('review')
  const cwd = resolve(target)
  if (!existsSync(cwd)) {
    process.stderr.write(`no such directory: ${cwd}\n`)
    return 2
  }

  const { run } = await import('../../src/run.ts')
  const discards: Discard[] = []
  await run({ cwd, paths: [], config: false, discards: (discard) => discards.push(discard) })

  const root = findRepoRoot(cwd)
  const index = await buildRepoIndex(root)
  const candidates = candidatesIn(discards, (discard) => satisfiedBy(index, discard))
  const asked = candidates.slice(0, cap)
  process.stderr.write(
    `${discards.length} discarded, ${candidates.length} of them not satisfied by the ` +
      `repository; asking about ${asked.length}\n`,
  )
  if (asked.length === 0) return 0

  const ask = askWith ?? (await jevAsk())
  const { answered } = await runPass({
    items: asked,
    width: concurrency,
    nameOf: (candidate) => `${candidate.file} ${candidate.text}`,
    answer: async (candidate) => ({
      ...candidate,
      probability: await ask({
        repo: root,
        file: candidate.file,
        candidate: candidate.text,
        sentence: candidate.sentence,
      }),
    }),
  })
  const judged = answered
  process.stdout.write(
    formatSuggestions(
      judged.filter((answer) => answer.probability >= showAt),
      judged.length,
    ),
  )
  return 0
}

if (process.argv[1] === import.meta.filename) {
  const argv = process.argv.slice(2)
  const [target] = argv.filter((argument) => !argument.startsWith('--'))
  try {
    if (target === undefined) throw new Error('usage: pnpm review <path-to-a-repo>')
    process.exitCode = await reviewMain(
      target,
      numberFlag(argv, '--show-at') ?? 0.7,
      countFlag(argv, '--cap') ?? 200,
      countFlag(argv, '--concurrency') ?? 8,
    )
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    process.exitCode = 2
  }
}
