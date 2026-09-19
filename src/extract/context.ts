import type { ClaimKind, Source } from '../core/types.ts'
import type { Frontmatter } from '../parse/frontmatter.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import type { LineTable } from '../parse/positions.ts'
import type { ProseGates, ProseReason } from './context-prose.ts'
import type { DiscardReason } from './discard.ts'

/**
 * Why a candidate did not become a claim: a shape rule from `discard.ts`, or a
 * prose gate from `context-prose.ts`. They are one union because they answer
 * one question, and ticket `07` groups by exactly this.
 */
export type DiscardCause = DiscardReason | ProseReason

/** A candidate the extractor threw away, and everything needed to judge it. */
export type Discard = {
  source: Source
  /**
   * The claim it would have become.
   *
   * The prose gates are shared: the same `conditional` that refuses a path also
   * refuses an anchor link and a script name, and a table that counted only the
   * first would report a rule's cost as smaller than it is. Measured over 700
   * repositories the difference is 60 discards in 94,972 — and 10 of the 32
   * `conditional` ones, which is the row where it matters.
   *
   * It is carried rather than folded in because the three are not
   * interchangeable: "does the repository have this path" is a question about a
   * path and nobody asks it of `pnpm build`.
   */
  kind: ClaimKind
  cause: DiscardCause
  /** The candidate as written, before `normalizePathText` touches it. */
  text: string
  offset: [number, number]
  /** 1-indexed, from the same `rangeFor` a claim's position comes from. */
  line: number
  /** The prose the rule read. See `proseWindowAround`. */
  window: string
}

/**
 * Where discarded candidates go when somebody is counting them.
 *
 * **Absent on every ordinary run**, which is the whole design. Discards are
 * the one thing this project has never been able to measure — they appear in
 * no snapshot and there is no artifact listing them (ticket `07` § "The gap")
 * — and the reason is that nothing ever asked for them. An absent sink costs a
 * comparison per discarded candidate and the two closures `extractPathClaims`
 * builds per source; what it does not cost is the prose window or the second
 * evaluation, both of which sit inside the optional call. That is cheap enough
 * that the instrumentation does not have to be a second copy of the extractor
 * which then drifts from this one.
 *
 * It deliberately does not reach the config or the CLI: this is research
 * plumbing for `scripts/discovery.ts`, not a feature.
 */
export type DiscardSink = (discard: Discard) => void

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
  /** Where to report candidates that did not become claims. Usually nowhere. */
  discards?: DiscardSink
}
