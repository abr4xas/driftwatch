/**
 * What happened to each repository, one JSONL line at a time.
 *
 * All three stages write to it and two of them read it back, which is why it
 * is not part of any one of them: cloning records a repository it refused,
 * running records an audit that threw, and `status` counts both. Appended as
 * each repository finishes, so a run that dies on repository 1400 resumes at
 * 1401 rather than starting over.
 *
 * **Nothing recorded here is a measurement.** See the header of `cli.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { jsonlIn, RESULTS } from './files.ts'

export type Outcome =
  | {
      repo: string
      ok: true
      sources: number
      /**
       * Documents git listed that the working tree did not have. Recorded
       * because a repository that audited 3 of 4 sources and one that audited
       * 4 are not the same observation, and `07` reads this file.
       */
      skipped: number
      claims: number
      findings: readonly unknown[]
    }
  | { repo: string; ok: false; stage: 'clone' | 'audit'; error: string }

/**
 * Every repo already recorded, so a resumed run does not redo them.
 *
 * Failures count as recorded. A repo whose config pointed outside the cone
 * fails the same way every time, and retrying it on each resume would make the
 * last repos of a long list unreachable.
 */
export function recordedIn(text: string): Set<string> {
  const done = new Set<string>()
  for (const parsed of jsonlIn(text)) {
    const repo: unknown = (parsed as { repo?: unknown }).repo
    if (typeof repo === 'string') done.add(repo)
  }
  return done
}

export function recorded(): Set<string> {
  return existsSync(RESULTS) ? recordedIn(readFileSync(RESULTS, 'utf8')) : new Set()
}

export async function record(outcome: Outcome): Promise<void> {
  await appendFile(RESULTS, `${JSON.stringify(outcome)}\n`, 'utf8')
}

/**
 * Loaded on demand, because `enumerate` and `clone` have no use for the
 * analyser and the two of them are what a long session spends its time in.
 * Taken once rather than per repository: the module cache makes the repeat
 * free, but the free repeat is what hides that it was ever a question.
 */
