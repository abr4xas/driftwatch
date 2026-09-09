import type { Root } from 'mdast'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'

/**
 * Un fragmento con su posicion exacta en el contenido original. Los offsets son
 * lo que hace posible `--fix` sin reformatear: se reemplaza ese rango de bytes
 * y nada mas.
 */
export type Span = {
  value: string
  offset: [number, number]
}

export type FenceSpan = Span & {
  /** El lenguaje declarado en el fence, o undefined si no declara ninguno. */
  lang: string | undefined
}

export type LinkSpan = Span & {
  /** El texto visible del link, para poder citarlo en un mensaje. */
  label: string
}

export type ParsedDoc = {
  inlineCode: readonly Span[]
  fences: readonly FenceSpan[]
  links: readonly LinkSpan[]
}

/** Si una url apunta afuera del repo. */
function isExternal(url: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(url) || url.startsWith('//')
}

const processor = unified().use(remarkParse)

/**
 * Localiza `value` dentro del texto crudo de un nodo. Hace falta porque la
 * posicion de mdast incluye la sintaxis (los backticks de un inlineCode, los
 * parentesis de un link), y lo que queremos senalar es el contenido.
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
  /** Rangos de inlineCode que son etiqueta de un link externo. */
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
        // El cuerpo del fence se localiza igual que los demas, pero cuando el
        // valor esta vacio no hay nada que senalar y se usa el nodo entero.
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
       * Un `inlineCode` que es la etiqueta de un link describe el **destino**
       * del link. Si el destino es externo, la ruta no es de este repo.
       *
       * Caso real (prisma/prisma):
       * `` [`docs/drive/`](https://github.com/prisma/ignite/tree/main/docs/drive) ``
       * afirma que `docs/drive/` existe en *prisma/ignite*, no aca.
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
