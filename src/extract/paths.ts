import type { Claim, Source } from '../core/types.ts'
import type { Frontmatter } from '../parse/frontmatter.ts'
import type { ProseGates } from './context-prose.ts'
import type { ParsedDoc } from '../parse/markdown.ts'
import { rangeFor, type LineTable } from '../parse/positions.ts'
import {
  discardReason,
  normalizePathText,
  type DiscardOptions,
  type DiscardReason,
} from './discard.ts'

/**
 * Extensions that count as a "file" for the shape rule in SPEC.md § 3 ("a final
 * segment with a known extension"). The list is explicit rather than a
 * `/\.\w+$/`: anything with a dot would match `v1.2` or `node.js`, which are
 * exactly the traps this project cannot afford.
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
 * The three shape rules of SPEC.md § 3: meeting one is enough. All three
 * require a slash, or ending in one (ADR-0003).
 */
export function looksLikePath(text: string): boolean {
  if (text.length === 0) return false

  // Ends in '/': it is a directory.
  if (text.endsWith('/')) return true
  if (!text.includes('/')) return false

  // Starts with a relative or absolute path marker.
  if (text.startsWith('./') || text.startsWith('../') || text.startsWith('/')) return true

  // The last segment has a known extension.
  const last = text.slice(text.lastIndexOf('/') + 1)
  const ext = extensionOf(last)
  return ext !== undefined && KNOWN_EXTENSIONS.has(ext)
}

export type PathEvaluation =
  { kind: 'path'; text: string } | { kind: 'discarded'; reason: DiscardReason }

/**
 * The full algorithm from ARCHITECTURE.md § "Path extraction", steps 1 to 5:
 * discard, normalize, and only then decide whether it is path-shaped. Steps 6
 * and 7 (resolving against the baseDir and querying the index) belong to the
 * check.
 */
export function evaluatePathText(raw: string, options?: DiscardOptions): PathEvaluation {
  const reason = discardReason(raw, options)
  if (reason !== undefined) return { kind: 'discarded', reason }

  const text = normalizePathText(raw)
  // Normalization can leave something that is no longer path-shaped: a suffix
  // eaten away, or an empty string.
  if (!looksLikePath(text)) return { kind: 'discarded', reason: 'not-path-shaped' }

  return { kind: 'path', text }
}

export type ExtractContext = {
  source: Source
  doc: ParsedDoc
  frontmatter: Frontmatter | undefined
  table: LineTable
  /** The prose gates for this source. See `proseGatesFor`. */
  prose: ProseGates
}

/**
 * Trims the anchor off a link target: `./docs/x.md#section` claims that
 * `./docs/x.md` exists. A bare anchor (`#section`) claims nothing about a path,
 * and verifying it is `link/broken`'s job.
 */
function withoutAnchor(url: string): string | undefined {
  const hash = url.indexOf('#')
  if (hash === -1) return url
  const path = url.slice(0, hash)
  return path.length === 0 ? undefined : path
}

/**
 * A link target comes percent-encoded: Markdown writes `%20` where the file
 * name has a space. Without decoding, `docs/Guide%20X.md` is reported missing
 * even though `docs/Guide X.md` is right there.
 */
function decodeTarget(target: string): string {
  try {
    return decodeURIComponent(target)
  } catch {
    // A malformed escape is left as is: better not to verify than to invent.
    return target
  }
}

/**
 * Path claims from inline code, Markdown links and frontmatter.
 *
 * The body of code fences is deliberately not scanned: a path inside a shell
 * example is part of the example, not a claim about the repo.
 */
export function extractPathClaims({
  source,
  doc,
  frontmatter,
  table,
  prose,
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
    // Rule 8: the line may be saying that this is an example, or that the
    // path may not exist. In both cases there is no claim to verify.
    if (prose.disclaims(span.offset[0])) continue
    push(span.value, span.value, span.offset, 'inline-code')
  }

  for (const link of doc.links) {
    const target = withoutAnchor(link.value)
    if (target === undefined) continue
    if (prose.disclaims(link.offset[0])) continue
    // The offset still points at the full url, anchor included, because that
    // is what is written in the file and what --fix would have to replace.
    push(link.value, decodeTarget(target), link.offset, 'link')
  }

  for (const value of frontmatter?.values ?? []) {
    push(value.value, value.value, value.offset, 'frontmatter', { key: value.key })
  }

  return claims
}
