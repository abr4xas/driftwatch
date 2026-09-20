import type { Claim, ClaimFact } from '../core/types.ts'
import { rangeFor } from '../parse/positions.ts'
import { proseWindowAround } from './context-prose.ts'
import type { DiscardCause, ExtractContext } from './context.ts'
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
 * A link target is a url by construction and cannot be a command; everything
 * else can. See `hasSpaces` in `discard.ts`.
 */
function optionsFor(context: Claim['context']): DiscardOptions {
  return { couldBeCommand: context !== 'link' }
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
  discards,
}: ExtractContext): Claim[] {
  const claims: Claim[] = []

  const report = (text: string, cause: DiscardCause, offset: [number, number]): void => {
    discards?.({
      source,
      kind: 'path',
      cause,
      text,
      offset,
      line: rangeFor(table, offset[0], offset[1]).line,
      window: proseWindowAround(source.content, offset[0]),
    })
  }

  /**
   * A candidate a prose gate refused, recorded **only if the shape rules would
   * have let it through**.
   *
   * Without that condition the prose rules get credited with every backticked
   * `true`, `pnpm test` and `--fix` in the corpus, because the gates run before
   * the shape rules and inline code is mostly not paths at all. Ticket `07`
   * asks what a rule threw away, and a candidate three other rules would have
   * thrown away anyway was not thrown away by this one.
   *
   * The evaluation is paid for only when a sink is listening; on an ordinary
   * run this function returns on its first line.
   */
  const gatedOut = (
    candidate: string,
    cause: DiscardCause,
    offset: [number, number],
    context: Claim['context'],
  ): void => {
    if (discards === undefined) return
    if (evaluatePathText(candidate, optionsFor(context)).kind !== 'path') return
    report(candidate, cause, offset)
  }

  const push = (
    raw: string,
    candidate: string,
    offset: [number, number],
    context: Claim['context'],
    fact?: ClaimFact,
  ): void => {
    const evaluated = evaluatePathText(candidate, optionsFor(context))
    if (evaluated.kind === 'discarded') {
      report(candidate, evaluated.reason, offset)
      return
    }
    claims.push({
      kind: 'path',
      source,
      text: evaluated.text,
      raw,
      range: rangeFor(table, offset[0], offset[1]),
      offset,
      context,
      ...(fact === undefined ? {} : { fact }),
    })
  }

  for (const span of doc.inlineCode) {
    // Rule 8: the line may be saying that this is an example, or that the
    // path may not exist. In both cases there is no claim to verify.
    const disclaimed = prose.disclaimedBy(span.offset[0])
    if (disclaimed !== undefined) {
      gatedOut(span.value, disclaimed, span.offset, 'inline-code')
      continue
    }
    // Rule 9: somewhere else in this document, the reader is told to create
    // this exact path. See `creationTargets`.
    if (prose.declaresDestination(span.value)) {
      gatedOut(span.value, 'creation-target', span.offset, 'inline-code')
      continue
    }
    push(span.value, span.value, span.offset, 'inline-code')
  }

  for (const link of doc.links) {
    const target = withoutAnchor(link.value)
    if (target === undefined) continue
    const candidate = decodeTarget(target)
    const disclaimed = prose.disclaimedBy(link.offset[0])
    if (disclaimed !== undefined) {
      gatedOut(candidate, disclaimed, link.offset, 'link')
      continue
    }
    if (prose.declaresDestination(link.value)) {
      gatedOut(candidate, 'creation-target', link.offset, 'link')
      continue
    }
    // The offset still points at the full url, anchor included, because that
    // is what is written in the file and what --fix would have to replace.
    push(link.value, candidate, link.offset, 'link')
  }

  for (const value of frontmatter?.values ?? []) {
    // No fact: the key it came from was carried and never read, and the union
    // is where that shows. `context: 'frontmatter'` is what the reporter uses.
    push(value.value, value.value, value.offset, 'frontmatter')
  }

  return claims
}
