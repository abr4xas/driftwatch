import type { Source } from '../core/types.ts'
import type { Frontmatter } from '../parse/frontmatter.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import type { LineTable } from '../parse/positions.ts'
import type { ProseGates } from './context-prose.ts'

/**
 * What every extractor reads from one source. It is built once per source, in
 * `run.ts`, and shared: the section scan the prose gates start with is over the
 * whole document, so paying for it per extractor would pay for it five times.
 *
 * It lives here and not inside an extractor for the reason `Check` lives in
 * `verify/check.ts`: it is the shape the registry next to it is a list of, and
 * the four other extractors used to import it from `paths.ts`.
 */
export type ExtractContext = {
  source: Source
  doc: ParsedDoc
  frontmatter: Frontmatter | undefined
  table: LineTable
  /** The prose gates for this source. See `proseGatesFor`. */
  prose: ProseGates
}
