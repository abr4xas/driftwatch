import { isMap, isPair, isScalar, isSeq, parseDocument } from 'yaml'
import type { FrontmatterType } from '../core/types.ts'

/** A string value from the frontmatter, with its position in the file. */
export type FrontmatterValue = {
  /** The key, in dot notation for nested values: `meta.path`. */
  key: string
  value: string
  offset: [number, number]
}

/** Why the YAML did not parse, and where. */
export type FrontmatterError = {
  /** The parser's own wording. It says more than any rephrasing of ours. */
  reason: string
  /** Absolute offsets into the file, pointing at the offending token. */
  offset: [number, number]
}

/** What a top-level pair says about its value. */
export type FrontmatterField = {
  key: string
  type: FrontmatterType
  /** The value when it is a string. Reading it is how a `yes` stays a boolean. */
  scalar: string | undefined
}

/** A top-level pair: the level at which every documented schema is defined. */
export type FrontmatterKey = FrontmatterField & {
  /** Absolute offsets of the **key** token, which is what a finding quotes. */
  offset: [number, number]
  /**
   * Absolute offsets of the **value** token, when the value is a scalar.
   *
   * A finding quotes the key and `--fix` replaces the value, so the two spans
   * are both needed and are not the same one. Without this, correcting a
   * `SKILL.md`'s `name` to its directory writes over the key and produces
   * `my-skill: wrong-thing`. `undefined` for a mapping or a list, which no
   * autofix targets.
   */
  valueOffset: [number, number] | undefined
}

export type Frontmatter = {
  /** The YAML body, without the delimiters. */
  raw: string
  /** Offsets of the YAML body within the file's content. */
  offset: [number, number]
  data: unknown
  /** The error if the YAML does not parse. */
  error: FrontmatterError | undefined
  /** String values only, which are the only ones that can be paths. */
  values: readonly FrontmatterValue[]
  /** The top-level pairs, empty when the block does not parse. */
  keys: readonly FrontmatterKey[]
}

/**
 * The leading block delimited by `---`. It is sliced by hand instead of adding
 * `remark-frontmatter`: three lines of regex against one more dependency on the
 * main path. The YAML inside does go to a real parser, never to a regex
 * (ARCHITECTURE.md § Stack).
 */
const BLOCK = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/u

/** Collects the string values, with the key in dot notation. */
function collectStrings(node: unknown, prefix: string, into: Array<[string, string]>): void {
  if (typeof node === 'string') {
    into.push([prefix, node])
    return
  }
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectStrings(item, `${prefix}[${i}]`, into))
    return
  }
  if (typeof node === 'object' && node !== null) {
    for (const [key, value] of Object.entries(node)) {
      collectStrings(value, prefix === '' ? key : `${prefix}.${key}`, into)
    }
  }
}

/** The YAML shape of a value node, or `undefined` for one we do not name. */
function typeOf(value: unknown): FrontmatterType | undefined {
  if (value === null || value === undefined) return 'empty'
  if (isMap(value)) return 'mapping'
  if (isSeq(value)) return 'list'
  if (!isScalar(value)) return undefined
  const scalar: unknown = value.value
  if (scalar === null) return 'empty'
  if (typeof scalar === 'string') return 'string'
  if (typeof scalar === 'number') return 'number'
  if (typeof scalar === 'boolean') return 'boolean'
  return undefined
}

/**
 * The top-level pairs, with the exact range of each key token.
 *
 * Only pairs whose key is a plain string: a complex key is somebody else's
 * schema, and no format we know defines one.
 */
function collectKeys(contents: unknown, start: number): FrontmatterKey[] {
  if (!isMap(contents)) return []

  const keys: FrontmatterKey[] = []
  for (const item of contents.items) {
    if (!isPair(item)) continue
    const key: unknown = item.key
    if (!isScalar(key) || typeof key.value !== 'string') continue
    const range = key.range
    if (range === null || range === undefined) continue
    const type = typeOf(item.value)
    if (type === undefined) continue
    const scalar: unknown = isScalar(item.value) ? item.value.value : undefined
    // `range[1]` and not `range[2]`: the third bound runs to the end of the
    // node, trailing comment and newline included, and replacing that span
    // would delete whatever the author wrote after the value.
    const valueRange = isScalar(item.value) ? item.value.range : undefined
    keys.push({
      key: key.value,
      type,
      offset: [start + range[0], start + range[1]],
      valueOffset:
        valueRange === null || valueRange === undefined
          ? undefined
          : [start + valueRange[0], start + valueRange[1]],
      scalar: typeof scalar === 'string' ? scalar : undefined,
    })
  }
  return keys
}

/**
 * The string values, positioned by text search inside the block.
 *
 * The YAML parser exposes the exact ranges, and the top-level keys do use
 * them, but a value is usually nested and reaching it would mean
 * reimplementing the traversal: to point at a path, the value's first
 * occurrence is enough.
 */
function collectValues(data: unknown, raw: string, start: number): FrontmatterValue[] {
  const pairs: Array<[string, string]> = []
  collectStrings(data, '', pairs)

  const values: FrontmatterValue[] = []
  let cursor = 0
  for (const [key, value] of pairs) {
    if (value.length === 0) continue
    const at = raw.indexOf(value, cursor)
    if (at === -1) continue
    values.push({ key, value, offset: [start + at, start + at + value.length] })
    cursor = at + value.length
  }
  return values
}

export function parseFrontmatter(content: string): Frontmatter | undefined {
  const match = BLOCK.exec(content)
  if (match === null) return undefined

  const raw = match[1] ?? ''
  const start = content.indexOf(raw, 4)
  const offset: [number, number] = [start, start + raw.length]

  /**
   * `parseDocument` rather than `parse`: it reports the errors instead of
   * throwing the first one, and it carries the positions both halves of
   * `frontmatter/invalid` need. `prettyErrors` is off because the message
   * would repeat a line and column the finding already shows, and `logLevel`
   * is silent because otherwise `yaml` reaches for `process.emitWarning` on
   * its own: a block holding `name: {{value}}` printed a node warning over the
   * report. The errors are still collected — they are the point.
   */
  const doc = parseDocument(raw, { prettyErrors: false, logLevel: 'silent' })
  const failure = doc.errors[0]
  const error: FrontmatterError | undefined =
    failure === undefined
      ? undefined
      : { reason: failure.message, offset: [start + failure.pos[0], start + failure.pos[1]] }

  const data: unknown = error === undefined ? doc.toJS() : undefined

  return {
    raw,
    offset,
    data,
    error,
    values: error === undefined ? collectValues(data, raw, start) : [],
    keys: error === undefined ? collectKeys(doc.contents, start) : [],
  }
}
