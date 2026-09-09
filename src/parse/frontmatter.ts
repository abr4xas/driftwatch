import { parse as parseYaml } from 'yaml'

/** A string value from the frontmatter, with its position in the file. */
export type FrontmatterValue = {
  /** The key, in dot notation for nested values: `meta.path`. */
  key: string
  value: string
  offset: [number, number]
}

export type Frontmatter = {
  /** The YAML body, without the delimiters. */
  raw: string
  /** Offsets of the YAML body within the file's content. */
  offset: [number, number]
  data: unknown
  /** The error message if the YAML does not parse. */
  error: string | undefined
  /** String values only, which are the only ones that can be paths. */
  values: readonly FrontmatterValue[]
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

export function parseFrontmatter(content: string): Frontmatter | undefined {
  const match = BLOCK.exec(content)
  if (match === null) return undefined

  const raw = match[1] ?? ''
  const start = content.indexOf(raw, 4)
  const offset: [number, number] = [start, start + raw.length]

  let data: unknown
  let error: string | undefined
  try {
    data = parseYaml(raw)
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause)
  }

  const pairs: Array<[string, string]> = []
  if (error === undefined) collectStrings(data, '', pairs)

  // The position is found by text search inside the block. The YAML parser
  // exposes a CST with exact positions, but using it would mean
  // reimplementing the traversal: to point at a path, the value's first
  // occurrence is enough.
  const values: FrontmatterValue[] = []
  let cursor = 0
  for (const [key, value] of pairs) {
    if (value.length === 0) continue
    const at = raw.indexOf(value, cursor)
    if (at === -1) continue
    values.push({ key, value, offset: [start + at, start + at + value.length] })
    cursor = at + value.length
  }

  return { raw, offset, data, error, values }
}
