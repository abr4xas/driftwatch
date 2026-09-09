import type { Claim, Source } from '../core/types.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import { discardReason } from './discard.ts'
import { rangeFor, type LineTable } from '../parse/positions.ts'

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
 * Las tres reglas de forma de SPEC.md § 3: alcanza con cumplir una.
 * Decidir *que es una ruta* es distinto de decidir *si esa ruta existe*; las
 * reglas de descarte viven aparte, en `discard.ts`.
 */
export function looksLikePath(text: string): boolean {
  if (text.length === 0) return false

  // Termina en '/': es un directorio.
  if (text.endsWith('/')) return true

  const hasSlash = text.includes('/')

  // Empieza con un marcador de ruta relativa o absoluta, y tiene estructura.
  if ((text.startsWith('./') || text.startsWith('../') || text.startsWith('/')) && hasSlash) {
    return true
  }

  // Contiene '/' y el ultimo segmento tiene una extension conocida.
  if (hasSlash) {
    const last = text.slice(text.lastIndexOf('/') + 1)
    const ext = extensionOf(last)
    return ext !== undefined && KNOWN_EXTENSIONS.has(ext)
  }

  return false
}

export type ExtractContext = {
  source: Source
  doc: ParsedDoc
  table: LineTable
}

/**
 * Claims de tipo path desde codigo inline. Los links de Markdown y el
 * frontmatter son las otras dos fuentes, y llegan en su propio ticket.
 */
export function extractPathClaims({ source, doc, table }: ExtractContext): Claim[] {
  const claims: Claim[] = []

  for (const span of doc.inlineCode) {
    const raw = span.value
    if (discardReason(raw) !== undefined) continue
    if (!looksLikePath(raw)) continue
    claims.push({
      kind: 'path',
      source,
      text: raw,
      raw,
      range: rangeFor(table, span.offset[0], span.offset[1]),
      offset: span.offset,
      context: 'inline-code',
    })
  }

  return claims
}
