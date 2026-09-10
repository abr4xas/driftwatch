/**
 * Frontmatter claims: what the leading YAML block asserts about itself.
 *
 * Two facts, and they are not the same kind of fact. That the block **is**
 * YAML is verifiable without knowing what wrote it. That a field holds the
 * right **type** needs a schema, and the schema lives with the check
 * (`verify/checks/frontmatter-invalid.ts`): this extractor only reports the
 * type it observed, so nothing here has to know what a `SKILL.md` is.
 */
import type { Claim } from '../core/types.ts'
import { FRONTMATTER_TYPES, type FrontmatterField } from '../parse/frontmatter.ts'
import { rangeFor } from '../parse/positions.ts'
import type { ExtractContext } from './paths.ts'

/** What a frontmatter claim asserts. It travels in `Claim.meta`. */
export type FrontmatterFact =
  { problem: 'parse'; reason: string } | ({ problem: 'type' } & FrontmatterField)

/**
 * The block is only claimed when its first non-blank line is key-shaped.
 *
 * `parseFrontmatter` slices any leading `---` block, and a document whose
 * first line is a thematic break gives one holding prose. Prose that happens
 * not to parse as YAML is not a frontmatter problem, and reporting it would be
 * reporting our own slicing.
 */
const KEY_SHAPED = /^[A-Za-z_][\w.-]*:(\s|$)/u

/**
 * A template placeholder anywhere in the block silences it whole, the parse
 * half included: a template is not a document, and neither the shape of its
 * fields nor whether its YAML parses says anything about a repo.
 *
 * A skill template is not a skill: `description: {{DESCRIPTION}}` parses as a
 * mapping, and the file it generates will hold a string. Same direction the
 * path extractor takes with placeholders, but deliberately **not** its
 * alphabet: `discard.ts` refuses any of `* ? { } < > $ [ ]` in a path, and a
 * block holding `allowed-tools: [Read]` carries two of them while being
 * perfectly ordinary. What is looked for here is a templating **syntax**, not
 * a character.
 */
const PLACEHOLDER = /\{\{|\{%|\$\{|<%/u

/**
 * The bounds of the line holding an offset.
 *
 * An offset landing **on** the newline is walked back one character: the
 * parser reports an unterminated construct at the end of the line it started
 * on, and taking that offset literally would land on the empty line after it.
 */
function lineSpanAt(content: string, offset: number): [number, number] {
  const at = content[offset] === '\n' && offset > 0 ? offset - 1 : offset
  const start = content.lastIndexOf('\n', at) + 1
  const end = content.indexOf('\n', at)
  return [start, end === -1 ? content.length : end]
}

function firstMeaningfulLine(raw: string): string {
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    // A leading comment is YAML, not a key, and says nothing about the block.
    if (trimmed !== '' && !trimmed.startsWith('#')) return trimmed
  }
  return ''
}

export function extractFrontmatterClaims({ source, frontmatter, table }: ExtractContext): Claim[] {
  if (frontmatter === undefined) return []
  if (!KEY_SHAPED.test(firstMeaningfulLine(frontmatter.raw))) return []
  if (PLACEHOLDER.test(frontmatter.raw)) return []

  const claim = (text: string, offset: [number, number], meta: FrontmatterFact): Claim => ({
    kind: 'frontmatter',
    source,
    text,
    raw: source.content.slice(offset[0], offset[1]),
    range: rangeFor(table, offset[0], offset[1]),
    offset,
    context: 'frontmatter',
    meta,
  })

  const { error } = frontmatter
  if (error !== undefined) {
    /**
     * The claim is the **line** the parser stopped on: it is found from the
     * parser's offset, so the finding lands on the right line, and it spans
     * the whole line rather than the token, because the token is often a
     * single character and `Claim.text` has to be the fragment that
     * `Claim.offset` covers (`core/types.ts`). The column is given up; the
     * reporter does not print one, and nothing here is ever `fixable`.
     */
    const offset = lineSpanAt(source.content, error.offset[0])
    return [
      claim(source.content.slice(offset[0], offset[1]).trim(), offset, {
        problem: 'parse',
        reason: error.reason,
      }),
    ]
  }

  return (
    frontmatter.keys
      // A key written with nothing after it asserts no type. "Missing" is
      // `skill/frontmatter`'s finding, and claiming it here would double it.
      .filter((key) => key.type !== 'empty')
      .map((key) =>
        claim(key.key, key.offset, {
          problem: 'type',
          key: key.key,
          type: key.type,
          scalar: key.scalar,
        }),
      )
  )
}

/** Validation, so the guard below narrows instead of casting. */
function isFrontmatterType(value: unknown): value is FrontmatterField['type'] {
  return FRONTMATTER_TYPES.some((type) => type === value)
}

/**
 * The fact a claim carries, validated rather than cast.
 *
 * `Claim.meta` is an open record, so the check reads it through this guard the
 * way `link/broken` reads a url through `splitAnchor`: the boundary is here,
 * and no check casts.
 */
export function frontmatterFactOf(claim: Claim): FrontmatterFact | undefined {
  const meta = claim.meta
  if (meta === undefined) return undefined
  if (meta.problem === 'parse') {
    return typeof meta.reason === 'string' ? { problem: 'parse', reason: meta.reason } : undefined
  }
  if (meta.problem !== 'type') return undefined
  if (typeof meta.key !== 'string' || !isFrontmatterType(meta.type)) return undefined
  return {
    problem: 'type',
    key: meta.key,
    type: meta.type,
    scalar: typeof meta.scalar === 'string' ? meta.scalar : undefined,
  }
}
