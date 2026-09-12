/**
 * What every reporter is handed about a `--fix` run.
 *
 * It lives here rather than in `pretty.ts` because four formats read it now.
 * `cli/main.ts` and `fix/session.ts` already imported these types from the
 * pretty reporter, which is where they happened to be written first rather
 * than where they belong.
 */
import type { Finding } from '../core/types.ts'

/** One replacement: where it lands, what it replaces, what it becomes. */
export type FixEntry = {
  file: string
  line: number
  before: string
  after: string
  /**
   * Absolute byte offsets into the source **as it was when the plan was made**.
   * `pretty` never reads them; `json` and `sarif` do, and both only emit them
   * for a dry run, because after a real write the file they index no longer
   * exists in that form.
   */
  range: readonly [number, number]
  /**
   * The finding this edit answers, by reference. Identity is the pairing:
   * `fix/apply.ts` keeps `edits[i]` and `findings[i]` aligned, and any key
   * built from `file:line:column` is one two findings on a line can collide on.
   */
  finding: Finding
}

/** What a `--fix` run applied, or would apply, as the reports need to say it. */
export type FixOutcome = {
  applied: number
  files: number
  /** `--dry-run`: nothing was written, and the wording says so. */
  dryRun: boolean
  entries: readonly FixEntry[]
}
