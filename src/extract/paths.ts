import type { Claim, Source } from '../core/types.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import { rangeFor, type LineTable } from '../parse/positions.ts'
import { discardReason, normalizePathText, type DiscardReason } from './discard.ts'

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
export function evaluatePathText(raw: string): PathEvaluation {
  const reason = discardReason(raw)
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
  table: LineTable
}

/**
 * Claims de tipo path desde codigo inline. Los links de Markdown y el
 * frontmatter son las otras dos fuentes, y llegan en su propio ticket.
 *
 * El cuerpo de los bloques de codigo no se escanea a proposito: una ruta dentro
 * de un ejemplo de shell es parte del ejemplo, no una afirmacion sobre el repo.
 */
export function extractPathClaims({ source, doc, table }: ExtractContext): Claim[] {
  const claims: Claim[] = []

  for (const span of doc.inlineCode) {
    const evaluated = evaluatePathText(span.value)
    if (evaluated.kind === 'discarded') continue
    claims.push({
      kind: 'path',
      source,
      text: evaluated.text,
      raw: span.value,
      range: rangeFor(table, span.offset[0], span.offset[1]),
      offset: span.offset,
      context: 'inline-code',
    })
  }

  return claims
}
