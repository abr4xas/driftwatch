/**
 * Where the two corpora live, derived once.
 *
 * Five modules used to count `..` from their own file to the repository root.
 * That arithmetic is invisible to the type checker and to the tests — moving a
 * script one directory deeper silently pointed every one of them at
 * `scripts/test/…`, and the first sign was a runner reporting an empty corpus
 * rather than a failure. One definition, and moving a file cannot mean it.
 */
import { join } from 'node:path'

/** `scripts/lib/` → the repository root. */
export const REPO_ROOT = join(import.meta.dirname, '..', '..')

/** The certification corpus: pinned repos, committed snapshots, human verdicts. */
export const CORPUS_DIR = join(REPO_ROOT, 'test', 'corpus')

/** The discovery corpus: disposable, unpinned, and carrying no verdicts. */
export const DISCOVERY_DIR = join(REPO_ROOT, 'test', 'discovery')
