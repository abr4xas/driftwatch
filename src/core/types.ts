/**
 * El modelo de datos del pipeline (ARCHITECTURE.md § "Modelo de datos").
 * Las etapas se comunican solo a traves de estos tipos, y ninguna conoce a la
 * siguiente. Cada tipo aparece aca cuando hay una etapa que lo consume, no
 * antes.
 */

export type SourceKind =
  'claude-md' | 'agents-md' | 'skill' | 'subagent' | 'command' | 'cursor-rule' | 'copilot'

/** Un archivo de contexto de agente: lo que se audita. */
export type Source = {
  /** Relativa a la raiz del repo, con separador posix. */
  path: string
  absPath: string
  kind: SourceKind
  content: string
  /**
   * Directorio contra el que se resuelven las rutas relativas que menciona.
   * Un `packages/api/CLAUDE.md` habla de su propio directorio, no de la raiz.
   * Es '' para una fuente en la raiz.
   */
  baseDir: string
  /**
   * Otras rutas con contenido byte a byte identico a esta, en el mismo
   * directorio. Es comun tener `AGENTS.md` y `CLAUDE.md` como copias: auditar
   * las dos reporta el mismo problema dos veces, que es la forma mas facil de
   * que la salida parezca el doble de ruidosa de lo que es.
   */
  aliases: readonly string[]
}

export type ClaimKind = 'path' | 'script' | 'dep' | 'symbol' | 'link' | 'frontmatter'

/** Donde aparecio el fragmento. Es lo que separa una ruta real de un ejemplo. */
export type ClaimContext = 'inline-code' | 'code-fence' | 'link' | 'frontmatter' | 'prose'

export type Range = {
  line: number
  column: number
  endLine: number
  endColumn: number
}

/** Un fragmento de una fuente que asegura algo verificable sobre el repo. */
export type Claim = {
  kind: ClaimKind
  source: Source
  /** El fragmento exacto afirmado, ya normalizado. */
  text: string
  /** El fragmento tal cual aparece en el archivo, antes de normalizar. */
  raw: string
  /** 1-indexado, apuntando al fragmento y no al nodo que lo contiene. */
  range: Range
  /** Offsets absolutos en `source.content`. Habilita --fix sin reformatear. */
  offset: [number, number]
  context: ClaimContext
  meta?: Record<string, unknown>
}

export type Verdict = 'ok' | 'broken' | 'suspect' | 'skipped'

export type Severity = 'error' | 'warning'

export type Suggestion = {
  value: string
  confidence: number
  fixable: boolean
}

export type Finding = {
  /** Id estable del check, como `path/missing`. */
  check: string
  severity: Severity
  claim: Claim
  message: string
  suggestion?: Suggestion
}
