/**
 * Where the discovery corpus lives on disk, and the two ways its files are read
 * back.
 *
 * Its own module for a mechanical reason with a real cause: `discovery.ts` ends
 * in a top-level `await main(...)`, so anything that imports it and is imported
 * *by* it deadlocks — the dynamic import waits for an evaluation that is
 * waiting for the dynamic import. The entry point cannot also be the library.
 *
 * Nothing here is committed. The whole directory is one `.gitignore` line: the
 * discovery corpus is disposable by design, and provenance lives in `FACETS`
 * rather than in a snapshot of what they returned. See `discovery.ts`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const HERE = import.meta.dirname
export const ROOT = join(HERE, '..', 'test', 'discovery')
export const LIST = join(ROOT, 'repos.txt')
export const REPOS_DIR = join(ROOT, 'repos')
/** Which (facet, page) pairs have been spent. Disposable, like the clones. */
export const CURSOR = join(ROOT, 'enumerated.json')
export const RESULTS = join(ROOT, 'results.jsonl')
/**
 * What the extractor threw away, one line per candidate.
 *
 * Rewritten whole on every `discards` run rather than appended to, which is the
 * opposite of what `results.jsonl` does and for a reason the other file does
 * not have. `enumerate` and `clone` resume because they are bought with rate
 * limit and hours of network; that pass is local, reads clones already on disk,
 * and costs a minute per hundred repositories. What resuming would buy is
 * small, and what it would cost is a file half computed by one version of
 * `discard.ts` and half by another — a table over which is not a table about
 * any rule that exists.
 */
export const DISCARDS = join(ROOT, 'discards.jsonl')
/**
 * Which documents are the same template, and the judgements behind it.
 *
 * Disposable like everything else here. The families are derived from the
 * clones and the verdicts are kept beside them so a reader can check the model
 * rather than take it — ticket `17`: it groups, it does not adjudicate.
 */
export const FAMILIES = join(ROOT, 'families.json')
export const VERDICTS = join(ROOT, 'family-verdicts.jsonl')

export function parseList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

export function readList(): string[] {
  return existsSync(LIST) ? parseList(readFileSync(LIST, 'utf8')) : []
}

/**
 * Every line of a JSONL file that parses.
 *
 * A torn last line is skipped, which is the whole reason these files are JSONL:
 * one torn line costs one record where a torn JSON array would cost the file.
 * Shared by both readers so that property is written once.
 */
export function* jsonlIn(text: string): Generator<unknown> {
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue
    try {
      yield JSON.parse(line)
    } catch {
      continue
    }
  }
}
