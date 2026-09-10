/**
 * Inline ignore directives (`docs/spec/SPEC.md` § 7 § "Inline ignores").
 *
 * Three forms, each taking an optional list of check ids:
 *
 *   <!-- driftwatch-ignore -->             the line the comment is on
 *   <!-- driftwatch-ignore-next-line -->   the line after it
 *   <!-- driftwatch-ignore-file -->        the whole file
 *
 * With no id the directive applies to every check; with ids, only to those.
 */
import type { LineTable } from '../parse/positions.ts'
import { rangeFor } from '../parse/positions.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import { matchesCheckId } from './check-id.ts'

/**
 * `<!-- driftwatch-ignore-next-line path/missing dep/missing -->`. The ids are
 * whatever follows the form, split on whitespace and commas so both spellings
 * read the same.
 */
const DIRECTIVE = /^<!--\s*driftwatch-ignore(-next-line|-file)?\b([^]*?)-->$/u

/**
 * A set of selectors, or `'all'` when the directive named none. Kept apart
 * from an empty array so "no ids" cannot be confused with "no matches".
 */
type Selectors = readonly string[] | 'all'

export type IgnoreIndex = {
  /** Directives that apply to the whole file. */
  file: readonly Selectors[]
  /** Directives keyed by the 1-indexed line they silence. */
  byLine: ReadonlyMap<number, readonly Selectors[]>
}

const EMPTY: IgnoreIndex = { file: [], byLine: new Map() }

function selectorsOf(rest: string): Selectors {
  const ids = rest
    .split(/[\s,]+/u)
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
  return ids.length === 0 ? 'all' : ids
}

function add(byLine: Map<number, Selectors[]>, line: number, selectors: Selectors): void {
  const existing = byLine.get(line)
  if (existing === undefined) byLine.set(line, [selectors])
  else existing.push(selectors)
}

/**
 * The directives are read from the parsed document's `html` nodes and never
 * from the raw text. A comment inside a code fence parses as `code`, so an
 * example of the syntax stays an example — this repo's own `SPEC.md` shows all
 * three forms inside a fenced block, and a regex over the file would arm them.
 */
export function parseIgnores(doc: ParsedDoc, table: LineTable): IgnoreIndex {
  if (doc.html.length === 0) return EMPTY

  const file: Selectors[] = []
  const byLine = new Map<number, Selectors[]>()

  for (const span of doc.html) {
    const match = DIRECTIVE.exec(span.value.trim())
    if (match === null) continue
    const selectors = selectorsOf(match[2] ?? '')
    const range = rangeFor(table, span.offset[0], span.offset[1])

    if (match[1] === '-file') file.push(selectors)
    else if (match[1] === '-next-line') add(byLine, range.endLine + 1, selectors)
    // A bare directive covers the line it sits on. Alone on its own line that
    // silences nothing, which is what `-next-line` is for.
    else add(byLine, range.line, selectors)
  }

  return { file, byLine }
}

/**
 * Whether any directive silences this check on this line.
 *
 * An id we do not recognise simply matches nothing. Unlike `--only`, an
 * unknown id here is **not** an error: a flag is typed by the person running
 * the command now, a directive lives in someone's repo and is read by versions
 * of driftwatch that have not shipped yet. Failing open is the safe direction.
 */
export function isIgnored(index: IgnoreIndex, check: string, line: number): boolean {
  const applicable = [...index.file, ...(index.byLine.get(line) ?? [])]
  return applicable.some(
    (selectors) =>
      selectors === 'all' || selectors.some((selector) => matchesCheckId(selector, check)),
  )
}
