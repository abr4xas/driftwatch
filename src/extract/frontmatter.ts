/**
 * Frontmatter claims: what the leading YAML block asserts about itself.
 *
 * Two facts, and they are not the same kind of fact. That the block **is**
 * YAML is verifiable without knowing what wrote it. That a field holds the
 * right **type** needs a schema, and the schema lives with the check
 * (`verify/checks/frontmatter-invalid.ts`): this extractor only reports the
 * type it observed, so nothing here has to know what a `SKILL.md` is.
 */
import type { Claim, ClaimFact, FrontmatterFact } from '../core/types.ts'
import type { Frontmatter } from '../parse/frontmatter.ts'
import { rangeFor } from '../parse/positions.ts'
import type { ExtractContext } from './context.ts'

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

/**
 * The block a check may reason about, or `undefined` when a gate refuses it.
 *
 * Exported because `extract/skill.ts` asks the same question about the same
 * bytes, and a second copy of these two rules drifting from the first is
 * exactly what this tool exists to find.
 */
export function claimableFrontmatter(
  frontmatter: Frontmatter | undefined,
): Frontmatter | undefined {
  if (frontmatter === undefined) return undefined
  if (!KEY_SHAPED.test(firstMeaningfulLine(frontmatter.raw))) return undefined
  if (PLACEHOLDER.test(frontmatter.raw)) return undefined
  return frontmatter
}

/**
 * A claim about a frontmatter block, positioned by a byte range in the source.
 *
 * Shared with `extract/skill.ts`, which claims the same kind about the same
 * bytes: `text` is always the fragment `offset` covers, and every caller gets
 * that for free rather than restating it.
 */
export function frontmatterClaim(
  { source, table }: Pick<ExtractContext, 'source' | 'table'>,
  offset: [number, number],
  fact: ClaimFact,
): Claim {
  const raw = source.content.slice(offset[0], offset[1])
  return {
    kind: 'frontmatter',
    source,
    text: raw.trim(),
    raw,
    range: rangeFor(table, offset[0], offset[1]),
    offset,
    context: 'frontmatter',
    fact,
  }
}

export function extractFrontmatterClaims(context: ExtractContext): Claim[] {
  const frontmatter = claimableFrontmatter(context.frontmatter)
  if (frontmatter === undefined) return []

  const claim = (offset: [number, number], fact: FrontmatterFact): Claim =>
    frontmatterClaim(context, offset, fact)

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
    const offset = lineSpanAt(context.source.content, error.offset[0])
    return [claim(offset, { subject: 'parse', reason: error.reason })]
  }

  // Every top-level key, `empty` ones included: `skill/frontmatter` reads
  // these same claims and an empty `description:` is one of its rules.
  return frontmatter.keys.map((key) =>
    claim(key.offset, { subject: 'key', key: key.key, type: key.type, scalar: key.scalar }),
  )
}

/** The fact a claim carries. The union discriminates; nothing is revalidated. */
export function frontmatterFactOf(claim: Claim): FrontmatterFact | undefined {
  const fact = claim.fact
  if (fact === undefined) return undefined
  return fact.subject === 'parse' || fact.subject === 'key' ? fact : undefined
}
