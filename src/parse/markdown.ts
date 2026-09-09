import type { Root } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

/**
 * A fragment with its exact position in the original content. The offsets are
 * what makes `--fix` possible without reformatting: that byte range is
 * replaced and nothing else.
 */
export type Span = {
  value: string
  offset: [number, number]
}

export type FenceSpan = Span & {
  /** The language declared on the fence, or undefined if it declares none. */
  lang: string | undefined
}

export type LinkSpan = Span & {
  /** The link's visible text, so a message can quote it. */
  label: string
}

export type ParsedDoc = {
  inlineCode: readonly Span[]
  fences: readonly FenceSpan[]
  links: readonly LinkSpan[]
}

/** Whether a url points outside the repo. */
function isExternal(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(url) || url.startsWith('//')
}

const processor = unified().use(remarkParse)

/**
 * Locates `value` inside a node's raw text. It is needed because the mdast
 * position includes the syntax (the backticks of an inlineCode, the parentheses
 * of a link), and what we want to point at is the content.
 */
function offsetOfValue(
  content: string,
  nodeStart: number,
  nodeEnd: number,
  value: string,
): [number, number] | undefined {
  if (value.length === 0) return undefined
  const raw = content.slice(nodeStart, nodeEnd)
  const at = raw.indexOf(value)
  if (at === -1) return undefined
  const start = nodeStart + at
  return [start, start + value.length]
}

export function parseMarkdown(content: string): ParsedDoc {
  const tree = processor.parse(content) as Root

  const inlineCode: Span[] = []
  const fences: FenceSpan[] = []
  const links: LinkSpan[] = []
  /** inlineCode ranges that are the label of an external link. */
  const externalLabels: Array<[number, number]> = []

  visit(tree, (node) => {
    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) return

    if (node.type === 'inlineCode') {
      const offset = offsetOfValue(content, start, end, node.value)
      if (offset !== undefined) inlineCode.push({ value: node.value, offset })
      return
    }

    if (node.type === 'code') {
      fences.push({
        value: node.value,
        lang: node.lang ?? undefined,
        // The fence body is located like every other value, but when the
        // value is empty there is nothing to point at and the whole node is
        // used instead.
        offset: offsetOfValue(content, start, end, node.value) ?? [start, end],
      })
      return
    }

    if (node.type === 'link') {
      const offset = offsetOfValue(content, start, end, node.url)
      if (offset === undefined) return
      const label = node.children
        .map((child) => ('value' in child && typeof child.value === 'string' ? child.value : ''))
        .join('')
      links.push({ value: node.url, label, offset })

      /**
       * An `inlineCode` that is a link's label describes the link's
       * **target**. If the target is external, the path is not from this repo.
       *
       * Real case (prisma/prisma):
       * `` [`docs/drive/`](https://github.com/prisma/ignite/tree/main/docs/drive) ``
       * claims that `docs/drive/` exists in *prisma/ignite*, not here.
       */
      if (isExternal(node.url)) {
        for (const child of node.children) {
          if (child.type !== 'inlineCode') continue
          const from = child.position?.start.offset
          const to = child.position?.end.offset
          if (from !== undefined && to !== undefined) externalLabels.push([from, to])
        }
      }
    }
  })

  const isExternalLabel = ([from, to]: [number, number]): boolean =>
    externalLabels.some(([a, b]) => from >= a && to <= b)

  return {
    inlineCode: inlineCode.filter((span) => !isExternalLabel(span.offset)),
    fences,
    links,
  }
}
