/**
 * The anchors a Markdown document offers, for `link/broken`.
 *
 * It works off the tree rather than growing `ParsedDoc` because most of its
 * inputs are **target files, not sources**: `ParsedDoc` is the shape the source
 * pipeline consumes, and a target is read only to answer one question. The
 * processor itself is shared, so there is one of them in the project.
 *
 * ## Why this is not GitHub's slug algorithm
 *
 * The obvious implementation is `github-slugger`, character class for character
 * class. A slug that diverges from GitHub's by one character class reports an
 * anchor that resolves fine in the browser, and `AGENTS.md` prices one false
 * positive at ten missed detections.
 *
 * So matching happens on a **canonical key**: lowercase, then drop everything
 * that is not a letter or a number. It is strictly more permissive than the
 * real slug — every anchor GitHub resolves keys the same on both sides — so the
 * divergence can only ever cost a detection, never produce a report.
 */
import type { Nodes } from 'mdast'
import { visit } from 'unist-util-visit'
import { parseToTree } from './markdown.ts'

/**
 * GitHub prefixes the ids it renders with `user-content-`, and a link copied
 * out of the DOM carries it. Stripping it costs nothing: a heading whose text
 * really begins with those words is not spelled with hyphens.
 */
const RENDERED_PREFIX = 'user-content-'

/**
 * Everything the key and the readable slug agree to throw away. It is the
 * load-bearing decision of ADR-0010, so it is written once.
 */
const NOT_ALPHANUMERIC = /[^\p{L}\p{N}]+/gu

/** The comparison key. See the note at the top of the file. */
export function anchorKey(text: string): string {
  const lower = text.trim().toLowerCase()
  const base = lower.startsWith(RENDERED_PREFIX) ? lower.slice(RENDERED_PREFIX.length) : lower
  return base.replaceAll(NOT_ALPHANUMERIC, '')
}

/**
 * A readable form of the anchor, close to what GitHub would render. It is only
 * ever shown in a suggestion — nothing is matched against it, because a
 * suggestion that reads `thefixflag` helps nobody.
 */
function displaySlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replaceAll(NOT_ALPHANUMERIC, '-')
    .replaceAll(/^-+|-+$/gu, '')
}

/**
 * A heading's visible text: its descendants, minus any html it contains.
 *
 * An image's `alt` counts. Whether the rendered slug includes it depends on
 * the renderer, and including it can only ever add a key — the direction that
 * costs a detection rather than producing a report.
 */
function visibleText(node: Nodes): string {
  let out = ''
  visit(node, (child) => {
    if (child.type === 'text' || child.type === 'inlineCode') out += child.value
    else if (child.type === 'image' || child.type === 'imageReference') out += child.alt ?? ''
  })
  return out
}

/**
 * `## Section {#custom-id}`. GitHub keeps the braces and slugs the lot; other
 * renderers honour the id. Both are collected, which is the permissive
 * direction.
 */
const CUSTOM_ID = /\{#([^}\s]+)\}\s*$/u

/** `id="x"`, `name='x'` or `id=x`, on any html node. */
const HTML_ID = /\b(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/giu

/**
 * Every anchor the document offers, as `key -> readable form`.
 *
 * Headings, the ids of any html in it, and the `{#custom-id}` convention.
 */
export function collectAnchors(content: string): ReadonlyMap<string, string> {
  const tree = parseToTree(content)
  const anchors = new Map<string, string>()
  /** How many headings have already produced each key, for GitHub's suffixes. */
  const seen = new Map<string, number>()

  const add = (key: string, display: string): void => {
    if (key === '' || anchors.has(key)) return
    anchors.set(key, display)
  }

  visit(tree, (node) => {
    if (node.type === 'html') {
      for (const match of node.value.matchAll(HTML_ID)) {
        const id = match[1] ?? match[2] ?? match[3] ?? ''
        add(anchorKey(id), displaySlug(id))
      }
      return
    }
    if (node.type !== 'heading') return

    const text = visibleText(node)
    const custom = CUSTOM_ID.exec(text)?.[1]
    if (custom !== undefined) add(anchorKey(custom), displaySlug(custom))

    const key = anchorKey(text)
    if (key === '') return
    /**
     * A repeated heading gets a numeric suffix: GitHub renders the second
     * `## Setup` as `setup-1`, which keys to `setup1`. Without this a correct
     * link to the second one is reported broken.
     */
    const nth = seen.get(key) ?? 0
    seen.set(key, nth + 1)
    const slug = displaySlug(text)
    if (nth === 0) add(key, slug)
    else add(`${key}${nth}`, `${slug}-${nth}`)
  })

  return anchors
}
