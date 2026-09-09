import type { Claim, Source } from '../core/types.ts'
import type { Frontmatter } from '../parse/frontmatter.ts'
import { lineAround, proseDisclaims } from './context-prose.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import { rangeFor, type LineTable } from '../parse/positions.ts'
import {
  discardReason,
  normalizePathText,
  type DiscardOptions,
  type DiscardReason,
} from './discard.ts'

/**
 * Extensiones que cuentan como "archivo" para la regla de forma de SPEC.md § 3
 * ("un segmento final con extension conocida"). La lista es explicita y no un
 * `/\.\w+$/`: cualquier cosa con un punto matchearia `v1.2` o `node.js`, que
 * son las trampas que este proyecto no puede permitirse.
 */
const KNOWN_EXTENSIONS = new Set([
  'ts',
  'tsx',
  'mts',
  'cts',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'jsonc',
  'json5',
  'yaml',
  'yml',
  'toml',
  'ini',
  'env',
  'md',
  'mdx',
  'mdc',
  'txt',
  'rst',
  'adoc',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'svg',
  'vue',
  'svelte',
  'astro',
  'py',
  'pyi',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'kts',
  'swift',
  'c',
  'h',
  'cc',
  'cpp',
  'hpp',
  'cs',
  'php',
  'sh',
  'bash',
  'zsh',
  'fish',
  'ps1',
  'sql',
  'graphql',
  'gql',
  'prisma',
  'proto',
  'lock',
  'gitignore',
  'dockerignore',
  'editorconfig',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'ico',
  'pdf',
  'csv',
  'tsv',
])

function extensionOf(segment: string): string | undefined {
  const dot = segment.lastIndexOf('.')
  if (dot <= 0 || dot === segment.length - 1) return undefined
  return segment.slice(dot + 1).toLowerCase()
}

/**
 * Las tres reglas de forma de SPEC.md § 3: alcanza con cumplir una. Las tres
 * exigen una barra, o terminar en una (ADR-0003).
 */
export function looksLikePath(text: string): boolean {
  if (text.length === 0) return false

  // Termina en '/': es un directorio.
  if (text.endsWith('/')) return true
  if (!text.includes('/')) return false

  // Empieza con un marcador de ruta relativa o absoluta.
  if (text.startsWith('./') || text.startsWith('../') || text.startsWith('/')) return true

  // El ultimo segmento tiene una extension conocida.
  const last = text.slice(text.lastIndexOf('/') + 1)
  const ext = extensionOf(last)
  return ext !== undefined && KNOWN_EXTENSIONS.has(ext)
}

export type PathEvaluation =
  { kind: 'path'; text: string } | { kind: 'discarded'; reason: DiscardReason }

/**
 * El algoritmo completo de ARCHITECTURE.md § "Extraccion de rutas", pasos 1 a 5:
 * descartar, normalizar, y recien entonces decidir si tiene forma de ruta. Los
 * pasos 6 y 7 (resolver contra el baseDir y consultar el indice) son del check.
 */
export function evaluatePathText(raw: string, options?: DiscardOptions): PathEvaluation {
  const reason = discardReason(raw, options)
  if (reason !== undefined) return { kind: 'discarded', reason }

  const text = normalizePathText(raw)
  // La normalizacion puede dejar algo que ya no tiene forma de ruta: un
  // sufijo comido, o una cadena vacia.
  if (!looksLikePath(text)) return { kind: 'discarded', reason: 'sin-forma-de-ruta' }

  return { kind: 'path', text }
}

export type ExtractContext = {
  source: Source
  doc: ParsedDoc
  frontmatter: Frontmatter | undefined
  table: LineTable
  /** `owner/repo` de este repo, para reconocer cuando la prosa habla de otro. */
  origin: string | undefined
}

/**
 * Recorta el ancla de un destino de link: `./docs/x.md#seccion` afirma que
 * existe `./docs/x.md`. Un ancla sola (`#seccion`) no afirma nada sobre una
 * ruta, y verificarla es trabajo de `link/broken`.
 */
function withoutAnchor(url: string): string | undefined {
  const hash = url.indexOf('#')
  if (hash === -1) return url
  const path = url.slice(0, hash)
  return path.length === 0 ? undefined : path
}

/**
 * Un destino de link viene percent-encoded: Markdown escribe `%20` donde el
 * nombre del archivo tiene un espacio. Sin decodificar, `docs/Guia%20X.md` se
 * reporta como faltante aunque `docs/Guia X.md` este ahi.
 */
function decodeTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    // Un escape mal formado se deja como esta: mejor no verificar que inventar.
    return target
  }
}

/**
 * Claims de tipo path desde codigo inline. Los links de Markdown y el
 * frontmatter son las otras dos fuentes, y llegan en su propio ticket.
 *
 * El cuerpo de los bloques de codigo no se escanea a proposito: una ruta dentro
 * de un ejemplo de shell es parte del ejemplo, no una afirmacion sobre el repo.
 */
export function extractPathClaims({
  source,
  doc,
  frontmatter,
  table,
  origin,
}: ExtractContext): Claim[] {
  const claims: Claim[] = []

  const push = (
    raw: string,
    candidate: string,
    offset: [number, number],
    context: Claim['context'],
    meta?: Record<string, unknown>,
  ): void => {
    const evaluated = evaluatePathText(candidate, {
      couldBeCommand: context !== 'link',
    })
    if (evaluated.kind === 'discarded') return
    claims.push({
      kind: 'path',
      source,
      text: evaluated.text,
      raw,
      range: rangeFor(table, offset[0], offset[1]),
      offset,
      context,
      ...(meta === undefined ? {} : { meta }),
    })
  }

  for (const span of doc.inlineCode) {
    // Regla 8: la linea puede estar diciendo que esto es un ejemplo, o que la
    // ruta puede no existir. En los dos casos no hay afirmacion que verificar.
    if (proseDisclaims(lineAround(source.content, span.offset[0]), { origin })) continue
    push(span.value, span.value, span.offset, 'inline-code')
  }

  for (const link of doc.links) {
    const target = withoutAnchor(link.value)
    if (target === undefined) continue
    if (proseDisclaims(lineAround(source.content, link.offset[0]), { origin })) continue
    // El offset sigue apuntando a la url completa, ancla incluida, porque es
    // lo que hay escrito en el archivo y lo que --fix tendria que reemplazar.
    push(link.value, decodeTarget(target), link.offset, 'link')
  }

  for (const value of frontmatter?.values ?? []) {
    push(value.value, value.value, value.offset, 'frontmatter', { key: value.key })
  }

  return claims
}
