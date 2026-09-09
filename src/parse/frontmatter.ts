import { parse as parseYaml } from 'yaml'

/** Un valor de cadena del frontmatter, con su posicion en el archivo. */
export type FrontmatterValue = {
  /** La clave, con notacion de punto para valores anidados: `meta.ruta`. */
  key: string
  value: string
  offset: [number, number]
}

export type Frontmatter = {
  /** El cuerpo YAML, sin los delimitadores. */
  raw: string
  /** Offsets del cuerpo YAML en el contenido del archivo. */
  offset: [number, number]
  data: unknown
  /** El mensaje de error si el YAML no parsea. */
  error: string | undefined
  /** Solo los valores de cadena, que son los unicos que pueden ser rutas. */
  values: readonly FrontmatterValue[]
}

/**
 * El bloque inicial delimitado por `---`. Se recorta a mano en vez de sumar
 * `remark-frontmatter`: son tres lineas de regex contra una dependencia mas en
 * el camino principal. El YAML de adentro si va a un parser de verdad, nunca a
 * una regex (ARCHITECTURE.md § Stack).
 */
const BLOCK = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/u

/** Recolecta los valores de cadena, con la clave en notacion de punto. */
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

  // La posicion se busca por texto dentro del bloque. El parser de YAML expone
  // un CST con posiciones exactas, pero usarlo obligaria a reimplementar el
  // recorrido: para senalar una ruta, la primera aparicion del valor alcanza.
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
