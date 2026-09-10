/**
 * Link claims: a Markdown link that names an anchor in another document.
 *
 * Only the **anchor** is claimed here. Whether the target file exists is
 * `path/missing`'s finding — it already extracts the path half of a link and
 * already suggests a candidate for it — and claiming it twice is how one broken
 * link turns into two lines of output.
 */
import type { Claim } from '../core/types.ts'
import { rangeFor } from '../parse/positions.ts'
import type { ExtractContext } from './paths.ts'

/** A link target whose anchor is worth verifying. */
export type AnchorLink = {
  /** The path half as written, decoded. Empty for a same-file anchor. */
  path: string
  /** The fragment, decoded, without the '#'. */
  anchor: string
}

/**
 * Targets whose headings we can parse.
 *
 * `.mdx` and `.mdc` are **excluded on purpose**, even though remark reads them
 * without complaining. An MDX document emits headings from JSX components and
 * from imported partials, and remark sees none of them — so the anchors we
 * collect are a subset of the real ones and every link into the rest becomes a
 * finding. Not parsing at all is the honest answer; the cost is that a broken
 * anchor into an MDX file goes undetected.
 */
const MARKDOWN = /\.(?:md|markdown)$/iu

/**
 * A url carrying **any** scheme, plus the protocol-relative form.
 *
 * Deliberately wider than `isExternal` in `parse/markdown.ts`, which requires
 * `://` because it answers a different question — whether an inlineCode label
 * describes another repository's file. Here anything with a scheme is
 * unverifiable, `mailto:` included, and the wider test costs nothing: a
 * relative path does not carry a colon before its first slash.
 */
const SCHEME = /^(?:[a-z][a-z\d+.-]*:|\/\/)/iu

/**
 * Fragments GitHub answers without any heading producing them: the synthesized
 * ones, and line references. Reporting these is reporting the renderer.
 */
const SYNTHETIC = new Set(['top', 'readme'])

/**
 * `#L12`, `#L12-L20`, and the column form GitHub's "Copy permalink" writes:
 * `#L12C5-L20C9`. The columns matter — without them the permalink form reaches
 * the check and every one of them is a finding.
 */
const LINE_REFERENCE = /^L\d+(?:C\d+)?(?:-L?\d+(?:C\d+)?)?$/u

/**
 * A browser text fragment (`#:~:text=something`). It is a scroll instruction
 * the renderer answers, not a name any heading produces.
 */
const TEXT_FRAGMENT = ':~:'

/** A malformed escape is left as written: better not to verify than to invent. */
function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * The anchor a link claims, or `undefined` when there is nothing to verify.
 *
 * Every `undefined` here is a false positive class the check never gets the
 * chance to produce; ticket `05` lists them.
 */
export function splitAnchor(url: string): AnchorLink | undefined {
  if (SCHEME.test(url)) return undefined

  const hash = url.indexOf('#')
  if (hash === -1) return undefined

  const anchor = decode(url.slice(hash + 1))
  if (
    anchor === '' ||
    SYNTHETIC.has(anchor.toLowerCase()) ||
    LINE_REFERENCE.test(anchor) ||
    anchor.includes(TEXT_FRAGMENT)
  ) {
    return undefined
  }

  const path = decode(url.slice(0, hash))
  if (path !== '' && !MARKDOWN.test(path)) return undefined

  return { path, anchor }
}

/**
 * The same prose gates the path claims pass: a link inside a section
 * documenting another repository's layout is not a claim about ours.
 */
export function extractLinkClaims({ source, doc, table, prose }: ExtractContext): Claim[] {
  const claims: Claim[] = []

  for (const link of doc.links) {
    if (splitAnchor(link.value) === undefined) continue
    if (prose.disclaims(link.offset[0])) continue

    claims.push({
      kind: 'link',
      source,
      // The url as written, anchor included: it is what --fix would replace and
      // what the reader searches the line for.
      text: link.value,
      raw: link.value,
      range: rangeFor(table, link.offset[0], link.offset[1]),
      offset: link.offset,
      context: 'link',
    })
  }

  return claims
}
